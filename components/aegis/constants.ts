import type { MasterKey } from "@/lib/portfolio";

export const appRelease = {
  version: "1.0.2",
  month: "June",
  year: "2026",
  codeName: "Dawn",
};

export const colors = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#f97316",
];

export const formSelectClass =
  "mt-2 w-full rounded-md border border-white/10 bg-zinc-950/90 px-3 py-2 text-zinc-100 outline-none focus:border-amber-400";
export const formInputClass =
  "mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100 outline-none focus:border-amber-400";

export const masterLabels: Record<MasterKey, string> = {
  assets: "Assets",
  platforms: "Platforms",
  labels: "Labels",
  accountCategories: "Account categories",
  investmentTypes: "Investment types",
  assetMediums: "Asset mediums",
  riskFactors: "Risk factors",
  liquidities: "Liquidities",
};

export const lockedColumnIds = ["actions"];
export const defaultColumnOrder = [
  "actions",
  "active",
  "platform",
  "asset",
  "label",
  "accountCategory",
  "investmentType",
  "assetMedium",
  "riskFactor",
  "liquidity",
  "source",
  "autoSync",
  "snapshotCount",
  "notes",
];
