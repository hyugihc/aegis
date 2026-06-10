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
  const metadataColumnCount = CSV_METADATA_COLUMNS.length;
  const detailedColumns = new Map<string, Extract<SnapshotColumn, { kind: "detailed" }>>();
  const legacyColumns: SnapshotColumn[] = [];

  header.slice(metadataColumnCount).forEach((label, offset) => {
    const index = offset + metadataColumnCount;
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

export function parsePortfolioCsv(csvText: string): PortfolioData {
  const parsed = Papa.parse<string[]>(csvText.replace(/^\uFEFF/, ""), {
    delimiter: ";",
    skipEmptyLines: "greedy",
  });
  const [rawHeader, ...rows] = parsed.data;
  if (!rawHeader || rawHeader.length < CSV_METADATA_COLUMNS.length) {
    throw new Error("CSV header tidak valid.");
  }

  const header = rawHeader.map((cell) => cell.replace(/^\uFEFF/, "").trim());
  const snapshotColumns = parseSnapshotColumns(header);
  const data = emptyPortfolio();
  const holdingsByKey = new Map<string, Holding>();
  const snapshotsByDate = new Map<string, Snapshot>();

  snapshotColumns.forEach((snapshotColumn) => {
    if (snapshotColumn.iso) {
      snapshotsByDate.set(snapshotColumn.iso, {
        id: `snapshot-${snapshotColumn.iso}`,
        date: snapshotColumn.iso,
        notes: "Imported from legacy Murub CSV",
        totalValue: 0,
        lines: [],
      });
    }
  });

  rows.forEach((row, rowIndex) => {
    const holding: Holding = {
      id: `holding-${rowIndex + 1}-${holdingKey({
        label: row[1] ?? "",
        asset: row[2] ?? "",
        platform: row[7] ?? "",
        investmentType: row[8] ?? "",
      })}`,
      active: String(row[0] ?? "1").trim() !== "0",
      label: row[1]?.trim() ?? "",
      asset: row[2]?.trim() ?? "",
      assetSymbol: (row[2]?.trim() ?? "").toUpperCase().replace(/\s+/g, ""),
      assetType: guessAssetType(row[2] ?? "", row[8] ?? "", row[6] ?? ""),
      liquidity: row[3]?.trim() ?? "",
      riskFactor: row[4]?.trim() ?? "",
      accountCategory: row[5]?.trim() ?? "",
      assetMedium: row[6]?.trim() ?? "",
      platform: row[7]?.trim() ?? "",
      investmentType: row[8]?.trim() ?? "",
      notes: row[9]?.trim() ?? "",
      source: sourceFromPlatform(row[7] ?? ""),
    };
    const key = holdingKey(holding);
    const canonicalHolding = holdingsByKey.get(key) ?? holding;
    if (!holdingsByKey.has(key)) {
      holdingsByKey.set(key, canonicalHolding);
    }

    pushUnique(data.masters.labels, holding.label);
    pushUnique(data.masters.assets, holding.asset, {
      symbol: holding.assetSymbol,
      type: holding.assetType,
    });
    pushUnique(data.masters.platforms, holding.platform);
    pushUnique(data.masters.accountCategories, holding.accountCategory);
    pushUnique(data.masters.investmentTypes, holding.investmentType);
    pushUnique(data.masters.assetMediums, holding.assetMedium);
    pushUnique(data.masters.riskFactors, holding.riskFactor);
    pushUnique(data.masters.liquidities, holding.liquidity);

    snapshotColumns.forEach((snapshotColumn) => {
      const line = readSnapshotLine(row, snapshotColumn);
      const snapshot = snapshotsByDate.get(snapshotColumn.iso);
      if (!line || !snapshot) return;
      snapshot.lines.push({
        holdingId: canonicalHolding.id,
        ...line,
      });
    });
  });

  data.holdings = Array.from(holdingsByKey.values());
  data.snapshots = Array.from(snapshotsByDate.values())
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
  return `${asset.platform.toUpperCase()}${connectionLabel} / ${asset.symbol}${name} · Qty ${asset.quantity.toLocaleString("id-ID", {
    maximumFractionDigits: 8,
  })}`;
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
