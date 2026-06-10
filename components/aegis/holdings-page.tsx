"use client";

import { useMemo, useState } from "react";
import { ColumnDef, ColumnOrderState, SortingState, VisibilityState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Eye, EyeOff, Link2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { defaultColumnOrder, formInputClass, formSelectClass, lockedColumnIds } from "@/components/aegis/constants";
import { MasterSelectField } from "@/components/aegis/master-select-field";
import { shouldShowSymbol, upsertMasterValue } from "@/components/aegis/client-utils";
import { autoPortfolioAssetLabel, type AutoPortfolioAsset, type Holding, type PortfolioData } from "@/lib/portfolio";

export function HoldingsPage({
  data,
  onChange,
}: {
  data: PortfolioData;
  onChange: (next: PortfolioData) => void;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "active", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(defaultColumnOrder);
  const [draggingColumnId, setDraggingColumnId] = useState("");
  const [editing, setEditing] = useState<Holding | null>(null);

  const columns = useMemo<ColumnDef<Holding>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button className="icon-button" title="Edit" onClick={() => setEditing(row.original)}>
              <Pencil size={15} />
            </button>
            <button
              className="icon-button text-rose-300"
              title="Delete"
              onClick={() =>
                onChange({
                  ...data,
                  holdings: data.holdings.filter((holding) => holding.id !== row.original.id),
                  snapshots: data.snapshots.map((snapshot) => ({
                    ...snapshot,
                    lines: snapshot.lines.filter((line) => line.holdingId !== row.original.id),
                    totalValue: snapshot.lines
                      .filter((line) => line.holdingId !== row.original.id)
                      .reduce((sum, line) => sum + line.value, 0),
                  })),
                })
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "active",
        header: "Active",
        cell: ({ getValue }) => (
          <span className={`badge ${getValue() ? "badge-green" : "badge-muted"}`}>{getValue() ? "Active" : "Inactive"}</span>
        ),
      },
      { accessorKey: "platform", header: "Platform" },
      {
        accessorKey: "asset",
        header: "Asset",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.asset}</p>
            <p className="text-xs text-zinc-500">
              {[shouldShowSymbol(row.original.asset, row.original.assetSymbol) ? row.original.assetSymbol : "", row.original.assetType]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ),
      },
      { accessorKey: "label", header: "Label" },
      { accessorKey: "accountCategory", header: "Category" },
      { accessorKey: "investmentType", header: "Type" },
      { accessorKey: "assetMedium", header: "Medium" },
      { accessorKey: "riskFactor", header: "Risk" },
      { accessorKey: "liquidity", header: "Liquidity" },
      { accessorKey: "source", header: "Source" },
      {
        id: "autoSync",
        header: "Auto sync",
        accessorFn: (row) => row.autoPortfolioAssetId ?? "",
        cell: ({ row }) => {
          const asset = data.autoPortfolio.assets.find((item) => item.id === row.original.autoPortfolioAssetId);
          return asset ? (
            <span className="badge border-sky-400/25 bg-sky-400/10 text-sky-100">{asset.platform.toUpperCase()} / {asset.symbol}</span>
          ) : (
            <span className="text-zinc-600">-</span>
          );
        },
      },
      {
        id: "snapshotCount",
        header: "Snapshots",
        accessorFn: (row) => data.snapshots.filter((snapshot) => snapshot.lines.some((line) => line.holdingId === row.id)).length,
      },
      { accessorKey: "notes", header: "Notes" },
    ],
    [data, onChange],
  );

  const table = useReactTable({
    data: data.holdings,
    columns,
    state: { globalFilter, sorting, columnVisibility, columnOrder },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 200 } },
  });

  function saveHolding(holding: Holding) {
    const exists = data.holdings.some((item) => item.id === holding.id);
    let masters = data.masters;
    masters = upsertMasterValue({ ...data, masters }, "labels", holding.label);
    masters = upsertMasterValue({ ...data, masters }, "assets", holding.asset, {
      symbol: holding.assetSymbol,
      type: holding.assetType,
    });
    masters = upsertMasterValue({ ...data, masters }, "platforms", holding.platform);
    masters = upsertMasterValue({ ...data, masters }, "accountCategories", holding.accountCategory);
    masters = upsertMasterValue({ ...data, masters }, "investmentTypes", holding.investmentType);
    masters = upsertMasterValue({ ...data, masters }, "assetMediums", holding.assetMedium);
    masters = upsertMasterValue({ ...data, masters }, "riskFactors", holding.riskFactor);
    masters = upsertMasterValue({ ...data, masters }, "liquidities", holding.liquidity);
    onChange({
      ...data,
      masters,
      holdings: exists ? data.holdings.map((item) => (item.id === holding.id ? holding : item)) : [holding, ...data.holdings],
    });
    setEditing(null);
  }

  function holdingFromAutoAsset(asset: AutoPortfolioAsset): Holding {
    const connection = data.autoPortfolio.connections.find((item) => item.id === asset.connectionId);
    const assetName = asset.name || asset.symbol;
    return {
      id: `holding-auto-${asset.id}`,
      active: true,
      label: connection?.label ?? "",
      asset: assetName,
      assetSymbol: asset.symbol,
      assetType: asset.assetType,
      liquidity: "",
      riskFactor: "",
      accountCategory: "",
      assetMedium: "",
      platform: connection?.label || asset.platform.toUpperCase(),
      investmentType: asset.assetType,
      notes: "Linked from Auto Sync",
      source: asset.platform,
      externalId: asset.id,
      autoPortfolioAssetId: asset.id,
    };
  }

  function importAutoSyncHoldings() {
    const linkedAutoAssetIds = new Set(data.holdings.map((holding) => holding.autoPortfolioAssetId).filter(Boolean));
    const missingAssets = data.autoPortfolio.assets.filter((asset) => !linkedAutoAssetIds.has(asset.id));
    if (missingAssets.length === 0) return;
    const nextHoldings = missingAssets.map(holdingFromAutoAsset);
    onChange({
      ...data,
      holdings: [...nextHoldings, ...data.holdings],
    });
  }

  function moveColumn(targetColumnId: string) {
    if (!draggingColumnId || draggingColumnId === targetColumnId) return;
    if (lockedColumnIds.includes(draggingColumnId) || lockedColumnIds.includes(targetColumnId)) return;
    setColumnOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggingColumnId);
      const to = next.indexOf(targetColumnId);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, draggingColumnId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="relative block max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 text-zinc-500" size={16} />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search asset, label, category, type, medium, risk, liquidity, source"
            className="w-full rounded-md border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-400"
          />
        </label>
        <button
          className="secondary-button"
          onClick={importAutoSyncHoldings}
          disabled={data.autoPortfolio.assets.length === 0}
        >
          <Link2 size={16} /> Import synced assets
        </button>
        <button
          className="primary-button"
          onClick={() =>
            setEditing({
              id: `holding-${crypto.randomUUID()}`,
              active: true,
              label: "",
              asset: "",
              assetSymbol: "",
              assetType: "",
              liquidity: "",
              riskFactor: "",
              accountCategory: "",
              assetMedium: "",
              platform: "",
              investmentType: "",
              notes: "",
              source: "manual",
            })
          }
        >
          <Plus size={16} /> Add holding
        </button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Eye size={14} /> Table columns
        </div>
        <p className="mt-1 text-xs text-zinc-500">Drag header kolom untuk mengubah urutan. Kolom Actions tetap terkunci di kiri.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {table
            .getAllLeafColumns()
            .filter((column) => column.id !== "actions")
            .map((column) => (
              <button
                key={column.id}
                onClick={() => column.toggleVisibility()}
                className={`column-toggle ${column.getIsVisible() ? "border-amber-400/50 text-amber-100" : "text-zinc-500"}`}
              >
                {column.getIsVisible() ? <Eye size={13} /> : <EyeOff size={13} />}
                {String(column.columnDef.header)}
              </button>
            ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      draggable={!lockedColumnIds.includes(header.column.id)}
                      onDragStart={() => setDraggingColumnId(header.column.id)}
                      onDragOver={(event) => {
                        if (!lockedColumnIds.includes(header.column.id)) event.preventDefault();
                      }}
                      onDrop={() => moveColumn(header.column.id)}
                      onDragEnd={() => setDraggingColumnId("")}
                      className={`px-3 py-3 align-top font-medium ${!lockedColumnIds.includes(header.column.id) ? "cursor-grab active:cursor-grabbing" : ""} ${draggingColumnId === header.column.id ? "opacity-50" : ""} ${header.column.id === "actions" ? "sticky left-0 z-20 border-r border-white/10 bg-zinc-950/95 backdrop-blur" : ""}`}
                    >
                      <button
                        className={header.column.getCanSort() ? "inline-flex items-center gap-1 hover:text-amber-300" : ""}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : ""}
                        {!lockedColumnIds.includes(header.column.id) ? <span className="text-[10px] text-zinc-700">::</span> : null}
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/5">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="text-zinc-300 hover:bg-white/[0.025]">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-3 py-3 align-top ${cell.column.id === "actions" ? "sticky left-0 z-10 border-r border-white/10 bg-zinc-950/95 shadow-[12px_0_18px_-16px_rgba(0,0,0,0.9)] backdrop-blur" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing ? <HoldingEditor data={data} holding={editing} onCancel={() => setEditing(null)} onSave={saveHolding} /> : null}
    </div>
  );
}

function HoldingEditor({
  data,
  holding,
  onCancel,
  onSave,
}: {
  data: PortfolioData;
  holding: Holding;
  onCancel: () => void;
  onSave: (holding: Holding) => void;
}) {
  const [draft, setDraft] = useState(holding);
  const set = (key: keyof Holding, value: string | boolean | undefined) => setDraft((current) => ({ ...current, [key]: value }));
  const autoAssets = data.autoPortfolio.assets.filter((asset) => {
    const connection = data.autoPortfolio.connections.find((item) => item.id === asset.connectionId);
    return connection?.status === "active" && connection.lastSyncedAt;
  });

  function updateAsset(assetName: string) {
    const asset = data.masters.assets.find((item) => item.name === assetName);
    if (!asset) return;
    setDraft((current) => ({
      ...current,
      asset: asset.name,
      assetSymbol: asset.symbol ?? current.assetSymbol,
      assetType: asset.type ?? current.assetType,
    }));
  }

  function updateAutoPortfolioAsset(assetId: string) {
    const asset = data.autoPortfolio.assets.find((item) => item.id === assetId);
    if (!asset) {
      setDraft((current) => ({
        ...current,
        autoPortfolioAssetId: undefined,
        externalId: undefined,
        source: "manual",
      }));
      return;
    }
    const connection = data.autoPortfolio.connections.find((item) => item.id === asset.connectionId);
    const assetName = asset.name || asset.symbol;
    setDraft((current) => ({
      ...current,
      autoPortfolioAssetId: asset.id,
      externalId: asset.id,
      source: asset.platform,
      platform: current.platform || connection?.label || asset.platform.toUpperCase(),
      asset: current.asset || assetName,
      assetSymbol: current.assetSymbol || asset.symbol,
      assetType: current.assetType || asset.assetType,
      investmentType: current.investmentType || asset.assetType,
      label: current.label || connection?.label || "",
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 p-3 sm:p-5">
      <div className="glass-panel h-full w-full max-w-3xl overflow-y-auto rounded-lg shadow-[0_0_56px_-28px_rgba(245,158,11,0.85)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-950/75 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Edit holding</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{draft.asset || "New holding"}</h2>
          </div>
          <button className="ghost-button" onClick={onCancel}>
            Close
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <MasterSelectField value={draft.asset} label="Asset" options={data.masters.assets.map((item) => item.name)} onChange={updateAsset} />
          <label className="sm:col-span-2 text-sm text-zinc-400">
            Auto sync asset link
            <select
              value={draft.autoPortfolioAssetId ?? ""}
              onChange={(event) => updateAutoPortfolioAsset(event.target.value)}
              className={formSelectClass}
            >
              <option value="">Not linked</option>
              {autoAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {autoPortfolioAssetLabel(data, asset)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-500">
              Snapshot baru akan memakai quantity dan price terakhir dari asset yang terhubung.
            </span>
          </label>
          <label className="text-sm text-zinc-400">
            Symbol
            <input
              value={draft.assetSymbol}
              onChange={(event) => set("assetSymbol", event.target.value.toUpperCase())}
              className={formInputClass}
              placeholder="BTC"
            />
          </label>
          <label className="text-sm text-zinc-400">
            Asset type
            <input
              value={draft.assetType}
              onChange={(event) => set("assetType", event.target.value)}
              className={formInputClass}
              placeholder="Crypto, Stock, Gold, Cash"
            />
          </label>
          <MasterSelectField value={draft.platform} label="Platform" options={data.masters.platforms.map((item) => item.name)} onChange={(value) => set("platform", value)} />
          <MasterSelectField value={draft.label} label="Account label" options={data.masters.labels.map((item) => item.name)} onChange={(value) => set("label", value)} />
          <MasterSelectField value={draft.accountCategory} label="Account category" options={data.masters.accountCategories.map((item) => item.name)} onChange={(value) => set("accountCategory", value)} />
          <MasterSelectField value={draft.investmentType} label="Investment type" options={data.masters.investmentTypes.map((item) => item.name)} onChange={(value) => set("investmentType", value)} />
          <MasterSelectField value={draft.assetMedium} label="Asset medium" options={data.masters.assetMediums.map((item) => item.name)} onChange={(value) => set("assetMedium", value)} />
          <MasterSelectField value={draft.riskFactor} label="Risk factor" options={data.masters.riskFactors.map((item) => item.name)} onChange={(value) => set("riskFactor", value)} />
          <MasterSelectField value={draft.liquidity} label="Liquidity" options={data.masters.liquidities.map((item) => item.name)} onChange={(value) => set("liquidity", value)} />
          <label className="text-sm text-zinc-400">
            Source
            <select value={draft.source} onChange={(event) => set("source", event.target.value)} className={formSelectClass}>
              {["manual", "binance", "okx", "mexc", "ibkr", "wallet"].map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2 text-sm text-zinc-400">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => set("notes", event.target.value)}
              className={formInputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" onClick={() => onSave(draft)}>
            <Save size={16} /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
