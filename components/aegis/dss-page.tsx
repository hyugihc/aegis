"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { AlertTriangle, Brain, Gauge, LineChart, Save, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formInputClass, formSelectClass } from "@/components/aegis/constants";
import { usePortfolioContext } from "@/context/portfolio-context";
import { buildDssPayload, type DssPayload } from "@/lib/dss";
import { formatCurrency, getHoldingLabels, type PortfolioData } from "@/lib/portfolio";

type Tab = "overview" | "rebalancing" | "dca" | "risk" | "assets" | "ai" | "settings";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "rebalancing", label: "Rebalancing" },
  { id: "dca", label: "DCA Helper" },
  { id: "risk", label: "Risk Monitor" },
  { id: "assets", label: "Assets" },
  { id: "ai", label: "AI Analyst" },
  { id: "settings", label: "DSS Settings" },
];

function percent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function categoryRows(payload: DssPayload) {
  return payload.categories.map((category) => {
    const current = payload.total > 0 ? (category.value / payload.total) * 100 : 0;
    const gap = current - category.target;
    const targetValue = (payload.total * category.target) / 100;
    return {
      ...category,
      current,
      gap,
      targetValue,
      deltaValue: category.value - targetValue,
      hard: Math.abs(gap) > category.threshold,
    };
  });
}

export function DssPage({ data, onChange }: { data: PortfolioData; onChange: (next: PortfolioData) => void }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [tab, setTab] = useState<Tab>("overview");
  const [snapshotId, setSnapshotId] = useState("");
  const [dcaBudget, setDcaBudget] = useState(5_000_000);
  const [query, setQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState(data.settings.ai.promptTemplate);
  const [aiResult, setAiResult] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const payload = useMemo(() => buildDssPayload(data, snapshotId), [data, snapshotId]);

  const rows = useMemo(() => (payload ? categoryRows(payload) : []), [payload]);
  const dcaAllocations = useMemo(() => {
    if (!payload) return new Map<string, number>();
    const totalVal = payload.total;
    const projectedTotal = totalVal + dcaBudget;
    const deficits = rows.map((row) => {
      const targetVal = (projectedTotal * row.target) / 100;
      const deficit = targetVal - row.value;
      return {
        name: row.name,
        deficit: deficit > 0 ? deficit : 0,
      };
    });
    const totalPositiveDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);
    const allocationMap = new Map<string, number>();
    rows.forEach((row) => {
      const def = deficits.find((d) => d.name === row.name)?.deficit ?? 0;
      const allocation = totalPositiveDeficit > 0 ? dcaBudget * (def / totalPositiveDeficit) : 0;
      allocationMap.set(row.name, allocation);
    });
    return allocationMap;
  }, [rows, dcaBudget, payload?.total]);

  if (!payload) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold text-white">Decision Support System</h2>
        <p className="mt-2 text-sm text-zinc-500">Buat atau import snapshot terlebih dahulu untuk membuka analitik Phase 4.</p>
      </Card>
    );
  }

  const hardCount = rows.filter((row) => row.hard).length;
  const targetAllocationTotal = rows.reduce((sum, row) => sum + row.target, 0);
  const targetAllocationIsBalanced = Math.abs(targetAllocationTotal - 100) < 0.01;
  const underweightRows = rows.filter((row) => row.gap < 0);
  const totalUnderweight = underweightRows.reduce((sum, row) => sum + Math.abs(row.gap), 0);
  const filteredAssets = payload.assets.filter((asset) => {
    const text = `${asset.holding.asset} ${asset.holding.assetSymbol} ${asset.holding.platform} ${asset.holding.accountCategory}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  function updateDssSetting(kind: "targetAllocations" | "rebalanceThresholds", name: string, value: number) {
    onChange({
      ...data,
      settings: {
        ...data.settings,
        dss: {
          ...data.settings.dss,
          [kind]: {
            ...data.settings.dss[kind],
            [name]: value,
          },
        },
      },
    });
  }

  async function analyze() {
    const currentPayload = payload;
    if (!currentPayload) return;
    setAiStatus("Menganalisa snapshot...");
    setAiResult("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: data.settings.ai.provider,
          apiKey: data.settings.ai.apiKey,
          model: data.settings.ai.model,
          prompt: aiPrompt,
          portfolio: {
            date: currentPayload.snapshot.date,
            total: currentPayload.total,
            categories: rows.map((row) => ({
              name: row.name,
              current: row.current,
              target: row.target,
              gap: row.gap,
              value: row.value,
            })),
            assets: currentPayload.assets.slice(0, 30).map((asset) => ({
              symbol: asset.holding.assetSymbol || asset.holding.asset,
              platform: asset.holding.platform,
              category: asset.holding.accountCategory,
              risk: asset.holding.riskFactor,
              liquidity: asset.holding.liquidity,
              value: asset.value,
            })),
          },
        }),
      });
      const json = (await response.json()) as { analysis?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "AI request failed");
      setAiResult(json.analysis ?? "");
      setAiStatus("Analisis selesai");
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : "AI request gagal");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Decision Support System</h2>
          <p className="mt-1 text-sm text-zinc-500">Snapshot analytics, rebalancing, DCA, risk monitor, dan AI analyst.</p>
        </div>
        <select value={payload.snapshot.id} onChange={(event) => setSnapshotId(event.target.value)} className={`${formSelectClass} max-w-sm`}>
          {data.snapshots.slice().sort((a, b) => b.date.localeCompare(a.date)).map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id}>{snapshot.date} - {formatSensitiveCurrency(snapshot.totalValue)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={<LineChart size={17} />} label="Snapshot total" value={formatSensitiveCurrency(payload.total)} />
        <Stat icon={<Gauge size={17} />} label="Weighted risk" value={`${payload.weightedRiskScore}/5`} detail={payload.riskLabel} />
        <Stat icon={<Target size={17} />} label="Hard rebalance" value={`${hardCount} bucket`} />
        <Stat icon={<AlertTriangle size={17} />} label="Warnings" value={`${payload.warnings.length}`} />
      </div>

      <div className="top-nav-scroll">
        {tabs.map((item) => (
          <button key={item.id} className={`top-nav-item ${tab === item.id ? "top-nav-active" : ""}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="p-5">
            <h3 className="font-semibold text-white">Allocation vs Target</h3>
            <div className="mt-4 space-y-3">
              {rows.map((row) => <AllocationBar key={row.name} row={row} formatValue={formatSensitiveCurrency} />)}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white">Category Mix</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                    {rows.map((row) => <Cell key={row.name} fill={row.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Warnings warnings={payload.warnings} />
        </div>
      ) : null}

      {tab === "rebalancing" ? (
        <Card className="overflow-hidden">
          <TableHead title="Rebalancing Matrix" />
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <tr><th className="px-5 py-3 text-left">Category</th><th className="px-3 py-3 text-right">Current</th><th className="px-3 py-3 text-right">Target</th><th className="px-3 py-3 text-right">Gap</th><th className="px-5 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.name}>
                  <td className="px-5 py-3 font-medium text-white">{row.name}</td>
                  <td className="px-3 py-3 text-right">{percent(row.current)}</td>
                  <td className="px-3 py-3 text-right">{percent(row.target)}</td>
                  <td className={`px-3 py-3 text-right ${row.hard ? "text-rose-200" : "text-emerald-200"}`}>{row.gap >= 0 ? "+" : ""}{percent(row.gap)}</td>
                  <td className="px-5 py-3 text-right text-amber-100">{row.deltaValue > 0 ? "Kurangi" : "Tambah"} {formatSensitiveCurrency(Math.abs(row.deltaValue))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === "dca" ? (
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
            <label className="text-sm text-zinc-400">Budget DCA bulan ini<input className={formInputClass} inputMode="decimal" value={dcaBudget} onChange={(event) => setDcaBudget(Number(event.target.value || 0))} /></label>
            <div className="space-y-3">
              {rows.map((row) => {
                const allocation = dcaAllocations.get(row.name) ?? 0;
                return (
                  <AllocationBar
                    key={row.name}
                    row={row}
                    dcaAllocation={allocation}
                    dcaBudget={dcaBudget}
                    formatValue={formatSensitiveCurrency}
                  />
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "risk" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold text-white">Risk Breakdown</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.riskBreakdown}>
                  <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Warnings warnings={payload.warnings} />
        </div>
      ) : null}

      {tab === "assets" ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <TableHead title="Snapshot Assets" bare />
            <label className="relative max-w-sm"><Search className="absolute left-3 top-3 text-zinc-500" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${formInputClass} mt-0 pl-9`} placeholder="Search assets" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-zinc-500"><tr><th className="px-5 py-3 text-left">Asset</th><th className="px-3 py-3">Platform</th><th className="px-3 py-3">Risk</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3 text-right">Share</th><th className="px-5 py-3 text-right">P/L vs Prev</th></tr></thead>
              <tbody className="divide-y divide-white/5">{filteredAssets.map((asset) => <tr key={asset.holdingId}><td className="px-5 py-3 font-medium text-white">{asset.holding.asset}<span className="ml-2 text-zinc-500">{asset.holding.assetSymbol}</span></td><td className="px-3 py-3 text-zinc-400">{asset.holding.platform || "-"}</td><td className="px-3 py-3 text-zinc-400">{asset.holding.riskFactor || "-"}</td><td className="px-3 py-3 text-right text-amber-100">{formatSensitiveCurrency(asset.value)}</td><td className="px-3 py-3 text-right">{percent(asset.share)}</td><td className={`px-5 py-3 text-right ${asset.pnl === null ? "text-zinc-500" : asset.pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{asset.pnl === null ? "-" : formatSensitiveCurrency(asset.pnl)}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === "ai" ? (
        <Card className="p-5">
          {!data.settings.ai.enabled || data.settings.ai.provider === "disabled" || !data.settings.ai.apiKey ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">Aktifkan AI dan simpan API key di Settings untuk memakai AI Analyst.</div>
          ) : null}
          <label className="mt-4 block text-sm text-zinc-400">Prompt<textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} className={formInputClass} rows={5} /></label>
          <div className="mt-4 flex flex-wrap items-center gap-3"><button className="primary-button" onClick={analyze} disabled={!data.settings.ai.enabled || !data.settings.ai.apiKey}><Brain size={16} /> Analyze</button><span className="text-sm text-zinc-500">{aiStatus}</span></div>
          {aiResult ? <div className="mt-5 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-200">{aiResult}</div> : null}
        </Card>
      ) : null}

      {tab === "settings" ? (
        <Card className="p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-white"><SlidersHorizontal size={18} /> Target Allocation</div>
              <p className="mt-1 text-xs text-zinc-500">Pilih dimensi/kategori yang digunakan untuk rebalancing & DCA.</p>
            </div>
            <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              targetAllocationIsBalanced
                ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                : "border-amber-300/25 bg-amber-400/10 text-amber-100"
            }`}>
              Total target: {percent(targetAllocationTotal)}
            </div>
          </div>
          
          <div className="mb-6 rounded-lg border border-white/10 bg-black/20 p-4">
            <label className="text-sm font-medium text-zinc-300">
              Dimensi Rebalancing
              <select
                value={data.settings.dss?.rebalanceDimension || "accountCategories"}
                onChange={(event) => {
                  onChange({
                    ...data,
                    settings: {
                      ...data.settings,
                      dss: {
                        ...data.settings.dss,
                        rebalanceDimension: event.target.value,
                        targetAllocations: {},
                        rebalanceThresholds: {},
                      },
                    },
                  });
                }}
                className={formSelectClass}
              >
                {getHoldingLabels(data.settings).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!targetAllocationIsBalanced ? (
            <div className="mb-5 flex gap-3 rounded-lg border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p>
                Total target alokasi harus 100%. Saat ini totalnya {percent(targetAllocationTotal)}, jadi hasil rebalancing dan DCA bisa bias sampai target disesuaikan.
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row.name} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">{row.name}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">Target %<input className={formInputClass} type="number" value={row.target} onChange={(event) => updateDssSetting("targetAllocations", row.name, Number(event.target.value))} /></label>
                  <label className="text-sm text-zinc-400">Threshold %<input className={formInputClass} type="number" value={row.threshold} onChange={(event) => updateDssSetting("rebalanceThresholds", row.name, Number(event.target.value))} /></label>
                </div>
              </div>
            ))}
          </div>
          <button className="secondary-button mt-4"><Save size={16} /> Auto-saved</button>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return <Card className="p-4"><div className="flex items-center gap-2 text-amber-200">{icon}<span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span></div><p className="mt-3 text-xl font-semibold text-white">{value}</p>{detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}</Card>;
}

function AllocationBar({
  row,
  valueLabel,
  formatValue = formatCurrency,
  dcaAllocation,
  dcaBudget,
}: {
  row: ReturnType<typeof categoryRows>[number];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  dcaAllocation?: number;
  dcaBudget?: number;
}) {
  const isDcaMode = dcaAllocation !== undefined;
  const displayValue = isDcaMode
    ? dcaAllocation > 0
      ? `DCA: ${formatValue(dcaAllocation)} (${percent((dcaAllocation / (dcaBudget || 1)) * 100)} budget)`
      : "DCA: -"
    : (valueLabel ?? formatValue(row.value));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-white">{row.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Current {percent(row.current)} | Target {percent(row.target)}
          </p>
        </div>
        <span className={row.hard ? "badge border-rose-300/30 bg-rose-400/10 text-rose-100" : "badge badge-green"}>
          {row.hard ? "Hard" : "OK"}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, row.current))}%`, background: row.color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>{displayValue}</span>
        <span>{row.gap >= 0 ? "+" : ""}{percent(row.gap)} gap</span>
      </div>
    </div>
  );
}

function Warnings({ warnings }: { warnings: DssPayload["warnings"] }) {
  return <Card className="p-5"><h3 className="font-semibold text-white">Warnings</h3><div className="mt-4 space-y-3">{warnings.length === 0 ? <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">Tidak ada warning kritis dari snapshot ini.</div> : warnings.map((warning, idx) => <div key={`${warning.title}-${idx}`} className={`rounded-lg border p-4 ${warning.level === "high" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}><p className="font-medium">{warning.title}</p><p className="mt-1 text-sm opacity-80">{warning.detail}</p></div>)}</div></Card>;
}

function TableHead({ title, bare }: { title: string; bare?: boolean }) {
  return <div className={bare ? "" : "border-b border-white/10 px-5 py-4"}><h3 className="flex items-center gap-2 font-semibold text-white"><Sparkles size={16} className="text-amber-300" /> {title}</h3></div>;
}
