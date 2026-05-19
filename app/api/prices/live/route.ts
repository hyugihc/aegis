import { DEFAULT_ALPHA_VANTAGE_API_KEY, DEFAULT_FINNHUB_API_KEY, DEFAULT_METALS_DEV_API_KEY, DEFAULT_COINGECKO_API_KEY, DEFAULT_COINMARKETCAP_API_KEY } from "@/lib/portfolio";

const CACHE_TTL_MS = 5 * 60 * 1000;
const ALPHA_BASE_URL = "https://www.alphavantage.co/query";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const METALS_DEV_BASE_URL = "https://api.metals.dev/v1/latest";
const TROY_OUNCE_GRAMS = 31.1034768;

type PriceSource = "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance";

type PriceCacheEntry = {
  price: number;
  source: PriceSource;
  sourceTicker: string;
  cachedAt: number;
};

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
  cachedAt: Record<string, string>;
  holdingPrices: Record<string, number>;
  holdingSources: Record<string, PriceSource>;
  holdingSourceTickers: Record<string, string>;
  holdingCachedAt: Record<string, string>;
  usdIdrRate?: number;
};

const priceCache = new Map<string, PriceCacheEntry>();
let usdIdrCache: PriceCacheEntry | null = null;

const coinGeckoIdAliases: Record<string, string> = {
  ada: "cardano",
  arb: "arbitrum",
  avax: "avalanche-2",
  bnb: "binancecoin",
  btc: "bitcoin",
  doge: "dogecoin",
  dot: "polkadot",
  eth: "ethereum",
  ldbtc: "bitcoin",
  ldeth: "ethereum",
  ldfdusd: "first-digital-usd",
  ldpepe: "pepe",
  ldpaxg: "pax-gold",
  ldsol: "solana",
  ldstrk: "strike",
  ldsxt: "stakestone",
  ldusdc: "usd-coin",
  ldusdt: "tether",
  ldwbeth: "wrapped-beacon-eth",
  matic: "matic-network",
  paxg: "pax-gold",
  paxgold: "pax-gold",
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
  vwra: "VWRA.L",
  "vwra.l": "VWRA.L",
};

function cacheKey(symbol: string) {
  return symbol.trim().toUpperCase();
}

function metalsDevCacheKey(holding: PriceRequestHolding & { symbol: string }) {
  return `${holding.symbol.trim().toUpperCase()}:METALS_DEV:${metalCode(holding)}:${metalUnit(holding)}`;
}

function normalizeCoinGeckoId(value: string) {
  const clean = value.trim().toLowerCase();
  return coinGeckoIdAliases[clean] ?? clean;
}

function isTokenizedGoldCoinGeckoId(id: string) {
  return id === "pax-gold" || id === "tether-gold";
}

function coinGeckoUnit(holding: PriceRequestHolding) {
  const unit = String(holding.priceUnit ?? "").trim().toLowerCase();
  return unit === "g" || unit === "kg" ? unit : "toz";
}

function isTokenizedGoldHolding(holding: PriceRequestHolding & { symbol: string }) {
  const symbol = holding.symbol.trim().toLowerCase();
  const ticker = String(holding.priceTicker ?? "").trim().toLowerCase();
  return (
    isTokenizedGoldCoinGeckoId(coinGeckoId(holding.symbol, holding)) ||
    ["paxg", "paxgold", "ldpaxg", "xaut"].includes(symbol) ||
    ["paxg", "paxgold", "ldpaxg", "xaut"].includes(ticker)
  );
}

function coinGeckoCacheKey(holding: PriceRequestHolding & { symbol: string }) {
  const id = coinGeckoId(holding.symbol, holding);
  return isTokenizedGoldCoinGeckoId(id)
    ? `${holding.symbol.trim().toUpperCase()}:COINGECKO:${id}:${coinGeckoUnit(holding)}`
    : cacheKey(holding.symbol);
}

function coinMarketCapCacheKey(holding: PriceRequestHolding & { symbol: string }) {
  const ticker = String(holding.priceTicker ?? "").trim() || holding.symbol;
  return isTokenizedGoldHolding(holding)
    ? `${holding.symbol.trim().toUpperCase()}:COINMARKETCAP:${ticker.trim().toUpperCase()}:${coinGeckoUnit(holding)}`
    : cacheKey(holding.symbol);
}

function priceCacheKeyForHolding(holding: PriceRequestHolding & { symbol: string }) {
  const source = String(holding.priceSource ?? "");
  if (source === "metals_dev") return metalsDevCacheKey(holding);
  if (source === "coinmarketcap") return coinMarketCapCacheKey(holding);
  return coinGeckoCacheKey(holding);
}

function convertTokenizedGoldPrice(price: number, holding: PriceRequestHolding & { symbol: string }) {
  if (!isTokenizedGoldHolding(holding)) return price;
  const unit = coinGeckoUnit(holding);
  if (unit === "g") return price / TROY_OUNCE_GRAMS;
  if (unit === "kg") return (price / TROY_OUNCE_GRAMS) * 1000;
  return price;
}

function convertCoinGeckoPrice(price: number, holding: PriceRequestHolding & { symbol: string }, id: string) {
  if (!isTokenizedGoldCoinGeckoId(id)) return price;
  return convertTokenizedGoldPrice(price, holding);
}

function coinGeckoSourceTicker(id: string, holding: PriceRequestHolding) {
  return isTokenizedGoldCoinGeckoId(id) ? `${id}/${coinGeckoUnit(holding)}` : id;
}

function isMatchingCacheEntry(entry: PriceCacheEntry | undefined, holding?: PriceRequestHolding & { symbol: string }) {
  if (!entry || !holding || entry.source !== "coingecko") return Boolean(entry);
  const id = coinGeckoId(holding.symbol, holding);
  return !isTokenizedGoldCoinGeckoId(id) || entry.sourceTicker === coinGeckoSourceTicker(id, holding);
}

function isFresh(entry?: PriceCacheEntry | null) {
  return Boolean(entry && Date.now() - entry.cachedAt < CACHE_TTL_MS);
}

function holdingSymbol(holding: PriceRequestHolding) {
  return String(holding.assetSymbol || holding.asset || "").trim().toUpperCase();
}

function holdingId(holding: PriceRequestHolding & { symbol: string }) {
  return String(holding.id ?? "").trim() || holding.symbol;
}

function uniquePriceRequestHoldings(holdings: Array<PriceRequestHolding & { symbol: string }>) {
  const byKey = new Map<string, PriceRequestHolding & { symbol: string }>();
  holdings.forEach((holding) => {
    const key = [
      holdingId(holding),
      holding.symbol,
      String(holding.priceSource ?? "").trim(),
      String(holding.priceTicker ?? "").trim(),
      String(holding.priceUnit ?? "").trim(),
    ].join(":");
    if (!byKey.has(key)) byKey.set(key, holding);
  });
  return Array.from(byKey.values());
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
    String(holding?.priceSource ?? "") === "yahoo_finance" ||
    String(holding?.priceSource ?? "") === "coinmarketcap"
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

function alphaError(payload: Record<string, unknown>) {
  return String(payload["Error Message"] ?? payload.Note ?? payload.Information ?? "");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAlphaVantage<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(ALPHA_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Alpha Vantage request failed.");
  return (await response.json()) as T;
}

async function usdToIdrRate(apiKey: string, coinGeckoApiKey?: string) {
  if (isFresh(usdIdrCache)) return usdIdrCache!.price;
  const fallbackRate = await fetchCoinGeckoUsdToIdrRate(coinGeckoApiKey).catch(() => null);
  if (fallbackRate) {
    usdIdrCache = { price: fallbackRate, source: "coingecko", sourceTicker: "tether", cachedAt: Date.now() };
    return fallbackRate;
  }
  const payload = await fetchAlphaVantage<Record<string, unknown>>({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: "USD",
    to_currency: "IDR",
    apikey: apiKey,
  });
  const message = alphaError(payload);
  if (message) throw new Error(message);
  const exchange = payload["Realtime Currency Exchange Rate"] as Record<string, unknown> | undefined;
  const rate = Number(exchange?.["5. Exchange Rate"]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("USD/IDR rate tidak tersedia dari Alpha Vantage.");
  usdIdrCache = { price: rate, source: "alpha_vantage", sourceTicker: "USD/IDR", cachedAt: Date.now() };
  return rate;
}

async function quoteAlphaVantagePrice(symbol: string, apiKey: string, rate: number, holding?: PriceRequestHolding) {
  const mappedSymbol = alphaSymbol(symbol, holding);
  if (!mappedSymbol) return null;
  const payload = await fetchAlphaVantage<Record<string, unknown>>({
    function: "GLOBAL_QUOTE",
    symbol: mappedSymbol,
    apikey: apiKey,
  });
  const message = alphaError(payload);
  if (message) throw new Error(message);
  const quote = payload["Global Quote"] as Record<string, unknown> | undefined;
  const usdPrice = Number(quote?.["05. price"]);
  return Number.isFinite(usdPrice) && usdPrice > 0 ? { price: usdPrice * rate, sourceTicker: mappedSymbol } : null;
}

async function fetchCoinGeckoUsdToIdrRate(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr", {
    cache: "no-store",
    headers,
  });
  if (!response.ok) throw new Error("CoinGecko USD/IDR request failed.");
  const payload = (await response.json()) as { tether?: { idr?: number } };
  const rate = payload.tether?.idr;
  return Number.isFinite(rate) && Number(rate) > 0 ? Number(rate) : null;
}

async function fetchCoinGeckoPrices(holdings: Array<PriceRequestHolding & { symbol: string }>, apiKey: string) {
  const ids = [...new Set(holdings.map((holding) => coinGeckoId(holding.symbol, holding)).filter(Boolean))];
  const prices = new Map<string, { price: number; sourceTicker: string; holding: PriceRequestHolding & { symbol: string } }>();
  if (ids.length === 0) return prices;

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=idr`,
    {
      cache: "no-store",
      headers: {
        "x-cg-demo-api-key": apiKey,
      },
    },
  );
  if (!response.ok) throw new Error("CoinGecko price request failed.");
  const payload = (await response.json()) as Record<string, { idr?: number }>;
  holdings.forEach((holding) => {
    const id = coinGeckoId(holding.symbol, holding);
    const price = payload[id]?.idr;
    if (Number.isFinite(price)) {
      prices.set(coinGeckoCacheKey(holding), {
        price: convertCoinGeckoPrice(Number(price), holding, id),
        sourceTicker: coinGeckoSourceTicker(id, holding),
        holding,
      });
    }
  });
  return prices;
}

async function fetchMetalsDevPrice(holding: PriceRequestHolding & { symbol: string }, apiKey: string) {
  const url = new URL(METALS_DEV_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("currency", "IDR");
  url.searchParams.set("unit", metalUnit(holding));

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Metals.dev price request failed.");

  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    metals?: Record<string, number>;
  };
  if (payload.status === "failure") throw new Error(payload.error_message ?? "Metals.dev price request failed.");

  const price = payload.metals?.[metalCode(holding)];
  return Number.isFinite(price) && Number(price) > 0
    ? { price: Number(price), sourceTicker: `${metalCode(holding)}/${metalUnit(holding)}` }
    : null;
}

async function fetchFinnhubPrice(symbol: string, apiKey: string, rate: number, holding?: PriceRequestHolding) {
  const mappedSymbol = finnhubSymbol(symbol, holding);
  if (!mappedSymbol) return null;

  const url = new URL(`${FINNHUB_BASE_URL}/quote`);
  url.searchParams.set("symbol", mappedSymbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Finnhub quote request failed.");

  const payload = (await response.json()) as { c?: number; error?: string };
  if (payload.error) throw new Error(payload.error);
  const price = Number(payload.c);
  return Number.isFinite(price) && price > 0 ? { price: price * rate, sourceTicker: mappedSymbol } : null;
}

async function fetchYahooFinancePrice(symbol: string, rate: number, holding?: PriceRequestHolding) {
  const mappedSymbol = yahooSymbol(symbol, holding);
  if (!mappedSymbol) return null;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(mappedSymbol)}`;
  const response = await fetch(url, { 
    cache: "no-store",
    headers: { 
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" 
    } 
  });
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  if (!result) return null;

  const price = result.meta?.regularMarketPrice;
  const currency = result.meta?.currency;

  if (!Number.isFinite(price)) return null;

  if (currency === "USD") {
    return { price: price * rate, sourceTicker: mappedSymbol };
  }
  
  if (currency === "IDR") {
    return { price: price, sourceTicker: mappedSymbol };
  }

  return { price: price * rate, sourceTicker: mappedSymbol };
}

type CoinMarketCapQuote = {
  IDR?: {
    price?: number;
  };
};

type CoinMarketCapItem = {
  id?: number | string;
  symbol?: string;
  is_active?: number;
  cmc_rank?: number | null;
  quote?: CoinMarketCapQuote;
};

type CoinMarketCapPayload = {
  data?: Record<string, CoinMarketCapItem | CoinMarketCapItem[]>;
};

type CoinMarketCapFetchResult = {
  type: "symbol" | "id";
  data: CoinMarketCapPayload;
};

async function fetchCoinMarketCapPrices(holdings: Array<PriceRequestHolding & { symbol: string }>, apiKey: string) {
  const prices = new Map<string, { price: number; sourceTicker: string; holding: PriceRequestHolding & { symbol: string } }>();
  if (holdings.length === 0) return prices;

  const ids: string[] = [];
  const symbols: string[] = [];

  holdings.forEach((holding) => {
    const ticker = String(holding.priceTicker ?? "").trim();
    if (ticker && /^\d+$/.test(ticker)) {
      ids.push(ticker);
    } else {
      const sym = ticker || holding.symbol;
      symbols.push(sym.trim().toUpperCase());
    }
  });

  const promises: Promise<CoinMarketCapFetchResult>[] = [];

  if (symbols.length > 0) {
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent([...new Set(symbols)].join(","))}&convert=IDR`;
    promises.push(
      fetch(url, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json",
        },
        cache: "no-store",
      }).then(async (res) => {
        if (!res.ok) throw new Error(`CoinMarketCap symbols request failed with status ${res.status}`);
        return { type: "symbol", data: await res.json() };
      })
    );
  }

  if (ids.length > 0) {
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${encodeURIComponent([...new Set(ids)].join(","))}&convert=IDR`;
    promises.push(
      fetch(url, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json",
        },
        cache: "no-store",
      }).then(async (res) => {
        if (!res.ok) throw new Error(`CoinMarketCap IDs request failed with status ${res.status}`);
        return { type: "id", data: await res.json() };
      })
    );
  }

  try {
    const results = await Promise.all(promises);
    results.forEach((res) => {
      if (!res.data || !res.data.data) return;
      const dataMap = res.data.data;

      holdings.forEach((holding) => {
        const ticker = String(holding.priceTicker ?? "").trim();
        const isId = ticker && /^\d+$/.test(ticker);
        const key = isId ? ticker : (ticker || holding.symbol).trim().toUpperCase();

        const itemOrArray = dataMap[key];
        let bestItem: CoinMarketCapItem | null = null;

        if (Array.isArray(itemOrArray)) {
          const activeItems = itemOrArray.filter((i) =>
            i && i.is_active === 1 && i.quote && i.quote["IDR"] && Number.isFinite(i.quote["IDR"].price)
          );
          if (activeItems.length > 0) {
            activeItems.sort((a, b) => {
              const rankA = a.cmc_rank !== null && a.cmc_rank !== undefined ? a.cmc_rank : Infinity;
              const rankB = b.cmc_rank !== null && b.cmc_rank !== undefined ? b.cmc_rank : Infinity;
              return rankA - rankB;
            });
            bestItem = activeItems[0];
          }
        } else if (itemOrArray && typeof itemOrArray === "object") {
          bestItem = itemOrArray;
        }

        if (bestItem && bestItem.quote && bestItem.quote["IDR"]) {
          const price = Number(bestItem.quote["IDR"].price);
          if (Number.isFinite(price)) {
            prices.set(priceCacheKeyForHolding(holding), {
              price: convertTokenizedGoldPrice(price, holding),
              sourceTicker: `${String(bestItem.id || bestItem.symbol)}${isTokenizedGoldHolding(holding) ? `/${coinGeckoUnit(holding)}` : ""}`,
              holding,
            });
          }
        }
      });
    });
  } catch (err) {
    console.error("CoinMarketCap fetch prices error:", err);
  }

  return prices;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      holdings?: unknown;
      symbols?: unknown;
      alphaVantageApiKey?: unknown;
      finnhubApiKey?: unknown;
      metalsDevApiKey?: unknown;
      coinGeckoApiKey?: unknown;
      coinMarketCapApiKey?: unknown;
    };
    const requestHoldings = Array.isArray(body.holdings) ? (body.holdings as PriceRequestHolding[]) : [];
    const symbolHoldings: PriceRequestHolding[] = Array.isArray(body.symbols)
      ? body.symbols.map((symbol) => ({ assetSymbol: String(symbol) }))
      : [];
    const holdings = uniquePriceRequestHoldings([...requestHoldings, ...symbolHoldings]
      .map((holding) => ({ ...holding, symbol: holdingSymbol(holding) }))
      .filter((holding) => holding.symbol));
    const symbols = [...new Set(holdings.map((holding) => holding.symbol))];
    const result: PriceResult = {
      prices: {},
      sources: {},
      sourceTickers: {},
      cachedAt: {},
      holdingPrices: {},
      holdingSources: {},
      holdingSourceTickers: {},
      holdingCachedAt: {},
    };
    const metalsHoldings = holdings.filter((holding) => String(holding.priceSource ?? "") === "metals_dev");
    const metalsSymbols = new Set(metalsHoldings.map((holding) => holding.symbol));

    const apiKey = String(body.alphaVantageApiKey ?? "").trim() || DEFAULT_ALPHA_VANTAGE_API_KEY;
    const coinGeckoApiKey = String(body.coinGeckoApiKey ?? "").trim() || DEFAULT_COINGECKO_API_KEY;
    const coinMarketCapApiKey = String(body.coinMarketCapApiKey ?? "").trim() || DEFAULT_COINMARKETCAP_API_KEY;
    const rate = await usdToIdrRate(apiKey, coinGeckoApiKey).catch(() => null);

    const missingHoldings = holdings.filter((holding) => {
      const symbol = holding.symbol;
      if (symbol === "IDR") {
        priceCache.set(cacheKey(symbol), { price: 1, source: "fiat", sourceTicker: "IDR", cachedAt: Date.now() });
        return false;
      }
      if ((symbol === "USDT" || symbol === "USD") && rate) {
        priceCache.set(cacheKey(symbol), { price: rate, source: "fiat", sourceTicker: "USD/IDR", cachedAt: Date.now() });
        return false;
      }
      const entry = priceCache.get(priceCacheKeyForHolding(holding));
      if (isFresh(entry) && isMatchingCacheEntry(entry, holding)) {
        result.prices[symbol] = entry!.price;
        result.sources[symbol] = entry!.source;
        result.sourceTickers[symbol] = entry!.sourceTicker;
        result.cachedAt[symbol] = new Date(entry!.cachedAt).toISOString();
        return false;
      }
      return true;
    });
    const missing = [...new Set(missingHoldings.map((holding) => holding.symbol))];

    if (missingHoldings.length > 0) {
      const metalsDevApiKey = String(body.metalsDevApiKey ?? "").trim() || DEFAULT_METALS_DEV_API_KEY;
      const metalsCandidates = missingHoldings.filter((holding) => String(holding.priceSource ?? "") === "metals_dev");
      for (const holding of metalsCandidates) {
        const result = await fetchMetalsDevPrice(holding, metalsDevApiKey).catch(() => null);
        if (result) {
          priceCache.set(metalsDevCacheKey(holding), { price: result.price, source: "metals_dev", sourceTicker: result.sourceTicker, cachedAt: Date.now() });
        }
      }

      // Fetch CMC candidates
      const cmcCandidates = missingHoldings.filter((holding) => String(holding.priceSource ?? "") === "coinmarketcap");
      if (cmcCandidates.length > 0) {
        const cmcPrices = await fetchCoinMarketCapPrices(cmcCandidates, coinMarketCapApiKey).catch(
          () => new Map<string, { price: number; sourceTicker: string; holding: PriceRequestHolding & { symbol: string } }>()
        );
        cmcPrices.forEach(({ price, sourceTicker }, key) => {
          const entry = { price, source: "coinmarketcap" as const, sourceTicker, cachedAt: Date.now() };
          priceCache.set(key, entry);
        });
      }

      // Fetch CoinGecko candidates (explicitly coingecko, or auto crypto)
      const coinCandidates = missingHoldings.filter(
        (holding) =>
          !metalsSymbols.has(holding.symbol) &&
          !shouldSkipCoinGecko(holding.symbol, holding) &&
          String(holding.priceSource ?? "") !== "coinmarketcap"
      );

      if (coinCandidates.length > 0) {
        let cgSuccess = false;
        try {
          const coinPrices = await fetchCoinGeckoPrices(coinCandidates, coinGeckoApiKey);
          coinPrices.forEach(({ price, sourceTicker }, key) => {
            const entry = { price, source: "coingecko" as const, sourceTicker, cachedAt: Date.now() };
            priceCache.set(key, entry);
          });
          cgSuccess = true;
        } catch (err) {
          console.warn("CoinGecko fetch failed (likely quota limit), falling back to CoinMarketCap:", err);
        }

        // Fallback to CoinMarketCap if CoinGecko failed
        if (!cgSuccess) {
          const fallbackPrices = await fetchCoinMarketCapPrices(coinCandidates, coinMarketCapApiKey).catch(
            () => new Map<string, { price: number; sourceTicker: string; holding: PriceRequestHolding & { symbol: string } }>()
          );
          fallbackPrices.forEach(({ price, sourceTicker, holding }, key) => {
            const entry = { price, source: "coinmarketcap" as const, sourceTicker, cachedAt: Date.now() };
            priceCache.set(key, entry);
            priceCache.set(coinGeckoCacheKey(holding), entry);
          });
        }
      }

      const yahooMissing = missing.filter(
        (symbol) => {
          if (metalsSymbols.has(symbol) || isFresh(priceCache.get(cacheKey(symbol)))) return false;
          const holding = holdings.find((item) => item.symbol === symbol);
          return Boolean(yahooSymbol(symbol, holding));
        },
      );
      if (yahooMissing.length > 0) {
        const rate = await usdToIdrRate(apiKey, coinGeckoApiKey).catch(() => null);
        if (rate) {
          for (const symbol of yahooMissing) {
            const holding = holdings.find((item) => item.symbol === symbol);
            const result = await fetchYahooFinancePrice(symbol, rate, holding).catch(() => null);
            if (result) {
              priceCache.set(cacheKey(symbol), { price: result.price, source: "yahoo_finance", sourceTicker: result.sourceTicker, cachedAt: Date.now() });
            }
          }
        }
      }

      const alphaMissing = missing.filter(
        (symbol) => {
          if (metalsSymbols.has(symbol) || isFresh(priceCache.get(cacheKey(symbol)))) return false;
          const holding = holdings.find((item) => item.symbol === symbol);
          return Boolean(alphaSymbol(symbol, holding));
        },
      );
      if (alphaMissing.length > 0) {
        const rate = await usdToIdrRate(apiKey, coinGeckoApiKey).catch(() => null);
        if (rate) {
          for (const [index, symbol] of alphaMissing.entries()) {
            if (index > 0) await wait(1200);
            const holding = holdings.find((item) => item.symbol === symbol);
            const result = await quoteAlphaVantagePrice(symbol, apiKey, rate, holding).catch(() => null);
            if (result) {
              priceCache.set(cacheKey(symbol), { price: result.price, source: "alpha_vantage", sourceTicker: result.sourceTicker, cachedAt: Date.now() });
            }
          }
        }
      }

      const finnhubApiKey = String(body.finnhubApiKey ?? "").trim() || DEFAULT_FINNHUB_API_KEY;
      const finnhubMissing = missing.filter(
        (symbol) => {
          if (metalsSymbols.has(symbol) || isFresh(priceCache.get(cacheKey(symbol)))) return false;
          const holding = holdings.find((item) => item.symbol === symbol);
          return Boolean(finnhubSymbol(symbol, holding));
        },
      );
      if (finnhubMissing.length > 0) {
        const rate = await usdToIdrRate(apiKey, coinGeckoApiKey).catch(() => null);
        if (rate) {
          for (const symbol of finnhubMissing) {
            const holding = holdings.find((item) => item.symbol === symbol);
            const result = await fetchFinnhubPrice(symbol, finnhubApiKey, rate, holding).catch(() => null);
            if (result) {
              priceCache.set(cacheKey(symbol), { price: result.price, source: "finnhub", sourceTicker: result.sourceTicker, cachedAt: Date.now() });
            }
          }
        }
      }
    }

    symbols.forEach((symbol) => {
      const metalsHolding = metalsHoldings.find((holding) => holding.symbol === symbol);
      const holding = holdings.find((item) => item.symbol === symbol);
      const entry = priceCache.get(metalsHolding ? metalsDevCacheKey(metalsHolding) : holding ? priceCacheKeyForHolding(holding) : cacheKey(symbol));
      if (!entry) return;
      result.prices[symbol] = entry.price;
      result.sources[symbol] = entry.source;
      result.sourceTickers[symbol] = entry.sourceTicker;
      result.cachedAt[symbol] = new Date(entry.cachedAt).toISOString();
    });

    holdings.forEach((holding) => {
      const entry = priceCache.get(priceCacheKeyForHolding(holding));
      if (!entry || !isMatchingCacheEntry(entry, holding)) return;
      const id = holdingId(holding);
      result.holdingPrices[id] = entry.price;
      result.holdingSources[id] = entry.source;
      result.holdingSourceTickers[id] = entry.sourceTicker;
      result.holdingCachedAt[id] = new Date(entry.cachedAt).toISOString();
    });

    // Attach USD/IDR rate for client-side conversions
    if (rate) {
      result.usdIdrRate = rate;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Live price request failed." },
      { status: 502 },
    );
  }
}
