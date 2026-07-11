"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileUp, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Breakdown } from "@/components/aegis/dashboard-page";
import { usePortfolioContext } from "@/context/portfolio-context";
import {
  buildSnapshotId,
  displaySource,
  download,
  fetchLatestPrices,
  formatDecimal,
  parseInputNumber,
  shouldShowSymbol,
  statDelta,
  todayIso,
  type PriceUpdateDetail,
} from "@/components/aegis/client-utils";
import { 
  breakdown, 
  defaultSnapshotLine,
  exportPortfolioCsv, 
  latestSnapshot, 
  lineRows, 
  parsePortfolioCsv,
  previousSnapshot, 
  type Holding, 
  type HoldingSnapshot, 
  type PortfolioData, 
  type Snapshot 
} from "@/lib/portfolio";
import { useMounted } from "@/lib/use-mounted";

type SnapshotDraftLine = HoldingSnapshot & {
  holding: Holding;
};

type SnapshotInputField = "amount" | "price" | "value";

function snapshotInputKey(holdingId: string, field: SnapshotInputField) {
  return `${holdingId}:${field}`;
}

function formatSnapshotInput(value: number, isFocused: boolean, maximumFractionDigits = 4) {
  if (!Number.isFinite(value) || value === 0) return "";
  if (isFocused) return String(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

function SnapshotEditor({
  data,
  snapshot,
  onCancel,
  onSave,
}: {
  data: PortfolioData;
  snapshot?: Snapshot;
  onCancel: () => void;
  onSave: (snapshot: Snapshot) => void;
}) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const snapshotHoldingIds = new Set(
    snapshot?.lines
      .filter((line) => line.value !== 0 || line.amount !== 0 || line.price !== 0)
      .map((line) => line.holdingId) ?? [],
  );
  const editableHoldings = data.holdings.filter((holding) => holding.active || snapshotHoldingIds.has(holding.id));
  const previous = snapshot ? previousSnapshot(data, snapshot.date) : latestSnapshot(data);
  const [date, setDate] = useState(snapshot?.date ?? todayIso());
  const [notes, setNotes] = useState(snapshot?.notes ?? "");
  const [priceStatus, setPriceStatus] = useState("");
  const [priceDetails, setPriceDetails] = useState<Map<string, PriceUpdateDetail>>(new Map());
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [activeInputText, setActiveInputText] = useState("");
  const previousLines = useMemo(
    () => new Map(previous?.lines.map((line) => [line.holdingId, line]) ?? []),
    [previous],
  );
  const [rows, setRows] = useState<SnapshotDraftLine[]>(() =>
    editableHoldings.map((holding) => {
      const existing = snapshot?.lines.find((line) => line.holdingId === holding.id);
      const previousLine = previous?.lines.find((line) => line.holdingId === holding.id);
      const line = snapshot ? existing ?? defaultSnapshotLine(data, holding, previousLine) : defaultSnapshotLine(data, holding, previousLine);
      const useCalculated = snapshot
        ? line.useCalculated ?? Boolean(line.price > 0 && line.amount > 0)
        : true;
      const amount = line?.amount ?? 0;
      const price = line?.price ?? 0;
      return {
        holding,
        holdingId: holding.id,
        amount,
        price,
        value: useCalculated ? amount * price : line?.value ?? 0,
        useCalculated,
      };
    }),
  );
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  function isInputFocused(holdingId: string, field: SnapshotInputField) {
    return focusedInput === snapshotInputKey(holdingId, field);
  }

  function focusInput(holdingId: string, field: SnapshotInputField, currentValue: number) {
    setFocusedInput(snapshotInputKey(holdingId, field));
    if (!currentValue || !Number.isFinite(currentValue)) {
      setActiveInputText("");
    } else {
      setActiveInputText(String(currentValue).replace(".", ","));
    }
  }

  function updateRow(holdingId: string, patch: Partial<HoldingSnapshot>) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.holdingId !== holdingId) return row;
        const next = { ...row, ...patch };
        if (next.useCalculated) next.value = next.amount * next.price;
        return next;
      }),
    );
  }

  function usePreviousRows() {
    if (!previous) return;
    setRows((currentRows) =>
      currentRows.map((row) => {
        const previousLine = previous.lines.find((line) => line.holdingId === row.holdingId);
        return previousLine
          ? {
              ...row,
              ...previousLine,
              value: previousLine.useCalculated ? previousLine.amount * previousLine.price : previousLine.value,
            }
          : row;
      }),
    );
  }

  function useAutoSyncRows() {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (!row.holding.autoPortfolioAssetId) return row;
        return {
          ...row,
          ...defaultSnapshotLine(data, row.holding, row),
        };
      }),
    );
    setPriceStatus("Rows yang punya Auto sync link sudah memakai quantity dan price terakhir dari hasil sync.");
  }

  async function updateUnitPrices() {
    setUpdatingPrices(true);
    setPriceStatus("Updating prices from configured services...");
    try {
      const { prices, details, coinGeckoCount, coinMarketCapCount, alphaVantageCount, finnhubCount, metalsDevCount } = await fetchLatestPrices(
        data,
        rows.map((row) => row.holding),
        data.settings.priceServices.alphaVantageApiKey,
      );
      setPriceDetails(details);
      setRows((currentRows) =>
        currentRows.map((row) => {
          const price = prices.get(row.holdingId);
          if (!Number.isFinite(price)) return row;
          return {
            ...row,
            price: price ?? row.price,
            useCalculated: true,
            value: row.amount * (price ?? row.price),
          };
        }),
      );
      setPriceStatus(
        prices.size > 0
          ? `${prices.size} unit price berhasil diupdate (${coinGeckoCount} CoinGecko, ${coinMarketCapCount} CoinMarketCap, ${alphaVantageCount} Alpha Vantage, ${finnhubCount} Finnhub, ${metalsDevCount} Metals.dev). Detail sumber tampil di kolom Unit price.`
          : "Tidak ada harga yang cocok dari layanan price untuk asset aktif.",
      );
    } catch (error) {
      setPriceStatus(error instanceof Error ? error.message : "Update price gagal.");
    } finally {
      setUpdatingPrices(false);
    }
  }

  function saveSnapshot() {
    const lines = rows.map((row) => {
      const amount = Number(row.amount) || 0;
      const price = Number(row.price) || 0;
      return {
        holdingId: row.holdingId,
        amount,
        price,
        useCalculated: row.useCalculated,
        value: row.useCalculated ? amount * price : Number(row.value) || 0,
      };
    });
    onSave({
      id: snapshot?.id ?? buildSnapshotId(date),
      date,
      notes,
      lines,
      totalValue: lines.reduce((sum, line) => sum + line.value, 0),
    });
  }

  if (editableHoldings.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">Belum ada holding aktif atau holding bernilai di snapshot ini.</p>
        <button className="ghost-button mt-4" onClick={onCancel}>
          Back
        </button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              {snapshot ? "Edit snapshot" : "New snapshot"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{date || "Snapshot"}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Use Calculated mengaktifkan amount dan unit price. Jika tidak aktif, isi value manual.
            </p>
          </div>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-right shadow-[0_0_32px_-22px_rgba(245,158,11,0.95)]">
            <p className="text-xs uppercase tracking-wider text-amber-200">Total</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatSensitiveCurrency(total)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">
            Snapshot date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100 outline-none focus:border-amber-400"
            />
          </label>
          <label className="text-sm text-zinc-400 sm:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100 outline-none focus:border-amber-400"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="secondary-button" onClick={usePreviousRows} disabled={!previous}>
            Use previous snapshot
          </button>
          <button className="secondary-button" onClick={useAutoSyncRows}>
            <RefreshCw size={16} /> Use auto sync
          </button>
          <button className="secondary-button" onClick={updateUnitPrices} disabled={updatingPrices}>
            <RefreshCw size={16} /> {updatingPrices ? "Updating..." : "Update price"}
          </button>
          {previous ? <span className="self-center text-xs text-zinc-500">Previous: {previous.date}</span> : null}
          {priceStatus ? <span className="self-center text-xs text-amber-200/80">{priceStatus}</span> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Holding</th>
              <th className="px-3 py-3 text-center font-medium">Use calculated</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="px-3 py-3 text-right font-medium">Unit price</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const previousLine = previousLines.get(row.holdingId);
              const priceDetail = priceDetails.get(row.holdingId);

              return (
              <tr key={row.holdingId} className="align-top text-zinc-300">
                <td className="px-5 py-4">
                  <p className="font-medium text-white">
                    {row.holding.asset}
                    {shouldShowSymbol(row.holding.asset, row.holding.assetSymbol) ? (
                      <span className="text-zinc-500"> ({row.holding.assetSymbol})</span>
                    ) : null}
                    {!row.holding.active ? (
                      <span className="ml-2 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        Inactive
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.holding.platform || "-"} {row.holding.label ? `· ${row.holding.label}` : ""}
                  </p>
                  {row.holding.autoPortfolioAssetId ? (
                    <p className="mt-2 inline-flex rounded border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[11px] font-medium text-sky-100">
                      Auto sync linked
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={row.useCalculated}
                    onChange={(event) => updateRow(row.holdingId, { useCalculated: event.target.checked })}
                    className="rounded border-white/20 bg-zinc-950 checked:border-amber-500 checked:bg-amber-500"
                  />
                </td>
                <td className="px-3 py-4">
                  <input
                    inputMode="decimal"
                    value={isInputFocused(row.holdingId, "amount") ? activeInputText : formatSnapshotInput(row.amount, false, 8)}
                    disabled={!row.useCalculated}
                    onFocus={() => focusInput(row.holdingId, "amount", row.amount)}
                    onBlur={() => {
                      setFocusedInput("");
                      setActiveInputText("");
                    }}
                    onChange={(event) => {
                      const val = event.target.value;
                      setActiveInputText(val);
                      updateRow(row.holdingId, { amount: parseInputNumber(val) });
                    }}
                    className="w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-right tabular-nums text-zinc-100 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
                    placeholder="0"
                  />
                  {previousLine ? (
                    <p className="mt-1 text-right text-[11px] text-zinc-500">
                      Previous: {formatDecimal(previousLine.amount)}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-4">
                  <input
                    inputMode="decimal"
                    value={isInputFocused(row.holdingId, "price") ? activeInputText : formatSnapshotInput(row.price, false, 4)}
                    disabled={!row.useCalculated}
                    onFocus={() => focusInput(row.holdingId, "price", row.price)}
                    onBlur={() => {
                      setFocusedInput("");
                      setActiveInputText("");
                    }}
                    onChange={(event) => {
                      const val = event.target.value;
                      setActiveInputText(val);
                      updateRow(row.holdingId, { price: parseInputNumber(val) });
                    }}
                    className="w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-right tabular-nums text-zinc-100 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
                    placeholder="1"
                  />
                  {previousLine ? (
                    <p className="mt-1 text-right text-[11px] text-zinc-500">
                      Previous unit price: {formatDecimal(previousLine.price, 4)}
                    </p>
                  ) : (
                    <p className="mt-1 text-right text-[11px] text-zinc-600">No previous unit price</p>
                  )}
                  {priceDetail ? (
                    <p className="mt-1 text-right text-[11px] text-amber-200/80">
                      {displaySource(priceDetail.source)} - {priceDetail.sourceTicker ?? "-"}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <input
                    inputMode="decimal"
                    value={isInputFocused(row.holdingId, "value") ? activeInputText : formatSnapshotInput(row.value, false, 4)}
                    disabled={row.useCalculated}
                    onFocus={() => focusInput(row.holdingId, "value", row.value)}
                    onBlur={() => {
                      setFocusedInput("");
                      setActiveInputText("");
                    }}
                    onChange={(event) => {
                      const val = event.target.value;
                      setActiveInputText(val);
                      updateRow(row.holdingId, { value: parseInputNumber(val) });
                    }}
                    className="w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-right tabular-nums text-zinc-100 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
                    placeholder="0"
                  />
                  {row.useCalculated ? (
                    <p className="mt-1 text-right text-[11px] text-zinc-500">= {formatSensitiveCurrency(row.amount * row.price)}</p>
                  ) : (
                    <p className="mt-1 text-right text-[11px] text-zinc-500">Manual value</p>
                  )}
                  {previousLine ? (
                    <p className="mt-1 text-right text-[11px] text-zinc-500">
                      Previous: {formatSensitiveCurrency(previousLine.value)}
                    </p>
                  ) : null}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 p-5">
        <button className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" onClick={saveSnapshot}>
          <Save size={16} /> {snapshot ? "Update snapshot" : "Create snapshot"}
        </button>
      </div>
    </Card>
  );
}

function SnapshotDetail({
  data,
  snapshot,
  onBack,
  onEdit,
}: {
  data: PortfolioData;
  snapshot: Snapshot;
  onBack: () => void;
  onEdit: () => void;
}) {
  const mounted = useMounted();
  const { formatSensitiveCurrency, formatSensitiveNumber } = usePortfolioContext();
  const previous = previousSnapshot(data, snapshot.date);
  const rows = useMemo(() => lineRows(data, snapshot), [data, snapshot]);
  const previousRows = useMemo(() => new Map(previous?.lines.map((line) => [line.holdingId, line.value]) ?? []), [previous]);
  const delta = previous ? statDelta(snapshot.totalValue, previous.totalValue) : null;
  const comparisonRows = rows.map((row) => {
    const previousValue = previousRows.get(row.holdingId);
    const difference = row.value - (previousValue ?? 0);
    const percent = previousValue ? (difference / previousValue) * 100 : null;
    return { ...row, previousValue, difference, percent };
  });
  const comparisonChart = comparisonRows
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 18)
    .map((row) => ({
      name: row.holding.assetSymbol || row.holding.asset,
      current: row.value,
      previous: row.previousValue ?? 0,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Snapshot</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{snapshot.date}</h2>
          {snapshot.notes ? <p className="mt-1 text-sm text-zinc-500">{snapshot.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" onClick={onEdit}>
            <Pencil size={16} /> Edit
          </button>
          <button className="ghost-button" onClick={onBack}>
            Back to list
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-300/80">Total at snapshot</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{formatSensitiveCurrency(snapshot.totalValue)}</p>
          {delta ? (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
              <span className="text-zinc-400">Change vs previous snapshot</span>
              <span className={delta.difference >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {delta.difference >= 0 ? "+" : ""}
                {formatSensitiveCurrency(delta.difference)}
              </span>
              {delta.percent !== null ? (
                <span className={delta.difference >= 0 ? "text-emerald-200/80" : "text-rose-200/80"}>
                  ({delta.percent >= 0 ? "+" : ""}
                  {delta.percent.toFixed(2)}%)
                </span>
              ) : null}
            </div>
          ) : null}
          {previous ? (
            <p className="mt-4 text-sm text-zinc-500">
              Previous snapshot: <span className="text-zinc-300">{previous.date}</span>
            </p>
          ) : null}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-white">Comparison status</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-zinc-500">Holdings compared</p>
              <p className="mt-1 text-lg font-semibold text-white">{comparisonRows.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-zinc-500">Snapshot date</p>
              <p className="mt-1 text-lg font-semibold text-white">{snapshot.date}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Holding comparison</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Current vs previous snapshot for each holding</h3>
          </div>
          {previous ? <p className="text-xs text-zinc-500">Baseline: {previous.date}</p> : null}
        </div>
        <div className="mt-5 h-[28rem]">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChart}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={90} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value))} />
                <Bar dataKey="previous" fill="#52525b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </Card>

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
          <h2 className="font-semibold text-white">Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3">Asset</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-right">Unit price</th>
                <th className="px-3 py-3 text-right">Value</th>
                <th className="px-3 py-3 text-right">Prev value</th>
                <th className="px-5 py-3 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisonRows.map((row) => (
                <tr key={row.holdingId} className="text-zinc-300">
                  <td className="px-5 py-3">
                    <span className="font-medium text-white">{row.holding.asset}</span>
                    {shouldShowSymbol(row.holding.asset, row.holding.assetSymbol) ? (
                      <span className="ml-2 text-zinc-500">({row.holding.assetSymbol})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{row.holding.platform || "-"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatSensitiveNumber(row.amount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{formatSensitiveNumber(row.price)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-amber-100/90">{formatSensitiveCurrency(row.value)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-400">
                    {row.previousValue === undefined ? "-" : formatSensitiveCurrency(row.previousValue)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={`font-medium ${row.difference >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {row.difference >= 0 ? "+" : ""}
                      {formatSensitiveCurrency(row.difference)}
                    </span>
                    {row.percent !== null ? (
                      <div className={`mt-1 text-xs ${row.difference >= 0 ? "text-emerald-200/80" : "text-rose-200/80"}`}>
                        {row.percent >= 0 ? "+" : ""}
                        {row.percent.toFixed(2)}%
                      </div>
                    ) : null}
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

export function SnapshotsPage({
  data,
  onChange,
  createRequest,
}: {
  data: PortfolioData;
  onChange: (next: PortfolioData) => void;
  createRequest: number;
}) {
  const mounted = useMounted();
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | "new" | null>(null);
  const [viewingSnapshotId, setViewingSnapshotId] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"legacy" | "detailed">("legacy");

  const editingSnapshot = editingSnapshotId && editingSnapshotId !== "new"
    ? data.snapshots.find((snapshot) => snapshot.id === editingSnapshotId)
    : undefined;
  const viewingSnapshot = viewingSnapshotId ? data.snapshots.find((snapshot) => snapshot.id === viewingSnapshotId) : undefined;

  const allIds = useMemo(() => data.snapshots.map((s) => s.id), [data.snapshots]);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    if (createRequest <= 0) return;
    const timer = window.setTimeout(() => {
      setViewingSnapshotId("");
      setEditingSnapshotId("new");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [createRequest]);

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const nextData = parsePortfolioCsv(text, data);
      onChange({
        ...nextData,
        profile: data.profile,
        settings: data.settings,
        autoPortfolio: data.autoPortfolio,
        cashflow: data.cashflow,
      });
      setImportStatus(`${file.name}: CSV berhasil digabung. Total sekarang ${nextData.holdings.length} holdings dan ${nextData.snapshots.length} snapshots.`);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  }

  function deleteSnapshot(id: string) {
    const snapshot = data.snapshots.find((item) => item.id === id);
    const label = snapshot ? `${snapshot.date} (${snapshot.lines.length} holding)` : "ini";
    if (!window.confirm(`Hapus snapshot ${label}? Data snapshot yang dihapus tidak bisa dikembalikan.`)) return;
    onChange({ ...data, snapshots: data.snapshots.filter((snapshot) => snapshot.id !== id) });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function saveSnapshot(snapshot: Snapshot) {
    const exists = data.snapshots.some((item) => item.id === snapshot.id);
    onChange({
      ...data,
      snapshots: (exists
        ? data.snapshots.map((item) => (item.id === snapshot.id ? snapshot : item))
        : [snapshot, ...data.snapshots]
      ).sort((a, b) => a.date.localeCompare(b.date)),
    });
    setEditingSnapshotId(null);
    setViewingSnapshotId(snapshot.id);
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (editingSnapshotId) {
    return (
      <SnapshotEditor
        data={data}
        snapshot={editingSnapshot}
        onCancel={() => setEditingSnapshotId(null)}
        onSave={saveSnapshot}
      />
    );
  }

  if (viewingSnapshot) {
    return (
      <SnapshotDetail
        data={data}
        snapshot={viewingSnapshot}
        onBack={() => setViewingSnapshotId("")}
        onEdit={() => {
          setEditingSnapshotId(viewingSnapshot.id);
          setViewingSnapshotId("");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {importStatus ? (
        <div className="mb-4 rounded-md border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 flex items-center justify-between">
          <span>{importStatus}</span>
          <button className="text-zinc-400 hover:text-white" onClick={() => setImportStatus("")}><Trash2 size={14} /></button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Snapshots</h2>
          <p className="mt-1 text-sm text-zinc-500">Historical portfolio values at a point in time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Clear Selection Button */}
          {selectedIds.size > 0 ? (
            <button
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-all bg-white/[0.05] hover:bg-white/[0.1] px-2.5 py-1.5 rounded border border-white/5"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection ({selectedIds.size})
            </button>
          ) : null}

          {/* Export Format Selector */}
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-zinc-950 p-1">
            <button
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                exportFormat === "legacy"
                  ? "bg-amber-500 text-black font-semibold shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setExportFormat("legacy")}
              title="Legacy format: Date columns containing total asset values"
            >
              Simple (Legacy)
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                exportFormat === "detailed"
                  ? "bg-amber-500 text-black font-semibold shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setExportFormat("detailed")}
              title="Detailed format: Triple columns containing amount, price, and value per date"
            >
              Detailed
            </button>
          </div>

          <label className="secondary-button cursor-pointer">
            <FileUp size={14} /> Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importCsv} />
          </label>

          <button
            className="secondary-button"
            onClick={() => download(
              `aegis-export-${new Date().toISOString().slice(0, 10)}.csv`,
              exportPortfolioCsv(data, selectedIds, exportFormat)
            )}
          >
            <Download size={14} /> Export CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              window.confirm(
                `Hapus semua ${data.snapshots.length} snapshot? Semua data snapshot akan hilang dan tidak bisa dikembalikan.`,
              ) && onChange({ ...data, snapshots: [] })
            }
          >
            <RefreshCw size={14} /> Reset Data
          </button>
          <button className="primary-button" onClick={() => setEditingSnapshotId("new")}>
            <Plus size={16} /> New snapshot
          </button>
        </div>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold text-white">Portfolio over time</h2>
        <div className="mt-4 h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.snapshots}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value))} />
                <Bar dataKey="totalValue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-white/20 bg-zinc-950 checked:border-amber-500 checked:bg-amber-500 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3">Date</th>
              <th className="px-3 py-3 text-right">Holdings</th>
              <th className="px-3 py-3 text-right">Total value</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.snapshots.slice().sort((a, b) => b.date.localeCompare(a.date)).map((snapshot) => (
              <tr key={snapshot.id} className={`hover:bg-white/[0.015] transition-colors ${selectedIds.has(snapshot.id) ? "bg-white/[0.025]" : ""}`}>
                <td className="px-5 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(snapshot.id)}
                    onChange={() => toggleSelect(snapshot.id)}
                    className="rounded border-white/20 bg-zinc-950 checked:border-amber-500 checked:bg-amber-500 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3 font-medium text-white">{snapshot.date}</td>
                <td className="px-3 py-3 text-right text-zinc-300">{snapshot.lines.length}</td>
                <td className="px-3 py-3 text-right tabular-nums text-amber-100">{formatSensitiveCurrency(snapshot.totalValue)}</td>
                <td className="px-5 py-3 text-right">
                  <button className="icon-button mr-2" title="View snapshot" onClick={() => setViewingSnapshotId(snapshot.id)}>
                    <Eye size={15} />
                  </button>
                  <button className="icon-button mr-2" title="Edit snapshot" onClick={() => setEditingSnapshotId(snapshot.id)}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button text-rose-300" title="Delete snapshot" onClick={() => deleteSnapshot(snapshot.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
