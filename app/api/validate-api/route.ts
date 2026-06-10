import { NextRequest, NextResponse } from "next/server";

const ALPHA_BASE_URL = "https://www.alphavantage.co/query";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const METALS_DEV_BASE_URL = "https://api.metals.dev/v1/latest";

export async function POST(request: NextRequest) {
  try {
    const { service, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 });
    }

    if (service === "alphaVantage") {
      const url = new URL(ALPHA_BASE_URL);
      url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
      url.searchParams.set("from_currency", "USD");
      url.searchParams.set("to_currency", "IDR");
      url.searchParams.set("apikey", apiKey);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data["Error Message"]) {
        return NextResponse.json({ success: false, error: data["Error Message"] });
      }
      if (data["Note"]) {
        return NextResponse.json({ success: false, error: data["Note"] });
      }
      if (data["Information"]) {
        return NextResponse.json({ success: false, error: data["Information"] });
      }
      if (!data["Realtime Currency Exchange Rate"]) {
        return NextResponse.json({ success: false, error: "Invalid response from Alpha Vantage" });
      }

      return NextResponse.json({ success: true, message: "Alpha Vantage API key is valid" });
    }

    if (service === "finnhub") {
      const url = new URL(`${FINNHUB_BASE_URL}/quote`);
      url.searchParams.set("symbol", "AAPL");
      url.searchParams.set("token", apiKey);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ success: false, error: data.error });
      }
      
      // Finnhub sometimes returns 0 or null prices if key is invalid but doesn't throw error
      if (data.c === 0 && data.pc === 0) {
          return NextResponse.json({ success: false, error: "Invalid API key or no data available" });
      }

      return NextResponse.json({ success: true, message: "Finnhub API key is valid" });
    }

    if (service === "metalsDev") {
      const url = new URL(METALS_DEV_BASE_URL);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("currency", "IDR");
      url.searchParams.set("unit", "toz");

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.status === "failure") {
        return NextResponse.json({ success: false, error: data.error_message || "Invalid API key" });
      }

      if (!data.metals) {
        return NextResponse.json({ success: false, error: "Invalid response from Metals.dev" });
      }

      return NextResponse.json({ success: true, message: "Metals.dev API key is valid" });
    }

    if (service === "coingecko") {
      const url = new URL("https://api.coingecko.com/api/v3/ping");
      const res = await fetch(url, {
        headers: { "x-cg-demo-api-key": apiKey },
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Invalid API key or CoinGecko error (Status ${res.status})` });
      }
      return NextResponse.json({ success: true, message: "CoinGecko API key is valid" });
    }

    if (service === "coinMarketCap") {
      const url = new URL("https://pro-api.coinmarketcap.com/v1/key/info");
      const res = await fetch(url, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json"
        },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.status !== 200 || data.status?.error_code !== 0) {
        return NextResponse.json({ success: false, error: data.status?.error_message || "Invalid API key" });
      }
      return NextResponse.json({ success: true, message: "CoinMarketCap API key is valid" });
    }

    return NextResponse.json({ success: false, error: "Unknown service" }, { status: 400 });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json({ success: false, error: "Failed to validate API key" }, { status: 500 });
  }
}
