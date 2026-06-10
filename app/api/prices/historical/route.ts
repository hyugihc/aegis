import { DEFAULT_ALPHA_VANTAGE_API_KEY, DEFAULT_FINNHUB_API_KEY, DEFAULT_METALS_DEV_API_KEY } from "@/lib/portfolio";

const ALPHA_BASE_URL = "https://www.alphavantage.co/query";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const METALS_DEV_BASE_URL = "https://api.metals.dev/v1/timeseries";
const TROY_OUNCE_GRAMS = 31.1034768;

type PriceSource = "fiat" | "coingecko" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance";

type PriceRequestHolding = {
  id?: unknown;
  asset?: unknown;
  assetSymbol?: unknown;
  assetType?: unknown;
  investmentType?: unknown;
  assetMedium?: unknown;
  priceSource?: unknown;
  priceTicker?: unknown;
  priceUnit?: unknown;
};

type PriceResult = {
  prices: Record<string, number>;
  sources: Record<string, PriceSource>;
  sourceTickers: Record<string, string>;
  pricedAt: Record<string, string>;
  holdingPrices: Record<string, number>;
  holdingSources: Record<string, PriceSource>;
  holdingSourceTickers: Record<string, string>;
  holdingPricedAt: Record<string, string>;
};

const historicalCache = new Map<string, { price: number; source: PriceSource; sourceTicker: string; pricedAt: string }>();

const coinGeckoIdAliases: Record<string, string> = {
  ada: "cardano",
  arb: "arbitrum",
  avax: "avalanche-2",
  bnb: "binancecoin",
  btc: "bitcoin",
  doge: "dogecoin",
  dot: "polkadot",
  eth: "ethereum",
  paxg: "pax-gold",
  pol: "polygon-ecosystem-token",
  sol: "solana",
  usdc: "usd-coin",
  usdt: "tether",
  xau: "pax-gold",
  xaut: "tether-gold",
  xrp: "ripple",
};

const alphaVantageSymbolMap: Record<string, string> = {
  vwra: "VWRA.L",
  "vwra.l": "VWRA.L",
};

const finnhubSymbolMap: Record<string, string> = {
  gld: "GLD",
  icln: "ICLN",
  voo: "VOO",
  vwra: "VWRA.L",
  "vwra.l": "VWRA.L",
};

const yahooSymbolMap: Record<string, string> = {
  gld: "GLD",
  icln: "ICLN",
  voo: "VOO",
  vwra: "VWRA.L",
  "vwra.l": "VWRA.L",
};

function holdingSymbol(holding: PriceRequestHolding) {
  return String(holding.assetSymbol || holding.asset || "").trim().toUpperCase();
}

function holdingId(holding: PriceRequestHolding & { symbol: string }) {
  return String(holding.id ?? "").trim() || holding.symbol;
}

function dateToUnix(iso: string) {
  return Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 1000);
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function coinGeckoDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

function normalizeCoinGeckoId(value: string) {
  const clean = value.trim().toLowerCase();
  return coinGeckoIdAliases[clean] ?? clean;
}

function coinGeckoId(symbol: string, holding?: PriceRequestHolding) {
  const ticker = String(holding?.priceTicker ?? "").trim();
  if (ticker && String(holding?.priceSource ?? "") === "coingecko") return normalizeCoinGeckoId(ticker);
  const cleanSymbol = symbol.trim().toLowerCase();
  if (coinGeckoIdAliases[cleanSymbol]) return coinGeckoIdAliases[cleanSymbol];
  return String(holding?.asset ?? symbol)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shouldSkipCoinGecko(symbol: string, holding?: PriceRequestHolding) {
  const cleanSymbol = symbol.trim().toLowerCase();
  if (cleanSymbol === "vwra" || cleanSymbol === "vwra.l") return true;

  if (String(holding?.priceSource ?? "") === "coingecko") return false;
  if (
    String(holding?.priceSource ?? "") === "alpha_vantage" ||
    String(holding?.priceSource ?? "") === "finnhub" ||
    String(holding?.priceSource ?? "") === "metals_dev" ||
    String(holding?.priceSource ?? "") === "yahoo_finance"
  ) {
    return true;
  }
  const haystack = `${symbol} ${holding?.asset ?? ""} ${holding?.assetType ?? ""} ${holding?.investmentType ?? ""} ${holding?.assetMedium ?? ""}`.toLowerCase();
  return haystack.includes("cash") || haystack.includes("rupiah") || symbol.toUpperCase() === "IDR";
}

function metalCode(holding: PriceRequestHolding) {
  const ticker = String(holding.priceTicker ?? "").trim().toLowerCase();
  if (ticker) return ticker;
  const haystack = `${holding.asset ?? ""} ${holding.assetSymbol ?? ""}`.toLowerCase();
  if (haystack.includes("silver")) return "silver";
  if (haystack.includes("platinum")) return "platinum";
  if (haystack.includes("palladium")) return "palladium";
  return "gold";
}

function metalUnit(holding: PriceRequestHolding) {
  const unit = String(holding.priceUnit ?? "").trim().toLowerCase();
  return unit === "g" || unit === "kg" ? unit : "toz";
}

function isTokenizedGoldCoinGeckoId(id: string) {
  return id === "pax-gold" || id === "tether-gold";
}

function coinGeckoUnit(holding: PriceRequestHolding) {
  const unit = String(holding.priceUnit ?? "").trim().toLowerCase();
  return unit === "g" || unit === "kg" ? unit : "toz";
}

function convertCoinGeckoPrice(price: number, holding: PriceRequestHolding, id: string) {
  if (!isTokenizedGoldCoinGeckoId(id)) return price;
  const unit = coinGeckoUnit(holding);
  if (unit === "g") return price / TROY_OUNCE_GRAMS;
  if (unit === "kg") return (price / TROY_OUNCE_GRAMS) * 1000;
  return price;
}

function coinGeckoSourceTicker(id: string, holding: PriceRequestHolding) {
  return isTokenizedGoldCoinGeckoId(id) ? `${id}/${coinGeckoUnit(holding)}` : id;
}

function historicalCacheKey(holding: PriceRequestHolding & { symbol: string }, iso: string) {
  const source = String(holding.priceSource ?? "auto");
  if (source === "metals_dev") {
    return `${holding.symbol}:metals_dev:${metalCode(holding)}:${metalUnit(holding)}:${iso}`;
  }
  if (!shouldSkipCoinGecko(holding.symbol, holding)) {
    const id = coinGeckoId(holding.symbol, holding);
    return `${holding.symbol}:coingecko:${id}:${coinGeckoUnit(holding)}:${iso}`;
  }
  return `${holding.symbol}:${source}:${iso}`;
}

function alphaSymbol(symbol: string, holding?: PriceRequestHolding) {
  const ticker = String(holding?.priceTicker ?? "").trim();
  if (ticker && String(holding?.priceSource ?? "") === "alpha_vantage") return ticker.toUpperCase();
  return alphaVantageSymbolMap[symbol.toLowerCase()] ?? null;
}

function finnhubSymbol(symbol: string, holding?: PriceRequestHolding) {
  const ticker = String(holding?.priceTicker ?? "").trim();
  if (ticker && String(holding?.priceSource ?? "") === "finnhub") return ticker.toUpperCase();
  return finnhubSymbolMap[symbol.toLowerCase()] ?? null;
}

function yahooSymbol(symbol: string, holding?: PriceRequestHolding) {
  const ticker = String(holding?.priceTicker ?? "").trim();
  if (ticker && String(holding?.priceSource ?? "") === "yahoo_finance") return ticker.toUpperCase();
  return yahooSymbolMap[symbol.toLowerCase()] ?? null;
}

function nearestDailyValue(series: Record<string, Record<string, unknown>>, iso: string, key: string) {
  return Object.entries(series)
    .filter(([date]) => date <= iso)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, row]) => ({ date, value: Number(row[key]) }))
    .find((row) => Number.isFinite(row.value) && row.value > 0) ?? null;
}

async function fetchAlphaVantage<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(ALPHA_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Alpha Vantage request failed.");
  return (await response.json()) as T;
}

async function alphaUsdToIdrRate(iso: string, apiKey: string) {
  const payload = await fetchAlphaVantage<Record<string, unknown>>({
    function: "FX_DAILY",
    from_symbol: "USD",
    to_symbol: "IDR",
    outputsize: "full",
    apikey: apiKey,
  });
  const series = payload["Time Series FX (Daily)"] as Record<string, Record<string, unknown>> | undefined;
  if (!series) return null;
  return nearestDailyValue(series, iso, "4. close")?.value ?? null;
}

async function yahooHistoricalPrice(symbol: string, iso: string) {
  const start = dateToUnix(addDaysIso(iso, -5));
  const end = dateToUnix(addDaysIso(iso, 2));
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=history&includeAdjustedClose=true`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const timestamps = (result?.timestamp ?? []) as number[];
  const quote = result?.indicators?.quote?.[0] as { close?: Array<number | null> } | undefined;
  const currency = String(result?.meta?.currency ?? "USD");
  const rows = timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: Number(quote?.close?.[index]),
    }))
    .filter((row) => row.date <= iso && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const row = rows[0];
  return row ? { price: row.close, pricedAt: row.date, currency } : null;
}

async function usdToIdrRate(iso: string, apiKey: string) {
  const yahooRate = await yahooHistoricalPrice("IDR=X", iso).catch(() => null);
  if (yahooRate?.price) return yahooRate.price;
  return alphaUsdToIdrRate(iso, apiKey).catch(() => null);
}

async function coinGeckoHistoricalPrice(symbol: string, holding: PriceRequestHolding & { symbol: string }, iso: string) {
  const id = coinGeckoId(symbol, holding);
  if (!id) return null;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/history?date=${coinGeckoDate(iso)}&localization=false`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { market_data?: { current_price?: { idr?: number } } };
  const price = Number(payload.market_data?.current_price?.idr);
  return Number.isFinite(price) && price > 0
    ? { price: convertCoinGeckoPrice(price, holding, id), sourceTicker: coinGeckoSourceTicker(id, holding), pricedAt: iso }
    : null;
}

async function metalsHistoricalPrice(holding: PriceRequestHolding & { symbol: string }, iso: string, apiKey: string) {
  const url = new URL(METALS_DEV_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("start_date", iso);
  url.searchParams.set("end_date", iso);
  url.searchParams.set("currency", "IDR");
  url.searchParams.set("unit", metalUnit(holding));

  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    status?: string;
    rates?: Record<string, { metals?: Record<string, number> }>;
    data?: Record<string, { metals?: Record<string, number> }>;
    metals?: Record<string, number>;
  };
  if (payload.status === "failure") return null;
  const metals = payload.rates?.[iso]?.metals ?? payload.data?.[iso]?.metals ?? payload.metals;
  const price = Number(metals?.[metalCode(holding)]);
  return Number.isFinite(price) && price > 0 ? { price, sourceTicker: `${metalCode(holding)}/${metalUnit(holding)}`, pricedAt: iso } : null;
}

async function alphaHistoricalPrice(symbol: string, holding: PriceRequestHolding, iso: string, apiKey: string, rate: number) {
  const mappedSymbol = alphaSymbol(symbol, holding);
  if (!mappedSymbol) return null;
  const payload = await fetchAlphaVantage<Record<string, unknown>>({
    function: "TIME_SERIES_DAILY_ADJUSTED",
    symbol: mappedSymbol,
    outputsize: "full",
    apikey: apiKey,
  });
  const series = payload["Time Series (Daily)"] as Record<string, Record<string, unknown>> | undefined;
  if (!series) return null;
  const row = nearestDailyValue(series, iso, "5. adjusted close") ?? nearestDailyValue(series, iso, "4. close");
  return row ? { price: row.value * rate, sourceTicker: mappedSymbol, pricedAt: row.date } : null;
}

async function finnhubHistoricalPrice(symbol: string, holding: PriceRequestHolding, iso: string, apiKey: string, rate: number) {
  const mappedSymbol = finnhubSymbol(symbol, holding);
  if (!mappedSymbol) return null;
  const url = new URL(`${FINNHUB_BASE_URL}/stock/candle`);
  url.searchParams.set("symbol", mappedSymbol);
  url.searchParams.set("resolution", "D");
  url.searchParams.set("from", String(dateToUnix(addDaysIso(iso, -5))));
  url.searchParams.set("to", String(dateToUnix(addDaysIso(iso, 1))));
  url.searchParams.set("token", apiKey);
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const payload = (await response.json()) as { s?: string; t?: number[]; c?: number[] };
  if (payload.s !== "ok") return null;
  const row = (payload.t ?? [])
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: Number(payload.c?.[index]),
    }))
    .filter((item) => item.date <= iso && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return row ? { price: row.close * rate, sourceTicker: mappedSymbol, pricedAt: row.date } : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: unknown;
      holdings?: unknown;
      alphaVantageApiKey?: unknown;
      finnhubApiKey?: unknown;
      metalsDevApiKey?: unknown;
    };
    const date = String(body.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Historical price date tidak valid." }, { status: 400 });
    }

    const holdings = (Array.isArray(body.holdings) ? (body.holdings as PriceRequestHolding[]) : [])
      .map((holding) => ({ ...holding, symbol: holdingSymbol(holding) }))
      .filter((holding) => holding.symbol);
    const alphaKey = String(body.alphaVantageApiKey ?? "").trim() || DEFAULT_ALPHA_VANTAGE_API_KEY;
    const finnhubKey = String(body.finnhubApiKey ?? "").trim() || DEFAULT_FINNHUB_API_KEY;
    const metalsKey = String(body.metalsDevApiKey ?? "").trim() || DEFAULT_METALS_DEV_API_KEY;
    const result: PriceResult = {
      prices: {},
      sources: {},
      sourceTickers: {},
      pricedAt: {},
      holdingPrices: {},
      holdingSources: {},
      holdingSourceTickers: {},
      holdingPricedAt: {},
    };
    const rate = await usdToIdrRate(date, alphaKey).catch(() => null);

    for (const holding of holdings) {
      const symbol = holding.symbol;
      if (symbol === "IDR") {
        result.prices[symbol] = 1;
        result.sources[symbol] = "fiat";
        result.sourceTickers[symbol] = "IDR";
        result.pricedAt[symbol] = date;
        const id = holdingId(holding);
        result.holdingPrices[id] = 1;
        result.holdingSources[id] = "fiat";
        result.holdingSourceTickers[id] = "IDR";
        result.holdingPricedAt[id] = date;
        continue;
      }

      if ((symbol === "USDT" || symbol === "USD") && rate) {
        result.prices[symbol] = rate;
        result.sources[symbol] = "fiat";
        result.sourceTickers[symbol] = "USD/IDR";
        result.pricedAt[symbol] = date;
        const id = holdingId(holding);
        result.holdingPrices[id] = rate;
        result.holdingSources[id] = "fiat";
        result.holdingSourceTickers[id] = "USD/IDR";
        result.holdingPricedAt[id] = date;
        continue;
      }

      const cacheKey = historicalCacheKey(holding, date);
      const cached = historicalCache.get(cacheKey);
      if (cached) {
        result.prices[symbol] = cached.price;
        result.sources[symbol] = cached.source;
        result.sourceTickers[symbol] = cached.sourceTicker;
        result.pricedAt[symbol] = cached.pricedAt;
        const id = holdingId(holding);
        result.holdingPrices[id] = cached.price;
        result.holdingSources[id] = cached.source;
        result.holdingSourceTickers[id] = cached.sourceTicker;
        result.holdingPricedAt[id] = cached.pricedAt;
        continue;
      }

      const source = String(holding.priceSource ?? "");
      let priceResult: { price: number; sourceTicker: string; pricedAt: string; source?: PriceSource } | null = null;

      if (source === "metals_dev") {
        priceResult = await metalsHistoricalPrice(holding, date, metalsKey).then((value) =>
          value ? { ...value, source: "metals_dev" as const } : null,
        );
      }

      if (!priceResult && source !== "metals_dev" && !shouldSkipCoinGecko(symbol, holding)) {
        priceResult = await coinGeckoHistoricalPrice(symbol, holding, date).then((value) =>
          value ? { ...value, source: "coingecko" as const } : null,
        );
      }

      if (!priceResult && rate) {
        const yahoo = yahooSymbol(symbol, holding);
        if (yahoo) {
          const yahooResult = await yahooHistoricalPrice(yahoo, date).catch(() => null);
          if (yahooResult) {
            priceResult = {
              price: yahooResult.currency === "IDR" ? yahooResult.price : yahooResult.price * rate,
              source: "yahoo_finance",
              sourceTicker: yahoo,
              pricedAt: yahooResult.pricedAt,
            };
          }
        }
      }

      if (!priceResult && rate) {
        priceResult = await alphaHistoricalPrice(symbol, holding, date, alphaKey, rate).then((value) =>
          value ? { ...value, source: "alpha_vantage" as const } : null,
        );
      }

      if (!priceResult && rate) {
        priceResult = await finnhubHistoricalPrice(symbol, holding, date, finnhubKey, rate).then((value) =>
          value ? { ...value, source: "finnhub" as const } : null,
        );
      }

      if (!priceResult) continue;
      result.prices[symbol] = priceResult.price;
      result.sources[symbol] = priceResult.source ?? "coingecko";
      result.sourceTickers[symbol] = priceResult.sourceTicker;
      result.pricedAt[symbol] = priceResult.pricedAt;
      const id = holdingId(holding);
      result.holdingPrices[id] = priceResult.price;
      result.holdingSources[id] = priceResult.source ?? "coingecko";
      result.holdingSourceTickers[id] = priceResult.sourceTicker;
      result.holdingPricedAt[id] = priceResult.pricedAt;

      historicalCache.set(cacheKey, {
        price: priceResult.price,
        source: priceResult.source ?? "coingecko",
        sourceTicker: priceResult.sourceTicker,
        pricedAt: priceResult.pricedAt,
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Historical price request failed." },
      { status: 502 },
    );
  }
}
