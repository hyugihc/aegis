import { DEFAULT_ALPHA_VANTAGE_API_KEY } from "@/lib/portfolio";

const BASE_URL = "https://www.alphavantage.co/query";

const alphaVantageSymbolMap: Record<string, string> = {
  vwra: "VWRA.L",
  "vwra.l": "VWRA.L",
};

type AlphaQuotePayload = {
  "Global Quote"?: {
    "05. price"?: string;
  };
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

type AlphaExchangePayload = {
  "Realtime Currency Exchange Rate"?: {
    "5. Exchange Rate"?: string;
  };
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

function alphaError(payload: AlphaQuotePayload | AlphaExchangePayload) {
  return payload["Error Message"] ?? payload.Note ?? payload.Information ?? "";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAlphaVantage<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Alpha Vantage request failed.");
  return (await response.json()) as T;
}

async function usdToIdrRate(apiKey: string) {
  const fallbackRate = await fetchCoinGeckoUsdToIdrRate().catch(() => null);
  if (fallbackRate) return fallbackRate;

  const payload = await fetchAlphaVantage<AlphaExchangePayload>({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: "USD",
    to_currency: "IDR",
    apikey: apiKey,
  });
  const message = alphaError(payload);
  if (message) throw new Error(message);
  const rate = Number(payload["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("USD/IDR rate tidak tersedia dari Alpha Vantage.");
  return rate;
}

async function fetchCoinGeckoUsdToIdrRate() {
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("CoinGecko USD/IDR request failed.");
  const payload = (await response.json()) as { tether?: { idr?: number } };
  const rate = payload.tether?.idr;
  return Number.isFinite(rate) && Number(rate) > 0 ? Number(rate) : null;
}

async function quotePrice(symbol: string, apiKey: string) {
  const mappedSymbol = alphaVantageSymbolMap[symbol.toLowerCase()];
  if (!mappedSymbol) return null;

  const payload = await fetchAlphaVantage<AlphaQuotePayload>({
    function: "GLOBAL_QUOTE",
    symbol: mappedSymbol,
    apikey: apiKey,
  });
  const message = alphaError(payload);
  if (message) throw new Error(message);
  const price = Number(payload["Global Quote"]?.["05. price"]);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { symbols?: unknown; apiKey?: unknown };
    const symbols = Array.isArray(body.symbols)
      ? [...new Set(body.symbols.map((symbol) => String(symbol).trim()).filter(Boolean))]
      : [];
    const apiKey = String(body.apiKey ?? "").trim() || DEFAULT_ALPHA_VANTAGE_API_KEY;

    if (symbols.length === 0) return Response.json({ prices: {} });

    const rate = await usdToIdrRate(apiKey);
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      await wait(1200);
      const price = await quotePrice(symbol, apiKey);
      if (price) prices[symbol] = price * rate;
    }

    return Response.json({ prices });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Alpha Vantage price request failed." },
      { status: 502 },
    );
  }
}
