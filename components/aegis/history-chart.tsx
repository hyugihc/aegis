"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AreaSeries, ColorType, createChart, LineSeries, type ISeriesApi, type MouseEventParams, type Time } from "lightweight-charts";
import { Card } from "@/components/ui/card";
import { colors } from "@/components/aegis/constants";
import { formatCurrency, getHoldingLabels, holdingFieldByMasterKey, lineRows, portfolioCashflowPoints, type PortfolioCashflowPoint, type PortfolioData } from "@/lib/portfolio";
import { useMounted } from "@/lib/use-mounted";
import { usePortfolioContext } from "@/context/portfolio-context";

type HistoryGroupKey = string;

type LegendPreference = {
  name: string;
  color: string;
  visible: boolean;
};

type HoverRow = {
  name: string;
  value: number;
  color: string;
  monthlyValue?: number;
  isCashflow?: boolean;
};

const historyGroupLabels: Record<string, string> = {
  asset: "Asset",
  platform: "Platform",
  label: "Label",
  accountCategory: "Account category",
  investmentType: "Investment type",
  assetMedium: "Asset medium",
  riskFactor: "Risk factor",
  liquidity: "Liquidity",
  source: "Source",
};

function historyPreferenceKey(groupKey: HistoryGroupKey) {
  return `murub:portfolio-history:${groupKey}:legend-preferences`;
}

function cashflowOverlayPreferenceKey(groupKey: HistoryGroupKey) {
  return `murub:portfolio-history:${groupKey}:cashflow-overlay`;
}

function historyColor(index: number) {
  const hue = (index * 137.508) % 360;
  const saturation = 0.72;
  const lightness = 0.58;
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const hueSegment = hue / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const match = lightness - (chroma / 2);
  const [red, green, blue] =
    hueSegment < 1 ? [chroma, x, 0] :
    hueSegment < 2 ? [x, chroma, 0] :
    hueSegment < 3 ? [0, chroma, x] :
    hueSegment < 4 ? [0, x, chroma] :
    hueSegment < 5 ? [x, 0, chroma] :
    [chroma, 0, x];

  return [red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")
    .replace(/^/, "#");
}

function areaFillAlpha(seriesCount: number) {
  if (seriesCount >= 18) return { top: "0d", bottom: "00" };
  if (seriesCount >= 10) return { top: "18", bottom: "00" };
  return { top: "40", bottom: "06" };
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 || value === 0 ? 1 : 2)}%`;
}

function buildHistoryPoints(data: PortfolioData, groupKey: HistoryGroupKey) {
  const names = new Set<string>();
  const points = data.snapshots
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((snapshot) => {
      const values: Record<string, number> = {};
      lineRows(data, snapshot).forEach((row) => {
        const name = String((row.holding as any)[groupKey] || "Unassigned");
        names.add(name);
        values[name] = (values[name] ?? 0) + row.value;
      });
      return { time: snapshot.date, values };
    });
  return { names: Array.from(names), points };
}

function reconcileLegend(names: string[], current: LegendPreference[]) {
  const currentByName = new Map(current.map((item) => [item.name, item]));
  const next = current.filter((item) => names.includes(item.name));
  names.forEach((name, index) => {
    if (next.some((item) => item.name === name)) return;
    next.push({
      name,
      color: currentByName.get(name)?.color ?? colors[index % colors.length] ?? historyColor(index),
      visible: currentByName.get(name)?.visible ?? true,
    });
  });
  return next;
}

export function HistoryChart({ data }: { data: PortfolioData }) {
  const mounted = useMounted();
  const { privacyMode, formatSensitiveCurrency } = usePortfolioContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [groupKey, setGroupKey] = useState<string>("accountCategory");

  const groupOptions = useMemo(() => {
    const list = [
      { key: "asset", label: "Asset" },
      { key: "platform", label: "Platform" },
    ];
    const holdingLabels = getHoldingLabels(data.settings);
    holdingLabels.forEach((l) => {
      const field = holdingFieldByMasterKey[l.id] || l.id;
      list.push({ key: field, label: l.name });
    });
    list.push({ key: "source", label: "Source" });
    return list;
  }, [data.settings]);

  useEffect(() => {
    const validKeys = groupOptions.map((opt) => opt.key);
    if (!validKeys.includes(groupKey)) {
      setGroupKey("asset");
    }
  }, [groupOptions, groupKey]);

  const { names, points } = useMemo(() => buildHistoryPoints(data, groupKey), [data, groupKey]);
  const cashflowPoints = useMemo(() => portfolioCashflowPoints(data), [data]);
  const overlayCashflowPoints = useMemo(() => {
    const lastSnapshotTime = points[points.length - 1]?.time;
    const lastCashflowPoint = cashflowPoints[cashflowPoints.length - 1];
    if (!lastSnapshotTime || !lastCashflowPoint || lastCashflowPoint.time >= lastSnapshotTime) return cashflowPoints;

    return [
      ...cashflowPoints,
      {
        time: lastSnapshotTime,
        value: lastCashflowPoint.value,
        monthlyValue: 0,
      },
    ];
  }, [cashflowPoints, points]);
  const cashflowPointByTime = useMemo(
    () => new Map<string, PortfolioCashflowPoint>(overlayCashflowPoints.map((point) => [point.time, point])),
    [overlayCashflowPoints],
  );
  const [legend, setLegend] = useState<LegendPreference[]>(() => reconcileLegend(names, []));
  const [cashflowOverlayVisible, setCashflowOverlayVisible] = useState(false);
  const [preferencesLoadedGroup, setPreferencesLoadedGroup] = useState("");
  const [hover, setHover] = useState<HoverRow[]>([]);
  const [draggedLegend, setDraggedLegend] = useState("");
  const visibleLegendCount = legend.filter((item) => item.visible).length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(historyPreferenceKey(groupKey));
      const saved = raw ? (JSON.parse(raw) as LegendPreference[]) : [];
      setLegend(reconcileLegend(names, saved));
      setCashflowOverlayVisible(window.localStorage.getItem(cashflowOverlayPreferenceKey(groupKey)) === "true");
      setPreferencesLoadedGroup(groupKey);
      setHover([]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [groupKey, names]);

  useEffect(() => {
    if (!mounted || preferencesLoadedGroup !== groupKey) return;
    window.localStorage.setItem(cashflowOverlayPreferenceKey(groupKey), String(cashflowOverlayVisible));
  }, [cashflowOverlayVisible, groupKey, mounted, preferencesLoadedGroup]);

  useEffect(() => {
    if (!mounted || preferencesLoadedGroup !== groupKey || !containerRef.current) return;
    window.localStorage.setItem(historyPreferenceKey(groupKey), JSON.stringify(legend));

    const visibleLegend = legend.filter((item) => item.visible);

    // Dynamic scaling for lightweight-charts coordinate limits (MAX_SAFE_INTEGER / 100)
    const maxVal = Math.max(
      ...points.map((point) =>
        visibleLegend.reduce((sum, item) => sum + (point.values[item.name] ?? 0), 0)
      ),
      ...overlayCashflowPoints.map((point) => point.value),
      0
    );
    const scaleFactor = maxVal > 90_000_000_000 ? 1_000_000 : 1;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 460,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
      },
      grid: {
        horzLines: { color: "rgba(255,255,255,0.06)" },
        vertLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: {
        horzLine: { color: "rgba(245,158,11,0.45)" },
        vertLine: { color: "rgba(245,158,11,0.45)" },
      },
      localization: {
        priceFormatter: (price: number) => (privacyMode ? "****" : formatCurrency(price * scaleFactor)),
      },
    });

    const seriesByName = new Map<string, ISeriesApi<"Area", Time>>();
    const fillAlpha = areaFillAlpha(visibleLegend.length);
    visibleLegend.forEach((item) => {
      seriesByName.set(
        item.name,
        chart.addSeries(AreaSeries, {
          lineColor: item.color,
          topColor: `${item.color}${fillAlpha.top}`,
          bottomColor: `${item.color}${fillAlpha.bottom}`,
          lineWidth: 2,
          priceLineVisible: false,
        }),
      );
    });

    const cashflowSeries = chart.addSeries(LineSeries, {
      color: "#ffffff",
      lineWidth: 1,
      priceLineVisible: false,
      visible: cashflowOverlayVisible && overlayCashflowPoints.length > 0,
    });
    cashflowSeries.setData(overlayCashflowPoints.map((point) => ({ time: point.time as Time, value: point.value / scaleFactor })));

    visibleLegend.forEach((item, itemIndex) => {
      const series = seriesByName.get(item.name);
      if (!series) return;
      series.setData(
        points.map((point) => {
          const cumulativeValue = visibleLegend.slice(0, itemIndex + 1).reduce((sum, legendItem) => sum + (point.values[legendItem.name] ?? 0), 0);
          return {
            time: point.time as Time,
            value: cumulativeValue / scaleFactor,
          };
        }),
      );
    });

    const onCrosshairMove = (params: MouseEventParams<Time>) => {
      if (!params.time) {
        setHover([]);
        return;
      }
      const time = String(params.time);
      const point = points.find((candidate) => candidate.time === time);
      const totalValue = point ? Object.values(point.values).reduce((sum, value) => sum + value, 0) : 0;
      const cashflowPoint = cashflowOverlayVisible ? cashflowPointByTime.get(time) : undefined;
      const stackRows = point
        ? visibleLegend
          .map((item) => {
            const value = point.values[item.name] ?? 0;
            return {
              name: item.name,
              color: item.color,
              value: privacyMode && totalValue > 0 ? (value / totalValue) * 100 : value,
            };
          })
          .filter((item) => item.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
        : [];
      const cashflowRows: HoverRow[] = cashflowPoint
        ? [{ name: "Portfolio cashflow", color: "#ffffff", value: cashflowPoint.value, monthlyValue: cashflowPoint.monthlyValue, isCashflow: true }]
        : [];
      setHover([...stackRows, ...cashflowRows]);
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    chart.timeScale().fitContent();

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
    };
  }, [cashflowOverlayVisible, cashflowPointByTime, formatSensitiveCurrency, groupKey, legend, mounted, overlayCashflowPoints, points, preferencesLoadedGroup, privacyMode]);

  function updateLegend(name: string, patch: Partial<LegendPreference>) {
    setLegend((current) => current.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  }

  function setAllLegendVisibility(visible: boolean) {
    setLegend((current) => current.map((item) => ({ ...item, visible })));
  }

  function dropLegend(targetName: string) {
    if (!draggedLegend || draggedLegend === targetName) return;
    setLegend((current) => {
      const next = [...current];
      const from = next.findIndex((item) => item.name === draggedLegend);
      const to = next.findIndex((item) => item.name === targetName);
      if (from < 0 || to < 0) return current;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDraggedLegend("");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold text-white">History chart</h2>
          <p className="mt-1 text-sm text-zinc-500">Stacked snapshot history</p>
        </div>
        <select
          value={groupKey}
          onChange={(event) => setGroupKey(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 lg:w-64"
        >
          {groupOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              Group by {opt.label.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-4 p-5">
        <div className="relative min-h-[460px]">
          <div ref={containerRef} className="h-[460px] w-full" />
          {hover.length > 0 ? (
            <div className="pointer-events-none absolute left-3 top-3 w-64 rounded-md border border-white/10 bg-zinc-950/90 p-3 text-xs shadow-2xl">
              {hover.map((item) => (
                <div key={item.name} className={item.isCashflow ? "mt-2 border-t border-white/10 pt-2" : "py-1"}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-zinc-300">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="shrink-0 font-semibold text-amber-100">
                      {item.isCashflow
                        ? formatSensitiveCurrency(item.value)
                        : privacyMode
                          ? formatPercent(item.value)
                          : formatSensitiveCurrency(item.value)}
                    </span>
                  </div>
                  {item.isCashflow ? (
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                      <span>Cashflow bulanan</span>
                      <span className="tabular-nums">{formatSensitiveCurrency(item.monthlyValue ?? 0)}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="max-h-56 overflow-y-auto pr-1">
          {cashflowPoints.length > 0 ? (
            <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={cashflowOverlayVisible}
                onChange={(event) => setCashflowOverlayVisible(event.target.checked)}
                className="rounded border-white/20 bg-zinc-950 checked:border-amber-500 checked:bg-amber-500"
              />
              <span className="inline-block h-0.5 w-6 bg-white" />
              <span className="min-w-0 flex-1">Portfolio cashflow overlay</span>
            </label>
          ) : null}
          <div className="mb-3 flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">{visibleLegendCount}</span>/{legend.length} group variables visible
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllLegendVisibility(false)}
                disabled={visibleLegendCount === 0}
                className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Uncheck all
              </button>
              <button
                type="button"
                onClick={() => setAllLegendVisibility(true)}
                disabled={visibleLegendCount === legend.length}
                className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check all
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {legend.map((item) => (
              <div
                key={item.name}
                draggable
                onDragStart={() => setDraggedLegend(item.name)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropLegend(item.name)}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(event) => updateLegend(item.name, { visible: event.target.checked })}
                  className="rounded border-white/20 bg-zinc-950 checked:border-amber-500 checked:bg-amber-500"
                />
                <input
                  type="color"
                  value={item.color}
                  onChange={(event) => updateLegend(item.name, { color: event.target.value })}
                  className="h-7 w-8 rounded border border-white/10 bg-transparent"
                  title={`${item.name} color`}
                />
                <span className="min-w-0 flex-1 truncate text-zinc-300" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
