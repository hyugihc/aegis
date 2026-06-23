import Papa from "papaparse";

export const CSV_METADATA_COLUMNS = [
  "active",
  "label",
  "asset",
  "liquidity",
  "risk_factor",
  "account_category",
  "asset_medium",
  "platform",
  "investment_type",
  "notes",
] as const;

const CSV_HOLDING_ID_COLUMN = "holding_id";

export type MasterKey =
  | "assets"
  | "platforms"
  | "labels"
  | "accountCategories"
  | "investmentTypes"
  | "assetMediums"
  | "riskFactors"
  | "liquidities";

export type MasterItem = {
  id: string;
  name: string;
  symbol: string;
  type: string;
  priceSource: "auto" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance";
  priceTicker: string;
  priceUnit: "toz" | "g" | "kg";
};

export type Holding = {
  id: string;
  active: boolean;
  label: string;
  asset: string;
  assetSymbol: string;
  assetType: string;
  liquidity: string;
  riskFactor: string;
  accountCategory: string;
  assetMedium: string;
  platform: string;
  investmentType: string;
  notes: string;
  source: "manual" | "binance" | "okx" | "mexc" | "ibkr" | "wallet";
  externalId?: string;
  autoPortfolioAssetId?: string;
};

export type HoldingSnapshot = {
  holdingId: string;
  amount: number;
  price: number;
  value: number;
  useCalculated: boolean;
};

export type AutoPortfolioPlatform = "binance" | "okx" | "mexc" | "ibkr" | "wallet";

export type AutoPortfolioConnection = {
  id: string;
  platform: AutoPortfolioPlatform;
  label: string;
  status: "active" | "pending" | "error";
  isVerified: boolean;
  hasCredentials: boolean;
  lastSyncedAt?: string;
  lastError?: string;
  createdAt: string;
  publicAddress?: string;
  network?: string;
  baseUrl?: string;
};

export type AutoPortfolioAsset = {
  id: string;
  connectionId: string;
  platform: AutoPortfolioPlatform;
  assetType: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  value: number;
  syncedAt: string;
};

export type Snapshot = {
  id: string;
  date: string;
  notes: string;
  totalValue: number;
  lines: HoldingSnapshot[];
};

export type IncomeSource = {
  id: string;
  name: string;
  description: string;
  showOnDashboard: boolean;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  description: string;
  isPortfolioCashflow: boolean;
  showOnDashboard: boolean;
};

export type CashflowLine = {
  id: string;
  sourceId?: string;
  categoryId?: string;
  name: string;
  amount: number;
};

export type CashflowRecord = {
  id: string;
  year: number;
  month: number;
  notes: string;
  incomes: CashflowLine[];
  allocations: CashflowLine[];
};

export type PortfolioCashflowPoint = {
  time: string;
  value: number;
  monthlyValue: number;
};

export type PortfolioData = {
  profile: {
    displayName: string;
    email: string;
    currency: "IDR";
  };
  settings: {
    priceServices: {
      alphaVantageApiKey: string;
      finnhubApiKey: string;
      metalsDevApiKey: string;
      coinGeckoApiKey: string;
      coinMarketCapApiKey: string;
      marketTileSymbols: string[];
    };
    weeklyReminderEnabled: boolean;
    ai: {
      enabled: boolean;
      provider: "gemini" | "claude" | "openai" | "disabled";
      apiKey: string;
      model: string;
      promptTemplate: string;
    };
    dss: {
      targetAllocations: Record<string, number>;
      rebalanceThresholds: Record<string, number>;
      riskWarningThreshold: number;
    };
  };
  shareTokens: Array<{
    token: string;
    label: string;
    createdAt: string;
    expiresAt?: string;
    active: boolean;
  }>;
  holdings: Holding[];
  snapshots: Snapshot[];
  autoPortfolio: {
    connections: AutoPortfolioConnection[];
    assets: AutoPortfolioAsset[];
  };
  cashflow: {
    incomeSources: IncomeSource[];
    expenseCategories: ExpenseCategory[];
    records: CashflowRecord[];
  };
  masters: Record<MasterKey, MasterItem[]>;
};

export const DEFAULT_ALPHA_VANTAGE_API_KEY = "GFMO4SK60GRB17HH";
export const DEFAULT_FINNHUB_API_KEY = "d8080lhr01qq9ln2ua70d8080lhr01qq9ln2ua7g";
export const DEFAULT_METALS_DEV_API_KEY = "BBMW6VAL0PDVM02FBIBO7272FBIBO";
export const DEFAULT_COINGECKO_API_KEY = "CG-wpg7DzyKxV5jfLegWZPymQqe";
export const DEFAULT_COINMARKETCAP_API_KEY = "b036e5a40e704f609cdc24e797ddad32";

export const masterKeys: MasterKey[] = [
  "assets",
  "platforms",
  "labels",
  "accountCategories",
  "investmentTypes",
  "assetMediums",
  "riskFactors",
  "liquidities",
];

export const emptyPortfolio = (): PortfolioData => ({
  profile: { displayName: "Aegis User", email: "local@aegis.dev", currency: "IDR" },
  settings: {
    priceServices: {
      alphaVantageApiKey: DEFAULT_ALPHA_VANTAGE_API_KEY,
      finnhubApiKey: DEFAULT_FINNHUB_API_KEY,
      metalsDevApiKey: DEFAULT_METALS_DEV_API_KEY,
      coinGeckoApiKey: DEFAULT_COINGECKO_API_KEY,
      coinMarketCapApiKey: DEFAULT_COINMARKETCAP_API_KEY,
      marketTileSymbols: ["VWRA", "PAXG", "BTC"],
    },
    weeklyReminderEnabled: false,
    ai: {
      enabled: false,
      provider: "disabled",
      apiKey: "",
      model: "gemini-2.0-flash",
      promptTemplate:
        "Analisa portofolio ini dalam Bahasa Indonesia. Fokus pada kekuatan, kelemahan, risiko konsentrasi, rebalancing, dan DCA bulan ini.",
    },
    dss: {
      targetAllocations: {},
      rebalanceThresholds: {},
      riskWarningThreshold: 35,
    },
  },
  shareTokens: [],
  holdings: [],
  snapshots: [],
  autoPortfolio: {
    connections: [],
    assets: [],
  },
  cashflow: {
    incomeSources: [],
    expenseCategories: [],
    records: [],
  },
  masters: {
    assets: [],
    platforms: [],
    labels: [],
    accountCategories: [],
    investmentTypes: [],
    assetMediums: [],
    riskFactors: [],
    liquidities: [],
  },
});

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

export function dateIdToIso(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return "";
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export function isoToDateId(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

function uniqueMasterId(baseId: string, usedIds: Set<string>) {
  const cleanBaseId = slug(baseId);
  if (!usedIds.has(cleanBaseId)) {
    usedIds.add(cleanBaseId);
    return cleanBaseId;
  }

  let suffix = 2;
  let candidate = `${cleanBaseId}-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${cleanBaseId}-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

export function normalizePortfolioData(data: PortfolioData): PortfolioData {
  const defaults = emptyPortfolio();
  const masters = masterKeys.reduce(
    (nextMasters, key) => {
      const usedIds = new Set<string>();
      const usedNames = new Set<string>();
      nextMasters[key] = (data.masters[key] ?? []).reduce<MasterItem[]>((items, item) => {
        const name = String(item.name ?? "").trim();
        const normalizedName = name.toLowerCase();
        if (!name || usedNames.has(normalizedName)) return items;
        usedNames.add(normalizedName);
        items.push({
          ...item,
          id: uniqueMasterId(item.id || name, usedIds),
          name,
          symbol: item.symbol ? String(item.symbol).trim() : "",
          type: item.type ? String(item.type).trim() : "",
          priceSource:
            item.priceSource === "coingecko" ||
            item.priceSource === "coinmarketcap" ||
            item.priceSource === "alpha_vantage" ||
            item.priceSource === "finnhub" ||
            item.priceSource === "metals_dev" ||
            item.priceSource === "yahoo_finance"
              ? item.priceSource
              : "auto",
          priceTicker: item.priceTicker ? String(item.priceTicker).trim() : (item.symbol ? String(item.symbol).trim() : ""),
          priceUnit: item.priceUnit === "g" || item.priceUnit === "kg" ? item.priceUnit : "toz",
        });
        return items;
      }, []);
      return nextMasters;
    },
    {} as Record<MasterKey, MasterItem[]>,
  );

  return {
    ...data,
    autoPortfolio: {
      connections: (data.autoPortfolio?.connections ?? []).map((connection) => ({
        id: String(connection.id ?? crypto.randomUUID()),
        platform: ["binance", "okx", "mexc", "ibkr", "wallet"].includes(String(connection.platform))
          ? connection.platform
          : "binance",
        label: String(connection.label ?? ""),
        status: ["active", "pending", "error"].includes(String(connection.status))
          ? connection.status
          : "pending",
        isVerified: Boolean(connection.isVerified),
        hasCredentials: Boolean(connection.hasCredentials),
        lastSyncedAt: connection.lastSyncedAt ? String(connection.lastSyncedAt) : undefined,
        lastError: connection.lastError ? String(connection.lastError) : undefined,
        createdAt: String(connection.createdAt ?? new Date().toISOString()),
        publicAddress: connection.publicAddress ? String(connection.publicAddress) : undefined,
        network: connection.network ? String(connection.network) : undefined,
        baseUrl: connection.baseUrl ? String(connection.baseUrl) : undefined,
      })),
      assets: (data.autoPortfolio?.assets ?? []).map((asset) => ({
        id: String(asset.id ?? crypto.randomUUID()),
        connectionId: String(asset.connectionId ?? ""),
        platform: ["binance", "okx", "mexc", "ibkr", "wallet"].includes(String(asset.platform)) ? asset.platform : "binance",
        assetType: String(asset.assetType ?? "spot"),
        symbol: String(asset.symbol ?? "").trim().toUpperCase(),
        name: String(asset.name ?? ""),
        quantity: Number(asset.quantity ?? 0),
        currentPrice: Number(asset.currentPrice ?? 0),
        value: Number(asset.value ?? 0),
        syncedAt: String(asset.syncedAt ?? new Date().toISOString()),
      })),
    },
    cashflow: {
      incomeSources: (data.cashflow?.incomeSources ?? []).map((source) => ({
        id: String(source.id ?? crypto.randomUUID()),
        name: String(source.name ?? ""),
        description: String(source.description ?? ""),
        showOnDashboard: source.showOnDashboard ?? true,
      })).filter((source) => source.name.trim()),
      expenseCategories: (data.cashflow?.expenseCategories ?? []).map((category) => ({
        id: String(category.id ?? crypto.randomUUID()),
        name: String(category.name ?? ""),
        description: String(category.description ?? ""),
        isPortfolioCashflow: Boolean(category.isPortfolioCashflow),
        showOnDashboard: category.showOnDashboard ?? true,
      })).filter((category) => category.name.trim()),
      records: (data.cashflow?.records ?? []).map((record) => ({
        id: String(record.id ?? crypto.randomUUID()),
        year: Number(record.year ?? new Date().getFullYear()),
        month: Number(record.month ?? new Date().getMonth() + 1),
        notes: String(record.notes ?? ""),
        incomes: (record.incomes ?? []).map((line) => ({
          id: String(line.id ?? crypto.randomUUID()),
          sourceId: line.sourceId ? String(line.sourceId) : undefined,
          name: String(line.name ?? ""),
          amount: Number(line.amount ?? 0),
        })),
        allocations: (record.allocations ?? []).map((line) => ({
          id: String(line.id ?? crypto.randomUUID()),
          categoryId: line.categoryId ? String(line.categoryId) : undefined,
          name: String(line.name ?? ""),
          amount: Number(line.amount ?? 0),
        })),
      })),
    },
    settings: {
      ...defaults.settings,
      ...(data.settings ?? {}),
      priceServices: {
        ...defaults.settings.priceServices,
        ...(data.settings?.priceServices ?? {}),
        finnhubApiKey: String(data.settings?.priceServices?.finnhubApiKey ?? defaults.settings.priceServices.finnhubApiKey),
        metalsDevApiKey: String(data.settings?.priceServices?.metalsDevApiKey ?? defaults.settings.priceServices.metalsDevApiKey),
        coinGeckoApiKey: String(data.settings?.priceServices?.coinGeckoApiKey ?? defaults.settings.priceServices.coinGeckoApiKey),
        coinMarketCapApiKey: String(data.settings?.priceServices?.coinMarketCapApiKey ?? defaults.settings.priceServices.coinMarketCapApiKey),
        marketTileSymbols: Array.isArray(data.settings?.priceServices?.marketTileSymbols)
          ? data.settings.priceServices.marketTileSymbols.map(String).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
          : defaults.settings.priceServices.marketTileSymbols,
      },
      weeklyReminderEnabled: Boolean(data.settings?.weeklyReminderEnabled ?? defaults.settings.weeklyReminderEnabled),
      ai: {
        ...defaults.settings.ai,
        ...(data.settings?.ai ?? {}),
        enabled: Boolean(data.settings?.ai?.enabled ?? defaults.settings.ai.enabled),
        provider: ["gemini", "claude", "openai", "disabled"].includes(String(data.settings?.ai?.provider))
          ? data.settings!.ai!.provider
          : defaults.settings.ai.provider,
        apiKey: String(data.settings?.ai?.apiKey ?? ""),
        model: String(data.settings?.ai?.model ?? defaults.settings.ai.model),
        promptTemplate: String(data.settings?.ai?.promptTemplate ?? defaults.settings.ai.promptTemplate),
      },
      dss: {
        ...defaults.settings.dss,
        ...(data.settings?.dss ?? {}),
        targetAllocations: { ...(data.settings?.dss?.targetAllocations ?? {}) },
        rebalanceThresholds: { ...(data.settings?.dss?.rebalanceThresholds ?? {}) },
        riskWarningThreshold: Number(data.settings?.dss?.riskWarningThreshold ?? defaults.settings.dss.riskWarningThreshold),
      },
    },
    shareTokens: (data.shareTokens ?? []).map((token) => ({
      token: String(token.token ?? ""),
      label: String(token.label ?? "Read-only share link"),
      createdAt: String(token.createdAt ?? new Date().toISOString()),
      expiresAt: token.expiresAt ? String(token.expiresAt) : undefined,
      active: Boolean(token.active ?? true),
    })).filter((token) => token.token.trim()),
    masters,
  };
}

function holdingKey(row: Pick<Holding, "label" | "asset" | "platform" | "investmentType">) {
  return [row.label, row.asset, row.platform, row.investmentType].map(slug).join("__");
}

function sourceFromPlatform(platform: string): Holding["source"] {
  const value = platform.toLowerCase();
  if (value.includes("binance")) return "binance";
  if (value.includes("okx")) return "okx";
  if (value.includes("mexc")) return "mexc";
  if (value.includes("ibkr")) return "ibkr";
  if (value.includes("wallet")) return "wallet";
  return "manual";
}

function guessAssetType(asset: string, investmentType: string, medium: string) {
  const joined = `${asset} ${investmentType} ${medium}`.toLowerCase();
  if (joined.includes("cash") || joined.includes("rupiah") || joined.includes("dollar")) return "Cash";
  if (joined.includes("crypto") || joined.includes("bitcoin") || joined.includes("token")) return "Crypto";
  if (joined.includes("gold") || joined.includes("emas")) return "Gold";
  if (joined.includes("stock") || joined.includes("etf")) return "Stock";
  return investmentType || "Other";
}

function numberCell(value: unknown) {
  const raw = String(value ?? "").replace(/\uFEFF/g, "").trim();
  if (raw === "") return null;

  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  } else {
    const dotCount = (raw.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      normalized = raw.replace(/\./g, "");
    } else if (dotCount === 1) {
      const [left, right] = raw.split(".");
      if (/^\d+$/.test(left + right) && right.length === 3) {
        normalized = left + right;
      }
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pushUnique(items: MasterItem[], name: string, extra: Partial<MasterItem> = {}) {
  const cleanName = name.trim();
  if (!cleanName) return;
  if (!items.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) {
    items.push({
      id: uniqueMasterId(cleanName, new Set(items.map((item) => item.id))),
      name: cleanName,
      symbol: "",
      type: "",
      priceSource: "auto",
      priceTicker: "",
      priceUnit: "toz",
      ...extra,
    });
  }
}

function clonePortfolioData(data: PortfolioData): PortfolioData {
  return {
    ...data,
    profile: { ...data.profile },
    settings: {
      ...data.settings,
      priceServices: {
        ...data.settings.priceServices,
        marketTileSymbols: [...data.settings.priceServices.marketTileSymbols],
      },
      ai: { ...data.settings.ai },
      dss: {
        ...data.settings.dss,
        targetAllocations: { ...data.settings.dss.targetAllocations },
        rebalanceThresholds: { ...data.settings.dss.rebalanceThresholds },
      },
    },
    shareTokens: data.shareTokens.map((token) => ({ ...token })),
    holdings: data.holdings.map((holding) => ({ ...holding })),
    snapshots: data.snapshots.map((snapshot) => ({
      ...snapshot,
      lines: snapshot.lines.map((line) => ({ ...line })),
    })),
    autoPortfolio: {
      connections: data.autoPortfolio.connections.map((connection) => ({ ...connection })),
      assets: data.autoPortfolio.assets.map((asset) => ({ ...asset })),
    },
    cashflow: {
      incomeSources: data.cashflow.incomeSources.map((source) => ({ ...source })),
      expenseCategories: data.cashflow.expenseCategories.map((category) => ({ ...category })),
      records: data.cashflow.records.map((record) => ({
        ...record,
        incomes: record.incomes.map((line) => ({ ...line })),
        allocations: record.allocations.map((line) => ({ ...line })),
      })),
    },
    masters: masterKeys.reduce((masters, key) => {
      masters[key] = data.masters[key].map((item) => ({ ...item }));
      return masters;
    }, {} as Record<MasterKey, MasterItem[]>),
  };
}

type SnapshotColumn =
  | {
      kind: "legacy";
      iso: string;
      valueIndex: number;
    }
  | {
      kind: "detailed";
      iso: string;
      amountIndex?: number;
      priceIndex?: number;
      valueIndex?: number;
    };

function parseSnapshotColumns(header: string[]) {
  const detailedColumns = new Map<string, Extract<SnapshotColumn, { kind: "detailed" }>>();
  const legacyColumns: SnapshotColumn[] = [];

  header.forEach((label, index) => {
    const detailedMatch = /^(amount|price|value)_(\d{2}\/\d{2}\/\d{4})$/i.exec(label);
    if (detailedMatch) {
      const [, field, dateId] = detailedMatch;
      const iso = dateIdToIso(dateId);
      if (!iso) return;
      const current = detailedColumns.get(iso) ?? { kind: "detailed", iso };
      if (field.toLowerCase() === "amount") current.amountIndex = index;
      if (field.toLowerCase() === "price") current.priceIndex = index;
      if (field.toLowerCase() === "value") current.valueIndex = index;
      detailedColumns.set(iso, current);
      return;
    }

    const iso = dateIdToIso(label);
    if (iso) {
      legacyColumns.push({ kind: "legacy", iso, valueIndex: index });
    }
  });

  return detailedColumns.size > 0
    ? Array.from(detailedColumns.values()).sort((a, b) => a.iso.localeCompare(b.iso))
    : legacyColumns.sort((a, b) => a.iso.localeCompare(b.iso));
}

function hasMetadataHeader(header: string[]) {
  return CSV_METADATA_COLUMNS.every((column) =>
    header.some((cell) => cell.toLowerCase() === column.toLowerCase()),
  );
}

function headerIndex(header: string[], column: string, fallbackIndex?: number) {
  const index = header.findIndex((cell) => cell.toLowerCase() === column.toLowerCase());
  return index >= 0 ? index : fallbackIndex;
}

function rowCell(row: string[], header: string[], column: string, fallbackIndex?: number) {
  const index = headerIndex(header, column, fallbackIndex);
  return index === undefined ? "" : row[index] ?? "";
}

function mergeImportedSnapshots(currentSnapshots: Snapshot[], importedSnapshots: Snapshot[]) {
  const snapshotsByDate = new Map(currentSnapshots.map((snapshot) => [snapshot.date, { ...snapshot, lines: snapshot.lines.map((line) => ({ ...line })) }]));

  importedSnapshots.forEach((importedSnapshot) => {
    if (importedSnapshot.lines.length === 0) return;
    const existing = snapshotsByDate.get(importedSnapshot.date);
    const linesByHolding = new Map(existing?.lines.map((line) => [line.holdingId, { ...line }]) ?? []);
    importedSnapshot.lines.forEach((line) => {
      linesByHolding.set(line.holdingId, { ...line });
    });
    const lines = Array.from(linesByHolding.values());
    snapshotsByDate.set(importedSnapshot.date, {
      id: existing?.id ?? importedSnapshot.id,
      date: importedSnapshot.date,
      notes: existing?.notes ?? importedSnapshot.notes,
      lines,
      totalValue: lines.reduce((sum, line) => sum + line.value, 0),
    });
  });

  return Array.from(snapshotsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function readSnapshotLine(row: string[], snapshotColumn: SnapshotColumn): Omit<HoldingSnapshot, "holdingId"> | null {
  if (snapshotColumn.kind === "legacy") {
    const value = numberCell(row[snapshotColumn.valueIndex]);
    return value === null ? null : { amount: value, price: 1, value, useCalculated: false };
  }

  const amount = snapshotColumn.amountIndex === undefined ? null : numberCell(row[snapshotColumn.amountIndex]);
  const price = snapshotColumn.priceIndex === undefined ? null : numberCell(row[snapshotColumn.priceIndex]);
  const explicitValue = snapshotColumn.valueIndex === undefined ? null : numberCell(row[snapshotColumn.valueIndex]);
  const calculatedValue = amount !== null && price !== null ? amount * price : null;
  const value = explicitValue ?? calculatedValue ?? amount;

  if (value === null) return null;

  return {
    amount: amount ?? value,
    price: price ?? (amount && amount !== 0 ? value / amount : 1),
    value,
    useCalculated: explicitValue === null && calculatedValue !== null,
  };
}

export function parsePortfolioCsv(csvText: string, existingData?: PortfolioData): PortfolioData {
  const parsed = Papa.parse<string[]>(csvText.replace(/^\uFEFF/, ""), {
    delimiter: ";",
    skipEmptyLines: "greedy",
  });
  const [rawHeader, ...rows] = parsed.data;
  if (!rawHeader) {
    throw new Error("CSV header tidak valid.");
  }

  const header = rawHeader.map((cell) => cell.replace(/^\uFEFF/, "").trim());
  const snapshotColumns = parseSnapshotColumns(header);
  const hasHoldingIdColumn = headerIndex(header, CSV_HOLDING_ID_COLUMN) !== undefined;
  const hasMetadataColumns = hasMetadataHeader(header);
  const isSnapshotInsert = hasHoldingIdColumn && snapshotColumns.length > 0 && !hasMetadataColumns;
  if (snapshotColumns.length === 0 || (!hasMetadataColumns && !isSnapshotInsert)) {
    throw new Error("CSV header tidak valid.");
  }
  const data = existingData ? clonePortfolioData(existingData) : emptyPortfolio();
  const importedHoldingsById = new Map<string, Holding>();
  const holdingsById = new Map(data.holdings.map((holding) => [holding.id, holding]));
  const holdingsByKey = new Map(data.holdings.map((holding) => [holdingKey(holding), holding]));
  const importedSnapshotsByDate = new Map<string, Snapshot>();

  snapshotColumns.forEach((snapshotColumn) => {
    if (snapshotColumn.iso) {
      importedSnapshotsByDate.set(snapshotColumn.iso, {
        id: `snapshot-${snapshotColumn.iso}`,
        date: snapshotColumn.iso,
        notes: "Imported from legacy Murub CSV",
        totalValue: 0,
        lines: [],
      });
    }
  });

  rows.forEach((row, rowIndex) => {
    const importedHoldingId = String(rowCell(row, header, CSV_HOLDING_ID_COLUMN) ?? "").trim();
    if (isSnapshotInsert && !importedHoldingId) return;

    const rowHolding = {
      active: String(rowCell(row, header, "active", 0) ?? "1").trim() !== "0",
      label: String(rowCell(row, header, "label", 1) ?? "").trim(),
      asset: String(rowCell(row, header, "asset", 2) ?? "").trim(),
      liquidity: String(rowCell(row, header, "liquidity", 3) ?? "").trim(),
      riskFactor: String(rowCell(row, header, "risk_factor", 4) ?? "").trim(),
      accountCategory: String(rowCell(row, header, "account_category", 5) ?? "").trim(),
      assetMedium: String(rowCell(row, header, "asset_medium", 6) ?? "").trim(),
      platform: String(rowCell(row, header, "platform", 7) ?? "").trim(),
      investmentType: String(rowCell(row, header, "investment_type", 8) ?? "").trim(),
      notes: String(rowCell(row, header, "notes", 9) ?? "").trim(),
    };
    const holding: Holding = {
      id: importedHoldingId || `holding-${rowIndex + 1}-${holdingKey(rowHolding)}`,
      ...rowHolding,
      assetSymbol: rowHolding.asset.toUpperCase().replace(/\s+/g, ""),
      assetType: guessAssetType(rowHolding.asset, rowHolding.investmentType, rowHolding.assetMedium),
      source: sourceFromPlatform(rowHolding.platform),
    };
    const key = holdingKey(holding);
    const canonicalHolding = importedHoldingId ? holdingsById.get(importedHoldingId) ?? (isSnapshotInsert ? undefined : holding) : holdingsByKey.get(key) ?? holding;
    if (!canonicalHolding) return;

    if (!holdingsById.has(canonicalHolding.id)) {
      holdingsById.set(canonicalHolding.id, canonicalHolding);
      holdingsByKey.set(key, canonicalHolding);
    }
    if (!importedHoldingsById.has(canonicalHolding.id)) {
      importedHoldingsById.set(canonicalHolding.id, canonicalHolding);
    }

    if (!isSnapshotInsert) {
      pushUnique(data.masters.labels, canonicalHolding.label);
      pushUnique(data.masters.assets, canonicalHolding.asset, {
        symbol: canonicalHolding.assetSymbol,
        type: canonicalHolding.assetType,
      });
      pushUnique(data.masters.platforms, canonicalHolding.platform);
      pushUnique(data.masters.accountCategories, canonicalHolding.accountCategory);
      pushUnique(data.masters.investmentTypes, canonicalHolding.investmentType);
      pushUnique(data.masters.assetMediums, canonicalHolding.assetMedium);
      pushUnique(data.masters.riskFactors, canonicalHolding.riskFactor);
      pushUnique(data.masters.liquidities, canonicalHolding.liquidity);
    }

    snapshotColumns.forEach((snapshotColumn) => {
      const line = readSnapshotLine(row, snapshotColumn);
      const snapshot = importedSnapshotsByDate.get(snapshotColumn.iso);
      if (!line || !snapshot) return;
      snapshot.lines.push({
        holdingId: canonicalHolding.id,
        ...line,
      });
    });
  });

  data.holdings = Array.from(holdingsById.values());
  const importedSnapshots = Array.from(importedSnapshotsByDate.values())
    .map((snapshot) => {
      // Merge duplicate lines for the same holdingId to prevent batch write failures in Firestore
      const mergedLinesMap = new Map<string, HoldingSnapshot>();
      snapshot.lines.forEach((line) => {
        const existing = mergedLinesMap.get(line.holdingId);
        if (existing) {
          existing.amount += line.amount;
          existing.value += line.value;
          if (existing.amount > 0) {
            existing.price = existing.value / existing.amount;
          } else {
            existing.price = line.price || existing.price;
          }
        } else {
          mergedLinesMap.set(line.holdingId, { ...line });
        }
      });
      const lines = Array.from(mergedLinesMap.values());
      return {
        ...snapshot,
        lines,
        totalValue: lines.reduce((sum, line) => sum + line.value, 0),
      };
    })
    .filter((snapshot) => snapshot.lines.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  data.snapshots = existingData ? mergeImportedSnapshots(data.snapshots, importedSnapshots) : importedSnapshots;
  if (!existingData) {
    data.holdings = Array.from(importedHoldingsById.values());
  }

  return normalizePortfolioData(data);
}

export function exportPortfolioCsv(
  data: PortfolioData,
  selectedIds?: Set<string>,
  format: "legacy" | "detailed" = "legacy"
) {
  const snapshots = selectedIds && selectedIds.size > 0
    ? data.snapshots.filter((s) => selectedIds.has(s.id))
    : data.snapshots;

  const dates = snapshots.map((snapshot) => snapshot.date).sort();
  const rows = data.holdings.map((holding) => {
    const valuesByDate = new Map(
      snapshots.map((snapshot) => [
        snapshot.date,
        snapshot.lines.find((line) => line.holdingId === holding.id),
      ]),
    );
    const extraColumns = dates.flatMap((date) => {
      const line = valuesByDate.get(date);
      if (format === "detailed") {
        return [
          line?.amount !== undefined ? String(line.amount) : "",
          line?.price !== undefined ? String(line.price) : "",
          line?.value !== undefined ? String(Math.round(line.value)) : "",
        ];
      } else {
        return [line?.value === undefined ? "" : String(Math.round(line.value))];
      }
    });

    return [
      ...(format === "detailed" ? [holding.id] : []),
      holding.active ? "1" : "0",
      holding.label,
      holding.asset,
      holding.liquidity,
      holding.riskFactor,
      holding.accountCategory,
      holding.assetMedium,
      holding.platform,
      holding.investmentType,
      holding.notes,
      ...extraColumns,
    ];
  });

  const fields = [
    ...(format === "detailed" ? [CSV_HOLDING_ID_COLUMN] : []),
    ...CSV_METADATA_COLUMNS,
    ...dates.flatMap((date) => {
      const dateId = isoToDateId(date);
      if (format === "detailed") {
        return [`amount_${dateId}`, `price_${dateId}`, `value_${dateId}`];
      } else {
        return [dateId];
      }
    }),
  ];

  return `\uFEFF${Papa.unparse(
    {
      fields,
      data: rows,
    },
    { delimiter: ";" },
  )}`;
}

export function latestSnapshot(data: PortfolioData) {
  return [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function previousSnapshot(data: PortfolioData, selectedDate: string) {
  return [...data.snapshots]
    .filter((snapshot) => snapshot.date < selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function autoPortfolioAssetForHolding(data: PortfolioData, holding: Holding) {
  if (!holding.autoPortfolioAssetId) return undefined;
  return data.autoPortfolio.assets.find((asset) => asset.id === holding.autoPortfolioAssetId);
}

export function autoPortfolioAssetLabel(data: PortfolioData, asset: AutoPortfolioAsset) {
  const connection = data.autoPortfolio.connections.find((item) => item.id === asset.connectionId);
  const connectionLabel = connection?.label ? ` - ${connection.label}` : "";
  const name = asset.name && asset.name.toUpperCase() !== asset.symbol ? ` - ${asset.name}` : "";
  return `${asset.platform.toUpperCase()}${connectionLabel} / ${asset.symbol}${name} - ${formatCurrency(asset.value)}`;
}

function autoPortfolioLine(data: PortfolioData, holding: Holding): HoldingSnapshot | null {
  const asset = autoPortfolioAssetForHolding(data, holding);
  if (!asset) return null;
  const amount = Number(asset.quantity) || 0;
  const price = Number(asset.currentPrice) || (amount > 0 ? Number(asset.value) / amount : 0);
  return {
    holdingId: holding.id,
    amount,
    price,
    value: amount * price,
    useCalculated: true,
  };
}

export function defaultSnapshotLine(data: PortfolioData, holding: Holding, fallbackLine?: HoldingSnapshot): HoldingSnapshot {
  const autoLine = autoPortfolioLine(data, holding);
  if (autoLine) return autoLine;
  if (fallbackLine) {
    const amount = Number(fallbackLine.amount) || 0;
    const price = Number(fallbackLine.price) || 0;
    return {
      ...fallbackLine,
      value: fallbackLine.useCalculated ? amount * price : Number(fallbackLine.value) || 0,
    };
  }
  return {
    holdingId: holding.id,
    amount: 0,
    price: 0,
    value: 0,
    useCalculated: true,
  };
}

export function resolveCurrentHoldingLine(
  data: PortfolioData,
  holding: Holding,
  options: { snapshot?: Snapshot; livePrice?: number } = {},
): HoldingSnapshot {
  const snapshot = options.snapshot ?? latestSnapshot(data);
  const snapshotLine = snapshot?.lines.find((line) => line.holdingId === holding.id);
  const asset = autoPortfolioAssetForHolding(data, holding);
  const snapshotDate = snapshot?.date ?? "";
  const syncedDate = asset?.syncedAt ? asset.syncedAt.slice(0, 10) : "";
  const useAutoQuantity = Boolean(asset && syncedDate && (!snapshotDate || syncedDate > snapshotDate));
  const autoQuantity = Number(asset?.quantity ?? 0);
  const snapshotQuantity = Number(snapshotLine?.amount ?? 0);
  const amount = useAutoQuantity ? autoQuantity : snapshotQuantity;
  const autoPrice = Number(asset?.currentPrice ?? 0) || (autoQuantity > 0 ? Number(asset?.value ?? 0) / autoQuantity : 0);
  const snapshotPrice = Number(snapshotLine?.price ?? 0);
  const livePrice = Number(options.livePrice);
  const price = Number.isFinite(livePrice) && livePrice > 0
    ? livePrice
    : snapshotPrice > 0
      ? snapshotPrice
      : autoPrice;

  return {
    holdingId: holding.id,
    amount,
    price: Number.isFinite(price) ? price : 0,
    value: amount * (Number.isFinite(price) ? price : 0),
    useCalculated: true,
  };
}

export function buildSnapshotFromHoldings(
  data: PortfolioData,
  date: string,
  notes: string,
  baseSnapshot?: Snapshot,
  pricesBySymbol: Record<string, number> = {},
): Snapshot | null {
  const lines = data.holdings
    .filter((holding) => holding.active)
    .map((holding) => {
      const baseLine = baseSnapshot?.lines.find((line) => line.holdingId === holding.id);
      const amount = resolveSnapshotAmount(data, holding, date, baseSnapshot?.date, baseLine);
      const symbol = (holding.assetSymbol || holding.asset).trim().toUpperCase();
      const historicalPrice = Number(pricesBySymbol[symbol]);
      const price = Number.isFinite(historicalPrice) && historicalPrice > 0
        ? historicalPrice
        : Number(baseLine?.price ?? 0);
      return {
        holdingId: holding.id,
        amount,
        price,
        useCalculated: true,
        value: amount * price,
      };
    })
    .filter((line) => line.amount !== 0 || line.price !== 0 || line.value !== 0);

  if (lines.length === 0) return null;

  return {
    id: buildStableSnapshotId(date),
    date,
    notes,
    lines,
    totalValue: lines.reduce((sum, line) => sum + line.value, 0),
  };
}

function resolveSnapshotAmount(
  data: PortfolioData,
  holding: Holding,
  targetDate: string,
  baseDate?: string,
  baseLine?: HoldingSnapshot,
) {
  const asset = autoPortfolioAssetForHolding(data, holding);
  const syncedDate = asset?.syncedAt ? asset.syncedAt.slice(0, 10) : "";

  if (asset && syncedDate && (!baseDate || syncedDate > baseDate) && syncedDate <= targetDate) {
    return Number(asset.quantity) || 0;
  }

  return Number(baseLine?.amount ?? 0);
}

function buildStableSnapshotId(date: string) {
  return `snapshot-${date}-auto`;
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ensureWeeklySnapshots(data: PortfolioData, today = new Date().toISOString().slice(0, 10)): PortfolioData {
  const sortedSnapshots = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latestWithLines = [...sortedSnapshots].reverse().find((snapshot) => snapshot.lines.length > 0);
  if (!latestWithLines) return data;

  const existingDates = new Set(sortedSnapshots.map((snapshot) => snapshot.date));
  const generated: Snapshot[] = [];
  let baseSnapshot = latestWithLines;
  let nextDate = addDaysIso(latestWithLines.date, 7);
  let iterations = 0;

  while (nextDate <= today && iterations < 104) {
    const existing = sortedSnapshots.find((snapshot) => snapshot.date === nextDate) ?? generated.find((snapshot) => snapshot.date === nextDate);
    if (existing) {
      baseSnapshot = existing;
    } else if (!existingDates.has(nextDate)) {
      const snapshot = buildSnapshotFromHoldings(data, nextDate, "auto weekly snapshot", baseSnapshot);
      if (snapshot) {
        generated.push(snapshot);
        existingDates.add(nextDate);
        baseSnapshot = snapshot;
      }
    }

    nextDate = addDaysIso(nextDate, 7);
    iterations += 1;
  }

  if (generated.length === 0) return data;
  return {
    ...data,
    snapshots: [...data.snapshots, ...generated].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function missingHolding(holdingId: string): Holding {
  return {
    id: holdingId,
    active: false,
    label: "",
    asset: "Missing holding",
    assetSymbol: holdingId,
    assetType: "",
    liquidity: "",
    riskFactor: "",
    accountCategory: "Missing holding",
    assetMedium: "Missing holding",
    platform: "Missing holding",
    investmentType: "Missing holding",
    notes: "This holding is no longer available in master holdings.",
    source: "manual",
  };
}

export function lineRows(data: PortfolioData, snapshot?: Snapshot) {
  if (!snapshot) return [];
  return snapshot.lines
    .map((line) => {
      const holding = data.holdings.find((item) => item.id === line.holdingId) ?? missingHolding(line.holdingId);
      return { ...line, holding };
    })
    .sort((a, b) => b.value - a.value);
}

export function breakdown(
  rows: Array<HoldingSnapshot & { holding: Holding }>,
  key: keyof Pick<
    Holding,
    "accountCategory" | "platform" | "riskFactor" | "assetMedium" | "liquidity" | "investmentType" | "label"
  >,
) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(row.holding[key] || "Unassigned");
    totals.set(label, (totals.get(label) ?? 0) + row.value);
  });
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function monthStartIso(year: number, month: number) {
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

function addMonths(iso: string, amount: number) {
  const [year, month] = iso.split("-").map(Number);
  const zeroBasedMonth = (year * 12) + (month - 1) + amount;
  const nextYear = Math.floor(zeroBasedMonth / 12);
  const nextMonth = (zeroBasedMonth % 12) + 1;
  return monthStartIso(nextYear, nextMonth);
}

export function portfolioCashflowPoints(data: PortfolioData): PortfolioCashflowPoint[] {
  const portfolioCategoryIds = new Set(
    data.cashflow.expenseCategories
      .filter((category) => category.isPortfolioCashflow)
      .map((category) => category.id),
  );
  if (portfolioCategoryIds.size === 0) return [];

  const totalsByMonth = new Map<string, number>();

  data.cashflow.records.forEach((record) => {
    const time = monthStartIso(record.year, record.month);
    const value = record.allocations
        .filter((line) => line.categoryId && portfolioCategoryIds.has(line.categoryId))
        .reduce((sum, line) => sum + line.amount, 0);
    if (value !== 0) {
      totalsByMonth.set(time, (totalsByMonth.get(time) ?? 0) + value);
    }
  });

  if (totalsByMonth.size === 0) return [];

  const cashflowMonths = Array.from(totalsByMonth.keys()).sort();
  const snapshotMonths = data.snapshots.map((snapshot) => snapshot.date.slice(0, 7) + "-01").sort();
  const firstMonth = cashflowMonths[0];
  const lastCashflowMonth = cashflowMonths[cashflowMonths.length - 1];
  const lastSnapshotMonth = snapshotMonths[snapshotMonths.length - 1];
  const lastMonth = lastSnapshotMonth && lastSnapshotMonth > lastCashflowMonth ? lastSnapshotMonth : lastCashflowMonth;
  const points: PortfolioCashflowPoint[] = [
    { time: addMonths(firstMonth, -1), value: 0, monthlyValue: 0 },
  ];
  let cumulativeValue = 0;

  for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
    const monthlyValue = totalsByMonth.get(month) ?? 0;
    cumulativeValue += monthlyValue;
    points.push({ time: month, value: cumulativeValue, monthlyValue });
  }

  return points;
}
