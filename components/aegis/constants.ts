import type { MasterKey } from "@/lib/portfolio";

export const appRelease = {
  version: "2.0 (build 18)",
  versionNumber: "2.0",
  buildNumber: 18,
  month: "November",
  year: "2026",
  codeName: "Ember",
  tagline: "Bara Api - AI-Native Model Context Protocol Server",
};

export type CodeNameTheme = {
  key: string;
  name: string;
  version: string;
  tagline: string;
  status: "completed" | "current" | "upcoming" | "planned" | "vision";
  statusLabel: string;
  description: string;
  textColor: string;
  textSub: string;
  border: string;
  borderHover: string;
  bgBadge: string;
  textBadge: string;
  dotColor: string;
  gradient: string;
  glow: string;
  cardBg: string;
};

export const codeNameThemes: Record<string, CodeNameTheme> = {
  Dawn: {
    key: "Dawn",
    name: "Dawn",
    version: "v1.x",
    tagline: "Fajar Pertama",
    status: "completed",
    statusLabel: "Selesai",
    description: "Fondasi portofolio personal, tracking snapshot mingguan, privasi data, dan simulator skenario awal.",
    textColor: "text-amber-400",
    textSub: "text-amber-200/80",
    border: "border-amber-500/25",
    borderHover: "hover:border-amber-400/50",
    bgBadge: "border border-amber-400/30 bg-amber-400/10",
    textBadge: "text-amber-300",
    dotColor: "bg-amber-400",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    glow: "shadow-[0_0_30px_-12px_rgba(245,158,11,0.4)]",
    cardBg: "bg-amber-950/[0.12]",
  },
  Ember: {
    key: "Ember",
    name: "Ember",
    version: "v2.0",
    tagline: "Bara Api",
    status: "current",
    statusLabel: "Aktif Saat Ini",
    description: "Konektivitas AI-Native melalui Model Context Protocol (MCP) server & konektor Claude Web.",
    textColor: "text-orange-400",
    textSub: "text-orange-200/80",
    border: "border-orange-500/40",
    borderHover: "hover:border-orange-400/60",
    bgBadge: "border border-orange-500/40 bg-orange-500/20",
    textBadge: "text-orange-200",
    dotColor: "bg-orange-500",
    gradient: "from-orange-500/25 via-red-500/10 to-transparent",
    glow: "shadow-[0_0_35px_-8px_rgba(249,115,22,0.55)]",
    cardBg: "bg-orange-950/[0.18]",
  },
  Horizon: {
    key: "Horizon",
    name: "Horizon",
    version: "v3.0",
    tagline: "Cakrawala",
    status: "upcoming",
    statusLabel: "Segera Hadir",
    description: "Ekspansi instrumen multi-aset (SBN, Reksadana), kalkulator FIRE interaktif, dan multi-currency realtime.",
    textColor: "text-cyan-400",
    textSub: "text-cyan-200/80",
    border: "border-cyan-500/25",
    borderHover: "hover:border-cyan-400/50",
    bgBadge: "border border-cyan-400/30 bg-cyan-400/10",
    textBadge: "text-cyan-300",
    dotColor: "bg-cyan-400",
    gradient: "from-cyan-500/20 via-sky-500/5 to-transparent",
    glow: "shadow-[0_0_30px_-12px_rgba(6,182,212,0.4)]",
    cardBg: "bg-cyan-950/[0.12]",
  },
  Aura: {
    key: "Aura",
    name: "Aura",
    version: "v4.0",
    tagline: "Perisai Cahaya",
    status: "planned",
    statusLabel: "Direncanakan",
    description: "Sistem automated risk guardian, simulasi crash pasar historis, dan proteksi hedging cerdas.",
    textColor: "text-emerald-400",
    textSub: "text-emerald-200/80",
    border: "border-emerald-500/25",
    borderHover: "hover:border-emerald-400/50",
    bgBadge: "border border-emerald-400/30 bg-emerald-400/10",
    textBadge: "text-emerald-300",
    dotColor: "bg-emerald-400",
    gradient: "from-emerald-500/20 via-teal-500/5 to-transparent",
    glow: "shadow-[0_0_30px_-12px_rgba(16,185,129,0.4)]",
    cardBg: "bg-emerald-950/[0.12]",
  },
  Aether: {
    key: "Aether",
    name: "Aether",
    version: "v5.0",
    tagline: "Unsur Langit Tertinggi",
    status: "vision",
    statusLabel: "Visi Akhir",
    description: "Orkestrasi rebalancing mandiri (otonom), cognitive deep AI agent, dan enkripsi vault terdesentralisasi.",
    textColor: "text-purple-400",
    textSub: "text-purple-200/80",
    border: "border-purple-500/25",
    borderHover: "hover:border-purple-400/50",
    bgBadge: "border border-purple-400/30 bg-purple-400/10",
    textBadge: "text-purple-300",
    dotColor: "bg-purple-400",
    gradient: "from-purple-500/20 via-violet-500/5 to-transparent",
    glow: "shadow-[0_0_30px_-12px_rgba(168,85,247,0.4)]",
    cardBg: "bg-purple-950/[0.12]",
  },
};

export const codeNamePhases = Object.values(codeNameThemes);

export const appChangelog = [
  {
    version: "2.0 (build 18)",
    versionNumber: "2.0",
    buildNumber: 18,
    date: "November 2026",
    codeName: "Ember",
    badge: "Current Release",
    title: "Model Context Protocol (MCP) Integration & Claude Web Connector",
    changes: [
      "Native Remote MCP Server integration (/api/mcp) supporting dual transports: Streamable HTTP (JSON-RPC 2.0) and Server-Sent Events (SSE).",
      "Claude Web Custom Connector support: chat with Claude to query net worth, view holdings, analyze DSS rebalancing, and track cashflow.",
      "7 built-in MCP tools: portfolio summary, holdings list, DSS rebalance analysis, cashflow records, historical snapshots, holding updater, and cashflow recorder.",
      "New Claude / MCP tab in Settings with 1-click URL copying, auto-generated MCP Secret Key, and custom header credentials.",
      "Smart User Resolver & multi-namespace sync ensuring seamless retrieval between Firebase UID and email accounts with ISO date normalization.",
    ],
  },
  {
    version: "1.3 (build 14)",
    versionNumber: "1.3",
    buildNumber: 14,
    date: "October 2026",
    codeName: "Dawn",
    badge: "Milestone",
    title: "Interactive Scenario Simulator & BTC Stress-Test Engine",
    changes: [
      "Enhanced portfolio scenario simulator with interactive shock models and visual rebalancing impact.",
      "Dedicated Bitcoin stress-test scenario models for severe crypto market drawdowns.",
      "Guest access mode enabling full simulator exploration without requiring an initial login.",
      "Integrated Gemini AI prompt templates for automated scenario evaluation and portfolio advice.",
    ],
  },
  {
    version: "1.2 (build 10)",
    versionNumber: "1.2",
    buildNumber: 10,
    date: "August 2026",
    codeName: "Dawn",
    badge: "Integration",
    title: "eToro Auto-Sync & Multi-Broker Integration",
    changes: [
      "Automated portfolio sync route supporting eToro portfolio balance and position ingestion.",
      "Secure session token management and Java Keystore (JKS) certificate handling for IBKR Gateway.",
      "Unified multi-broker normalization for mixed fiat and global equity assets.",
    ],
  },
  {
    version: "1.2 (build 9)",
    versionNumber: "1.2",
    buildNumber: 9,
    date: "July 2026",
    codeName: "Dawn",
    badge: "Feature",
    title: "Dynamic Holding Label Categories & Dynamic DSS Rebalancing Dimension",
    changes: [
      "Dynamic Holding Label Categories: Custom dynamic master data configuration across portfolio holdings.",
      "Dynamic DSS Rebalancing Dimension: Multi-dimensional rebalancing calculations and automatic warning triggers.",
    ],
  },
  {
    version: "1.1 (build 8)",
    versionNumber: "1.1",
    buildNumber: 8,
    date: "July 2026",
    codeName: "Dawn",
    badge: "Feature",
    title: "In-App Versioning & Release Roadmap",
    changes: [
      "Dedicated in-app versioning and release notes page (/version).",
      "Evolution roadmap tracking long-term architectural milestones from Dawn to Aether.",
    ],
  },
  {
    version: "1.1 (build 7)",
    versionNumber: "1.1",
    buildNumber: 7,
    date: "June 2026",
    codeName: "Dawn",
    badge: "Security",
    title: "Privacy Mode & Snapshot Review Controls",
    changes: [
      "Privacy mode masking sensitive currency amounts across dashboard, snapshot tables, and cashflow views.",
      "Weekly snapshot review controls with confirmation dialog before backfilling missing historical records.",
      "Masked charts and blur toggles to safeguard portfolio visibility during presentations.",
    ],
  },
  {
    version: "1.1 (build 6)",
    versionNumber: "1.1",
    buildNumber: 6,
    date: "June 2026",
    codeName: "Dawn",
    badge: "Auth",
    title: "Email Authentication & Credential Management",
    changes: [
      "Direct email and password login flow implemented alongside third-party OAuth sign-in.",
      "Password visibility eye toggle for improved login experience.",
      "Integrated secure credentials API and real-time Firestore user syncing.",
    ],
  },
  {
    version: "1.0 (build 1)",
    versionNumber: "1.0",
    buildNumber: 1,
    date: "May 2026",
    codeName: "Dawn",
    badge: "Initial Release",
    title: "Initial Portfolio Workspace (Aegis Dawn)",
    changes: [
      "Core portfolio foundation: Holdings, Snapshots, Cashflow, Settings, and Master Data.",
      "CSV import and export engine for seamless snapshot data backup and transfer.",
      "Firebase Firestore synchronized cloud database and responsive dark-themed UI.",
    ],
  },
];

export type RoadmapItem = {
  version: string;
  codeName: string;
  tagline: string;
  theme: string;
  status: "upcoming" | "planned" | "vision";
  features: string[];
};

export const appRoadmap: RoadmapItem[] = [
  {
    version: "v3.0",
    codeName: "Horizon",
    tagline: "Cakrawala",
    theme: "Ekspansi cakupan instrumen investasi & proyeksi masa depan",
    status: "upcoming",
    features: [
      "Ekspansi Instrumen Multi-Aset: Integrasi pelacakan SBN/Obligasi Negara, Reksadana, P2P Lending, dan Properti.",
      "FIRE & Wealth Projection: Kalkulator dan simulasi interaktif Financial Independence / Retire Early dengan proyeksi Monte Carlo.",
      "Advanced Cashflow Planning: Menghubungkan recurring income/expenses secara langsung dengan proyeksi target alokasi portofolio.",
      "Multi-Currency Live Converter: Pelaporan dual-currency (IDR & USD) dengan realtime FX exchange rates.",
      "Deeper DSS Explanations: Analisis mendalam AI Decision Support System untuk deviasi alokasi dan anomali pasar.",
    ],
  },
  {
    version: "v4.0",
    codeName: "Aura",
    tagline: "Perisai Cahaya",
    theme: "Sistem manajemen risiko otomatis & proteksi aset menyeluruh",
    status: "planned",
    features: [
      "Automated Risk Guardian: Deteksi dini risiko konsentrasi berlebih pada single-asset, sektor, atau platform penyimpan.",
      "Stress Testing & Market Crash Engine: Simulasi ketahanan portofolio terhadap skenario krisis historis (2008, Covid 2020, Crypto Winter 2022).",
      "Dynamic Hedging Suggestions: Rekomendasi taktis DSS untuk alokasi aset defensif (Emas/PAXG & Cash) saat volatilitas ekstrem.",
      "Smart Alert & Trigger Notification: Notifikasi otomatis (Telegram / Email / Webhook) saat alokasi aset menembus batas toleransi rebalancing.",
      "Granular Snapshot Review Controls: Verifikasi dan kontrol selektif sebelum snapshot mingguan otomatis diterapkan.",
    ],
  },
  {
    version: "v5.0",
    codeName: "Aether",
    tagline: "Unsur Langit Tertinggi",
    theme: "Sistem otonom portofolio yang sepenuhnya matang & desentralisasi",
    status: "vision",
    features: [
      "Autonomous Portfolio Orchestration: Eksekusi rebalancing terotomasi melalui integrasi API broker dan exchange terpilih.",
      "Deep Cognitive AI Agent: Analisis sentimen makroekonomi terpadu, tren siklus pasar, dan rotasi aset cerdas.",
      "Decentralized Vault & Key Management: Backup terdesentralisasi dengan enkripsi end-to-end tanpa ketergantungan server pusat.",
      "Custom Strategy Builder: Pembuat strategi alokasi kustom berbasis aturan kuantitatif (Momentum, Value, All-Weather).",
      "Ecosystem Synergy: Sinkronisasi otonom multi-modul lintas ekosistem Murub.",
    ],
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
