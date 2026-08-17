import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type WriteBatch,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";
import type {
  AutoPortfolioAsset,
  AutoPortfolioConnection,
  CashflowRecord,
  ExpenseCategory,
  Holding,
  HoldingSnapshot,
  IncomeSource,
  MasterItem,
  MasterKey,
  PortfolioData,
} from "@/lib/portfolio";
import { emptyPortfolio, getHoldingLabels, normalizePortfolioData } from "@/lib/portfolio";
import { getSecureCredentials, saveSecureCredentials } from "@/lib/firebase-functions";

const USER_COLLECTION = "users";
const PROFILE_COLLECTION = "aegis_profile";
const PROFILE_DOC = "main";
const HOLDINGS_COLLECTION = "aegis_holdings";
const SNAPSHOTS_COLLECTION = "aegis_snapshots";
const HOLDING_SNAPSHOTS_COLLECTION = "aegis_holding_snapshots";
const AUTO_CONNECTIONS_COLLECTION = "aegis_platform_connections";
const AUTO_ASSETS_COLLECTION = "aegis_portfolio_assets";
const INCOME_SOURCES_COLLECTION = "aegis_income_sources";
const EXPENSE_CATEGORIES_COLLECTION = "aegis_expense_categories";
const CASHFLOW_RECORDS_COLLECTION = "aegis_cashflow_records";
const SHARE_TOKENS_COLLECTION = "aegis_share_tokens";

const masterCollections: Record<string, string> = {
  assets: "aegis_assets",
  platforms: "aegis_platforms",
  labels: "aegis_labels",
  accountCategories: "aegis_account_categories",
  investmentTypes: "aegis_investment_types",
  assetMediums: "aegis_asset_mediums",
  riskFactors: "aegis_risk_factors",
  liquidities: "aegis_liquidities",
};

const holdingSources = new Set(["manual", "binance", "okx", "mexc", "ibkr", "wallet", "etoro"]);

function userDoc(userId: string) {
  return doc(firebaseDb, USER_COLLECTION, userId);
}

function userCollection(userId: string, collectionName: string) {
  return collection(userDoc(userId), collectionName);
}

function userDocument(userId: string, collectionName: string, documentId: string) {
  return doc(userCollection(userId, collectionName), documentId);
}

function cleanRecordValue(val: any): any {
  if (val === undefined) return null;
  if (Array.isArray(val)) {
    return val.map(cleanRecordValue);
  }
  if (val !== null && typeof val === "object") {
    const constructorName = val.constructor?.name;
    if (constructorName === "FieldValue" || constructorName === "Timestamp" || constructorName === "DocumentReference") {
      return val;
    }
    if (val._delegate) {
      return val;
    }
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const v = val[key];
      if (v !== undefined) {
        cleaned[key] = cleanRecordValue(v);
      }
    }
    return cleaned;
  }
  return val;
}

function cleanRecord<T extends { id: string }>(record: T) {
  const cleaned = cleanRecordValue(record);
  cleaned.updatedAt = serverTimestamp();
  return cleaned;
}

function masterFromDoc(id: string, data: DocumentData): MasterItem {
  const symbol = data.symbol ? String(data.symbol) : "";
  return {
    id,
    name: String(data.name ?? ""),
    symbol,
    type: data.type ? String(data.type) : "",
    priceSource: (data.priceSource ? String(data.priceSource) : "auto") as MasterItem["priceSource"],
    priceTicker: data.priceTicker ? String(data.priceTicker) : symbol,
    priceUnit: (data.priceUnit ? String(data.priceUnit) : "toz") as MasterItem["priceUnit"],
  };
}

function holdingFromDoc(id: string, data: DocumentData): Holding {
  const source = String(data.source ?? "manual");
  return {
    id,
    active: Boolean(data.active ?? true),
    label: String(data.label ?? ""),
    asset: String(data.asset ?? data.assetName ?? ""),
    assetSymbol: String(data.assetSymbol ?? ""),
    assetType: String(data.assetType ?? ""),
    liquidity: String(data.liquidity ?? ""),
    riskFactor: String(data.riskFactor ?? ""),
    accountCategory: String(data.accountCategory ?? ""),
    assetMedium: String(data.assetMedium ?? ""),
    platform: String(data.platform ?? ""),
    investmentType: String(data.investmentType ?? ""),
    notes: String(data.notes ?? ""),
    source: holdingSources.has(source) ? (source as Holding["source"]) : "manual",
    externalId: data.externalId ? String(data.externalId) : undefined,
    autoPortfolioAssetId: data.autoPortfolioAssetId ? String(data.autoPortfolioAssetId) : undefined,
  };
}

function lineFromDoc(id: string, data: DocumentData): HoldingSnapshot {
  return {
    holdingId: String(data.holdingId ?? id),
    amount: Number(data.amount ?? 0),
    price: Number(data.price ?? 0),
    value: Number(data.value ?? 0),
    useCalculated: Boolean(data.useCalculated ?? false),
  };
}

function connectionFromDoc(id: string, data: DocumentData): AutoPortfolioConnection {
  const platform = String(data.platform ?? "binance");
  const status = String(data.status ?? "pending");
  return {
    id,
    platform: platform === "okx" || platform === "mexc" || platform === "ibkr" || platform === "wallet" || platform === "etoro" ? platform : "binance",
    label: String(data.label ?? ""),
    status: status === "active" || status === "error" ? status : "pending",
    isVerified: Boolean(data.isVerified ?? false),
    hasCredentials: Boolean(data.hasCredentials ?? false),
    lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : undefined,
    lastError: data.lastError ? String(data.lastError) : undefined,
    createdAt: String(data.createdAt ?? ""),
    publicAddress: data.publicAddress ? String(data.publicAddress) : undefined,
    network: data.network ? String(data.network) : undefined,
    baseUrl: data.baseUrl ? String(data.baseUrl) : undefined,
  };
}

function autoAssetFromDoc(id: string, data: DocumentData): AutoPortfolioAsset {
  const platform = String(data.platform ?? "binance");
  return {
    id,
    connectionId: String(data.connectionId ?? ""),
    platform: platform === "okx" || platform === "mexc" || platform === "ibkr" || platform === "wallet" || platform === "etoro" ? platform : "binance",
    assetType: String(data.assetType ?? "spot"),
    symbol: String(data.symbol ?? "").toUpperCase(),
    name: String(data.name ?? ""),
    quantity: Number(data.quantity ?? 0),
    currentPrice: Number(data.currentPrice ?? 0),
    value: Number(data.value ?? 0),
    syncedAt: String(data.syncedAt ?? ""),
  };
}

function incomeSourceFromDoc(id: string, data: DocumentData): IncomeSource {
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    showOnDashboard: Boolean(data.showOnDashboard ?? true),
  };
}

function expenseCategoryFromDoc(id: string, data: DocumentData): ExpenseCategory {
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    isPortfolioCashflow: Boolean(data.isPortfolioCashflow ?? false),
    showOnDashboard: Boolean(data.showOnDashboard ?? true),
  };
}

function cashflowRecordFromDoc(id: string, data: DocumentData): CashflowRecord {
  return {
    id,
    year: Number(data.year ?? new Date().getFullYear()),
    month: Number(data.month ?? new Date().getMonth() + 1),
    notes: String(data.notes ?? ""),
    incomes: Array.isArray(data.incomes) ? data.incomes : [],
    allocations: Array.isArray(data.allocations) ? data.allocations : [],
  };
}

async function commitBatches(writeOps: Array<(batch: WriteBatch) => void>) {
  for (let index = 0; index < writeOps.length; index += 450) {
    const batch = writeBatch(firebaseDb);
    writeOps.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function loadPortfolioFromFirestore(userId: string, fallbackUid?: string): Promise<{ data: PortfolioData; exists: boolean }> {
  const data = emptyPortfolio();
  let profileSnapshot = await getDoc(userDocument(userId, PROFILE_COLLECTION, PROFILE_DOC));
  let finalUserId = userId;

  if (!profileSnapshot.exists() && fallbackUid && fallbackUid !== userId) {
    const fallbackProfileSnapshot = await getDoc(userDocument(fallbackUid, PROFILE_COLLECTION, PROFILE_DOC));
    if (fallbackProfileSnapshot.exists()) {
      profileSnapshot = fallbackProfileSnapshot;
      finalUserId = fallbackUid;
    }
  }

  // New user: no profile in Firestore at all — return emptyPortfolio() with seed defaults
  if (!profileSnapshot.exists()) {
    return { data, exists: false };
  }

  if (profileSnapshot.exists()) {
    const profile = profileSnapshot.data();
    data.profile = {
      displayName: String(profile.displayName ?? data.profile.displayName),
      email: String(profile.email ?? data.profile.email),
      currency: "IDR",
    };
    
    const settings = profile.settings ?? {};
    const priceServices = settings.priceServices ?? {};
    const ai = settings.ai ?? {};
    const dss = settings.dss ?? {};
    
    data.settings = {
      ...data.settings,
      priceServices: {
        ...data.settings.priceServices,
        alphaVantageApiKey: String(priceServices.alphaVantageApiKey ?? data.settings.priceServices.alphaVantageApiKey),
        finnhubApiKey: String(priceServices.finnhubApiKey ?? data.settings.priceServices.finnhubApiKey),
        metalsDevApiKey: String(priceServices.metalsDevApiKey ?? data.settings.priceServices.metalsDevApiKey),
        coinGeckoApiKey: String(priceServices.coinGeckoApiKey ?? data.settings.priceServices.coinGeckoApiKey),
        coinMarketCapApiKey: String(priceServices.coinMarketCapApiKey ?? data.settings.priceServices.coinMarketCapApiKey),
        marketTileSymbols: Array.isArray(priceServices.marketTileSymbols)
          ? priceServices.marketTileSymbols.map(String)
          : data.settings.priceServices.marketTileSymbols,
      },
      weeklyReminderEnabled: Boolean(settings.weeklyReminderEnabled ?? data.settings.weeklyReminderEnabled),
      ai: {
        ...data.settings.ai,
        enabled: Boolean(ai.enabled ?? data.settings.ai.enabled),
        provider: ["gemini", "claude", "openai", "disabled"].includes(String(ai.provider))
          ? ai.provider
          : data.settings.ai.provider,
        apiKey: String(ai.apiKey ?? data.settings.ai.apiKey),
        model: String(ai.model ?? data.settings.ai.model),
        promptTemplate: String(ai.promptTemplate ?? data.settings.ai.promptTemplate),
      },
      dss: {
        ...data.settings.dss,
        targetAllocations: { ...data.settings.dss.targetAllocations, ...(dss.targetAllocations ?? {}) },
        rebalanceThresholds: { ...data.settings.dss.rebalanceThresholds, ...(dss.rebalanceThresholds ?? {}) },
        riskWarningThreshold: Number(dss.riskWarningThreshold ?? data.settings.dss.riskWarningThreshold),
        rebalanceDimension: dss.rebalanceDimension ? String(dss.rebalanceDimension) : data.settings.dss.rebalanceDimension,
      },
      holdingLabels: Array.isArray(settings.holdingLabels)
        ? settings.holdingLabels.map((l: any) => ({ id: String(l.id), name: String(l.name) }))
        : data.settings.holdingLabels,
    };

    if (
      data.settings.priceServices.alphaVantageApiKey === "[SECURE]" ||
      data.settings.priceServices.finnhubApiKey === "[SECURE]" ||
      data.settings.priceServices.metalsDevApiKey === "[SECURE]" ||
      data.settings.priceServices.coinGeckoApiKey === "[SECURE]" ||
      data.settings.priceServices.coinMarketCapApiKey === "[SECURE]" ||
      data.settings.ai.apiKey === "[SECURE]"
    ) {
      try {
        const secure = await getSecureCredentials("price_service", "main");
        if (secure) {
          if (secure.alphaVantageApiKey) data.settings.priceServices.alphaVantageApiKey = secure.alphaVantageApiKey;
          if (secure.finnhubApiKey) data.settings.priceServices.finnhubApiKey = secure.finnhubApiKey;
          if (secure.metalsDevApiKey) data.settings.priceServices.metalsDevApiKey = secure.metalsDevApiKey;
          if (secure.coinGeckoApiKey) data.settings.priceServices.coinGeckoApiKey = secure.coinGeckoApiKey;
          if (secure.coinMarketCapApiKey) data.settings.priceServices.coinMarketCapApiKey = secure.coinMarketCapApiKey;
        }
        const aiSecure = await getSecureCredentials("ai_service", "main");
        if (aiSecure?.apiKey) data.settings.ai.apiKey = aiSecure.apiKey;
      } catch (error) {
        console.error("Failed to load secure credentials:", error);
      }
    }
  }

  const holdingLabels = getHoldingLabels(data.settings);
  const activeMasterKeys = ["assets", "platforms", ...holdingLabels.map((l) => l.id)];

  const masterEntries = await Promise.all(
    activeMasterKeys.map(async (key) => {
      const colName = masterCollections[key] || `aegis_custom_${key}`;
      const snapshot = await getDocs(query(userCollection(finalUserId, colName), orderBy("name")));
      const items = snapshot.docs.map((item) => masterFromDoc(item.id, item.data()));
      // Fallback to seed defaults if Firestore collection is empty
      if (items.length === 0 && (data.masters as any)[key] && (data.masters as any)[key].length > 0) {
        return [key, (data.masters as any)[key]] as const;
      }
      return [key, items] as const;
    }),
  );
  data.masters = {} as any;
  masterEntries.forEach(([key, items]) => {
    data.masters[key] = items;
  });

  const holdingsSnapshot = await getDocs(query(userCollection(finalUserId, HOLDINGS_COLLECTION), orderBy("asset")));
  data.holdings = holdingsSnapshot.docs.map((item) => holdingFromDoc(item.id, item.data()));

  const snapshotsSnapshot = await getDocs(query(userCollection(finalUserId, SNAPSHOTS_COLLECTION), orderBy("date")));
  data.snapshots = await Promise.all(
    snapshotsSnapshot.docs.map(async (snapshotDoc) => {
      const snapshotData = snapshotDoc.data();
      const linesSnapshot = await getDocs(
        collection(userDocument(finalUserId, SNAPSHOTS_COLLECTION, snapshotDoc.id), HOLDING_SNAPSHOTS_COLLECTION),
      );
      const lines = linesSnapshot.docs.map((line) => lineFromDoc(line.id, line.data()));
      return {
        id: snapshotDoc.id,
        date: String(snapshotData.date ?? ""),
        notes: String(snapshotData.notes ?? ""),
        totalValue: Number(snapshotData.totalValue ?? lines.reduce((sum, line) => sum + line.value, 0)),
        lines,
      };
    }),
  );

  const connectionsSnapshot = await getDocs(query(userCollection(finalUserId, AUTO_CONNECTIONS_COLLECTION), orderBy("platform")));
  data.autoPortfolio.connections = connectionsSnapshot.docs.map((item) => connectionFromDoc(item.id, item.data()));

  const autoAssetsSnapshot = await getDocs(query(userCollection(finalUserId, AUTO_ASSETS_COLLECTION), orderBy("symbol")));
  data.autoPortfolio.assets = autoAssetsSnapshot.docs.map((item) => autoAssetFromDoc(item.id, item.data()));

  const incomeSourcesSnapshot = await getDocs(query(userCollection(finalUserId, INCOME_SOURCES_COLLECTION), orderBy("name")));
  data.cashflow.incomeSources = incomeSourcesSnapshot.docs.map((item) => incomeSourceFromDoc(item.id, item.data()));

  const expenseCategoriesSnapshot = await getDocs(query(userCollection(finalUserId, EXPENSE_CATEGORIES_COLLECTION), orderBy("name")));
  data.cashflow.expenseCategories = expenseCategoriesSnapshot.docs.map((item) => expenseCategoryFromDoc(item.id, item.data()));

  const cashflowRecordsSnapshot = await getDocs(userCollection(finalUserId, CASHFLOW_RECORDS_COLLECTION));
  const sortedRecords = cashflowRecordsSnapshot.docs.map((item) => cashflowRecordFromDoc(item.id, item.data()));
  sortedRecords.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  data.cashflow.records = sortedRecords;

  const shareTokensSnapshot = await getDocs(query(userCollection(finalUserId, SHARE_TOKENS_COLLECTION), orderBy("createdAt")));
  data.shareTokens = shareTokensSnapshot.docs.map((item) => {
    const token = item.data();
    return {
      token: item.id,
      label: String(token.label ?? "Read-only share link"),
      createdAt: String(token.createdAt ?? ""),
      expiresAt: token.expiresAt ? String(token.expiresAt) : undefined,
      active: Boolean(token.active ?? true),
    };
  });

  return { data: normalizePortfolioData(data), exists: true };
}

export async function savePortfolioToFirestore(userId: string, data: PortfolioData) {
  const normalizedData = normalizePortfolioData(data);
  const writeOps: Array<(batch: WriteBatch) => void> = [];

  const secureSettings = {
    ...normalizedData.settings,
    priceServices: {
      ...normalizedData.settings.priceServices,
      alphaVantageApiKey: "[SECURE]",
      finnhubApiKey: "[SECURE]",
      metalsDevApiKey: "[SECURE]",
      coinGeckoApiKey: "[SECURE]",
      coinMarketCapApiKey: "[SECURE]",
    },
    ai: {
      ...normalizedData.settings.ai,
      apiKey: normalizedData.settings.ai.apiKey ? "[SECURE]" : "",
    },
  };

  if (
    (normalizedData.settings.priceServices.alphaVantageApiKey && normalizedData.settings.priceServices.alphaVantageApiKey !== "[SECURE]") ||
    (normalizedData.settings.priceServices.finnhubApiKey && normalizedData.settings.priceServices.finnhubApiKey !== "[SECURE]") ||
    (normalizedData.settings.priceServices.metalsDevApiKey && normalizedData.settings.priceServices.metalsDevApiKey !== "[SECURE]") ||
    (normalizedData.settings.priceServices.coinGeckoApiKey && normalizedData.settings.priceServices.coinGeckoApiKey !== "[SECURE]") ||
    (normalizedData.settings.priceServices.coinMarketCapApiKey && normalizedData.settings.priceServices.coinMarketCapApiKey !== "[SECURE]")
  ) {
    saveSecureCredentials("price_service", "main", {
      alphaVantageApiKey: normalizedData.settings.priceServices.alphaVantageApiKey,
      finnhubApiKey: normalizedData.settings.priceServices.finnhubApiKey,
      metalsDevApiKey: normalizedData.settings.priceServices.metalsDevApiKey,
      coinGeckoApiKey: normalizedData.settings.priceServices.coinGeckoApiKey,
      coinMarketCapApiKey: normalizedData.settings.priceServices.coinMarketCapApiKey,
    }).catch((err) => console.error("Failed to save secure credentials:", err));
  }

  if (normalizedData.settings.ai.apiKey && normalizedData.settings.ai.apiKey !== "[SECURE]") {
    saveSecureCredentials("ai_service", "main", {
      apiKey: normalizedData.settings.ai.apiKey,
    }).catch((err) => console.error("Failed to save AI credentials:", err));
  }

  writeOps.push((batch) => {
    batch.set(userDocument(userId, PROFILE_COLLECTION, PROFILE_DOC), {
      ...normalizedData.profile,
      currency: "IDR",
      settings: secureSettings,
      updatedAt: serverTimestamp(),
    });
  });

  const holdingLabels = getHoldingLabels(normalizedData.settings);
  const activeMasterKeys = ["assets", "platforms", ...holdingLabels.map((l) => l.id)];

  const existingMasterDocs = await Promise.all(
    activeMasterKeys.map(async (key) => {
      const colName = masterCollections[key] || `aegis_custom_${key}`;
      const snapshot = await getDocs(userCollection(userId, colName));
      return [key, snapshot.docs] as const;
    }),
  );
  existingMasterDocs.forEach(([key, docs]) => {
    const colName = masterCollections[key] || `aegis_custom_${key}`;
    docs.forEach((item) => {
      writeOps.push((batch) => batch.delete(userDocument(userId, colName, item.id)));
    });
  });

  const existingHoldings = await getDocs(userCollection(userId, HOLDINGS_COLLECTION));
  existingHoldings.docs.forEach((item) => {
    writeOps.push((batch) => batch.delete(userDocument(userId, HOLDINGS_COLLECTION, item.id)));
  });

  const existingSnapshots = await getDocs(userCollection(userId, SNAPSHOTS_COLLECTION));
  await Promise.all(
    existingSnapshots.docs.map(async (snapshotDoc) => {
      const linesSnapshot = await getDocs(
        collection(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id), HOLDING_SNAPSHOTS_COLLECTION),
      );
      linesSnapshot.docs.forEach((line) => {
        writeOps.push((batch) =>
          batch.delete(doc(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id), HOLDING_SNAPSHOTS_COLLECTION, line.id)),
        );
      });
      writeOps.push((batch) => batch.delete(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id)));
    }),
  );

  for (const collectionName of [
    AUTO_CONNECTIONS_COLLECTION,
    AUTO_ASSETS_COLLECTION,
    INCOME_SOURCES_COLLECTION,
    EXPENSE_CATEGORIES_COLLECTION,
    CASHFLOW_RECORDS_COLLECTION,
    SHARE_TOKENS_COLLECTION,
  ]) {
    const existingDocs = await getDocs(userCollection(userId, collectionName));
    existingDocs.docs.forEach((item) => {
      writeOps.push((batch) => batch.delete(userDocument(userId, collectionName, item.id)));
    });
  }

  activeMasterKeys.forEach((key) => {
    const colName = masterCollections[key] || `aegis_custom_${key}`;
    const items = normalizedData.masters[key] || [];
    items.forEach((item) => {
      writeOps.push((batch) => batch.set(userDocument(userId, colName, item.id), cleanRecord(item)));
    });
  });

  normalizedData.holdings.forEach((holding) => {
    writeOps.push((batch) => batch.set(userDocument(userId, HOLDINGS_COLLECTION, holding.id), cleanRecord(holding)));
  });

  normalizedData.snapshots.forEach((snapshot) => {
    writeOps.push((batch) =>
      batch.set(userDocument(userId, SNAPSHOTS_COLLECTION, snapshot.id), {
        id: snapshot.id,
        date: snapshot.date,
        notes: snapshot.notes,
        totalValue: snapshot.totalValue,
        updatedAt: serverTimestamp(),
      }),
    );
    snapshot.lines.forEach((line) => {
      writeOps.push((batch) =>
        batch.set(
          doc(userDocument(userId, SNAPSHOTS_COLLECTION, snapshot.id), HOLDING_SNAPSHOTS_COLLECTION, line.holdingId),
          {
            ...line,
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });
  });

  normalizedData.autoPortfolio.connections.forEach((connection) => {
    writeOps.push((batch) => batch.set(userDocument(userId, AUTO_CONNECTIONS_COLLECTION, connection.id), cleanRecord(connection)));
  });

  normalizedData.autoPortfolio.assets.forEach((asset) => {
    writeOps.push((batch) => batch.set(userDocument(userId, AUTO_ASSETS_COLLECTION, asset.id), cleanRecord(asset)));
  });

  normalizedData.cashflow.incomeSources.forEach((source) => {
    writeOps.push((batch) => batch.set(userDocument(userId, INCOME_SOURCES_COLLECTION, source.id), cleanRecord(source)));
  });

  normalizedData.cashflow.expenseCategories.forEach((category) => {
    writeOps.push((batch) => batch.set(userDocument(userId, EXPENSE_CATEGORIES_COLLECTION, category.id), cleanRecord(category)));
  });

  normalizedData.cashflow.records.forEach((record) => {
    writeOps.push((batch) => batch.set(userDocument(userId, CASHFLOW_RECORDS_COLLECTION, record.id), cleanRecord(record)));
  });

  normalizedData.shareTokens.forEach((token) => {
    writeOps.push((batch) => batch.set(userDocument(userId, SHARE_TOKENS_COLLECTION, token.token), cleanRecord({ id: token.token, ...token })));
  });

  await commitBatches(writeOps);
}

export async function deleteAllUserData(userId: string) {
  const writeOps: Array<(batch: WriteBatch) => void> = [];

  // Delete profile
  const profileRef = userDocument(userId, PROFILE_COLLECTION, PROFILE_DOC);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    writeOps.push((batch) => batch.delete(profileRef));
  }

  // Delete all master data collections
  const holdingLabels = Object.values(masterCollections);
  for (const colName of holdingLabels) {
    const snapshot = await getDocs(userCollection(userId, colName));
    snapshot.docs.forEach((item) => {
      writeOps.push((batch) => batch.delete(userDocument(userId, colName, item.id)));
    });
  }

  // Delete holdings
  const holdingsSnap = await getDocs(userCollection(userId, HOLDINGS_COLLECTION));
  holdingsSnap.docs.forEach((item) => {
    writeOps.push((batch) => batch.delete(userDocument(userId, HOLDINGS_COLLECTION, item.id)));
  });

  // Delete snapshots + nested holding snapshots
  const snapshotsSnap = await getDocs(userCollection(userId, SNAPSHOTS_COLLECTION));
  await Promise.all(
    snapshotsSnap.docs.map(async (snapshotDoc) => {
      const linesSnap = await getDocs(
        collection(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id), HOLDING_SNAPSHOTS_COLLECTION),
      );
      linesSnap.docs.forEach((line) => {
        writeOps.push((batch) =>
          batch.delete(doc(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id), HOLDING_SNAPSHOTS_COLLECTION, line.id)),
        );
      });
      writeOps.push((batch) => batch.delete(userDocument(userId, SNAPSHOTS_COLLECTION, snapshotDoc.id)));
    }),
  );

  // Delete auto portfolio, cashflow, share tokens
  for (const collectionName of [
    AUTO_CONNECTIONS_COLLECTION,
    AUTO_ASSETS_COLLECTION,
    INCOME_SOURCES_COLLECTION,
    EXPENSE_CATEGORIES_COLLECTION,
    CASHFLOW_RECORDS_COLLECTION,
    SHARE_TOKENS_COLLECTION,
  ]) {
    const snap = await getDocs(userCollection(userId, collectionName));
    snap.docs.forEach((item) => {
      writeOps.push((batch) => batch.delete(userDocument(userId, collectionName, item.id)));
    });
  }

  await commitBatches(writeOps);
}

export function clearLocalStorageForUser(userId: string) {
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.includes(userId)) {
      keysToRemove.push(key);
    }
  }
  // Also clear the generic aegis storage key for this user
  keysToRemove.push(`aegis:phase-1:portfolio:${userId}`);
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
