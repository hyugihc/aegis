import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fetchIbkrGateway, IBKR_GATEWAY_BASE_URL, ibkrSessionCookieName } from "@/lib/ibkr-gateway";

type Platform = "binance" | "okx" | "mexc" | "ibkr" | "wallet";

type SyncedAsset = {
  assetType: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  value: number;
};

const BINANCE_BASE_URL = "https://api.binance.com";
const OKX_BASE_URL = "https://www.okx.com";
const MEXC_BASE_URL = "https://api.mexc.com";
const ETHERSCAN_V2_BASE_URL = "https://api.etherscan.io/v2/api";

const chainIds: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
};

const nativeSymbols: Record<string, string> = {
  ethereum: "ETH",
  bsc: "BNB",
  polygon: "MATIC",
  arbitrum: "ETH",
  optimism: "ETH",
  avalanche: "AVAX",
};

const knownTokenContracts: Record<string, Record<string, { contract: string; decimals: number }>> = {
  arbitrum: {
    USDC: { contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    "USDC.e": { contract: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", decimals: 6 },
    USDT: { contract: "0xfd086bc7cd5c5d445926927ff24d58a4003d7e4", decimals: 6 },
    ARB: { contract: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18 },
    FLUID: { contract: "0xbe72e441bf55620fc6506f510803281d98423e7a", decimals: 18 },
  },
  ethereum: {
    USDC: { contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    USDT: { contract: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
  },
};

const coinGeckoIds: Record<string, string> = {
  ARB: "arbitrum",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  ETH: "ethereum",
  FLUID: "fluid",
  MATIC: "matic-network",
  USDC: "usd-coin",
  "USDC.e": "usd-coin",
  USDT: "tether",
  USD: "tether",
};

function signSha256(query: string, secret: string) {
  return createHmac("sha256", secret).update(query).digest("hex");
}

async function usdIdrRate() {
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr", {
    cache: "no-store",
  });
  if (!response.ok) return 16_000;
  const payload = (await response.json()) as { tether?: { idr?: number } };
  return Number(payload.tether?.idr) > 0 ? Number(payload.tether?.idr) : 16_000;
}

async function fetchBinancePrices() {
  const response = await fetch(`${BINANCE_BASE_URL}/api/v3/ticker/price`, { cache: "no-store" });
  if (!response.ok) return new Map<string, number>();
  const payload = (await response.json()) as Array<{ symbol?: string; price?: string }>;
  const prices = new Map<string, number>([["USDT", 1], ["USDC", 1], ["FDUSD", 1]]);
  payload.forEach((item) => {
    if (!item.symbol?.endsWith("USDT")) return;
    const base = item.symbol.replace(/USDT$/, "");
    const price = Number(item.price);
    if (Number.isFinite(price) && price > 0) prices.set(base, price);
  });
  return prices;
}

function binancePriceSymbol(asset: string) {
  const symbol = asset.toUpperCase();
  return symbol.startsWith("LD") && symbol.length > 2 ? symbol.slice(2) : symbol;
}

async function fetchOkxPrices() {
  const response = await fetch(`${OKX_BASE_URL}/api/v5/market/tickers?instType=SPOT`, { cache: "no-store" });
  if (!response.ok) return new Map<string, number>();
  const payload = (await response.json()) as { code: string; data: Array<{ instId: string; last: string }> };
  if (payload.code !== "0") return new Map<string, number>();
  const prices = new Map<string, number>([["USDT", 1], ["USDC", 1], ["USD", 1]]);
  payload.data.forEach((item) => {
    if (!item.instId.endsWith("-USDT")) return;
    const base = item.instId.split("-")[0];
    const price = Number(item.last);
    if (Number.isFinite(price) && price > 0) prices.set(base, price);
  });
  return prices;
}

async function fetchMexcPrices() {
  const response = await fetch(`${MEXC_BASE_URL}/api/v3/ticker/price`, { cache: "no-store" });
  if (!response.ok) return new Map<string, number>();
  const payload = (await response.json()) as Array<{ symbol?: string; price?: string }>;
  const prices = new Map<string, number>([["USDT", 1], ["USDC", 1], ["USD", 1]]);
  payload.forEach((item) => {
    if (!item.symbol?.endsWith("USDT")) return;
    const base = item.symbol.replace(/USDT$/, "");
    const price = Number(item.price);
    if (Number.isFinite(price) && price > 0) prices.set(base, price);
  });
  return prices;
}

async function fetchIdrPrices(symbols: string[]) {
  const ids = [...new Set(symbols.map((symbol) => coinGeckoIds[symbol.toUpperCase()] ?? coinGeckoIds[symbol]).filter(Boolean))];
  if (ids.length === 0) return new Map<string, number>();

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=idr`, {
    cache: "no-store",
  });
  if (!response.ok) return new Map<string, number>();

  const payload = (await response.json()) as Record<string, { idr?: number }>;
  const prices = new Map<string, number>();
  symbols.forEach((symbol) => {
    const id = coinGeckoIds[symbol.toUpperCase()] ?? coinGeckoIds[symbol];
    const price = id ? Number(payload[id]?.idr) : 0;
    if (Number.isFinite(price) && price > 0) prices.set(symbol.toUpperCase(), price);
  });
  return prices;
}

async function callExplorer(params: Record<string, string>, network: string, apiKey: string) {
  const query = new URLSearchParams({
    ...params,
    chainid: String(chainIds[network] ?? chainIds.ethereum),
  });
  if (apiKey) query.set("apikey", apiKey);
  const response = await fetch(`${ETHERSCAN_V2_BASE_URL}?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Wallet explorer error ${response.status}.`);
  return (await response.json()) as { status?: string; message?: string; result?: string };
}

async function syncWallet(address: string, network: string, apiKey: string): Promise<SyncedAsset[]> {
  const normalizedAddress = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalizedAddress)) {
    throw new Error("Format wallet address tidak valid.");
  }

  const assets: Array<Omit<SyncedAsset, "currentPrice" | "value">> = [];
  const nativeSymbol = nativeSymbols[network] ?? "ETH";
  const nativeBalance = await callExplorer(
    { module: "account", action: "balance", address: normalizedAddress, tag: "latest" },
    network,
    apiKey,
  );
  if (nativeBalance.status === "1") {
    const quantity = Number(nativeBalance.result ?? 0) / 1e18;
    if (quantity > 0) assets.push({ assetType: "wallet", symbol: nativeSymbol, name: nativeSymbol, quantity });
  }

  const tokens = knownTokenContracts[network] ?? {};
  await Promise.all(
    Object.entries(tokens).map(async ([symbol, token]) => {
      const payload = await callExplorer(
        {
          module: "account",
          action: "tokenbalance",
          contractaddress: token.contract.toLowerCase(),
          address: normalizedAddress,
          tag: "latest",
        },
        network,
        apiKey,
      ).catch(() => null);
      if (payload?.status !== "1") return;
      const quantity = Number(payload.result ?? 0) / 10 ** token.decimals;
      if (quantity > 0) assets.push({ assetType: "token", symbol, name: symbol, quantity });
    }),
  );

  const prices = await fetchIdrPrices(assets.map((asset) => asset.symbol));
  return assets.map((asset) => {
    const currentPrice = prices.get(asset.symbol.toUpperCase()) ?? 0;
    return { ...asset, currentPrice, value: asset.quantity * currentPrice };
  });
}

async function syncBinance(apiKey: string, apiSecret: string): Promise<SyncedAsset[]> {
  const query = new URLSearchParams({
    timestamp: String(Date.now() - 500),
    recvWindow: "10000",
  });
  query.set("signature", signSha256(query.toString(), apiSecret));
  const response = await fetch(`${BINANCE_BASE_URL}/api/v3/account?${query.toString()}`, {
    cache: "no-store",
    headers: { "X-MBX-APIKEY": apiKey },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.msg ?? "Binance sync failed.");

  const [prices, rate] = await Promise.all([fetchBinancePrices(), usdIdrRate()]);
  return ((payload.balances ?? []) as Array<{ asset: string; free: string; locked: string }>)
    .map((balance) => {
      const symbol = balance.asset.toUpperCase();
      const priceSymbol = binancePriceSymbol(symbol);
      return {
        assetType: symbol.startsWith("LD") ? "simple_earn" : "spot",
        symbol,
        name: symbol.startsWith("LD") ? `${priceSymbol} Simple Earn` : symbol,
        quantity: Number(balance.free) + Number(balance.locked),
        currentPrice: (prices.get(symbol) ?? prices.get(priceSymbol) ?? 0) * rate,
        value: 0,
      };
    })
    .filter((asset) => asset.quantity > 0)
    .map((asset) => ({ ...asset, value: asset.quantity * asset.currentPrice }));
}

function okxSignature(timestamp: string, method: string, requestPath: string, body: string, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}${method}${requestPath}${body}`).digest("base64");
}

async function fetchOkxPrivate(path: string, apiKey: string, apiSecret: string, passphrase: string) {
  const timestamp = new Date().toISOString();
  const response = await fetch(`${OKX_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": okxSignature(timestamp, "GET", path, "", apiSecret),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
  });

  if (!response.ok) {
    let msg = `OKX error ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        const errorData = JSON.parse(text);
        msg = errorData.msg || msg;
      }
    } catch {
      // Keep default msg
    }
    throw new Error(msg);
  }

  const text = await response.text();
  if (!text) return { code: "0", data: [] };
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response from OKX.");
  }
}

async function syncOkx(apiKey: string, apiSecret: string, passphrase: string): Promise<SyncedAsset[]> {
  // Use sequential or slightly staggered fetches to avoid rate limit/timestamp issues
  const [fundingPayload, tradingPayload, savingsPayload, stakingPayload, prices, rate] = await Promise.all([
    fetchOkxPrivate("/api/v5/asset/balances", apiKey, apiSecret, passphrase),
    fetchOkxPrivate("/api/v5/account/balance", apiKey, apiSecret, passphrase),
    fetchOkxPrivate("/api/v5/finance/savings/balance", apiKey, apiSecret, passphrase).catch(() => ({ code: "0", data: [] })),
    fetchOkxPrivate("/api/v5/finance/staking-defi/balance", apiKey, apiSecret, passphrase).catch(() => ({ code: "0", data: [] })),
    fetchOkxPrices(),
    usdIdrRate(),
  ]);

  if (fundingPayload.code !== "0") throw new Error(fundingPayload.msg || "OKX funding sync failed.");
  if (tradingPayload.code !== "0") throw new Error(tradingPayload.msg || "OKX trading sync failed.");

  const assetsMap = new Map<string, number>();

  // Funding account balances
  (fundingPayload.data ?? []).forEach((item: { ccy: string; bal: string }) => {
    const qty = Number(item.bal);
    if (qty > 0) {
      const symbol = item.ccy.toUpperCase();
      assetsMap.set(symbol, (assetsMap.get(symbol) ?? 0) + qty);
    }
  });

  // Trading account balances
  (tradingPayload.data?.[0]?.details ?? []).forEach((item: { ccy: string; eq: string }) => {
    const qty = Number(item.eq);
    if (qty > 0) {
      const symbol = item.ccy.toUpperCase();
      assetsMap.set(symbol, (assetsMap.get(symbol) ?? 0) + qty);
    }
  });

  // Savings (Simple Earn) balances
  if (savingsPayload.code === "0") {
    (savingsPayload.data ?? []).forEach((item: { ccy: string; amt: string }) => {
      const qty = Number(item.amt);
      if (qty > 0) {
        const symbol = item.ccy.toUpperCase();
        assetsMap.set(symbol, (assetsMap.get(symbol) ?? 0) + qty);
      }
    });
  }

  // Staking & DeFi balances
  if (stakingPayload.code === "0") {
    (stakingPayload.data ?? []).forEach((item: { ccy: string; amt: string }) => {
      const qty = Number(item.amt);
      if (qty > 0) {
        const symbol = item.ccy.toUpperCase();
        assetsMap.set(symbol, (assetsMap.get(symbol) ?? 0) + qty);
      }
    });
  }

  return Array.from(assetsMap.entries())
    .map(([symbol, quantity]) => {
      const price = (prices.get(symbol) ?? 0) * rate;
      return {
        assetType: "spot",
        symbol,
        name: symbol,
        quantity,
        currentPrice: price,
        value: quantity * price,
      };
    })
    .filter((asset) => asset.quantity > 0);
}

async function syncMexc(apiKey: string, apiSecret: string): Promise<SyncedAsset[]> {
  const query = new URLSearchParams({
    timestamp: String(Date.now()),
  });
  query.set("signature", signSha256(query.toString(), apiSecret));
  const response = await fetch(`${MEXC_BASE_URL}/api/v3/account?${query.toString()}`, {
    cache: "no-store",
    headers: { "X-MEXC-APIKEY": apiKey },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.msg ?? "MEXC sync failed.");

  const [prices, rate] = await Promise.all([fetchMexcPrices(), usdIdrRate()]);
  return ((payload.balances ?? []) as Array<{ asset: string; free: string; locked: string }>)
    .map((balance) => {
      const quantity = Number(balance.free) + Number(balance.locked);
      const symbol = balance.asset.toUpperCase();
      const price = (prices.get(symbol) ?? 0) * rate;
      return {
        assetType: "spot",
        symbol,
        name: symbol,
        quantity,
        currentPrice: price,
        value: quantity * price,
      };
    })
    .filter((asset) => asset.quantity > 0);
}

async function syncIbkr(accountId: string, baseUrl: string, sessionToken: string): Promise<SyncedAsset[]> {
  if (!sessionToken.trim()) throw new Error("Session IBKR belum tersedia. Klik Ambil Session setelah login di portal.");

  const rate = await usdIdrRate();
  const assets: SyncedAsset[] = [];
  const accountsResult = await fetchIbkrGateway<Array<{ accountId?: string; id?: string; account?: string }>>(
    baseUrl || IBKR_GATEWAY_BASE_URL,
    "/portfolio/accounts",
    sessionToken,
  );
  const accounts = Array.isArray(accountsResult.payload) ? accountsResult.payload : [];
  const selectedAccountId =
    accountId.trim() ||
    String(accounts[0]?.accountId ?? accounts[0]?.id ?? accounts[0]?.account ?? "").trim();

  if (!selectedAccountId) {
    throw new Error("Tidak bisa menemukan IBKR Account ID dari Gateway.");
  }

  let page = 0;

  while (page < 20) {
    const positionsResult = await fetchIbkrGateway<Array<{
      position?: number;
      assetClass?: string;
      ticker?: string;
      contractDesc?: string;
      mktPrice?: number;
      mktValue?: number;
    }>>(baseUrl || IBKR_GATEWAY_BASE_URL, `/portfolio/${selectedAccountId}/positions/${page}`, sessionToken);
    const positions = positionsResult.payload;
    if (!Array.isArray(positions) || positions.length === 0) break;

    positions.forEach((position) => {
      const quantity = Number(position.position ?? 0);
      if (quantity === 0) return;
      const symbol = String(position.ticker ?? position.contractDesc ?? "UNKNOWN").toUpperCase();
      const currentPrice = Number(position.mktPrice ?? 0) * rate;
      const value = Number(position.mktValue ?? 0) ? Number(position.mktValue) * rate : quantity * currentPrice;
      assets.push({
        assetType: String(position.assetClass ?? "stock").toLowerCase(),
        symbol,
        name: String(position.contractDesc ?? symbol),
        quantity,
        currentPrice,
        value,
      });
    });

    if (positions.length < 100) break;
    page += 1;
  }

  const ledgerResult = await fetchIbkrGateway<Record<string, { cashbalance?: number }>>(
    baseUrl || IBKR_GATEWAY_BASE_URL,
    `/portfolio/${selectedAccountId}/ledger`,
    sessionToken,
  ).catch(() => ({ payload: {} as Record<string, { cashbalance?: number }> }));
  const ledger = ledgerResult.payload;
  Object.entries(ledger).forEach(([currency, balance]) => {
    if (currency.toUpperCase() === "BASE") return;
    const quantity = Number(balance?.cashbalance ?? 0);
    if (quantity <= 0) return;
    const symbol = currency.toUpperCase();
    const currentPrice = symbol === "IDR" ? 1 : rate;
    assets.push({
      assetType: "cash",
      symbol,
      name: `${symbol} Cash`,
      quantity,
      currentPrice,
      value: quantity * currentPrice,
    });
  });

  return assets;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      platform?: Platform;
      apiKey?: string;
      apiSecret?: string;
      passphrase?: string;
      publicAddress?: string;
      network?: string;
      baseUrl?: string;
      sessionToken?: string;
      connectionId?: string;
    };
    const platform = body.platform;
    const apiKey = String(body.apiKey ?? "").trim();
    const apiSecret = String(body.apiSecret ?? "").trim();
    const passphrase = String(body.passphrase ?? "").trim();
    const connectionId = String(body.connectionId ?? "").trim();

    if (platform !== "binance" && platform !== "okx" && platform !== "mexc" && platform !== "ibkr" && platform !== "wallet") {
      return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
    }
    if (platform !== "wallet" && platform !== "ibkr" && (!apiKey || !apiSecret || (platform === "okx" && !passphrase))) {
      return NextResponse.json({ error: "API credentials are required for manual sync." }, { status: 400 });
    }

    const assets =
      platform === "binance"
        ? await syncBinance(apiKey, apiSecret)
        : platform === "okx"
          ? await syncOkx(apiKey, apiSecret, passphrase)
          : platform === "mexc"
            ? await syncMexc(apiKey, apiSecret)
            : platform === "wallet"
              ? await syncWallet(String(body.publicAddress ?? ""), String(body.network ?? "ethereum"), apiKey)
              : await syncIbkr(
                  String(body.publicAddress ?? ""),
                  String(body.baseUrl ?? IBKR_GATEWAY_BASE_URL),
                  String(body.sessionToken ?? "") || (connectionId ? request.cookies.get(ibkrSessionCookieName(connectionId))?.value ?? "" : ""),
                );

    return NextResponse.json({ assets, syncedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Platform sync failed." },
      { status: 502 },
    );
  }
}
