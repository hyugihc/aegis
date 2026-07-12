import type { MasterKey } from "@/lib/portfolio";

export const appRelease = {
  version: "1.1 build 8",
  month: "July",
  year: "2026",
  codeName: "Dawn",
};

export const appChangelog = [

  {
    version: "1.1 build 8",
    date: "July 2026",
    codeName: "Dawn",
    changes: [
      "versioning page.",
    ],
  },

  {
    version: "1.1 build 7",
    date: "June 2026",
    codeName: "Dawn",
    title: "Privacy, snapshots, and auto sync portfolio flow",
    changes: [
      "Privacy mode masks portfolio values across dashboard overlays, snapshot detail tables, and cashflow views.",
      "Weekly snapshot backfill now asks for confirmation before generating missing historical snapshots.",
    ],
  },
  {
    version: "1.1 build 6",
    date: "June 2026",
    codeName: "Dawn",
    title: "Auto sync and snapshot improvements",
    changes: [
      "auto sync assets can be linked into holdings and used when creating or updating snapshots.",
      "login via email and password is now supported alongside Google and Apple sign-in.",
    ],
  },
  {
    version: "1.0",
    date: "May 2026",
    codeName: "Foundation",
    title: "Initial portfolio workspace",
    changes: [
      "Holdings, snapshots, settings, master data, and portfolio breakdowns formed the first stable workflow.",
      "CSV import and export made it possible to move snapshot history in and out of Aegis.",
      "Firebase-backed sync and authentication became the default data layer.",
    ],
  },
];

export const appRoadmap = [
  {
    title: "Snapshot review controls",
    description: "More granular controls for auto-generated weekly snapshots, including preview and selective creation.",
  },
  {
    title: "Cashflow planning",
    description: "Scenario tools that connect recurring cashflow with target allocation and FIRE projections.",
  },
  {
    title: "Deeper DSS explanations",
    description: "Clearer decision support notes that show the reason behind concentration, risk, and allocation warnings.",
  },
  {
    title: "Sharing refinements",
    description: "More flexible read-only sharing with focused views for selected snapshots or asset groups.",
  },
];

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

export const lockedColumnIds = ["select", "actions"];
export const defaultColumnOrder = [
  "select",
  "actions",
  "active",
  "currentValue",
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
