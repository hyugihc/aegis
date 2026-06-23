"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type Column, type ColumnDef, type ColumnFiltersState, type ColumnOrderState, type RowSelectionState, type SortingState, type VisibilityState } from "@tanstack/react-table";
import { AlertTriangle, Eye, EyeOff, GripVertical, Link2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { defaultColumnOrder, formInputClass, formSelectClass, lockedColumnIds } from "@/components/aegis/constants";
import { MasterSelectField } from "@/components/aegis/master-select-field";
import { shouldShowSymbol, upsertMasterValue } from "@/components/aegis/client-utils";
import { autoPortfolioAssetLabel, formatCurrency, latestSnapshot, resolveCurrentHoldingLine, type AutoPortfolioAsset, type Holding, type PortfolioData } from "@/lib/portfolio";

type DeleteRequest = {
  ids: string[];
  title: string;
};

export function HoldingsPage({
  data,
  onChange,
}: {
  data: PortfolioData;
  onChange: (next: PortfolioData) => void;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "active", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(defaultColumnOrder);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [draggingColumnId, setDraggingColumnId] = useState("");
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const linkedAutoAssetIds = useMemo(
    () => new Set(data.holdings.map((holding) => holding.autoPortfolioAssetId).filter(Boolean)),
    [data.holdings],
  );
  const importableAutoAssets = useMemo(() => {
    return data.autoPortfolio.assets.filter((asset) => !linkedAutoAssetIds.has(asset.id));
  }, [data.autoPortfolio.assets, linkedAutoAssetIds]);
  const currentSnapshot = useMemo(() => latestSnapshot(data), [data]);
  const holdingValues = useMemo(() => {
    return new Map(
      data.holdings.map((holding) => [
        holding.id,
        resolveCurrentHoldingLine(data, holding, { snapshot: currentSnapshot }).value,
      ]),
    );
  }, [currentSnapshot, data]);

  const linkedHoldingByAutoAssetId = useMemo(() => {
    return new Map(
      data.holdings
        .filter((holding) => holding.autoPortfolioAssetId)
        .map((holding) => [holding.autoPortfolioAssetId!, holding]),
    );
  }, [data.holdings]);

  const syncedAutoAssets = useMemo(() => {
    return data.autoPortfolio.assets;
  }, [data.autoPortfolio.assets]);

  const columns = useMemo<ColumnDef<Holding>[]>(
    () => [
      {
        id: "select",
        header: "Select",
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.asset || row.original.id}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 accent-amber-400"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
      },
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
              onClick={() => setDeleteRequest({ ids: [row.original.id], title: row.original.asset || row.original.label || "holding ini" })}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: "active",
        header: "Active",
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true;
          return String(row.getValue(columnId)) === filterValue;
        },
        cell: ({ getValue }) => (
          <span className={`badge ${getValue() ? "badge-green" : "badge-muted"}`}>{getValue() ? "Active" : "Inactive"}</span>
        ),
      },
      {
        id: "currentValue",
        header: "Current value",
        accessorFn: (row) => holdingValues.get(row.id) ?? 0,
        filterFn: (row, columnId, filterValue) => {
          const search = String(filterValue ?? "").trim();
          if (!search) return true;
          return String(Math.round(Number(row.getValue(columnId)) || 0)).includes(search.replace(/\D/g, ""));
        },
        cell: ({ getValue }) => <span className="font-semibold text-amber-100">{formatCurrency(getValue<number>())}</span>,
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
    [data, holdingValues],
  );

  const table = useReactTable({
    data: data.holdings,
    columns,
    state: { globalFilter, columnFilters, sorting, columnVisibility, columnOrder, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 200 } },
  });

  const selectedHoldingIds = table.getSelectedRowModel().rows.map((row) => row.original.id);

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

  function deleteHoldings(ids: string[]) {
    const deletingIds = new Set(ids);
    onChange({
      ...data,
      holdings: data.holdings.filter((holding) => !deletingIds.has(holding.id)),
      snapshots: data.snapshots.map((snapshot) => {
        const lines = snapshot.lines.filter((line) => !deletingIds.has(line.holdingId));
        return {
          ...snapshot,
          lines,
          totalValue: lines.reduce((sum, line) => sum + line.value, 0),
        };
      }),
    });
    setRowSelection({});
    setDeleteRequest(null);
  }

  function importAutoSyncHoldings(assetIds: string[]) {
    const importingIds = new Set(assetIds);
    const nextHoldings = importableAutoAssets.filter((asset) => importingIds.has(asset.id)).map(holdingFromAutoAsset);
    if (nextHoldings.length === 0) return;
    onChange({
      ...data,
      holdings: [...nextHoldings, ...data.holdings],
    });
    setImportOpen(false);
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
        {selectedHoldingIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400">{selectedHoldingIds.length} selected</span>
            <button className="secondary-button" onClick={() => table.toggleAllPageRowsSelected(true)}>
              Select page
            </button>
            <button className="ghost-button" onClick={() => table.resetRowSelection()}>
              Clear
            </button>
            <button
              className="secondary-button text-rose-300"
              onClick={() => setDeleteRequest({ ids: selectedHoldingIds, title: `${selectedHoldingIds.length} holdings terpilih` })}
            >
              <Trash2 size={16} /> Delete selected
            </button>
          </div>
        ) : null}
        <button
          className="secondary-button"
          onClick={() => setImportOpen(true)}
          disabled={syncedAutoAssets.length === 0}
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
            .filter((column) => column.id !== "select" && column.id !== "actions")
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
          <table className="min-w-[1440px] text-left text-sm">
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
                      className={`px-3 py-3 align-top font-medium ${!lockedColumnIds.includes(header.column.id) ? "cursor-grab active:cursor-grabbing" : ""} ${draggingColumnId === header.column.id ? "opacity-50" : ""} ${header.column.id === "select" ? "sticky left-0 z-30 w-[48px] min-w-[48px] max-w-[48px] bg-zinc-950/95 backdrop-blur" : ""} ${header.column.id === "actions" ? "sticky left-[48px] z-20 w-[88px] min-w-[88px] max-w-[88px] border-r border-white/10 bg-zinc-950/95 backdrop-blur" : ""}`}
                    >
                      <button
                        className={header.column.getCanSort() ? "inline-flex items-center gap-1 hover:text-amber-300" : ""}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : ""}
                        {!lockedColumnIds.includes(header.column.id) ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-300/35 bg-amber-300/10 text-amber-200 shadow-[0_0_18px_-10px_rgba(245,158,11,0.95)]"
                            title="Drag to rearrange column"
                          >
                            <GripVertical size={14} strokeWidth={2.5} />
                          </span>
                        ) : null}
                      </button>
                      {header.column.getCanFilter() ? <ColumnFilter column={header.column} /> : null}
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
                      className={`px-3 py-3 align-top ${cell.column.id === "select" ? "sticky left-0 z-20 w-[48px] min-w-[48px] max-w-[48px] bg-zinc-950/95 backdrop-blur" : ""} ${cell.column.id === "actions" ? "sticky left-[48px] z-10 w-[88px] min-w-[88px] max-w-[88px] border-r border-white/10 bg-zinc-950/95 shadow-[12px_0_18px_-16px_rgba(0,0,0,0.9)] backdrop-blur" : ""}`}
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

      {deleteRequest ? (
        <DeleteHoldingDialog
          title={deleteRequest.title}
          count={deleteRequest.ids.length}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={() => deleteHoldings(deleteRequest.ids)}
        />
      ) : null}
      {importOpen ? (
        <ImportSyncedAssetsDialog
          data={data}
          assets={syncedAutoAssets}
          linkedHoldingByAutoAssetId={linkedHoldingByAutoAssetId}
          onCancel={() => setImportOpen(false)}
          onImport={importAutoSyncHoldings}
        />
      ) : null}
      {editing ? <HoldingEditor data={data} holding={editing} onCancel={() => setEditing(null)} onSave={saveHolding} /> : null}
    </div>
  );
}

function ColumnFilter({ column }: { column: Column<Holding> }) {
  const value = column.getFilterValue();

  if (column.id === "active") {
    return (
      <select
        value={String(value ?? "")}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        className="mt-2 w-full min-w-24 rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-[11px] normal-case tracking-normal text-zinc-200 outline-none focus:border-amber-400"
      >
        <option value="">All</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    );
  }

  return (
    <input
      value={String(value ?? "")}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => column.setFilterValue(event.target.value || undefined)}
      placeholder="Filter"
      className="mt-2 w-full min-w-28 rounded-md border border-white/10 bg-zinc-950/80 px-2 py-1.5 text-[11px] normal-case tracking-normal text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-amber-400"
    />
  );
}

function DeleteHoldingDialog({
  title,
  count,
  onCancel,
  onConfirm,
}: {
  title: string;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="glass-panel w-full max-w-lg rounded-lg p-5 shadow-[0_0_56px_-28px_rgba(251,113,133,0.9)]">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-400/25 bg-rose-400/10 text-rose-200">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-200">Peringatan hapus holding</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {count === 1 ? "Holding ini" : `${count} holdings ini`} akan dihapus dari daftar holding dan semua line snapshot terkait juga ikut dihapus.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="secondary-button border-rose-400/30 text-rose-200 hover:border-rose-300/60" onClick={onConfirm}>
            <Trash2 size={16} /> Delete holding
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportSyncedAssetsDialog({
  data,
  assets,
  linkedHoldingByAutoAssetId,
  onCancel,
  onImport,
}: {
  data: PortfolioData;
  assets: AutoPortfolioAsset[];
  linkedHoldingByAutoAssetId: Map<string, Holding>;
  onCancel: () => void;
  onImport: (assetIds: string[]) => void;
}) {
  const availableAssets = assets.filter((asset) => !linkedHoldingByAutoAssetId.has(asset.id));
  const [selectedAssetIds, setSelectedAssetIds] = useState(() => new Set(availableAssets.map((asset) => asset.id)));
  const selectedCount = selectedAssetIds.size;

  function toggleAsset(assetId: string, checked: boolean) {
    if (linkedHoldingByAutoAssetId.has(assetId)) return;
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedAssetIds(checked ? new Set(availableAssets.map((asset) => asset.id)) : new Set());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="glass-panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg shadow-[0_0_56px_-28px_rgba(245,158,11,0.85)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Import synced assets</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Pilih asset yang akan dibuat menjadi holding</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Asset yang sudah terhubung tetap ditampilkan, tapi tidak bisa diimpor ulang.
          </p>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <label className="mb-3 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={availableAssets.length > 0 && selectedCount === availableAssets.length}
              disabled={availableAssets.length === 0}
              onChange={(event) => toggleAll(event.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Select all available assets
          </label>
          <div className="divide-y divide-white/5 rounded-md border border-white/10">
            {assets.map((asset) => {
              const linkedHolding = linkedHoldingByAutoAssetId.get(asset.id);
              const disabled = Boolean(linkedHolding);
              return (
                <label key={asset.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 ${disabled ? "cursor-not-allowed bg-white/[0.015] opacity-55" : "cursor-pointer hover:bg-white/[0.03]"}`}>
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.has(asset.id)}
                    disabled={disabled}
                    onChange={(event) => toggleAsset(asset.id, event.target.checked)}
                    className="h-4 w-4 accent-amber-400"
                  />
                  <span>
                    <span className="block font-medium text-white">{autoPortfolioAssetLabel(data, asset)}</span>
                    <span className="text-xs text-zinc-500">
                      {asset.assetType || "-"} / synced {asset.syncedAt ? asset.syncedAt.slice(0, 10) : "-"}
                      {linkedHolding ? ` / linked to ${linkedHolding.asset || linkedHolding.label || linkedHolding.id}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-amber-100">{formatCurrency(asset.value)}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            <p>
              Setelah import, asset terpilih akan dibuat sebagai holding baru dan langsung ditautkan ke auto sync asset masing-masing.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" disabled={selectedCount === 0} onClick={() => onImport(Array.from(selectedAssetIds))}>
            <Link2 size={16} /> Import {selectedCount} assets
          </button>
        </div>
      </div>
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
  const linkedHoldingByAutoAssetId = useMemo(() => {
    return new Map(
      data.holdings
        .filter((item) => item.autoPortfolioAssetId && item.id !== holding.id)
        .map((item) => [item.autoPortfolioAssetId!, item]),
    );
  }, [data.holdings, holding.id]);

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
              {autoAssets.map((asset) => {
                const linkedHolding = linkedHoldingByAutoAssetId.get(asset.id);
                return (
                  <option key={asset.id} value={asset.id} disabled={Boolean(linkedHolding)}>
                    {autoPortfolioAssetLabel(data, asset)}
                    {linkedHolding ? ` (linked to ${linkedHolding.asset || linkedHolding.label || linkedHolding.id})` : ""}
                  </option>
                );
              })}
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
