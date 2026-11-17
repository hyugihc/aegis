import { getAdminFirestore } from "./firebase-admin";
import {
  emptyPortfolio,
  normalizePortfolioData,
  type PortfolioData,
  type Holding,
  type Snapshot,
  type HoldingSnapshot,
  type CashflowRecord,
  type MasterItem,
} from "@/lib/portfolio";
import { loadPortfolioFromFirestore } from "@/lib/firestore-portfolio";

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

export function normalizeSnapshotDate(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // Handle DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Handle DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
}

export async function getPortfolioForUser(userId: string): Promise<PortfolioData> {
  const adminDb = getAdminFirestore();

  if (!adminDb) {
    // Fallback to client Firestore SDK if Admin SDK is not configured
    try {
      const res = await loadPortfolioFromFirestore(userId);
      return res.data;
    } catch (err) {
      console.error("[Aegis MCP] Fallback loadPortfolioFromFirestore error:", err);
      throw new Error(
        "Firebase Admin credentials are not configured and client fallback failed. Please configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel environment variables.",
      );
    }
  }

  // Resolve which user document actually holds the most recent active portfolio data
  // (In Aegis, users might have data stored under user.email or user.uid)
  let targetUserId = userId;
  const initialUserDoc = adminDb.collection(USER_COLLECTION).doc(targetUserId);
  const initialProfileSnap = await initialUserDoc.collection(PROFILE_COLLECTION).doc(PROFILE_DOC).get();

  const candidateIds = new Set<string>([targetUserId]);
  if (initialProfileSnap.exists) {
    const email = initialProfileSnap.data()?.email;
    if (email) candidateIds.add(String(email));
  }

  // Check existing user docs in Firestore
  try {
    const allUsersSnap = await adminDb.collection(USER_COLLECTION).limit(10).get();
    allUsersSnap.docs.forEach((doc) => candidateIds.add(doc.id));
  } catch (err) {
    console.warn("[Aegis MCP] Error listing user candidate docs:", err);
  }

  // Find candidate document with the latest snapshot date
  let bestUserId = targetUserId;
  let bestLatestDate = "";

  for (const cId of candidateIds) {
    try {
      const sSnap = await adminDb.collection(USER_COLLECTION).doc(cId).collection(SNAPSHOTS_COLLECTION).get();
      if (!sSnap.empty) {
        for (const sDoc of sSnap.docs) {
          const rawDate = String(sDoc.data()?.date ?? "");
          const normDate = normalizeSnapshotDate(rawDate);
          if (normDate > bestLatestDate) {
            bestLatestDate = normDate;
            bestUserId = cId;
          }
        }
      }
    } catch {
      // Ignore individual candidate error
    }
  }

  targetUserId = bestUserId;
  const userRef = adminDb.collection(USER_COLLECTION).doc(targetUserId);
  const profileSnap = await userRef.collection(PROFILE_COLLECTION).doc(PROFILE_DOC).get();

  const data = emptyPortfolio();

  if (profileSnap.exists) {
    const profile = profileSnap.data() || {};
    data.profile = {
      displayName: String(profile.displayName ?? data.profile.displayName),
      email: String(profile.email ?? data.profile.email),
      currency: "IDR",
    };

    if (profile.settings) {
      data.settings = {
        ...data.settings,
        ...profile.settings,
      };
    }
  }

  // Load masters
  const masterKeys = Object.keys(masterCollections);
  await Promise.all(
    masterKeys.map(async (key) => {
      const colName = masterCollections[key];
      const snap = await userRef.collection(colName).orderBy("name").get();
      if (!snap.empty) {
        const items: MasterItem[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: String(d.name ?? ""),
            symbol: d.symbol ? String(d.symbol) : undefined,
            type: d.type ? String(d.type) : undefined,
            priceSource: d.priceSource,
            priceTicker: d.priceTicker,
            priceUnit: d.priceUnit,
          };
        });
        (data.masters as Record<string, MasterItem[]>)[key] = items;
      }
    }),
  );

  // Load holdings
  const holdingsSnap = await userRef.collection(HOLDINGS_COLLECTION).orderBy("asset").get();
  data.holdings = holdingsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      active: Boolean(d.active ?? true),
      label: String(d.label ?? ""),
      asset: String(d.asset ?? ""),
      assetSymbol: String(d.assetSymbol ?? ""),
      assetType: String(d.assetType ?? ""),
      liquidity: String(d.liquidity ?? ""),
      riskFactor: String(d.riskFactor ?? ""),
      accountCategory: String(d.accountCategory ?? ""),
      assetMedium: String(d.assetMedium ?? ""),
      platform: String(d.platform ?? ""),
      investmentType: String(d.investmentType ?? ""),
      notes: String(d.notes ?? ""),
      source: d.source ?? "manual",
      externalId: d.externalId,
      autoPortfolioAssetId: d.autoPortfolioAssetId,
    };
  });

  // Load all snapshots (without limit to guarantee complete history)
  const snapshotsSnap = await userRef.collection(SNAPSHOTS_COLLECTION).get();
  const loadedSnapshots = await Promise.all(
    snapshotsSnap.docs.map(async (snapDoc) => {
      const sData = snapDoc.data();
      const linesSnap = await snapDoc.ref.collection(HOLDING_SNAPSHOTS_COLLECTION).get();
      const lines: HoldingSnapshot[] = linesSnap.docs.map((lDoc) => {
        const lData = lDoc.data();
        return {
          holdingId: String(lData.holdingId ?? lDoc.id),
          amount: Number(lData.amount ?? 0),
          price: Number(lData.price ?? 0),
          value: Number(lData.value ?? 0),
          useCalculated: Boolean(lData.useCalculated ?? true),
        };
      });

      const rawDate = String(sData.date ?? "");
      const normalizedDate = normalizeSnapshotDate(rawDate);

      return {
        id: snapDoc.id,
        date: normalizedDate || rawDate,
        notes: String(sData.notes ?? ""),
        totalValue: Number(sData.totalValue ?? lines.reduce((acc, curr) => acc + curr.value, 0)),
        lines,
      };
    }),
  );

  // Sort descending by normalized ISO date
  loadedSnapshots.sort((a, b) => b.date.localeCompare(a.date));
  data.snapshots = loadedSnapshots;

  // Load cashflow
  const cashflowSnap = await userRef.collection(CASHFLOW_RECORDS_COLLECTION).get();
  data.cashflow.records = cashflowSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      year: Number(d.year ?? new Date().getFullYear()),
      month: Number(d.month ?? new Date().getMonth() + 1),
      notes: String(d.notes ?? ""),
      incomes: Array.isArray(d.incomes) ? d.incomes : [],
      allocations: Array.isArray(d.allocations) ? d.allocations : [],
    };
  });

  const incomeSourcesSnap = await userRef.collection(INCOME_SOURCES_COLLECTION).get();
  data.cashflow.incomeSources = incomeSourcesSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: String(d.name ?? ""),
      description: String(d.description ?? ""),
      showOnDashboard: Boolean(d.showOnDashboard ?? true),
    };
  });

  const expenseCategoriesSnap = await userRef.collection(EXPENSE_CATEGORIES_COLLECTION).get();
  data.cashflow.expenseCategories = expenseCategoriesSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: String(d.name ?? ""),
      description: String(d.description ?? ""),
      isPortfolioCashflow: Boolean(d.isPortfolioCashflow ?? false),
      showOnDashboard: Boolean(d.showOnDashboard ?? true),
    };
  });

  return normalizePortfolioData(data);
}

export async function addOrUpdateHolding(
  userId: string,
  holdingInput: Partial<Holding> & { asset: string },
): Promise<{ success: boolean; id: string; message: string }> {
  const adminDb = getAdminFirestore();
  if (!adminDb) {
    throw new Error("Firebase Admin SDK is required for write operations. Please configure service account in Vercel.");
  }

  const userRef = adminDb.collection(USER_COLLECTION).doc(userId);
  const holdingsCol = userRef.collection(HOLDINGS_COLLECTION);

  let holdingId = holdingInput.id;

  if (!holdingId) {
    // Check if an existing holding with the same asset symbol/name exists
    const existing = await holdingsCol.where("asset", "==", holdingInput.asset).limit(1).get();
    if (!existing.empty) {
      holdingId = existing.docs[0].id;
    } else {
      holdingId = holdingsCol.doc().id;
    }
  }

  const holdingDoc = holdingsCol.doc(holdingId);
  const currentSnap = await holdingDoc.get();
  const currentData = currentSnap.data() || {};

  const updatedRecord = {
    ...currentData,
    ...holdingInput,
    id: holdingId,
    active: holdingInput.active ?? currentData.active ?? true,
    updatedAt: new Date().toISOString(),
  };

  await holdingDoc.set(updatedRecord, { merge: true });

  return {
    success: true,
    id: holdingId,
    message: currentSnap.exists ? `Holding '${holdingInput.asset}' updated.` : `Holding '${holdingInput.asset}' created.`,
  };
}

export async function recordCashflow(
  userId: string,
  entry: {
    year: number;
    month: number;
    type: "income" | "allocation";
    categoryOrSourceName: string;
    amount: number;
    notes?: string;
  },
): Promise<{ success: boolean; message: string }> {
  const adminDb = getAdminFirestore();
  if (!adminDb) {
    throw new Error("Firebase Admin SDK is required for write operations.");
  }

  const userRef = adminDb.collection(USER_COLLECTION).doc(userId);
  const docId = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
  const recordDoc = userRef.collection(CASHFLOW_RECORDS_COLLECTION).doc(docId);
  const snap = await recordDoc.get();

  const recordData = snap.exists
    ? snap.data()
    : {
        id: docId,
        year: entry.year,
        month: entry.month,
        notes: entry.notes || "",
        incomes: [],
        allocations: [],
      };

  const id = `item_${Date.now()}`;
  if (entry.type === "income") {
    recordData?.incomes.push({
      id,
      sourceId: entry.categoryOrSourceName,
      amount: entry.amount,
      notes: entry.notes || "",
    });
  } else {
    recordData?.allocations.push({
      id,
      categoryId: entry.categoryOrSourceName,
      amount: entry.amount,
      notes: entry.notes || "",
    });
  }

  recordData!.updatedAt = new Date().toISOString();
  await recordDoc.set(recordData!, { merge: true });

  return {
    success: true,
    message: `Recorded ${entry.type} of Rp ${entry.amount.toLocaleString("id-ID")} for ${entry.year}/${entry.month}.`,
  };
}
