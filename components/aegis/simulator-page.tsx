"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

type Asset = {
  id: "vwra" | "gold" | "bond" | "btc";
  name: string;
  label: string;
  color: string;
  cagr: number;
  alloc: number;
};

const horizons = [10, 15, 20];
const withdrawalRates = [4, 3.5, 3];
const initialAssets: Asset[] = [
  { id: "vwra", name: "Global Equities", label: "VWRA / IWDA", color: "#5b8af0", cagr: 8, alloc: 55 },
  { id: "gold", name: "Emas Fisik", label: "PAXG / XAUT / Pegadaian", color: "#f0a94a", cagr: 7, alloc: 15 },
  { id: "bond", name: "USD Bond / Stablecoin", label: "US T-Bond / USDT yield", color: "#64b8c8", cagr: 7, alloc: 15 },
  { id: "btc", name: "Bitcoin", label: "BTC", color: "#f7931a", cagr: 10, alloc: 15 },
];

function projValue(initial: number, monthly: number, cagr: number, years: number, stepUp = 0) {
  const r = cagr / 100;
  const s = stepUp / 100;
  if (years <= 0) return initial;
  const lump = initial * Math.pow(1 + r, years);
  if (years < 1 || s === 0) {
    if (r === 0) return lump + monthly * 12 * years;
    return lump + monthly * 12 * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
  }
  let sipTotal = 0;
  for (let y = 0; y < Math.floor(years); y += 1) {
    const monthlyAtYear = monthly * Math.pow(1 + s, y);
    const remaining = years - y;
    sipTotal += r === 0 ? monthlyAtYear * 12 * remaining : monthlyAtYear * 12 * Math.pow(1 + r, remaining);
  }
  return lump + sipTotal;
}

function totalInvested(init: number, monthly: number, years: number, stepUp: number) {
  if (stepUp === 0 || years === 0) return init + monthly * 12 * years;
  let total = init;
  for (let y = 0; y < Math.floor(years); y += 1) {
    total += monthly * Math.pow(1 + stepUp / 100, y) * 12;
  }
  return total;
}

function realValue(nominal: number, inflation: number, years: number) {
  return inflation <= 0 || years <= 0 ? nominal : nominal / Math.pow(1 + inflation / 100, years);
}

function fmtJuta(value: number) {
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} M`;
  if (value >= 100) return `${Math.round(value)} jt`;
  return `${value.toFixed(1)} jt`;
}

function fmtCurrency(value: number) {
  return `Rp ${fmtJuta(value)}`;
}

function fmtPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function SimulatorPage() {
  const [init, setInit] = useState(1000);
  const [monthly, setMonthly] = useState(7);
  const [inflation, setInflation] = useState(3.5);
  const [stepUp, setStepUp] = useState(5);
  const [fireTarget, setFireTarget] = useState(20);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [assets, setAssets] = useState(initialAssets);
  const [chartMode, setChartMode] = useState<"portfolio" | "perAsset">("portfolio");
  const [selectedHorizon, setSelectedHorizon] = useState<number | null>(null);

  const totalAlloc = assets.reduce((sum, asset) => sum + asset.alloc, 0);
  const weightedCagr = assets.reduce((sum, asset) => sum + (asset.alloc / 100) * asset.cagr, 0);
  const selectedYears = selectedHorizon ?? 1;

  const portfolioAt = (years: number) =>
    assets.reduce((sum, asset) => sum + projValue(init * (asset.alloc / 100), monthly * (asset.alloc / 100), asset.cagr, years, stepUp), 0);

  const chartData = useMemo(() => Array.from({ length: 21 }, (_, year) => {
    const point: Record<string, number> = {
      year,
      portfolio: portfolioAt(year),
      real: realValue(portfolioAt(year), inflation, year),
      invested: totalInvested(init, monthly, year, stepUp),
    };
    assets.forEach((asset) => {
      point[asset.id] = projValue(init * (asset.alloc / 100), monthly * (asset.alloc / 100), asset.cagr, year, stepUp);
    });
    return point;
  }), [assets, init, monthly, inflation, stepUp]);

  const currentValue = portfolioAt(0);
  const futureValue = portfolioAt(selectedYears);
  const totalGrowth = futureValue - currentValue;
  const monthGrowth = selectedHorizon === null ? portfolioAt(1 / 12) - currentValue : totalGrowth / (selectedYears * 12);
  const yearGrowth = selectedHorizon === null ? portfolioAt(1) - currentValue : totalGrowth / selectedYears;
  const yearsForBreakdown = selectedHorizon ?? 10;
  const totalNominalBreakdown = portfolioAt(yearsForBreakdown);
  const realCagr = weightedCagr - inflation;
  const monthlyYear10 = monthly * Math.pow(1 + stepUp / 100, 9);

  const withdrawalMultiplier = withdrawalRate > 0 ? 100 / withdrawalRate : 0;
  const fireNumber = fireTarget > 0 && withdrawalMultiplier > 0 ? fireTarget * 12 * withdrawalMultiplier : 0;
  const fireProgress = fireNumber > 0 ? Math.min(100, (currentValue / fireNumber) * 100) : 0;
  const fireGap = Math.max(0, fireNumber - currentValue);
  let fireYear: number | null = null;
  let fireNominalTarget = 0;
  for (let year = 1; year <= 50; year += 1) {
    const inflatedTarget = fireNumber * Math.pow(1 + inflation / 100, year);
    if (portfolioAt(year) >= inflatedTarget) {
      fireYear = year;
      fireNominalTarget = inflatedTarget;
      break;
    }
  }

  function updateAsset(id: Asset["id"], patch: Partial<Asset>) {
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));
  }

  return (
    <div className="py-2">
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="space-y-6" id="investment-calculator">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Investment simulator</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Simulasikan portofolio 4 kantong</h2>
              <p className="mt-2 text-sm text-zinc-400">Rencanakan modal awal, tabungan bulanan, dan alokasi aset dengan proyeksi otomatis.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-amber-100">Results update automatically when you change any input.</div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <div className="space-y-4">
              <Panel title="Modal & tabungan">
                <div className="grid gap-4">
                  <MillionInput label="Modal awal" value={init} onChange={setInit} suffix="jt" />
                  <MillionInput label="Tabungan / bulan" value={monthly} onChange={setMonthly} suffix="jt" />
                </div>
              </Panel>

              <Panel title="Asumsi simulasi">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberInput label="Inflasi / tahun" badge="daya beli riil" value={inflation} onChange={setInflation} suffix="%" step="0.1" description="Target inflasi BI sekitar 2.5-3.5%. Digunakan untuk menghitung nilai riil portofolio." />
                  <NumberInput label="Kenaikan tabungan / tahun" badge="step-up DCA" value={stepUp} onChange={setStepUp} suffix="%" step="0.5" description="Tabungan bulanan naik tiap tahun mengikuti kenaikan gaji. 0% = tetap." />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] ${realCagr < 0 ? "text-rose-400" : "text-zinc-400"}`}>Real CAGR portofolio: {realCagr.toFixed(2)}%/thn</span>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-400">Tabungan thn ke-10: {fmtCurrency(monthlyYear10)}/bln</span>
                </div>
              </Panel>

              <Panel title="Kantong investasi">
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border border-white/10 bg-[#090b11] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">{asset.name}</p>
                          <p className="text-xs text-zinc-500">{asset.label}</p>
                        </div>
                        <div className="text-sm font-semibold text-amber-200">{fmtCurrency(init * (asset.alloc / 100))}</div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <SmallInput label="CAGR (%/tahun)" value={asset.cagr} onChange={(value) => updateAsset(asset.id, { cagr: value })} max={asset.id === "btc" ? 300 : 100} step="0.5" />
                        <SmallInput label="Proporsi (%)" value={asset.alloc} onChange={(value) => updateAsset(asset.id, { alloc: value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Distribusi alokasi">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex rounded-full bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-200">CAGR Portofolio: {weightedCagr.toFixed(2)}%/thn</p>
                  <p className={`text-sm font-medium ${Math.abs(totalAlloc - 100) <= 0.5 ? "hidden" : "text-rose-300"}`}>Total alokasi tidak 100% - mohon sesuaikan</p>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-[#0a0c11] p-3">
                  <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
                    {assets.map((asset) => <div key={asset.id} className="h-full transition-all" style={{ width: `${totalAlloc === 0 ? 0 : (asset.alloc / totalAlloc) * 100}%`, background: asset.color }} />)}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {assets.map((asset) => <div key={asset.id} className="flex items-center gap-2 text-xs text-zinc-400"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: asset.color }} />{asset.name.split(" ")[0]} {asset.alloc.toFixed(0)}%</div>)}
                </div>
              </Panel>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {horizons.map((year) => (
                  <button key={year} type="button" onClick={() => setSelectedHorizon(selectedHorizon === year ? null : year)} className={`rounded-lg border bg-[#090b11] p-4 text-center transition hover:border-amber-400/40 hover:bg-white/[0.04] ${selectedHorizon === year ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]" : "border-white/10"}`}>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{year} tahun</p>
                    <p className="mt-3 text-lg font-semibold text-white">{fmtCurrency(portfolioAt(year))}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">nominal</p>
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <p className="text-sm font-medium text-sky-300/80">{fmtCurrency(realValue(portfolioAt(year), inflation, year))}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">nilai riil</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <GrowthCard tone="emerald" title={selectedHorizon === null ? "Estimasi kenaikan 1 bulan" : `Rata-rata kenaikan / bulan (${selectedYears} tahun)`} value={`+${fmtCurrency(monthGrowth)}`} detail={selectedHorizon === null ? `${fmtPercent(currentValue > 0 ? (monthGrowth / currentValue) * 100 : 0)} dari nilai saat ini` : `Rata-rata menuju proyeksi ${selectedYears} tahun`} />
                <GrowthCard tone="sky" title={selectedHorizon === null ? "Estimasi kenaikan 1 tahun" : `Rata-rata kenaikan / tahun (${selectedYears} tahun)`} value={`+${fmtCurrency(yearGrowth)}`} detail={selectedHorizon === null ? `${fmtPercent(currentValue > 0 ? (yearGrowth / currentValue) * 100 : 0)} dari nilai saat ini` : `${fmtPercent(currentValue > 0 ? (yearGrowth / currentValue) * 100 : 0)} rata-rata terhadap nilai saat ini`} />
              </div>

              <Panel title="Grafik pertumbuhan" subtitle="Nominal, nilai riil, dan tunai">
                <div className="flex justify-end">
                  <div className="flex gap-2 rounded-full border border-white/10 bg-black/40 p-1">
                    <button type="button" onClick={() => setChartMode("portfolio")} className={`rounded-full px-4 py-2 text-xs font-semibold ${chartMode === "portfolio" ? "bg-amber-400/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}>Portofolio total</button>
                    <button type="button" onClick={() => setChartMode("perAsset")} className={`rounded-full px-4 py-2 text-xs font-semibold ${chartMode === "perAsset" ? "bg-amber-400/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}>Per kantong</button>
                  </div>
                </div>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="year" tick={{ fill: "#a1a1aa", fontSize: 11 }} stroke="rgba(255,255,255,0.08)" />
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} stroke="rgba(255,255,255,0.08)" tickFormatter={(value) => `Rp ${fmtJuta(Number(value))}`} width={76} />
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} formatter={(value) => fmtCurrency(Number(value))} labelFormatter={(label) => `Tahun ke-${label}`} />
                      {chartMode === "portfolio" ? (
                        <>
                          <Line type="monotone" dataKey="portfolio" name="Portofolio Nominal" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="real" name="Nilai Riil" stroke="#38bdf8" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="invested" name="Tunai" stroke="#71717a" strokeDasharray="6 4" strokeWidth={1.5} dot={false} />
                        </>
                      ) : assets.map((asset) => <Line key={asset.id} type="monotone" dataKey={asset.id} name={asset.name} stroke={asset.color} strokeWidth={2} dot={false} />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-amber-400" /> Nominal</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-sky-400" /> Nilai riil</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-zinc-500" /> Tunai</span>
                </div>
              </Panel>

              <Panel title={`Breakdown ${yearsForBreakdown} tahun`}>
                <div className="space-y-3">
                  {assets.map((asset) => {
                    const nominal = projValue(init * (asset.alloc / 100), monthly * (asset.alloc / 100), asset.cagr, yearsForBreakdown, stepUp);
                    const real = realValue(nominal, inflation, yearsForBreakdown);
                    const share = totalNominalBreakdown > 0 ? (nominal / totalNominalBreakdown) * 100 : 0;
                    return (
                      <div key={asset.id} className="rounded-lg border border-white/10 bg-[#090b11] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div><p className="text-sm font-medium text-white">{asset.name}</p><p className="text-[11px] text-zinc-500">{asset.label}</p></div>
                          <div className="text-right"><div className="text-sm font-semibold text-white">{fmtCurrency(nominal)}</div><div className="text-[11px] text-sky-300/80">{fmtCurrency(real)} riil</div></div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400"><span>{asset.alloc.toFixed(0)}% alokasi</span><span>+{asset.cagr}% CAGR</span><span>{share.toFixed(1)}% dari total</span></div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <div className="rounded-lg border border-violet-400/20 bg-violet-500/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300/80">FIRE Calculator</p><p className="mt-1 text-sm text-zinc-400">Financial Independence - estimasi kapan kamu bisa pensiun dari portofolio ini.</p></div>
                  <span className="shrink-0 rounded-full bg-violet-400/10 px-3 py-1.5 text-[11px] text-violet-200">{withdrawalRate}% withdrawal rule</span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <MillionInput label="Target pengeluaran / bulan" value={fireTarget} onChange={setFireTarget} suffix="jt" description="Pengeluaran rutin saat sudah pensiun (harga hari ini)." />
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500">Withdrawal rule</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {withdrawalRates.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setWithdrawalRate(rate)}
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              withdrawalRate === rate
                                ? "border-violet-300/60 bg-violet-400/15 text-white"
                                : "border-white/10 bg-white/5 text-zinc-400 hover:border-violet-300/30 hover:text-white"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div><p className="text-xs text-zinc-500">FIRE Number ({withdrawalMultiplier.toFixed(1)}x pengeluaran tahunan)</p><p className="mt-1.5 text-lg font-semibold text-white">{fireNumber > 0 ? fmtCurrency(fireNumber) : "-"}</p></div>
                    <div><p className="text-xs text-zinc-500">Jika inflasi diperhitungkan</p><p className="text-sm font-medium text-sky-300/80">{fireYear ? `Target nominal thn ${fireYear}: ${fmtCurrency(fireNominalTarget)}` : "Tidak tercapai dalam 50 tahun"}</p></div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <FireStat label="FIRE tercapai" value={fireYear ? `Tahun ke-${fireYear}` : ">50 tahun"} />
                  <FireStat label="Progress saat ini" value={`${fireProgress.toFixed(1)}%`} />
                  <FireStat label="Sisa yang dibutuhkan" value={fireGap > 0 ? fmtCurrency(fireGap) : "Sudah tercapai"} amber />
                </div>
                <div className="mt-4"><div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-500" style={{ width: `${fireProgress}%` }} /></div><p className="mt-2 text-[11px] text-zinc-600">Dihitung berdasarkan nilai portofolio saat ini terhadap FIRE number nominal.</p></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-5"><div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{title}</div>{subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}<div className="mt-5">{children}</div></div>;
}

function MillionInput({ label, value, onChange, suffix, description }: { label: string; value: number; onChange: (value: number) => void; suffix: string; description?: string }) {
  return <label className="grid gap-2 text-sm text-zinc-400"><span>{label}</span><div className="flex items-center gap-2"><input type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} className="w-full rounded-lg border border-white/10 bg-[#0a0c11] px-4 py-3 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" /><span className="text-sm text-zinc-500">{suffix}</span></div>{description ? <p className="text-[11px] text-zinc-600">{description}</p> : null}</label>;
}

function NumberInput({ label, badge, value, onChange, suffix, step, description }: { label: string; badge: string; value: number; onChange: (value: number) => void; suffix: string; step: string; description: string }) {
  return <label className="grid gap-2 text-sm text-zinc-400"><div className="flex items-center justify-between gap-2"><span>{label}</span><span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-300">{badge}</span></div><div className="flex items-center gap-2"><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Number(event.target.value || 0))} className="w-full rounded-lg border border-white/10 bg-[#0a0c11] px-4 py-3 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" /><span className="text-sm text-zinc-500">{suffix}</span></div><p className="text-[11px] text-zinc-600">{description}</p></label>;
}

function SmallInput({ label, value, onChange, max = 100, step = "1" }: { label: string; value: number; onChange: (value: number) => void; max?: number; step?: string }) {
  return <label className="grid gap-2 text-xs text-zinc-400"><span>{label}</span><input type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value || 0))} className="rounded-lg border border-white/10 bg-[#0a0c11] px-3 py-2 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" /></label>;
}

function GrowthCard({ tone, title, value, detail }: { tone: "emerald" | "sky"; title: string; value: string; detail: string }) {
  const classes = tone === "emerald" ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-300/80" : "border-sky-400/20 bg-sky-500/5 text-sky-300/80";
  return <div className={`rounded-lg border p-4 ${classes}`}><p className="text-xs uppercase tracking-[0.25em]">{title}</p><p className="mt-3 text-lg font-semibold text-white">{value}</p><p className="mt-1 text-xs text-zinc-400">{detail}</p></div>;
}

function FireStat({ label, value, amber }: { label: string; value: string; amber?: boolean }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center"><p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p><p className={`mt-2 text-base font-semibold ${amber ? "text-amber-200" : "text-white"}`}>{value}</p></div>;
}
