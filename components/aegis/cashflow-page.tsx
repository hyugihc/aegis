"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Download,
  Eye,
  FileUp,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { download, parseInputNumber } from "@/components/aegis/client-utils";
import { formInputClass, formSelectClass } from "@/components/aegis/constants";
import { usePortfolioContext } from "@/context/portfolio-context";
import {
  type PortfolioCashflowPoint,
  portfolioCashflowPoints,
  type CashflowLine,
  type CashflowRecord,
  type ExpenseCategory,
  type IncomeSource,
  type PortfolioData,
} from "@/lib/portfolio";

type View = "dashboard" | "records" | "income-sources" | "expense-categories" | "portfolio";
type Notice = { type: "success" | "error"; message: string } | null;
type SortDirection = "asc" | "desc";
type RecordSortKey = "period" | "income" | "allocation" | "remaining";
type PortfolioSortKey = "period" | "monthlyValue" | "value";

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function monthLabel(record: Pick<CashflowRecord, "year" | "month">) {
  return `${monthNames[record.month - 1] ?? record.month} ${record.year}`;
}

function recordTotals(record: CashflowRecord) {
  const income = record.incomes.reduce((sum, line) => sum + line.amount, 0);
  const allocation = record.allocations.reduce((sum, line) => sum + line.amount, 0);
  return { income, allocation, remaining: income - allocation };
}

function sortRecords(records: CashflowRecord[]) {
  return records
    .slice()
    .sort((a, b) => b.year - a.year || b.month - a.month);
}

function compareNumber(a: number, b: number, direction: SortDirection) {
  return direction === "asc" ? a - b : b - a;
}

function compactName(value: string) {
  return value.trim().toLowerCase();
}

function parseCashflowAmount(value: string | number | null | undefined) {
  const raw = String(value ?? "").trim();
  const negativeMatch = /^\((.+)\)$/.exec(raw);
  if (negativeMatch) return -parseInputNumber(negativeMatch[1]);
  return parseInputNumber(raw);
}

function formatCashflowCsvAmount(value: number) {
  if (!value) return "";
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(value));
  return value < 0 ? `(${formatted})` : formatted;
}

function usedIncomeSourceIds(records: CashflowRecord[]) {
  return new Set(records.flatMap((record) => record.incomes.map((line) => line.sourceId).filter(Boolean) as string[]));
}

function usedExpenseCategoryIds(records: CashflowRecord[]) {
  return new Set(records.flatMap((record) => record.allocations.map((line) => line.categoryId).filter(Boolean) as string[]));
}

function emptyRecord(data: PortfolioData, record?: CashflowRecord): CashflowRecord {
  const today = new Date();
  const incomes = data.cashflow.incomeSources
    .filter((source) => record?.incomes.some((line) => line.sourceId === source.id) || source.showOnDashboard)
    .map((source) => ({
      id: record?.incomes.find((line) => line.sourceId === source.id)?.id ?? crypto.randomUUID(),
      sourceId: source.id,
      name: source.name,
      amount: record?.incomes.find((line) => line.sourceId === source.id)?.amount ?? 0,
    }));

  const allocations = data.cashflow.expenseCategories
    .filter((category) => record?.allocations.some((line) => line.categoryId === category.id) || category.showOnDashboard)
    .map((category) => ({
      id: record?.allocations.find((line) => line.categoryId === category.id)?.id ?? crypto.randomUUID(),
      categoryId: category.id,
      name: category.name,
      amount: record?.allocations.find((line) => line.categoryId === category.id)?.amount ?? 0,
    }));

  return {
    id: record?.id ?? `cashflow-${crypto.randomUUID()}`,
    year: record?.year ?? today.getFullYear(),
    month: record?.month ?? today.getMonth() + 1,
    notes: record?.notes ?? "",
    incomes,
    allocations,
  };
}

export function portfolioCashflowByMonth(data: PortfolioData) {
  return portfolioCashflowPoints(data);
}

export function CashflowPage({ data, onChange }: { data: PortfolioData; onChange: (next: PortfolioData) => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [notice, setNotice] = useState<Notice>(null);
  const [recordDraft, setRecordDraft] = useState<CashflowRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<CashflowRecord | null>(null);
  const [sourceDraft, setSourceDraft] = useState<IncomeSource | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<ExpenseCategory | null>(null);

  const records = sortRecords(data.cashflow.records);
  const recentRecords = records.slice(0, 5);

  function flash(nextNotice: Notice) {
    setNotice(nextNotice);
  }

  function openCreateRecord() {
    setRecordDraft(emptyRecord(data));
  }

  function openEditRecord(record: CashflowRecord) {
    setDetailRecord(null);
    setRecordDraft(emptyRecord(data, record));
  }

  function saveRecord(record: CashflowRecord) {
    if (record.year < 2000 || record.year > 2100 || record.month < 1 || record.month > 12) {
      flash({ type: "error", message: "Tahun atau bulan tidak valid." });
      return;
    }

    const duplicate = data.cashflow.records.some(
      (item) => item.id !== record.id && item.year === record.year && item.month === record.month,
    );
    if (duplicate) {
      flash({ type: "error", message: "Catatan keuangan untuk bulan ini sudah ada." });
      return;
    }

    const cleanedRecord: CashflowRecord = {
      ...record,
      incomes: record.incomes
        .filter((line) => line.sourceId && line.amount !== 0)
        .map((line) => ({ ...line, name: data.cashflow.incomeSources.find((source) => source.id === line.sourceId)?.name ?? line.name })),
      allocations: record.allocations
        .filter((line) => line.categoryId && line.amount !== 0)
        .map((line) => ({ ...line, name: data.cashflow.expenseCategories.find((category) => category.id === line.categoryId)?.name ?? line.name })),
    };

    const exists = data.cashflow.records.some((item) => item.id === cleanedRecord.id);
    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        records: exists
          ? data.cashflow.records.map((item) => (item.id === cleanedRecord.id ? cleanedRecord : item))
          : [cleanedRecord, ...data.cashflow.records],
      },
    });
    setRecordDraft(null);
    setView("records");
    flash({ type: "success", message: exists ? "Catatan keuangan berhasil diperbarui." : "Catatan keuangan berhasil dibuat." });
  }

  function deleteRecord(record: CashflowRecord) {
    if (!window.confirm(`Hapus catatan cashflow ${monthLabel(record)}? Data pendapatan dan alokasi bulan ini tidak bisa dikembalikan.`)) return;
    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        records: data.cashflow.records.filter((item) => item.id !== record.id),
      },
    });
    setDetailRecord(null);
    flash({ type: "success", message: "Catatan keuangan berhasil dihapus." });
  }

  function saveSource(source: IncomeSource) {
    const name = source.name.trim();
    if (!name) {
      flash({ type: "error", message: "Nama sumber pendapatan wajib diisi." });
      return;
    }

    const duplicate = data.cashflow.incomeSources.some((item) => item.id !== source.id && compactName(item.name) === compactName(name));
    if (duplicate) {
      flash({ type: "error", message: "Sumber pendapatan dengan nama ini sudah ada." });
      return;
    }

    const nextSource = { ...source, name, description: source.description.trim() };
    const exists = data.cashflow.incomeSources.some((item) => item.id === source.id);
    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        incomeSources: exists
          ? data.cashflow.incomeSources.map((item) => (item.id === source.id ? nextSource : item))
          : [nextSource, ...data.cashflow.incomeSources],
        records: data.cashflow.records.map((record) => ({
          ...record,
          incomes: record.incomes.map((line) => (line.sourceId === source.id ? { ...line, name: nextSource.name } : line)),
        })),
      },
    });
    setSourceDraft(null);
    flash({ type: "success", message: exists ? "Sumber pendapatan berhasil diperbarui." : "Sumber pendapatan berhasil ditambahkan." });
  }

  function deleteSource(source: IncomeSource) {
    if (usedIncomeSourceIds(data.cashflow.records).has(source.id)) {
      flash({ type: "error", message: "Tidak dapat menghapus sumber pendapatan yang masih digunakan." });
      return;
    }
    if (!window.confirm(`Hapus sumber pendapatan "${source.name}"? Data ini tidak bisa dikembalikan.`)) return;
    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        incomeSources: data.cashflow.incomeSources.filter((item) => item.id !== source.id),
      },
    });
    flash({ type: "success", message: "Sumber pendapatan berhasil dihapus." });
  }

  function saveCategory(category: ExpenseCategory) {
    const name = category.name.trim();
    if (!name) {
      flash({ type: "error", message: "Nama kategori alokasi wajib diisi." });
      return;
    }

    const duplicate = data.cashflow.expenseCategories.some((item) => item.id !== category.id && compactName(item.name) === compactName(name));
    if (duplicate) {
      flash({ type: "error", message: "Kategori alokasi dengan nama ini sudah ada." });
      return;
    }

    const nextCategory = { ...category, name, description: category.description.trim() };
    const exists = data.cashflow.expenseCategories.some((item) => item.id === category.id);
    const categories = exists
      ? data.cashflow.expenseCategories.map((item) => (item.id === category.id ? nextCategory : item))
      : [nextCategory, ...data.cashflow.expenseCategories];

    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        expenseCategories: categories,
        records: data.cashflow.records.map((record) => ({
          ...record,
          allocations: record.allocations.map((line) => (line.categoryId === category.id ? { ...line, name: nextCategory.name } : line)),
        })),
      },
    });
    setCategoryDraft(null);
    flash({ type: "success", message: exists ? "Kategori alokasi berhasil diperbarui." : "Kategori alokasi berhasil ditambahkan." });
  }

  function deleteCategory(category: ExpenseCategory) {
    if (usedExpenseCategoryIds(data.cashflow.records).has(category.id)) {
      flash({ type: "error", message: "Tidak dapat menghapus kategori alokasi yang masih digunakan." });
      return;
    }
    if (!window.confirm(`Hapus kategori alokasi "${category.name}"? Data ini tidak bisa dikembalikan.`)) return;
    onChange({
      ...data,
      cashflow: {
        ...data.cashflow,
        expenseCategories: data.cashflow.expenseCategories.filter((item) => item.id !== category.id),
      },
    });
    flash({ type: "success", message: "Kategori alokasi berhasil dihapus." });
  }

  function resetCashflow() {
    if (
      !window.confirm(
        `Hapus semua data cashflow? ${data.cashflow.records.length} catatan, ${data.cashflow.incomeSources.length} sumber pendapatan, dan ${data.cashflow.expenseCategories.length} kategori alokasi akan hilang permanen.`,
      )
    ) return;
    onChange({
      ...data,
      cashflow: {
        incomeSources: [],
        expenseCategories: [],
        records: [],
      },
    });
    setRecordDraft(null);
    setDetailRecord(null);
    setSourceDraft(null);
    setCategoryDraft(null);
    setView("dashboard");
    flash({ type: "success", message: "Semua data cashflow berhasil dihapus." });
  }

  function exportCsv() {
    if (records.length === 0) {
      flash({ type: "error", message: "Tidak ada catatan keuangan untuk diekspor." });
      return;
    }

    const usedSources = data.cashflow.incomeSources
      .filter((source) => records.some((record) => record.incomes.some((line) => line.sourceId === source.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
    const usedCategories = data.cashflow.expenseCategories
      .filter((category) => records.some((record) => record.allocations.some((line) => line.categoryId === category.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
    const rows = records
      .slice()
      .reverse()
      .map((record) => [
        `01/${String(record.month).padStart(2, "0")}/${record.year}`,
        ...usedSources.map((source) => {
          const amount = record.incomes.find((line) => line.sourceId === source.id)?.amount ?? 0;
          return formatCashflowCsvAmount(amount);
        }),
        ...usedCategories.map((category) => {
          const amount = record.allocations.find((line) => line.categoryId === category.id)?.amount ?? 0;
          return formatCashflowCsvAmount(amount);
        }),
      ]);

    download(
      `cashflow_export_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.csv`,
      Papa.unparse(
        {
          fields: ["bulan", ...usedSources.map((source) => `[income] ${source.name}`), ...usedCategories.map((category) => `[expense] ${category.name}`)],
          data: rows,
        },
        { delimiter: ";" },
      ),
    );
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsed = Papa.parse<string[]>((await file.text()).replace(/^\uFEFF/, ""), { delimiter: ";", skipEmptyLines: "greedy" });
    const [header, ...rows] = parsed.data;
    if (!header) {
      flash({ type: "error", message: "CSV tidak valid." });
      event.target.value = "";
      return;
    }

    const nextSources = [...data.cashflow.incomeSources];
    const nextCategories = [...data.cashflow.expenseCategories];
    const incomeColumns: Array<{ index: number; source: IncomeSource }> = [];
    const expenseColumns: Array<{ index: number; category: ExpenseCategory }> = [];

    header.forEach((label, index) => {
      const cleanLabel = String(label ?? "").trim();
      const incomeMatch = /^\[income\]\s*(.+)$/i.exec(cleanLabel);
      const expenseMatch = /^\[expense\]\s*(.+)$/i.exec(cleanLabel);

      if (incomeMatch) {
        const sourceName = incomeMatch[1].trim();
        let source = nextSources.find((item) => compactName(item.name) === compactName(sourceName));
        if (!source) {
          source = { id: `income-${crypto.randomUUID()}`, name: sourceName, description: "", showOnDashboard: true };
          nextSources.push(source);
        }
        incomeColumns.push({ index, source });
      }

      if (expenseMatch) {
        const categoryName = expenseMatch[1].trim();
        let category = nextCategories.find((item) => compactName(item.name) === compactName(categoryName));
        if (!category) {
          category = { id: `expense-${crypto.randomUUID()}`, name: categoryName, description: "", isPortfolioCashflow: false, showOnDashboard: true };
          nextCategories.push(category);
        }
        expenseColumns.push({ index, category });
      }
    });

    let importedCount = 0;
    const importedRecords: CashflowRecord[] = [];

    rows.forEach((row) => {
      const [day, month, year] = String(row[0] ?? "").split("/").map(Number);
      if (!day || !month || !year || month < 1 || month > 12 || year < 2000) return;
      const alreadyExists = data.cashflow.records.some((record) => record.year === year && record.month === month)
        || importedRecords.some((record) => record.year === year && record.month === month);
      if (alreadyExists) return;

      const incomes = incomeColumns
        .map(({ index, source }) => ({
          id: crypto.randomUUID(),
          sourceId: source.id,
          name: source.name,
          amount: parseCashflowAmount(row[index]),
        }))
        .filter((line) => line.amount !== 0);
      const allocations = expenseColumns
        .map(({ index, category }) => ({
          id: crypto.randomUUID(),
          categoryId: category.id,
          name: category.name,
          amount: parseCashflowAmount(row[index]),
        }))
        .filter((line) => line.amount !== 0);

      importedRecords.push({
        id: `cashflow-${year}-${String(month).padStart(2, "0")}-${crypto.randomUUID()}`,
        year,
        month,
        notes: `Imported from ${file.name}`,
        incomes,
        allocations,
      });
      importedCount += 1;
    });

    onChange({
      ...data,
      cashflow: {
        incomeSources: nextSources,
        expenseCategories: nextCategories,
        records: [...data.cashflow.records, ...importedRecords],
      },
    });
    flash({ type: "success", message: `Berhasil mengimpor ${importedCount} catatan keuangan.` });
    event.target.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Cashflow Manager</h2>
          <p className="mt-1 text-sm text-zinc-500">Kelola pendapatan, alokasi dana, dan cash-flow portofolio bulanan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="secondary-button cursor-pointer">
            <FileUp size={16} /> Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importCsv} />
          </label>
          <button className="secondary-button" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
          <button className="secondary-button" onClick={resetCashflow}>
            <RefreshCw size={16} /> Reset Data
          </button>
          <button className="primary-button" onClick={openCreateRecord}>
            <Plus size={16} /> Tambah Catatan
          </button>
        </div>
      </div>

      <CashflowNav view={view} onChange={setView} />

      {notice ? <NoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}

      {view === "dashboard" ? (
        <DashboardPanel
          data={data}
          records={recentRecords}
          onCreate={openCreateRecord}
          onEdit={openEditRecord}
          onShow={setDetailRecord}
          onDelete={deleteRecord}
          onSave={saveRecord}
          onGoToRecords={() => setView("records")}
          onGoToSources={() => setView("income-sources")}
          onGoToCategories={() => setView("expense-categories")}
        />
      ) : null}

      {view === "records" ? (
        <RecordsPanel records={records} onCreate={openCreateRecord} onShow={setDetailRecord} onEdit={openEditRecord} onDelete={deleteRecord} />
      ) : null}

      {view === "income-sources" ? (
        <SourcesPanel
          sources={data.cashflow.incomeSources}
          usedIds={usedIncomeSourceIds(data.cashflow.records)}
          onCreate={() => setSourceDraft({ id: `income-${crypto.randomUUID()}`, name: "", description: "", showOnDashboard: true })}
          onEdit={setSourceDraft}
          onDelete={deleteSource}
        />
      ) : null}

      {view === "expense-categories" ? (
        <CategoriesPanel
          categories={data.cashflow.expenseCategories}
          usedIds={usedExpenseCategoryIds(data.cashflow.records)}
          onCreate={() => setCategoryDraft({ id: `expense-${crypto.randomUUID()}`, name: "", description: "", isPortfolioCashflow: false, showOnDashboard: true })}
          onEdit={setCategoryDraft}
          onDelete={deleteCategory}
        />
      ) : null}

      {view === "portfolio" ? <PortfolioCashflowTable rows={portfolioCashflowByMonth(data)} /> : null}

      {recordDraft ? <RecordEditor data={data} record={recordDraft} onCancel={() => setRecordDraft(null)} onSave={saveRecord} /> : null}
      {detailRecord ? <RecordDetail record={detailRecord} onClose={() => setDetailRecord(null)} onEdit={() => openEditRecord(detailRecord)} /> : null}
      {sourceDraft ? <SourceEditor source={sourceDraft} onCancel={() => setSourceDraft(null)} onSave={saveSource} /> : null}
      {categoryDraft ? <CategoryEditor category={categoryDraft} onCancel={() => setCategoryDraft(null)} onSave={saveCategory} /> : null}
    </div>
  );
}

function CashflowNav({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const items: Array<{ id: View; label: string; Icon: typeof Landmark }> = [
    { id: "dashboard", label: "Dashboard", Icon: Landmark },
    { id: "records", label: "Catatan Bulanan", Icon: BarChart3 },
    { id: "income-sources", label: "Sumber Pendapatan", Icon: WalletCards },
    { id: "expense-categories", label: "Kategori Alokasi", Icon: Save },
    { id: "portfolio", label: "Portfolio Cashflow", Icon: Download },
  ];

  return (
    <div className="top-nav-scroll">
      {items.map(({ id, label, Icon }) => (
        <button key={id} className={`top-nav-item ${view === id ? "top-nav-active" : ""}`} onClick={() => onChange(id)}>
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

function NoticeBanner({ notice, onClose }: { notice: Exclude<Notice, null>; onClose: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
      notice.type === "success"
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
        : "border-rose-400/30 bg-rose-500/10 text-rose-100"
    }`}>
      <span>{notice.message}</span>
      <button className="text-current opacity-70 transition hover:opacity-100" onClick={onClose} aria-label="Close notice">
        <X size={16} />
      </button>
    </div>
  );
}

function DashboardPanel({
  data,
  records,
  onCreate,
  onEdit,
  onShow,
  onDelete,
  onSave,
  onGoToRecords,
  onGoToSources,
  onGoToCategories,
}: {
  data: PortfolioData;
  records: CashflowRecord[];
  onCreate: () => void;
  onEdit: (record: CashflowRecord) => void;
  onShow: (record: CashflowRecord) => void;
  onDelete: (record: CashflowRecord) => void;
  onSave: (record: CashflowRecord) => void;
  onGoToRecords: () => void;
  onGoToSources: () => void;
  onGoToCategories: () => void;
}) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [draft, setDraft] = useState(() => emptyRecord(data));
  const totals = useMemo(() => recordTotals(draft), [draft]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (totals.remaining < 0) {
      const confirmed = window.confirm(`Total alokasi melebihi pendapatan sebesar ${formatSensitiveCurrency(Math.abs(totals.remaining))}.\n\nYakin ingin dilanjutkan?`);
      if (!confirmed) return;
    }
    onSave(draft);
    setDraft(emptyRecord(data));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.9fr)]">
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Input Catatan Keuangan Bulanan</h3>
          <p className="mt-1 text-sm text-zinc-500">Pilih bulan, isi pendapatan dan alokasi, lalu simpan.</p>
        </div>
        <form onSubmit={submit} className="p-5">
          <RecordFields data={data} draft={draft} onChange={setDraft} fixedMasterRows />
          <BalanceSummary totals={totals} />
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="primary-button" type="submit" disabled={data.cashflow.incomeSources.length === 0 || data.cashflow.expenseCategories.length === 0}>
              <Save size={16} /> Simpan Catatan
            </button>
            {data.cashflow.incomeSources.length === 0 ? <button type="button" className="secondary-button" onClick={onGoToSources}>Buat Sumber Pendapatan</button> : null}
            {data.cashflow.expenseCategories.length === 0 ? <button type="button" className="secondary-button" onClick={onGoToCategories}>Buat Kategori Alokasi</button> : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-semibold text-white">Catatan Terbaru</h3>
          <button className="ghost-button" onClick={onGoToRecords}>Lihat Semua</button>
        </div>
        {records.length > 0 ? (
          <div className="divide-y divide-white/5">
            {records.map((record) => {
              const total = recordTotals(record);
              return (
                <div key={record.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{monthLabel(record)}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Pendapatan <span className="text-emerald-300">{formatSensitiveCurrency(total.income)}</span> | Alokasi{" "}
                        <span className="text-amber-100">{formatSensitiveCurrency(total.allocation)}</span>
                      </p>
                    </div>
                    <p className={`shrink-0 text-right text-sm font-semibold ${total.remaining < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                      {formatSensitiveCurrency(total.remaining)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button className="portfolio-action-button" onClick={() => onShow(record)}><Eye size={14} /> Detail</button>
                    <button className="portfolio-action-button" onClick={() => onEdit(record)}><Pencil size={14} /> Edit</button>
                    <button className="portfolio-action-button text-rose-300" onClick={() => onDelete(record)}><Trash2 size={14} /> Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-400">Belum ada catatan keuangan.</p>
            <button className="secondary-button mt-4" onClick={onCreate}><Plus size={16} /> Tambah Catatan</button>
          </div>
        )}
      </Card>
    </div>
  );
}

function RecordsPanel({ records, onCreate, onShow, onEdit, onDelete }: { records: CashflowRecord[]; onCreate: () => void; onShow: (record: CashflowRecord) => void; onEdit: (record: CashflowRecord) => void; onDelete: (record: CashflowRecord) => void }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [sort, setSort] = useState<{ key: RecordSortKey; direction: SortDirection }>({ key: "period", direction: "desc" });
  const sortedRecords = useMemo(() => {
    return records.slice().sort((a, b) => {
      if (sort.key === "period") return compareNumber((a.year * 12) + a.month, (b.year * 12) + b.month, sort.direction);

      const aTotals = recordTotals(a);
      const bTotals = recordTotals(b);
      return compareNumber(aTotals[sort.key], bTotals[sort.key], sort.direction);
    });
  }, [records, sort]);

  function changeSort(key: RecordSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Catatan Bulanan</h3>
          <p className="mt-1 text-sm text-zinc-500">Diurutkan dari catatan terbaru.</p>
        </div>
        <button className="primary-button" onClick={onCreate}><Plus size={16} /> Tambah Catatan</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <SortableTh active={sort.key === "period"} direction={sort.direction} onClick={() => changeSort("period")} className="px-5 py-3">
                Bulan/Tahun
              </SortableTh>
              <SortableTh active={sort.key === "income"} direction={sort.direction} onClick={() => changeSort("income")} className="px-3 py-3 text-right" align="right">
                Pendapatan
              </SortableTh>
              <SortableTh active={sort.key === "allocation"} direction={sort.direction} onClick={() => changeSort("allocation")} className="px-3 py-3 text-right" align="right">
                Alokasi
              </SortableTh>
              <SortableTh active={sort.key === "remaining"} direction={sort.direction} onClick={() => changeSort("remaining")} className="px-3 py-3 text-right" align="right">
                Selisih
              </SortableTh>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedRecords.map((record) => {
              const total = recordTotals(record);
              return (
                <tr key={record.id} className="text-zinc-300">
                  <td className="px-5 py-3 font-medium text-white">{monthLabel(record)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-300">{formatSensitiveCurrency(total.income)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-amber-100">{formatSensitiveCurrency(total.allocation)}</td>
                  <td className={`px-3 py-3 text-right tabular-nums font-semibold ${total.remaining < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatSensitiveCurrency(total.remaining)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="icon-button" onClick={() => onShow(record)} title="Detail"><Eye size={15} /></button>
                      <button className="icon-button" onClick={() => onEdit(record)} title="Edit"><Pencil size={15} /></button>
                      <button className="icon-button text-rose-300" onClick={() => onDelete(record)} title="Hapus"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedRecords.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-zinc-500" colSpan={5}>Belum ada catatan keuangan.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SortableTh({
  active,
  align = "left",
  children,
  className,
  direction,
  onClick,
}: {
  active: boolean;
  align?: "left" | "right";
  children: React.ReactNode;
  className: string;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <th className={className} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 transition hover:text-zinc-200 ${align === "right" ? "justify-end" : ""} ${active ? "text-amber-100" : ""}`}
      >
        <span>{children}</span>
        <ArrowUpDown size={13} className={active ? "text-amber-300" : "text-zinc-600"} />
      </button>
    </th>
  );
}

function PortfolioCashflowTable({ rows }: { rows: PortfolioCashflowPoint[] }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [sort, setSort] = useState<{ key: PortfolioSortKey; direction: SortDirection }>({ key: "period", direction: "desc" });
  const visibleRows = useMemo(() => {
    return rows
      .filter((row, index) => index > 0 || row.monthlyValue !== 0)
      .sort((a, b) => {
        if (sort.key === "period") return sort.direction === "asc" ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time);
        return compareNumber(a[sort.key], b[sort.key], sort.direction);
      });
  }, [rows, sort]);

  function changeSort(key: PortfolioSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-semibold text-white">Portfolio Cashflow View</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Akumulasi nilai kategori alokasi yang ditandai sebagai Cash-Flow Portofolio. Angka positif menambah saldo, angka negatif mengurangi saldo.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <SortableTh active={sort.key === "period"} direction={sort.direction} onClick={() => changeSort("period")} className="px-5 py-3">
              Bulan
            </SortableTh>
            <SortableTh active={sort.key === "monthlyValue"} direction={sort.direction} onClick={() => changeSort("monthlyValue")} className="px-5 py-3 text-right" align="right">
              Cashflow Bulanan
            </SortableTh>
            <SortableTh active={sort.key === "value"} direction={sort.direction} onClick={() => changeSort("value")} className="px-5 py-3 text-right" align="right">
              Akumulasi
            </SortableTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {visibleRows.map((row) => (
            <tr key={row.time}>
              <td className="px-5 py-3 text-white">{row.time.slice(0, 7)}</td>
              <td className={`px-5 py-3 text-right tabular-nums font-semibold ${row.monthlyValue < 0 ? "text-rose-300" : row.monthlyValue > 0 ? "text-emerald-300" : "text-zinc-500"}`}>
                {row.monthlyValue > 0 ? "+" : ""}
                {formatSensitiveCurrency(row.monthlyValue)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-100">{formatSensitiveCurrency(row.value)}</td>
            </tr>
          ))}
          {visibleRows.length === 0 ? (
            <tr><td className="px-5 py-8 text-center text-zinc-500" colSpan={3}>Belum ada cash-flow portofolio.</td></tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

function SourcesPanel({ sources, usedIds, onCreate, onEdit, onDelete }: { sources: IncomeSource[]; usedIds: Set<string>; onCreate: () => void; onEdit: (source: IncomeSource) => void; onDelete: (source: IncomeSource) => void }) {
  return (
    <MasterPanel title="Sumber Pendapatan" empty="Belum ada sumber pendapatan." onCreate={onCreate}>
      {sources.map((source) => (
        <MasterRow key={source.id} title={source.name} description={source.description} used={usedIds.has(source.id)} hidden={!source.showOnDashboard} onEdit={() => onEdit(source)} onDelete={() => onDelete(source)} />
      ))}
    </MasterPanel>
  );
}

function CategoriesPanel({ categories, usedIds, onCreate, onEdit, onDelete }: { categories: ExpenseCategory[]; usedIds: Set<string>; onCreate: () => void; onEdit: (category: ExpenseCategory) => void; onDelete: (category: ExpenseCategory) => void }) {
  return (
    <MasterPanel title="Kategori Alokasi" empty="Belum ada kategori alokasi." onCreate={onCreate}>
      {categories.map((category) => (
        <MasterRow
          key={category.id}
          title={category.name}
          description={category.description}
          used={usedIds.has(category.id)}
          hidden={!category.showOnDashboard}
          badge={category.isPortfolioCashflow ? "Cash-Flow Portofolio" : undefined}
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category)}
        />
      ))}
    </MasterPanel>
  );
}

function MasterPanel({ title, empty, children, onCreate }: { title: string; empty: string; children: React.ReactNode; onCreate: () => void }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <button className="primary-button" onClick={onCreate}><Plus size={16} /> Tambah</button>
      </div>
      <div className="p-5">
        {hasChildren ? <div className="space-y-3">{children}</div> : <div className="py-8 text-center text-sm text-zinc-500">{empty}</div>}
      </div>
    </Card>
  );
}

function MasterRow({ title, description, badge, used, hidden, onEdit, onDelete }: { title: string; description?: string; badge?: string; used: boolean; hidden?: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-white">{title}</h4>
          {badge ? <span className="badge badge-green">{badge}</span> : null}
          {used ? <span className="badge badge-muted">Digunakan</span> : null}
          {hidden ? <span className="badge badge-muted">Sembunyi di Dashboard</span> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      <div className="flex gap-2">
        <button className="portfolio-action-button" onClick={onEdit}><Pencil size={14} /> Edit</button>
        <button className="portfolio-action-button text-rose-300" onClick={onDelete}><Trash2 size={14} /> Hapus</button>
      </div>
    </div>
  );
}

function RecordEditor({ data, record, onCancel, onSave }: { data: PortfolioData; record: CashflowRecord; onCancel: () => void; onSave: (record: CashflowRecord) => void }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const [draft, setDraft] = useState(record);
  const totals = useMemo(() => recordTotals(draft), [draft]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (totals.remaining < 0) {
      const confirmed = window.confirm(`Total alokasi melebihi pendapatan sebesar ${formatSensitiveCurrency(Math.abs(totals.remaining))}.\n\nYakin ingin dilanjutkan?`);
      if (!confirmed) return;
    }
    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 p-3 sm:p-5">
      <form onSubmit={submit} className="glass-panel h-full w-full max-w-4xl overflow-y-auto rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 className="font-semibold text-white">{record.id.startsWith("cashflow-") ? "Catatan Keuangan Bulanan" : monthLabel(draft)}</h2>
            <p className="mt-1 text-xs text-zinc-500">{monthLabel(draft)}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onCancel}>Tutup</button>
        </div>
        <div className="p-5">
          <RecordFields data={data} draft={draft} onChange={setDraft} />
          <BalanceSummary totals={totals} />
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-zinc-950/80 px-5 py-4 backdrop-blur-xl">
          <button type="button" className="ghost-button" onClick={onCancel}>Batal</button>
          <button className="primary-button" type="submit"><Save size={16} /> Simpan</button>
        </div>
      </form>
    </div>
  );
}

function RecordFields({ data, draft, onChange, fixedMasterRows = false }: { data: PortfolioData; draft: CashflowRecord; onChange: (record: CashflowRecord) => void; fixedMasterRows?: boolean }) {
  function updateLine(kind: "incomes" | "allocations", lineId: string, patch: Partial<CashflowLine>) {
    onChange({
      ...draft,
      [kind]: draft[kind].map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    });
  }

  function addLine(kind: "incomes" | "allocations") {
    onChange({
      ...draft,
      [kind]: [...draft[kind], { id: crypto.randomUUID(), name: "", amount: 0 }],
    });
  }

  function removeLine(kind: "incomes" | "allocations", lineId: string) {
    onChange({
      ...draft,
      [kind]: draft[kind].filter((line) => line.id !== lineId),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-zinc-400">
          Tahun
          <input type="number" min={2000} max={2100} value={draft.year} onChange={(event) => onChange({ ...draft, year: Number(event.target.value) })} className={formInputClass} required />
        </label>
        <label className="text-sm text-zinc-400">
          Bulan
          <select value={draft.month} onChange={(event) => onChange({ ...draft, month: Number(event.target.value) })} className={formSelectClass} required>
            <option value="">-- Pilih Bulan --</option>
            {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <LineEditor
          title="Pendapatan"
          empty="Belum ada sumber pendapatan yang dikonfigurasi."
          kind="incomes"
          lines={draft.incomes}
          options={data.cashflow.incomeSources}
          fixedMasterRows={fixedMasterRows}
          onAdd={() => addLine("incomes")}
          onRemove={(id) => removeLine("incomes", id)}
          onUpdate={(id, patch) => updateLine("incomes", id, patch)}
        />
        <LineEditor
          title="Alokasi Dana"
          empty="Belum ada kategori alokasi yang dikonfigurasi."
          kind="allocations"
          lines={draft.allocations}
          options={data.cashflow.expenseCategories}
          fixedMasterRows={fixedMasterRows}
          onAdd={() => addLine("allocations")}
          onRemove={(id) => removeLine("allocations", id)}
          onUpdate={(id, patch) => updateLine("allocations", id, patch)}
        />
      </div>
    </div>
  );
}

function LineEditor({
  title,
  empty,
  kind,
  lines,
  options,
  fixedMasterRows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  empty: string;
  kind: "incomes" | "allocations";
  lines: CashflowLine[];
  options: Array<IncomeSource | ExpenseCategory>;
  fixedMasterRows: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CashflowLine>) => void;
}) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const idField = kind === "incomes" ? "sourceId" : "categoryId";
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="font-semibold text-white">{title}</h3>
        {!fixedMasterRows ? <button type="button" className="secondary-button" onClick={onAdd}><Plus size={16} /> Tambah</button> : null}
      </div>
      <div className="mt-4 space-y-3">
        {lines.length > 0 ? lines.map((line) => {
          const selectedId = line[idField];
          return (
            <div key={line.id} className={fixedMasterRows ? "grid gap-2" : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"}>
              {fixedMasterRows ? (
                <label className="text-sm text-zinc-400">
                  {options.find((option) => option.id === selectedId)?.name ?? line.name}
                  <input
                    inputMode="decimal"
                    value={line.amount || ""}
                    onChange={(event) => onUpdate(line.id, { amount: parseInputNumber(event.target.value) })}
                    className={formInputClass}
                    placeholder="0"
                  />
                </label>
              ) : (
                <>
                  <select
                    value={selectedId ?? ""}
                    onChange={(event) => {
                      const option = options.find((item) => item.id === event.target.value);
                      onUpdate(line.id, { [idField]: event.target.value, name: option?.name ?? "" });
                    }}
                    className={`${formSelectClass} mt-0`}
                    required
                  >
                    <option value="">{kind === "incomes" ? "-- Pilih Sumber --" : "-- Pilih Kategori --"}</option>
                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  <input
                    inputMode="decimal"
                    value={line.amount || ""}
                    onChange={(event) => onUpdate(line.id, { amount: parseInputNumber(event.target.value) })}
                    className={`${formInputClass} mt-0`}
                    placeholder="Jumlah"
                    required
                  />
                  <button type="button" className="secondary-button text-rose-300" onClick={() => onRemove(line.id)}><Trash2 size={16} /></button>
                </>
              )}
            </div>
          );
        }) : (
          <div className="rounded-md border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{empty}</div>
        )}
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-zinc-950/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total {title}</p>
        <p className="mt-1 text-xl font-semibold text-white">{formatSensitiveCurrency(total)}</p>
      </div>
    </div>
  );
}

function BalanceSummary({ totals }: { totals: { income: number; allocation: number; remaining: number } }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  return (
    <div className={`mt-5 rounded-lg border p-4 ${
      totals.remaining < 0
        ? "border-orange-300/30 bg-orange-400/10"
        : totals.remaining > 0
          ? "border-emerald-300/30 bg-emerald-400/10"
          : "border-sky-300/30 bg-sky-400/10"
    }`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lg font-semibold text-white">Selisih (Pendapatan - Alokasi)</span>
        <span className={`text-2xl font-bold tabular-nums ${totals.remaining < 0 ? "text-orange-300" : totals.remaining > 0 ? "text-emerald-300" : "text-sky-300"}`}>
          {formatSensitiveCurrency(totals.remaining)}
        </span>
      </div>
      {totals.remaining < 0 ? <p className="mt-2 text-sm text-orange-200">Total alokasi melebihi pendapatan sebesar {formatSensitiveCurrency(Math.abs(totals.remaining))}.</p> : null}
    </div>
  );
}

function RecordDetail({ record, onClose, onEdit }: { record: CashflowRecord; onClose: () => void; onEdit: () => void }) {
  const totals = recordTotals(record);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6">
      <Card className="w-full max-w-4xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Catatan Keuangan {monthLabel(record)}</h2>
            <p className="mt-1 text-sm text-zinc-500">Detail pendapatan dan alokasi tersimpan.</p>
          </div>
          <div className="flex gap-2">
            <button className="secondary-button" onClick={onEdit}><Pencil size={16} /> Edit</button>
            <button className="ghost-button" onClick={onClose}><ArrowLeft size={16} /> Kembali</button>
          </div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <DetailTable title="Pendapatan" totalLabel="Total Pendapatan" rows={record.incomes.map((line) => ({ name: line.name, amount: line.amount }))} />
          <DetailTable title="Alokasi" totalLabel="Total Alokasi" rows={record.allocations.map((line) => ({ name: line.name, amount: line.amount }))} />
        </div>
        <div className="px-5 pb-5">
          <BalanceSummary totals={totals} />
        </div>
      </Card>
    </div>
  );
}

function DetailTable({ title, totalLabel, rows }: { title: string; totalLabel: string; rows: Array<{ name: string; amount: number }> }) {
  const { formatSensitiveCurrency } = usePortfolioContext();
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/5">
          {rows.map((row, index) => (
            <tr key={`${row.name}-${index}`}>
              <td className="px-4 py-3 text-zinc-300">{row.name}</td>
              <td className="px-4 py-3 text-right tabular-nums text-white">{formatSensitiveCurrency(row.amount)}</td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={2}>Tidak ada data.</td></tr> : null}
          <tr className="bg-white/5 font-semibold">
            <td className="px-4 py-3 text-white">{totalLabel}</td>
            <td className="px-4 py-3 text-right tabular-nums text-white">{formatSensitiveCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SourceEditor({ source, onCancel, onSave }: { source: IncomeSource; onCancel: () => void; onSave: (source: IncomeSource) => void }) {
  const [draft, setDraft] = useState(source);
  return (
    <SimpleEditor
      title={source.name ? "Edit Sumber Pendapatan" : "Tambah Sumber Pendapatan"}
      name={draft.name}
      description={draft.description}
      showOnDashboard={draft.showOnDashboard}
      namePlaceholder="Misalnya: Gaji, Tunjangan, Bonus"
      descriptionPlaceholder="Jelaskan sumber pendapatan ini"
      onName={(name) => setDraft((current) => ({ ...current, name }))}
      onDescription={(description) => setDraft((current) => ({ ...current, description }))}
      onShowOnDashboard={(showOnDashboard) => setDraft((current) => ({ ...current, showOnDashboard }))}
      onCancel={onCancel}
      onSave={() => onSave(draft)}
    />
  );
}

function CategoryEditor({ category, onCancel, onSave }: { category: ExpenseCategory; onCancel: () => void; onSave: (category: ExpenseCategory) => void }) {
  const [draft, setDraft] = useState(category);
  return (
    <SimpleEditor
      title={category.name ? "Edit Kategori Alokasi" : "Tambah Kategori Alokasi"}
      name={draft.name}
      description={draft.description}
      portfolio={draft.isPortfolioCashflow}
      showOnDashboard={draft.showOnDashboard}
      namePlaceholder="Misalnya: Kebutuhan Pokok, Amal, Tabungan"
      descriptionPlaceholder="Jelaskan kategori alokasi ini"
      onPortfolio={(isPortfolioCashflow) => setDraft((current) => ({ ...current, isPortfolioCashflow }))}
      onName={(name) => setDraft((current) => ({ ...current, name }))}
      onDescription={(description) => setDraft((current) => ({ ...current, description }))}
      onShowOnDashboard={(showOnDashboard) => setDraft((current) => ({ ...current, showOnDashboard }))}
      onCancel={onCancel}
      onSave={() => onSave(draft)}
    />
  );
}

function SimpleEditor({
  title,
  name,
  description,
  portfolio,
  showOnDashboard,
  namePlaceholder,
  descriptionPlaceholder,
  onName,
  onDescription,
  onPortfolio,
  onShowOnDashboard,
  onCancel,
  onSave,
}: {
  title: string;
  name: string;
  description: string;
  portfolio?: boolean;
  showOnDashboard: boolean;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onPortfolio?: (value: boolean) => void;
  onShowOnDashboard: (value: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6">
      <form onSubmit={submit} className="glass-panel w-full max-w-2xl rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <label className="mt-4 block text-sm text-zinc-400">
          Nama
          <input value={name} onChange={(event) => onName(event.target.value)} className={formInputClass} placeholder={namePlaceholder} required maxLength={255} />
        </label>
        <label className="mt-4 block text-sm text-zinc-400">
          Deskripsi (Opsional)
          <textarea value={description} onChange={(event) => onDescription(event.target.value)} className={formInputClass} placeholder={descriptionPlaceholder} rows={3} maxLength={500} />
        </label>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={showOnDashboard} onChange={(event) => onShowOnDashboard(event.target.checked)} className="mt-1" />
            <span>
              Tampilkan di Dashboard Input
              <span className="mt-1 block text-xs text-zinc-500">Jika dicentang, sumber ini akan muncul di form input cepat di dashboard.</span>
            </span>
          </label>
          {onPortfolio ? (
            <label className="flex items-start gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={Boolean(portfolio)} onChange={(event) => onPortfolio(event.target.checked)} className="mt-1" />
              <span>
                Tandai sebagai Cash-Flow Portofolio
                <span className="mt-1 block text-xs text-zinc-500">Semua kategori bertanda ini akan dijumlahkan sebagai cash-flow portofolio.</span>
              </span>
            </label>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="ghost-button" onClick={onCancel}>Batal</button>
          <button className="primary-button" type="submit"><Save size={16} /> Simpan</button>
        </div>
      </form>
    </div>
  );
}
