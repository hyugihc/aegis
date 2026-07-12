import type { Holding, MasterKey, PortfolioData } from "@/lib/portfolio";

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function statDelta(current: number, previous?: number) {
  if (!previous) return null;
  const difference = current - previous;
  return {
    difference,
    percent: previous > 0 ? (difference / previous) * 100 : null,
  };
}

export function parseInputNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const sign = raw.startsWith("-") ? "-" : "";
  const unsigned = sign ? raw.slice(1) : raw;
  let normalized = unsigned;
  if (unsigned.includes(",") && unsigned.includes(".")) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else if (unsigned.includes(",")) {
    normalized = unsigned.replace(",", ".");
  } else {
    const dotCount = (unsigned.match(/\./g) ?? []).length;
    if (dotCount > 1) normalized = unsigned.replace(/\./g, "");
    if (dotCount === 1) {
      const [left, right] = unsigned.split(".");
      if (/^\d+$/.test(left + right) && right.length === 3) normalized = left + right;
    }
  }
  const parsed = Number(`${sign}${normalized}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDecimal(value: number, maximumFractionDigits = 8) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(Number.isFinite(value) ? value : 0);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function buildSnapshotId(date: string) {
  return `snapshot-${date}-${crypto.randomUUID()}`;
}

export type PriceUpdateResult = {
  prices: Map<string, number>;
  details: Map<string, PriceUpdateDetail>;
  coinGeckoCount: number;
  coinMarketCapCount: number;
  alphaVantageCount: number;
  finnhubCount: number;
  metalsDevCount: number;
};

export type PriceUpdateDetail = {
  source?: "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance";
  sourceTicker?: string;
};

export type LivePricePayload = {
  prices?: Record<string, number>;
  sources?: Record<string, "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance">;
  sourceTickers?: Record<string, string>;
  cachedAt?: Record<string, string>;
  holdingPrices?: Record<string, number>;
  holdingSources?: Record<string, "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance">;
  holdingSourceTickers?: Record<string, string>;
  holdingCachedAt?: Record<string, string>;
  usdIdrRate?: number;
};

export type HistoricalPricePayload = {
  prices?: Record<string, number>;
  sources?: Record<string, "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance">;
  sourceTickers?: Record<string, string>;
  pricedAt?: Record<string, string>;
  holdingPrices?: Record<string, number>;
  holdingSources?: Record<string, "fiat" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance">;
  holdingSourceTickers?: Record<string, string>;
  holdingPricedAt?: Record<string, string>;
};

export function priceConfigKey(holding: Holding & { priceSource?: string; priceTicker?: string; priceUnit?: string }) {
  return [
    holding.id,
    holding.assetSymbol || holding.asset,
    holding.priceSource ?? "",
    holding.priceTicker ?? "",
    holding.priceUnit ?? "",
  ].map((value) => String(value).trim()).join(":");
}

export function livePriceForHolding(payload: LivePricePayload, holding: Holding) {
  const symbol = (holding.assetSymbol || holding.asset).trim().toUpperCase();
  return payload.holdingPrices?.[holding.id] ?? payload.prices?.[symbol];
}

export function historicalPriceForHolding(payload: HistoricalPricePayload, holding: Holding) {
  const symbol = (holding.assetSymbol || holding.asset).trim().toUpperCase();
  return payload.holdingPrices?.[holding.id] ?? payload.prices?.[symbol];
}

export async function fetchLatestPrices(data: PortfolioData, holdings: Holding[], alphaVantageApiKey: string): Promise<PriceUpdateResult> {
  const response = await fetch("/api/prices/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      holdings: holdings.map((holding) => holdingWithPriceConfig(data, holding)),
      alphaVantageApiKey,
      finnhubApiKey: data.settings.priceServices.finnhubApiKey,
      metalsDevApiKey: data.settings.priceServices.metalsDevApiKey,
      coinGeckoApiKey: data.settings.priceServices.coinGeckoApiKey,
      coinMarketCapApiKey: data.settings.priceServices.coinMarketCapApiKey,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Live price request failed.");
  }

  const payload = (await response.json()) as LivePricePayload;
  const prices = new Map<string, number>();
  const details = new Map<string, PriceUpdateDetail>();
  let coinGeckoCount = 0;
  let coinMarketCapCount = 0;
  let alphaVantageCount = 0;
  let finnhubCount = 0;
  let metalsDevCount = 0;

  holdings.forEach((holding) => {
    const symbol = (holding.assetSymbol || holding.asset).trim().toUpperCase();
    const price = payload.holdingPrices?.[holding.id] ?? payload.prices?.[symbol];
    if (!Number.isFinite(price)) return;
    prices.set(holding.id, Number(price));
    details.set(holding.id, {
      source: payload.holdingSources?.[holding.id] ?? payload.sources?.[symbol],
      sourceTicker: payload.holdingSourceTickers?.[holding.id] ?? payload.sourceTickers?.[symbol] ?? symbol,
    });
    const source = payload.holdingSources?.[holding.id] ?? payload.sources?.[symbol];
    if (source === "coingecko") coinGeckoCount += 1;
    if (source === "coinmarketcap") coinMarketCapCount += 1;
    if (source === "alpha_vantage") alphaVantageCount += 1;
    if (source === "finnhub") finnhubCount += 1;
    if (source === "metals_dev") metalsDevCount += 1;
  });

  return { prices, details, coinGeckoCount, coinMarketCapCount, alphaVantageCount, finnhubCount, metalsDevCount };
}

export async function fetchLiveSymbolPrices(
  symbols: string[],
  apiKeys: { alphaVantageApiKey: string; finnhubApiKey?: string; metalsDevApiKey?: string; coinGeckoApiKey?: string; coinMarketCapApiKey?: string },
  holdings: Array<Holding & { priceSource?: string; priceTicker?: string; priceUnit?: string }> = [],
) {
  const response = await fetch("/api/prices/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: holdings.length > 0 ? [] : symbols, holdings, ...apiKeys }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Live price request failed.");
  }
  return (await response.json()) as LivePricePayload;
}

export async function fetchHistoricalPrices(data: PortfolioData, date: string, holdings: Holding[]) {
  const response = await fetch("/api/prices/historical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date,
      holdings: holdings.map((holding) => holdingWithPriceConfig(data, holding)),
      alphaVantageApiKey: data.settings.priceServices.alphaVantageApiKey,
      finnhubApiKey: data.settings.priceServices.finnhubApiKey,
      metalsDevApiKey: data.settings.priceServices.metalsDevApiKey,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Historical price request failed.");
  }
  return (await response.json()) as HistoricalPricePayload;
}

export function upsertMasterValue(data: PortfolioData, key: MasterKey, name: string, extra: Record<string, string> = {}) {
  const cleanName = name.trim();
  if (!cleanName) return data.masters;
  const exists = data.masters[key].some((item) => item.name.toLowerCase() === cleanName.toLowerCase());
  if (exists) return data.masters;
  return {
    ...data.masters,
    [key]: [{ id: crypto.randomUUID(), name: cleanName, ...extra }, ...data.masters[key]],
  };
}

export function daysSince(date: string) {
  if (!date) return 999;
  const today = new Date(todayIso());
  const snapshotDate = new Date(`${date}T00:00:00`);
  return Math.floor((today.getTime() - snapshotDate.getTime()) / 86_400_000);
}

export function displaySource(source?: string) {
  if (source === "alpha_vantage") return "Alpha Vantage";
  if (source === "finnhub") return "Finnhub";
  if (source === "coingecko") return "CoinGecko";
  if (source === "coinmarketcap") return "CoinMarketCap";
  if (source === "metals_dev") return "Metals.dev";
  if (source === "yahoo_finance") return "Yahoo Finance";
  if (source === "fiat") return "Fiat";
  return "Pending";
}

function compactToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function shouldShowSymbol(name: string, symbol?: string) {
  if (!symbol) return false;
  const cleanName = compactToken(name);
  const cleanSymbol = compactToken(symbol);
  return Boolean(cleanSymbol && cleanSymbol !== cleanName && !cleanName.includes(cleanSymbol) && !cleanSymbol.includes(cleanName));
}

export function holdingWithPriceConfig(data: PortfolioData, holding: Holding) {
  const holdingAssetName = holding.asset.trim().toLowerCase();
  const holdingSymbol = holding.assetSymbol.trim().toLowerCase();
  const assetByName = data.masters.assets.find((item) => item.name.trim().toLowerCase() === holdingAssetName);
  const symbolMatches = holdingSymbol
    ? data.masters.assets.filter((item) => item.symbol?.trim().toLowerCase() === holdingSymbol)
    : [];
  const asset = assetByName ?? (symbolMatches.length === 1 ? symbolMatches[0] : undefined);
  return {
    ...holding,
    priceSource: asset?.priceSource ?? "auto",
    priceTicker: asset?.priceTicker ?? "",
    priceUnit: asset?.priceUnit ?? "toz",
  };
}

