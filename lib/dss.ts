import {
  breakdown,
  holdingFieldByMasterKey,
  lineRows,
  previousSnapshot,
  type Holding,
  type HoldingSnapshot,
  type PortfolioData,
  type Snapshot,
} from "@/lib/portfolio";

export type DssCategory = {
  name: string;
  value: number;
  target: number;
  threshold: number;
  color: string;
};

export type DssAsset = HoldingSnapshot & {
  holding: Holding;
  previousValue: number | null;
  pnl: number | null;
  share: number;
  riskScore: number;
};

export type DssPayload = {
  snapshot: Snapshot;
  previous?: Snapshot;
  total: number;
  change: { value: number; percent: number | null } | null;
  weightedRiskScore: number;
  riskLabel: string;
  categories: DssCategory[];
  riskBreakdown: Array<{ name: string; value: number }>;
  platformBreakdown: Array<{ name: string; value: number }>;
  assets: DssAsset[];
  warnings: Array<{ level: "high" | "medium"; title: string; detail: string }>;
};

const colors = ["#60a5fa", "#f59e0b", "#4ade80", "#c084fc", "#f87171", "#22d3ee", "#a3e635", "#fb7185"];

const categoryHints = [
  { target: 55, threshold: 5, color: "#60a5fa", keywords: ["stock", "equity", "saham", "etf", "vwra", "iwda"] },
  { target: 15, threshold: 7, color: "#f59e0b", keywords: ["alternativ", "alternative", "crypto", "bitcoin", "btc", "speculative"] },
  { target: 15, threshold: 5, color: "#4ade80", keywords: ["bond", "cash", "fixed income", "stable", "usd token", "obligasi"] },
  { target: 15, threshold: 5, color: "#c084fc", keywords: ["physical", "gold", "emas", "metal"] },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ");
}

function profileForCategory(name: string, index: number, count: number) {
  const normalized = normalize(name);
  const matched = categoryHints.find((hint) => hint.keywords.some((keyword) => normalized.includes(keyword)));
  if (matched) return matched;
  return { target: Math.round((100 / Math.max(1, count)) * 100) / 100, threshold: 5, color: colors[index % colors.length] };
}

export function riskScore(label: string) {
  switch (label.trim().toUpperCase()) {
    case "VERY LOW RISK":
    case "CASH":
      return 1;
    case "LOW RISK":
      return 2;
    case "MEDIUM RISK":
      return 3;
    case "HIGH RISK":
      return 4;
    case "VERY HIGH RISK":
      return 5;
    default:
      return 3;
  }
}

function riskLabel(score: number) {
  if (score >= 4.5) return "Very High";
  if (score >= 3.5) return "High";
  if (score >= 2.5) return "Medium";
  if (score >= 1.5) return "Low";
  return "Very Low";
}

export function buildDssPayload(data: PortfolioData, snapshotId?: string): DssPayload | null {
  const snapshot = snapshotId
    ? data.snapshots.find((item) => item.id === snapshotId)
    : data.snapshots.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!snapshot) return null;

  const previous = previousSnapshot(data, snapshot.date);
  const rows = lineRows(data, snapshot);
  const previousRows = previous ? lineRows(data, previous) : [];
  const previousByHolding = new Map(previousRows.map((row) => [row.holdingId, row.value]));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  const rebalanceDimension = data.settings.dss?.rebalanceDimension || "accountCategories";
  const holdingField = (holdingFieldByMasterKey[rebalanceDimension] || rebalanceDimension) as any;

  const categoryNames = Array.from(new Set(rows.map((row) => (row.holding as any)[holdingField] || "Unassigned")));
  const categoryTotals = breakdown(rows, holdingField);
  const weightedRiskTotal = rows.reduce((sum, row) => sum + row.value * riskScore(row.holding.riskFactor), 0);

  const categories = categoryNames.map((name, index) => {
    const defaultProfile = profileForCategory(name, index, categoryNames.length);
    return {
      name,
      value: categoryTotals.find((item) => item.name === name)?.value ?? 0,
      target: data.settings.dss.targetAllocations[name] ?? defaultProfile.target,
      threshold: data.settings.dss.rebalanceThresholds[name] ?? defaultProfile.threshold,
      color: defaultProfile.color,
    };
  });

  const assets = rows.map((row) => {
    const previousValue = previousByHolding.get(row.holdingId) ?? null;
    return {
      ...row,
      previousValue,
      pnl: previousValue === null ? null : row.value - previousValue,
      share: total > 0 ? (row.value / total) * 100 : 0,
      riskScore: riskScore(row.holding.riskFactor),
    };
  });

  const platforms = breakdown(rows, "platform");
  const warnings: DssPayload["warnings"] = [];
  const highRiskValue = assets.filter((asset) => asset.riskScore >= 4).reduce((sum, asset) => sum + asset.value, 0);
  if (total > 0 && (highRiskValue / total) * 100 > data.settings.dss.riskWarningThreshold) {
    warnings.push({
      level: "high",
      title: "Eksposur risiko tinggi melewati threshold",
      detail: `${((highRiskValue / total) * 100).toFixed(2)}% portofolio berada di aset HIGH/VERY HIGH RISK.`,
    });
  }
  platforms.forEach((platform) => {
    const share = total > 0 ? (platform.value / total) * 100 : 0;
    if (share >= 30) {
      warnings.push({
        level: "medium",
        title: `Konsentrasi platform ${platform.name || "Unassigned"} besar`,
        detail: `${platform.name || "Unassigned"} menampung ${share.toFixed(2)}% dari nilai snapshot.`,
      });
    }
  });

  const previousTotal = previous?.totalValue ?? null;
  const change = previousTotal === null
    ? null
    : {
        value: total - previousTotal,
        percent: previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
      };
  const weightedRiskScore = total > 0 ? Math.round((weightedRiskTotal / total) * 100) / 100 : 0;

  return {
    snapshot,
    previous,
    total,
    change,
    weightedRiskScore,
    riskLabel: riskLabel(weightedRiskScore),
    categories,
    riskBreakdown: breakdown(rows, "riskFactor"),
    platformBreakdown: platforms,
    assets,
    warnings,
  };
}
