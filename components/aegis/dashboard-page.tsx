"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, ReferenceDot } from "recharts";
import { Bell, Plus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { colors } from "@/components/aegis/constants";
import {
  daysSince,
  displaySource,
  fetchLiveSymbolPrices,
  holdingWithPriceConfig,
  historicalPriceForHolding,
  livePriceForHolding,
  priceConfigKey,
  shouldShowSymbol,
  statDelta,
  type LivePricePayload,
  fetchHistoricalPrices,
} from "@/components/aegis/client-utils";
import { HistoryChart } from "@/components/aegis/history-chart";
import { usePortfolioContext } from "@/context/portfolio-context";
import { useMounted } from "@/lib/use-mounted";
import { breakdown, formatCurrency, latestSnapshot, lineRows, previousSnapshot, resolveCurrentHoldingLine, type Holding, type HoldingSnapshot, type PortfolioData } from "@/lib/portfolio";

type DashboardLineRow = HoldingSnapshot & { holding: Holding; live?: boolean };

function SnapshotReminderBanner({ latestDate, onCreateSnapshot }: { latestDate?: string; onCreateSnapshot: () => void }) {
  const gapDays = daysSince(latestDate ?? "");
  if (gapDays <= 7) return null;
  return (
    <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-4 py-3 shadow-[0_0_32px_-20px_rgba(245,158,11,0.95)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 shrink-0 text-amber-200" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-100">Belum ada snapshot minggu ini.</p>
            <p className="mt-1 text-xs text-amber-100/70">
              Snapshot terakhir: {latestDate ?? "belum ada"}{latestDate ? ` (${gapDays} hari lalu)` : ""}.
            </p>
          </div>
        </div>
        <button className="primary-button" onClick={onCreateSnapshot}>
          <Plus size={16} /> Buat sekarang
        </button>
      </div>
    </div>
  );
}

const CACHE_KEY = "aegis_dashboard_prices_cache_v2";
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type ClientPriceCache = {
  payload: LivePricePayload;
  timestamp: number;
  symbols: string[];
};

export function DashboardPage({ data, onCreateSnapshot }: { data: PortfolioData; onCreateSnapshot: () => void }) {
  const { privacyMode, formatSensitiveCurrency, formatSensitiveNumber, maskSensitiveText } = usePortfolioContext();
  const [snapshotId, setSnapshotId] = useState("");
  const [livePrices, setLivePrices] = useState<LivePricePayload>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ClientPriceCache;
          const age = Date.now() - parsed.timestamp;
          if (age < CLIENT_CACHE_TTL) {
            return parsed.payload;
          }
        }
      } catch (e) {
        console.error("Failed to load live prices from localStorage cache:", e);
      }
    }
    return {};
  });

  const [liveStatus, setLiveStatus] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ClientPriceCache;
          const age = Date.now() - parsed.timestamp;
          if (age < CLIENT_CACHE_TTL) {
            const count = Object.keys(parsed.payload.prices ?? {}).length;
            return `Loaded from cache (${count} assets, ${Math.round(age / 60000)}m ago)`;
          }
        }
      } catch (e) {}
    }
    return "Live prices pending";
  });

  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ClientPriceCache;
          return parsed.timestamp;
        }
      } catch (e) {}
    }
    return null;
  });
  const selectedSnapshot = useMemo(() => {
    if (snapshotId) return data.snapshots.find((snapshot) => snapshot.id === snapshotId);
    return latestSnapshot(data);
  }, [data, snapshotId]);
  const newestSnapshot = useMemo(() => latestSnapshot(data), [data]);
  const rows = useMemo(() => lineRows(data, selectedSnapshot), [data, selectedSnapshot]);
  const latestRows = useMemo(() => lineRows(data, newestSnapshot), [data, newestSnapshot]);
  const previous = selectedSnapshot ? previousSnapshot(data, selectedSnapshot.date) : undefined;
  const delta = selectedSnapshot ? statDelta(selectedSnapshot.totalValue, previous?.totalValue) : null;
  const liveBaseRows = useMemo<DashboardLineRow[]>(() => {
    const holdingsById = new Map(latestRows.map((row) => [row.holding.id, row.holding]));
    data.holdings.forEach((holding) => {
      if (holding.active && !holdingsById.has(holding.id)) {
        holdingsById.set(holding.id, holding);
      }
    });

    return Array.from(holdingsById.values()).map((holding) => ({
      ...resolveCurrentHoldingLine(data, holding, { snapshot: newestSnapshot }),
      holding,
    }));
  }, [data, latestRows, newestSnapshot]);
  const liveRows = useMemo(
    () =>
      liveBaseRows.map((row) => {
        const price = livePriceForHolding(livePrices, row.holding);
        return {
          ...resolveCurrentHoldingLine(data, row.holding, {
            snapshot: newestSnapshot,
            livePrice: Number.isFinite(price) ? Number(price) : undefined,
          }),
          holding: row.holding,
          live: Number.isFinite(price),
        };
      }),
    [data, liveBaseRows, livePrices, newestSnapshot],
  );
  const liveTotal = liveRows.reduce((sum, row) => sum + row.value, 0);
  const liveDelta = newestSnapshot ? statDelta(liveTotal, newestSnapshot.totalValue) : null;

  const livePriceHoldings = useMemo(() => liveBaseRows.map((row) => holdingWithPriceConfig(data, row.holding)), [data, liveBaseRows]);

  const [historicalValuations, setHistoricalValuations] = useState<{ date: string; value: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const last7Dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();
  }, []);

  useEffect(() => {
    if (liveBaseRows.length === 0) return;
    let cancelled = false;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const promises = last7Dates.map(async (date) => {
          const payload = await fetchHistoricalPrices(
            data,
            date,
            liveBaseRows.map((row) => row.holding),
          );
          
          let total = 0;
          liveBaseRows.forEach((row) => {
            const price = historicalPriceForHolding(payload, row.holding);
            if (Number.isFinite(price)) {
              total += row.amount * Number(price);
            } else {
              total += row.value;
            }
          });
          return { date, value: total };
        });

        const results = await Promise.all(promises);
        if (cancelled) return;
        setHistoricalValuations(results);
      } catch (err) {
        console.error("Failed to fetch 7-day historical prices:", err);
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [data, liveBaseRows, last7Dates]);

  const chartData = useMemo(() => {
    if (historicalValuations.length === 0) return [];
    const copy = [...historicalValuations];
    const today = new Date().toISOString().slice(0, 10);
    const todayIndex = copy.findIndex((item) => item.date === today);
    if (todayIndex !== -1 && liveTotal > 0) {
      copy[todayIndex] = { ...copy[todayIndex], value: liveTotal };
    }
    return copy;
  }, [historicalValuations, liveTotal]);

  const { minVal, maxVal, minIndex, maxIndex } = useMemo(() => {
    if (chartData.length === 0) return { minVal: 0, maxVal: 0, minIndex: -1, maxIndex: -1 };
    let minVal = Infinity;
    let maxVal = -Infinity;
    let minIndex = -1;
    let maxIndex = -1;
    chartData.forEach((item, index) => {
      if (item.value < minVal) {
        minVal = item.value;
        minIndex = index;
      }
      if (item.value > maxVal) {
        maxVal = item.value;
        maxIndex = index;
      }
    });
    return { minVal, maxVal, minIndex, maxIndex };
  }, [chartData]);

  const yDomain = useMemo(() => {
    if (minVal === maxVal) {
      return [minVal * 0.9 || 0, maxVal * 1.1 || 100];
    }
    const diff = maxVal - minVal;
    return [minVal - diff * 0.15, maxVal + diff * 0.15];
  }, [minVal, maxVal]);

  const sevenDayDelta = useMemo(() => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1].value;
    const start = chartData[0].value;
    return statDelta(current, start);
  }, [chartData]);

  const todayDelta = useMemo(() => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1].value;
    const yesterday = chartData[chartData.length - 2].value;
    return statDelta(current, yesterday);
  }, [chartData]);

  const formatSensitiveCompactCurrency = (value: number) => {
    if (privacyMode) return formatSensitiveCurrency(value);
    if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2).replace(".", ",")} T`;
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2).replace(".", ",")} Jt`;
    return formatSensitiveCurrency(value);
  };

  const handleFetchPrices = async (force = false) => {
    if (liveBaseRows.length === 0) return;

    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ClientPriceCache;
          const age = Date.now() - parsed.timestamp;
          const currentSymbols = livePriceHoldings.map(priceConfigKey);
          const cachedSymbolsStr = [...parsed.symbols].sort().join(",");
          const currentSymbolsStr = [...currentSymbols].sort().join(",");
          if (age < CLIENT_CACHE_TTL && cachedSymbolsStr === currentSymbolsStr) {
            console.log("Using fresh client cache for dashboard prices");
            return;
          }
        }
      } catch (e) {}
    }

    setLiveStatus("Updating live prices...");
    try {
      const symbols = livePriceHoldings.map(priceConfigKey);
      const payload = await fetchLiveSymbolPrices(
        livePriceHoldings.map((holding) => holding.assetSymbol || holding.asset),
        {
          alphaVantageApiKey: data.settings.priceServices.alphaVantageApiKey,
          finnhubApiKey: data.settings.priceServices.finnhubApiKey,
          metalsDevApiKey: data.settings.priceServices.metalsDevApiKey,
          coinGeckoApiKey: data.settings.priceServices.coinGeckoApiKey,
          coinMarketCapApiKey: data.settings.priceServices.coinMarketCapApiKey,
        },
        livePriceHoldings,
      );

      setLivePrices(payload);
      setLastFetchedAt(Date.now());
      const count = Object.keys(payload.prices ?? {}).length;
      setLiveStatus(count > 0 ? `${count} live prices updated` : "No live prices matched");

      const cacheEntry: ClientPriceCache = {
        payload,
        timestamp: Date.now(),
        symbols,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      setLiveStatus(error instanceof Error ? error.message : "Live price update failed");
    }
  };

  useEffect(() => {
    handleFetchPrices(false);
  }, [
    liveBaseRows,
    data.settings.priceServices.alphaVantageApiKey,
    data.settings.priceServices.finnhubApiKey,
    data.settings.priceServices.metalsDevApiKey,
    data.settings.priceServices.coinGeckoApiKey,
    data.settings.priceServices.coinMarketCapApiKey,
  ]);

  return (
    <div className="space-y-6">
      <SnapshotReminderBanner latestDate={newestSnapshot?.date} onCreateSnapshot={onCreateSnapshot} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <Card className="relative min-h-80 overflow-hidden p-6">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))]" />
          
          {/* Background AreaChart depicting 7-day movement */}
          {chartData.length > 0 && (
            <div className="absolute inset-0 z-0 opacity-35 transition-opacity duration-500 pointer-events-none select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 35, right: 35, bottom: 25, left: 35 }}>
                  <defs>
                    <linearGradient id="liveChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(245, 158, 11, 0.3)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgba(245, 158, 11, 0)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={yDomain} hide />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#liveChartGradient)"
                  />
                  {minIndex !== -1 && (
                    <ReferenceDot
                      x={chartData[minIndex].date}
                      y={chartData[minIndex].value}
                      r={4}
                      fill="#ef4444"
                      stroke="#09090b"
                      strokeWidth={2}
                      label={{
                        value: `Min: ${formatSensitiveCompactCurrency(minVal)}`,
                        fill: "#fca5a5",
                        fontSize: 9,
                        fontWeight: "bold",
                        position: "bottom",
                        offset: 10,
                      }}
                    />
                  )}
                  {maxIndex !== -1 && (
                    <ReferenceDot
                      x={chartData[maxIndex].date}
                      y={chartData[maxIndex].value}
                      r={4}
                      fill="#10b981"
                      stroke="#09090b"
                      strokeWidth={2}
                      label={{
                        value: `Max: ${formatSensitiveCompactCurrency(maxVal)}`,
                        fill: "#6ee7b7",
                        fontSize: 9,
                        fontWeight: "bold",
                        position: "top",
                        offset: 10,
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="absolute bottom-0 left-12 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
          <div className="relative z-10 flex min-h-72 flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                Live portfolio valuation
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {formatSensitiveCurrency(liveTotal || newestSnapshot?.totalValue || 0)}
              </p>
              {liveDelta ? (
                <p className={`mt-4 text-sm ${liveDelta.difference >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {liveDelta.difference >= 0 ? "+" : ""}
                  {formatSensitiveCurrency(liveDelta.difference)}
                  {liveDelta.percent !== null ? ` (${liveDelta.percent >= 0 ? "+" : ""}${liveDelta.percent.toFixed(2)}%)` : ""}
                  <span className="text-zinc-500"> vs snapshot terbaru</span>
                </p>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Import CSV atau buat snapshot untuk memulai analisis.</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xs text-amber-200/80">{liveStatus}</span>
                <button
                  onClick={() => handleFetchPrices(true)}
                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2 py-1 text-[11px] font-semibold border border-amber-500/30 transition cursor-pointer"
                  title="Force refresh live prices"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-zinc-500">Priced holdings</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {liveRows.filter((row) => row.live).length}/{liveRows.length}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-zinc-500">7-day movement</p>
                {sevenDayDelta ? (
                  <div className="mt-1">
                    <p className={`text-[15px] font-semibold leading-tight ${sevenDayDelta.difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {sevenDayDelta.difference >= 0 ? "+" : ""}{formatSensitiveCurrency(sevenDayDelta.difference)}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${sevenDayDelta.difference >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                      {sevenDayDelta.percent !== null ? `${sevenDayDelta.percent >= 0 ? "+" : ""}${sevenDayDelta.percent.toFixed(2)}%` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xl font-semibold text-zinc-400">-</p>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-zinc-500">Today's movement</p>
                {todayDelta ? (
                  <div className="mt-1">
                    <p className={`text-[15px] font-semibold leading-tight ${todayDelta.difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {todayDelta.difference >= 0 ? "+" : ""}{formatSensitiveCurrency(todayDelta.difference)}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${todayDelta.difference >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                      {todayDelta.percent !== null ? `${todayDelta.percent >= 0 ? "+" : ""}${todayDelta.percent.toFixed(2)}%` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xl font-semibold text-zinc-400">-</p>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5 shadow-[0_0_38px_-24px_rgba(245,158,11,0.75)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Snapshot selector</p>
          <select
            value={selectedSnapshot?.id ?? ""}
            onChange={(event) => setSnapshotId(event.target.value)}
            className="mt-3 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
          >
            {data.snapshots.slice().sort((a, b) => b.date.localeCompare(a.date)).map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.date} - {formatSensitiveCurrency(snapshot.totalValue)}
              </option>
            ))}
          </select>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Holdings</p>
              <p className="mt-1 text-2xl font-semibold text-white">{rows.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Snapshots</p>
              <p className="mt-1 text-2xl font-semibold text-white">{data.snapshots.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Selected total</p>
              <p className="mt-1 text-lg font-semibold text-amber-100">{formatSensitiveCurrency(selectedSnapshot?.totalValue ?? 0)}</p>
              {delta ? (
                <p className={`mt-1 text-xs ${delta.difference >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {delta.difference >= 0 ? "+" : ""}
                  {formatSensitiveCurrency(delta.difference)}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* Live Price Details Panel */}
      {lastFetchedAt && Object.keys(livePrices.prices ?? {}).length > 0 && (
        <Card className="p-4 border-white/10 bg-black/10">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white select-none">
              <span>Info Pengambilan Live Price ({Object.keys(livePrices.prices ?? {}).length} aset)</span>
              <span className="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs text-zinc-400">
              <p>
                <strong className="text-zinc-300">Waktu Pengambilan:</strong>{" "}
                {new Date(lastFetchedAt).toLocaleString("id-ID")}{" "}
                <span className="text-zinc-500">
                  ({Math.round((Date.now() - lastFetchedAt) / 60000)} menit yang lalu)
                </span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Object.entries(livePrices.prices ?? {}).map(([symbol, price]) => {
                  const source = livePrices.sources?.[symbol];
                  const ticker = livePrices.sourceTickers?.[symbol];
                  const cachedTime = livePrices.cachedAt?.[symbol]
                    ? new Date(livePrices.cachedAt[symbol]).toLocaleTimeString("id-ID")
                    : "";
                  return (
                    <div key={symbol} className="flex items-center justify-between rounded bg-zinc-950/40 p-2 border border-white/5">
                      <span className="font-semibold text-zinc-200">{symbol}</span>
                      <div className="text-right">
                        <span className="text-amber-100 block">{formatSensitiveCurrency(price)}</span>
                        <span className="text-[10px] text-zinc-500">
                          {displaySource(source)} {ticker ? `(${ticker})` : ""} {cachedTime ? `· ${cachedTime}` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {(() => {
          // Compute top 4 unique asset symbols by total value from the latest snapshot
          const assetValueMap = new Map<string, number>();
          latestRows.forEach((row) => {
            const symbol = (row.holding.assetSymbol || row.holding.asset).trim().toUpperCase();
            assetValueMap.set(symbol, (assetValueMap.get(symbol) ?? 0) + row.value);
          });
          const top4Symbols = [...assetValueMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([symbol]) => symbol);
          const top4Rows = top4Symbols
            .map((symbol) => latestRows.find((row) => (row.holding.assetSymbol || row.holding.asset).trim().toUpperCase() === symbol))
            .filter((row): row is (typeof latestRows)[number] => Boolean(row));
          const usdIdrRate = livePrices.usdIdrRate;

          return top4Rows.map((row) => {
            const holding = holdingWithPriceConfig(data, row.holding);
            const symbol = (holding.assetSymbol || holding.asset).trim().toUpperCase();
            const priceIdr = livePriceForHolding(livePrices, holding);
            const priceUsd = Number.isFinite(priceIdr) && usdIdrRate && usdIdrRate > 0
              ? Number(priceIdr) / usdIdrRate
              : null;
            const source = livePrices.holdingSources?.[holding.id] ?? livePrices.sources?.[symbol];
            const sourceTicker = livePrices.holdingSourceTickers?.[holding.id] ?? livePrices.sourceTickers?.[symbol];
            const cachedAt = livePrices.holdingCachedAt?.[holding.id] ?? livePrices.cachedAt?.[symbol];
            return (
              <Card key={holding.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">{symbol}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-white">
                      {Number.isFinite(priceIdr) ? formatSensitiveCurrency(Number(priceIdr)) : "-"}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-zinc-400">
                      {priceUsd !== null
                        ? maskSensitiveText(`$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(priceUsd)}`)
                        : "-"}
                    </p>
                  </div>
                  <span className="rounded-md border border-amber-300/20 bg-amber-300/[0.08] px-2 py-1 text-[11px] text-amber-100">
                    {displaySource(source)}
                    {sourceTicker ? ` - ${sourceTicker}` : ""}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {cachedAt ? new Date(cachedAt).toLocaleString("id-ID") : "Waiting for price"}
                </p>
              </Card>
            );
          });
        })()}
      </div>

      <HistoryChart data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="By account category" data={breakdown(rows, "accountCategory")} />
        <Breakdown title="By platform" data={breakdown(rows, "platform")} />
        <Breakdown title="By risk" data={breakdown(rows, "riskFactor")} />
        <Breakdown title="By asset medium" data={breakdown(rows, "assetMedium")} />
        <Breakdown title="By liquidity" data={breakdown(rows, "liquidity")} />
        <Breakdown title="By investment type" data={breakdown(rows, "investmentType")} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">Selected snapshot lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3">Asset</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-right">Unit price</th>
                <th className="px-5 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.slice(0, 120).map((row) => (
                <tr key={row.holdingId} className="hover:bg-white/[0.025]">
                  <td className="px-5 py-3">
                    <span className="font-medium text-white">{row.holding.asset}</span>
                    {shouldShowSymbol(row.holding.asset, row.holding.assetSymbol) ? (
                      <span className="ml-2 text-zinc-500">{row.holding.assetSymbol}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{row.holding.platform || "-"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{formatSensitiveNumber(row.amount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-500">{formatSensitiveNumber(row.price)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-amber-100">
                    {formatSensitiveCurrency(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Breakdown({ title, data }: { title: string; data: Array<{ name: string; value: number }> }) {
  const mounted = useMounted();
  const { privacyMode, formatSensitiveCurrency } = usePortfolioContext();
  const [displayMode, setDisplayMode] = useState<"value" | "percent">("value");
  const visibleData = data.slice(0, 8);
  const legendData = data.slice(0, 5);
  const totalValue = visibleData.reduce((sum, item) => sum + item.value, 0);
  const formatPercent = (value: number) => {
    if (totalValue <= 0) return "0.00%";
    return `${((value / totalValue) * 100).toFixed(2)}%`;
  };
  const effectiveDisplayMode = privacyMode ? "percent" : displayMode;
  const formatBreakdownValue = (value: number) => (effectiveDisplayMode === "percent" ? formatPercent(value) : formatSensitiveCurrency(value));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">{title}</h2>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/20 p-0.5">
          <button
            type="button"
            onClick={() => setDisplayMode("value")}
            className={`px-2.5 py-1 text-[11px] font-semibold transition ${
              effectiveDisplayMode === "value" ? "rounded bg-amber-400/15 text-amber-100" : "text-zinc-400 hover:text-zinc-100"
            }`}
            aria-pressed={effectiveDisplayMode === "value"}
            disabled={privacyMode}
            title={privacyMode ? "Value disembunyikan saat privacy mode aktif" : undefined}
          >
            Value
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("percent")}
            className={`px-2.5 py-1 text-[11px] font-semibold transition ${
              effectiveDisplayMode === "percent" ? "rounded bg-amber-400/15 text-amber-100" : "text-zinc-400 hover:text-zinc-100"
            }`}
            aria-pressed={effectiveDisplayMode === "percent"}
          >
            %
          </button>
        </div>
      </div>
      <div className="mt-4 h-56">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={visibleData} dataKey="value" nameKey="name" outerRadius={82} paddingAngle={2}>
                {visibleData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatBreakdownValue(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <div className="mt-2 grid gap-2">
        {legendData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-xs">
            <span className="min-w-0 truncate text-zinc-300">
              <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />
              {item.name}
            </span>
            <span className="shrink-0 font-semibold text-amber-100">{formatBreakdownValue(item.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
