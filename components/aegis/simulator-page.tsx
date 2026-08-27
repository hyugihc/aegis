"use client";

import { useMemo, useState } from "react";
import type React from "react";
import {
  Area, AreaChart, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Pencil, X, Maximize2, Minimize2, Download, Info } from "lucide-react";

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ASSET UNIVERSE - per-year return tables (20 entries, % per year)
// Normal  : historical baseline, dollar dominan
// Mild    : krisis ringan 1-4 thn, lalu recovery
// Dalio   : Stage-6 sovereign debt crisis + dollar debasement
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
const R: Record<string, Record<string, number[]>> = {
  // ── SKENARIO 1: Normal ─────────────────────────────────────────────────────
  // Historical baseline, dollar dominan, pertumbuhan moderat stabil
  normal: {
    vwra:      [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    veur:      [7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:        [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:      [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    btc:       [35,28,22,18,15,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    bonds:     [4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8],
    tips:      [3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  },
  // ── SKENARIO 2: Krisis Ringan ──────────────────────────────────────────────
  // Dollar melemah moderat, koreksi pasar 1-4 tahun, lalu recovery
  mild: {
    vwra:      [-15,-5,3,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    veur:      [-10,-2,5,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:        [-20,-8,5,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    gold:      [25,15,8,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    btc:       [-35,60,70,40,25,20,16,12,10,10,9,8,8,8,7,7,7,7,7,7],
    bonds:     [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    tips:      [5,5,4,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [-20,-5,5,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [15,10,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [10,8,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [30,20,8,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
  // ── SKENARIO 3: Dalio Breakdown ────────────────────────────────────────────
  // Stage-6 sovereign debt crisis + dollar debasement besar-besaran
  dalio: {
    vwra:      [-30,-15,-5,3,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
    veur:      [-20,-10,0,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    em:        [-35,-15,5,15,12,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9],
    gold:      [40,30,20,10,8,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:       [-50,100,80,60,40,25,20,18,15,12,10,9,8,8,7,7,7,7,7,7],
    bonds:     [2,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    tips:      [8,7,6,5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [-40,-20,-5,5,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [25,20,12,7,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [15,12,8,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [55,40,25,12,8,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [-2,-3,-2,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  },
  // ── SKENARIO 4: Goldilocks (Roubini) ──────────────────────────────────────
  // Pemulihan moderat pasca-tarif 2025. AI investasi menopang, inflasi turun
  // perlahan, Fed mulai pangkas suku bunga. Skenario paling diharapkan Wall St.
  goldilocks: {
    vwra:      [12,13,11,10,9.5,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    veur:      [8,9,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:        [11,12,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:      [6,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    btc:       [40,35,25,18,15,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    bonds:     [5.5,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    tips:      [4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [10,11,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [5,4.5,4,3.5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
  // ── SKENARIO 5: Stagflasi Ringan ──────────────────────────────────────────
  // Inflasi stagnan di atas target (3%+), pertumbuhan melambat, Fed terjebak.
  // "Stagflation light" (RBC Canada). Pasar flat-negatif secara riil.
  stagflasi: {
    vwra:      [2,-1,1,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    veur:      [1,-2,0,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    em:        [3,0,2,4,5,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    gold:      [18,15,12,9,7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:       [-20,10,25,20,15,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    bonds:     [2,2,2.5,3,3,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    tips:      [7,8,7,6,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    reit:      [-5,-3,1,3,5,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    cmdty:     [20,18,14,10,7,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [-5,-3,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [22,18,14,10,7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [5,5,5,5,4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
  // ── SKENARIO 6: Oil Shock / Geopolitik ────────────────────────────────────
  // Konflik Timur Tengah → minyak >$130/bbl. Morgan Stanley midyear 2026:
  // price shock bisa berubah volume shock → resesi global jika berlanjut.
  oilshock: {
    vwra:      [-20,-12,-5,2,5,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8],
    veur:      [-25,-15,-5,2,5,6,7,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:        [-15,-8,0,5,8,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:      [30,20,15,10,7,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4],
    btc:       [-30,20,40,30,20,16,14,12,10,10,9,9,8,8,8,8,7,7,7,7],
    bonds:     [1,1,2,3,3.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    tips:      [6,7,6,5,4,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [-25,-15,-5,3,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [45,35,20,12,8,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [-3,-2,2,4,4,3.5,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [25,20,15,10,7,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [5,5,4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
  // ── SKENARIO 7: AI Productivity Boom ──────────────────────────────────────
  // AI mendorong lonjakan produktivitas → pertumbuhan di atas ekspektasi,
  // inflasi turun, pasar saham meledak. Upside scenario Morgan Stanley / JPM.
  aiboom: {
    vwra:      [15,18,16,14,13,12,11,10,10,10,10,9,9,9,9,9,9,9,9,9],
    veur:      [10,12,11,10,9,8.5,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:        [12,15,14,13,12,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:      [2,1,2,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    btc:       [80,60,45,30,22,18,15,13,11,10,9,9,8,8,8,8,7,7,7,7],
    bonds:     [4,3.5,3.5,4,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5],
    tips:      [2.5,2,2.5,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    reit:      [12,14,12,10,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cmdty:     [2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    longbond:  [2,1.5,2,2.5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    silver:    [6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    cash:      [3.5,3,3,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
};

type ScenarioId = "normal" | "mild" | "dalio" | "goldilocks" | "stagflasi" | "oilshock" | "aiboom";
type AssetKey = string;

type ScenarioMeta = { label: string; shortLabel: string; desc: string; color: string; source: string; group: "bullish" | "neutral" | "bearish" | "crisis" };

const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  normal:     {
    label: "Normal",
    shortLabel: "Normal",
    color: "#3B82F6",
    group: "neutral",
    source: "Baseline historis",
    desc: "Historical baseline - pasar saham global bertumbuh stabil, dominasi dollar AS tetap kuat, suku bunga terkendali.",
  },
  goldilocks: {
    label: "Goldilocks",
    shortLabel: "Goldilocks",
    color: "#22C55E",
    group: "bullish",
    source: "Roubini / Morgan Stanley",
    desc: "Pemulihan moderat pasca-tarif 2025. AI menopang investasi, inflasi turun perlahan, Fed pangkas suku bunga. Skenario paling diharapkan Wall Street untuk 2026.",
  },
  aiboom:     {
    label: "AI Boom",
    shortLabel: "AI Boom",
    color: "#A855F7",
    group: "bullish",
    source: "Morgan Stanley / JPMorgan upside",
    desc: "AI mendorong lonjakan produktivitas di atas ekspektasi. Pasar saham meledak, inflasi turun drastis, pertumbuhan global berakselerasi. Skenario upside paling optimis.",
  },
  mild:       {
    label: "Krisis Ringan",
    shortLabel: "Krisis Ringan",
    color: "#F59E0B",
    group: "bearish",
    source: "Dalio / konsensus Wall St.",
    desc: "Dollar melemah moderat, koreksi pasar saham 1-4 tahun sebelum pemulihan. Setara dengan siklus resesi biasa seperti 2001 atau 2018.",
  },
  stagflasi:  {
    label: "Stagflasi Ringan",
    shortLabel: "Stagflasi",
    color: "#F97316",
    group: "bearish",
    source: "RBC Canada / RSM / Schwab",
    desc: "Inflasi stagnan di atas 3%, pertumbuhan melambat, Fed terjebak antara memangkas atau menahan suku bunga. Pasar flat secara riil. Mirip 1970s tapi lebih mild.",
  },
  oilshock:   {
    label: "Oil Shock",
    shortLabel: "Oil Shock",
    color: "#EF4444",
    group: "crisis",
    source: "Morgan Stanley midyear 2026",
    desc: "Konflik geopolitik Timur Tengah mendorong harga minyak melampaui $130/barel. Price shock bisa bertransformasi menjadi volume shock — kekurangan fisik komoditas memicu resesi global.",
  },
  dalio:      {
    label: "Dalio Breakdown",
    shortLabel: "Dalio",
    color: "#DC2626",
    group: "crisis",
    source: "Ray Dalio Big Debt Cycle",
    desc: "Tahap 6 siklus utang besar: sovereign debt crisis + dollar debasement. Saham ambruk, emas & komoditas melesat sebagai pelindung daya beli. Restrukturisasi sistem moneter global.",
  },
};

type AssetMeta = {
  key: AssetKey;
  label: string;
  sublabel: string;
  color: string;
  group: string;
  note: string;
  returns: Partial<Record<ScenarioId, string>>;
};

const ASSETS: AssetMeta[] = [
  {
    key: "vwra",  label: "Global Equities",   sublabel: "VWRA / IWDA",
    color: "#60A5FA", group: "Saham",
    note: "Saham global kelas dunia",
    returns: { normal: "9%/thn", goldilocks: "12-13% awal, stabil 9%", aiboom: "15-18% awal, stabil 9%", mild: "-15%, -5%, lalu 7%", stagflasi: "2%, -1%, lalu 5%", oilshock: "-20%, -12%, lalu 8%", dalio: "-30%, -15%, lalu 6%" },
  },
  {
    key: "veur",  label: "European Equity",   sublabel: "VEUR / EuroStoxx",
    color: "#A78BFA", group: "Saham",
    note: "Underperform vs global di normal, paling terpukul oil shock",
    returns: { normal: "7.5%/thn", goldilocks: "8-9% awal, stabil 7.5%", aiboom: "10-12% awal, stabil 7.5%", mild: "-10%, -2%, lalu 7.5%", stagflasi: "1%, -2%, lalu 5%", oilshock: "-25%, -15%, lalu 7.5%", dalio: "-20%, -10%, lalu 7%" },
  },
  {
    key: "em",    label: "Emerging Markets",  sublabel: "VWO / EIMI",
    color: "#34D399", group: "Saham",
    note: "Pasar berkembang; diuntungkan dolar lemah, dirugikan oil shock",
    returns: { normal: "10%/thn", goldilocks: "11-12% awal, stabil 10%", aiboom: "12-15% awal, stabil 10%", mild: "-20%, -8%, lalu 9%", stagflasi: "3-7% stagnan", oilshock: "-15%, -8%, lalu 10%", dalio: "-35%, -15%, lalu 9%" },
  },
  {
    key: "gold",  label: "Emas Fisik",        sublabel: "PAXG / Gold ETF",
    color: "#FBBF24", group: "Safe Haven",
    note: "Pelindung nilai mata uang; meledak di krisis & stagflasi",
    returns: { normal: "4%/thn", goldilocks: "5-6% awal, stabil 4%", aiboom: "1-2% (risk-on turun)", mild: "+25%, +15%, lalu 4%", stagflasi: "+18%, +15%, lalu 5%", oilshock: "+30%, +20%, lalu 4%", dalio: "+40%, +30%, lalu 5%" },
  },
  {
    key: "silver", label: "Perak",            sublabel: "Silver ETF / Fisik",
    color: "#94A3B8", group: "Safe Haven",
    note: "Lebih volatil dari emas, juga aset industri (double benefit di oil shock)",
    returns: { normal: "5%/thn", goldilocks: "6-7% awal, stabil 5%", aiboom: "5-6%/thn", mild: "+30%, +20%, lalu 5%", stagflasi: "+22%, +18%, lalu 5%", oilshock: "+25%, +20%, lalu 5%", dalio: "+55%, +40%, lalu 5%" },
  },
  {
    key: "btc",   label: "Bitcoin",           sublabel: "Self-custodied BTC",
    color: "#F97316", group: "Digital Asset",
    note: "Maturasi nonlinear mengikuti siklus halving; high beta di semua skenario",
    returns: { normal: "35%→22%→10%→7%", goldilocks: "40-35% awal, lalu normal", aiboom: "80-60% awal, lalu melambat", mild: "-35%, +60%, +70%, lalu 16%→7%", stagflasi: "-20%, +10%, +25%, lalu 12%→7%", oilshock: "-30%, +20%, +40%, lalu 14%→7%", dalio: "-50%, +100%, +80%, lalu 20%→7%" },
  },
  {
    key: "bonds", label: "Bond / Stablecoin", sublabel: "US T-Bond / USDT yield",
    color: "#64B5F6", group: "Fixed Income",
    note: "Tergerus riil di stagflasi & dalio; bagus di goldilocks (Fed pangkas)",
    returns: { normal: "4.8%/thn", goldilocks: "5.5% awal, turun ke 4%", aiboom: "4-4.5%/thn", mild: "4%/thn", stagflasi: "2-3.5% (riil negatif!)", oilshock: "1-3.5%, lalu 4%", dalio: "2-4% (riil sangat negatif!)" },
  },
  {
    key: "tips",  label: "TIPS / Inflasi Bond", sublabel: "Inflation-Protected",
    color: "#4DD0E1", group: "Fixed Income",
    note: "Bintang di stagflasi & dalio; underperform di AI boom",
    returns: { normal: "3.5%/thn", goldilocks: "3.5-4%/thn", aiboom: "2.5% (inflasi rendah)", mild: "+5%, lalu 3.5%", stagflasi: "+7-8%, lalu 4%", oilshock: "+6-7%, lalu 3.5%", dalio: "+8%, +7%, lalu 3.5%" },
  },
  {
    key: "longbond", label: "Long Bond",      sublabel: "20-30yr Treasury",
    color: "#7986CB", group: "Fixed Income",
    note: "Defensif di resesi biasa; berbahaya di stagflasi (duration risk)",
    returns: { normal: "3%/thn", goldilocks: "4-5% awal (Fed pangkas)", aiboom: "1.5-2%/thn", mild: "+10%, +8%, lalu 3%", stagflasi: "-5%, -3%, lalu 3%", oilshock: "-3%, -2%, lalu 4%", dalio: "+15%, +12%, lalu 3%" },
  },
  {
    key: "reit",  label: "REIT",              sublabel: "Real Estate ETF",
    color: "#FF8A65", group: "Real Asset",
    note: "Sensitif suku bunga; bagus di goldilocks & AI boom",
    returns: { normal: "8%/thn", goldilocks: "10-11% awal, stabil 8%", aiboom: "12-14% awal, stabil 8%", mild: "-20%, -5%, lalu 8%", stagflasi: "-5%, -3%, lalu 7%", oilshock: "-25%, -15%, lalu 8%", dalio: "-40%, -20%, lalu 8%" },
  },
  {
    key: "cmdty", label: "Komoditas",         sublabel: "DJP / GSG Index",
    color: "#A5D6A7", group: "Real Asset",
    note: "Meledak di oil shock; berguna di stagflasi & dalio",
    returns: { normal: "3%/thn", goldilocks: "3-4%/thn", aiboom: "2-3%/thn", mild: "+15%, +10%, lalu 3%", stagflasi: "+20%, +18%, lalu 4%", oilshock: "+45%, +35%, lalu 3%", dalio: "+25%, +20%, lalu 3%" },
  },
  {
    key: "cash",  label: "Cash / Money Market", sublabel: "ORI / Suku Bunga",
    color: "#B0BEC5", group: "Likuiditas",
    note: "Sangat likuid; riil positif di goldilocks, negatif di dalio",
    returns: { normal: "4%/thn", goldilocks: "4.5% awal, turun 3.5%", aiboom: "3-3.5%/thn", mild: "3.5%/thn", stagflasi: "5%/thn (tapi inflasi juga tinggi)", oilshock: "5% awal, lalu 3.5%", dalio: "-2%, -3%, lalu 3%" },
  },
];

type WeightMap = Record<string, number>;

type Preset = {
  id: string;
  label: string;
  desc: string;
  color: string;
  weights: Partial<WeightMap>;
};

const PRESETS: Preset[] = [
  {
    id: "aegis_a",
    label: "Aegis A - Saat Ini",
    desc: "Portofolio awal: ekuitas global + gold + BTC + bonds",
    color: "#60A5FA",
    weights: { vwra: 65, gold: 10, btc: 15, bonds: 10 },
  },
  {
    id: "aegis_b",
    label: "Aegis B - Gold 18%",
    desc: "Naikkan gold mengikuti rekomendasi terbaru Dalio",
    color: "#FBBF24",
    weights: { vwra: 62, gold: 18, btc: 15, bonds: 5 },
  },
  {
    id: "aegis_c",
    label: "Aegis C - Multi Equity",
    desc: "Diversifikasi ke VEUR & EM, gold 15%",
    color: "#A78BFA",
    weights: { vwra: 45, veur: 10, em: 10, gold: 15, btc: 15, bonds: 5 },
  },
  {
    id: "all_weather",
    label: "All Weather - Dalio",
    desc: "Portofolio legendaris Ray Dalio: seimbang di 4 kondisi ekonomi",
    color: "#34D399",
    weights: { vwra: 30, longbond: 40, bonds: 15, gold: 7.5, cmdty: 7.5 },
  },
  {
    id: "holy_grail",
    label: "Holy Grail - Uncorrelated",
    desc: "Diversifikasi ekstrem pada aset dengan korelasi rendah untuk hasil stabil",
    color: "#F59E0B",
    weights: { vwra: 20, veur: 10, em: 10, gold: 15, silver: 5, btc: 10, bonds: 10, tips: 5, longbond: 5, reit: 5, cmdty: 5 },
  },
  {
    id: "dalio_2024",
    label: "Dalio 2024 - Gold Heavy",
    desc: "Rekomendasi terbaru: perbesar emas/komoditas, kurangi aset kertas dollar",
    color: "#EF4444",
    weights: { vwra: 30, em: 10, gold: 25, silver: 5, btc: 10, bonds: 5, tips: 10, cmdty: 5 },
  },
  {
    id: "conservative",
    label: "Konservatif",
    desc: "Defensif: dominasi obligasi + gold, minim ekuitas",
    color: "#7986CB",
    weights: { vwra: 20, gold: 15, bonds: 25, tips: 20, longbond: 15, cash: 5 },
  },
  {
    id: "growth",
    label: "Agresif - Growth",
    desc: "Mengejar pertumbuhan tinggi: dominasi ekuitas global + BTC",
    color: "#FF8A65",
    weights: { vwra: 50, em: 15, btc: 25, gold: 5, bonds: 5 },
  },
  {
    id: "goldilocks_port",
    label: "Goldilocks Optimis",
    desc: "Untuk skenario Roubini: ekuitas tinggi, REIT, obligasi mulai menarik",
    color: "#22C55E",
    weights: { vwra: 45, em: 15, reit: 15, bonds: 15, btc: 5, cash: 5 },
  },
  {
    id: "ai_boom_port",
    label: "AI Boom Maksimal",
    desc: "Taruhan penuh AI Boom: overweight saham global, REIT, BTC",
    color: "#A855F7",
    weights: { vwra: 50, em: 15, reit: 10, btc: 20, bonds: 5 },
  },
  {
    id: "stagflasi_port",
    label: "Stagflasi Shield",
    desc: "Bertahan di stagflasi: TIPS, emas, komoditas, silver — minim obligasi nominal",
    color: "#F97316",
    weights: { vwra: 15, em: 5, gold: 25, silver: 10, tips: 25, cmdty: 15, cash: 5 },
  },
  {
    id: "oilshock_port",
    label: "Oil Shock Survivor",
    desc: "Lindungi diri dari guncangan energi: komoditas besar, emas, EM, kurangi Eropa",
    color: "#EF4444",
    weights: { vwra: 10, em: 20, gold: 20, silver: 10, cmdty: 25, tips: 10, cash: 5 },
  },
];

function emptyWeights(): WeightMap {
  return Object.fromEntries(ASSETS.map((a) => [a.key, 0]));
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// HELPER MATH FUNCTIONS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function getReturnsCagr(returns: number[]): number {
  let val = 100;
  for (const r of returns) {
    val *= (1 + r / 100);
  }
  return (Math.pow(val / 100, 1 / returns.length) - 1) * 100;
}

function findShiftForCagr(baseReturns: number[], targetCagr: number): number {
  let low = -100;
  let high = 500;
  for (let iter = 0; iter < 15; iter++) {
    const mid = (low + high) / 2;
    let val = 100;
    for (const r of baseReturns) {
      val *= (1 + (r + mid) / 100);
    }
    const cagr = (Math.pow(val / 100, 1 / baseReturns.length) - 1) * 100;
    if (cagr < targetCagr) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

function getSeriesMaxDrawdown(values: number[]): number {
  let peak = 0;
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = ((peak - v) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

function totalInvested(init: number, monthly: number, years: number, stepUp: number) {
  if (years === 0) return init;
  let total = init;
  for (let y = 0; y < Math.floor(years); y++) {
    total += monthly * Math.pow(1 + stepUp / 100, y) * 12;
  }
  const fract = years - Math.floor(years);
  if (fract > 0) {
    total += monthly * Math.pow(1 + stepUp / 100, Math.floor(years)) * 12 * fract;
  }
  return total;
}

function realValue(nominal: number, inflation: number, years: number) {
  return inflation <= 0 || years <= 0 ? nominal : nominal / Math.pow(1 + inflation / 100, years);
}

// Generates scenario returns array taking krisis onset year into account
function getScenarioReturns(
  scenarioId: ScenarioId,
  assetKey: string,
  onsetYear: number,
  length = 20
): number[] {
  const normalReturns = R.normal[assetKey] || Array(20).fill(4);
  const scenReturns = R[scenarioId]?.[assetKey] || normalReturns;

  const out: number[] = [];
  const onsetIndex = onsetYear - 1; // e.g. Year 3 = index 2

  for (let i = 0; i < length; i++) {
    if (scenarioId === "normal") {
      out.push(i < normalReturns.length ? normalReturns[i] : normalReturns[normalReturns.length - 1]);
    } else if (i < onsetIndex) {
      // Before crisis year: behaves like normal returns
      out.push(i < normalReturns.length ? normalReturns[i] : normalReturns[normalReturns.length - 1]);
    } else {
      // Starts crisis path from year 1 (index 0) of the selected scenario returns
      const crisisTimelineIndex = i - onsetIndex;
      if (crisisTimelineIndex < scenReturns.length) {
        out.push(scenReturns[crisisTimelineIndex]);
      } else {
        out.push(scenReturns[scenReturns.length - 1]);
      }
    }
  }
  return out;
}

function getDefaultCagrs(scenarioId: ScenarioId, onsetYear: number): Record<AssetKey, number> {
  const result = {} as Record<AssetKey, number>;
  ASSETS.forEach(a => {
    const returns = getScenarioReturns(scenarioId, a.key, onsetYear, 20);
    result[a.key] = Math.round(getReturnsCagr(returns) * 10) / 10;
  });
  return result;
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ENGINE - Dynamic Year-by-Year Compound + DCA Projection
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function calcScenarioSeries(
  init: number,
  monthly: number,
  stepUp: number,
  weights: WeightMap,
  customCagrs: Partial<WeightMap>,
  scenarioId: ScenarioId,
  onsetYear: number,
  length = 21
) {
  // 1. Generate return arrays for each asset
  const assetReturns = {} as Record<string, number[]>;
  ASSETS.forEach(a => {
    const baseRet = getScenarioReturns(scenarioId, a.key, onsetYear, length);
    
    // If the user overrode this asset's return, we apply a shift
    if (customCagrs[a.key] !== undefined) {
      const targetCagr = customCagrs[a.key] as number;
      const baseRet20 = getScenarioReturns(scenarioId, a.key, onsetYear, 20);
      const shift = findShiftForCagr(baseRet20, targetCagr);
      assetReturns[a.key] = baseRet.map(r => r + shift);
    } else {
      assetReturns[a.key] = baseRet;
    }
  });

  // 2. Project each asset value year-by-year
  const assetValues = {} as Record<string, number[]>;
  ASSETS.forEach(a => {
    const allocPct = weights[a.key] || 0;
    const initialVal = init * (allocPct / 100);
    const initialMonthly = monthly * (allocPct / 100);
    const returns = assetReturns[a.key];

    const vals = [initialVal];
    let currentVal = initialVal;

    for (let y = 0; y < length - 1; y++) {
      const monthlySavings = initialMonthly * Math.pow(1 + stepUp / 100, y);
      const ry = returns[y];
      
      const r = ry / 100;
      const lumpGrowth = currentVal * (1 + r);
      let nextVal = lumpGrowth;
      if (r === 0) {
        nextVal += monthlySavings * 12;
      } else {
        const rMonthly = Math.pow(1 + r, 1 / 12) - 1;
        const sipGrowth = monthlySavings * ((Math.pow(1 + rMonthly, 12) - 1) / rMonthly) * (1 + rMonthly);
        nextVal += sipGrowth;
      }
      currentVal = nextVal;
      vals.push(currentVal);
    }
    assetValues[a.key] = vals;
  });

  // 3. Sum up values at each year
  return Array.from({ length }, (_, y) => {
    let portfolioVal = 0;
    ASSETS.forEach(a => {
      portfolioVal += assetValues[a.key][y];
    });
    
    return {
      year: y,
      portfolio: portfolioVal,
      ...ASSETS.reduce((acc, a) => {
        acc[a.key] = assetValues[a.key][y];
        return acc;
      }, {} as Record<string, number>)
    };
  });
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ENGINE - Pure Return Projections starting from Base 100 (for Multipliers)
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function calcSeries(
  weights: WeightMap,
  scenario: ScenarioId,
  onsetYear: number,
  customCagrs: Partial<WeightMap> = {},
  length = 21
): { year: number; value: number }[] {
  const out: { year: number; value: number }[] = [{ year: 0, value: 100 }];
  let v = 100;
  
  const assetReturns = {} as Record<string, number[]>;
  ASSETS.forEach(a => {
    const baseRet = getScenarioReturns(scenario, a.key, onsetYear, length - 1);
    if (customCagrs[a.key] !== undefined) {
      const targetCagr = customCagrs[a.key] as number;
      const baseRet20 = getScenarioReturns(scenario, a.key, onsetYear, 20);
      const shift = findShiftForCagr(baseRet20, targetCagr);
      assetReturns[a.key] = baseRet.map(r => r + shift);
    } else {
      assetReturns[a.key] = baseRet;
    }
  });

  for (let i = 0; i < length - 1; i++) {
    const yr = ASSETS.reduce((sum, a) => sum + (weights[a.key] || 0) * (assetReturns[a.key]?.[i] ?? 0), 0) / 1e4;
    v = v * (1 + yr);
    out.push({ year: i + 1, value: Math.round(v * 10) / 10 });
  }
  return out;
}

function getMetrics(series: { year: number; value: number }[]) {
  const fin = series[20].value;
  const cagr = (Math.pow(fin / 100, 1 / 20) - 1) * 100;
  let peak = 0, maxDD = 0;
  for (const d of series) {
    if (d.value > peak) peak = d.value;
    const dd = ((peak - d.value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  return {
    mult:  (fin / 100).toFixed(2),
    cagr:  cagr.toFixed(1),
    maxDD: maxDD.toFixed(0),
    y5:    series[5].value,
    y10:   series[10].value,
    fin,
  };
}

function fmtJuta(value: number) {
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} M`;
  if (value >= 100) return `${Math.round(value)} jt`;
  return `${value.toFixed(1)} jt`;
}
function fmtCurrency(value: number) { return `Rp ${fmtJuta(value)}`; }
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

const withdrawalRates = [4, 3.5, 3];
const horizons = [10, 15, 20];

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// MAIN APP COMPONENT
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

export function SimulatorPage() {
  const [weights, setWeights] = useState<WeightMap>({ ...emptyWeights(), vwra: 65, gold: 10, btc: 15, bonds: 10 });
  const [activePreset, setActivePreset] = useState<string>("aegis_a");
  const [scenario, setScenario] = useState<ScenarioId>("normal");
  const [crisisOnsetYear, setCrisisOnsetYear] = useState<number>(3);
  const [mode, setMode] = useState<"portfolio" | "scenarios" | "presets">("portfolio");

  const [init, setInit] = useState(1000);
  const [monthly, setMonthly] = useState(7);
  const [inflation, setInflation] = useState(3.5);
  const [stepUp, setStepUp] = useState(5);
  const [fireTarget, setFireTarget] = useState(20);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [selectedHorizon, setSelectedHorizon] = useState<number | null>(null);

  // Scenario-specific CAGR override values
  const [customReturns, setCustomReturns] = useState<Record<ScenarioId, Partial<WeightMap>>>(() => ({
    normal: {},
    mild: {},
    dalio: {},
    goldilocks: {},
    stagflasi: {},
    oilshock: {},
    aiboom: {},
  }));
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [selectedScenarioForEdit, setSelectedScenarioForEdit] = useState<ScenarioId>("normal");

  // Maximized Chart States
  const [isChartMaximized, setIsChartMaximized] = useState(false);
  const [maximizedHorizon, setMaximizedHorizon] = useState<number>(20);
  const [confidenceBand, setConfidenceBand] = useState<"none" | "68" | "95">("none");
  const [portfolioVolatility, setPortfolioVolatility] = useState<number>(12);
  const [isLogScale, setIsLogScale] = useState(false);
  const [showTargetLine, setShowTargetLine] = useState(true);

  const total = ASSETS.reduce((s, a) => s + (Number(weights[a.key]) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.5;
  const sc = SCENARIOS[scenario];

  // Selected scenario custom returns override
  const activeCustomReturns = customReturns[scenario];

  // Dynamic set weights
  const setW = (key: AssetKey, val: string) => {
    const n = Math.max(0, Math.min(100, Number(val) || 0));
    setWeights((prev) => ({ ...prev, [key]: n }));
    setActivePreset("");
  };

  const applyPreset = (p: Preset) => {
    const w = { ...emptyWeights(), ...p.weights } as WeightMap;
    setWeights(w);
    setActivePreset(p.id);
  };

  const handleNormalize = () => {
    if (total === 0) return;
    const keys = ASSETS.map((a) => a.key);
    const nw: WeightMap = emptyWeights();
    let rem = 100;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) nw[k] = Math.max(0, rem);
      else { const v = Math.round(((weights[k] || 0) / total) * 100); nw[k] = v; rem -= v; }
    });
    setWeights(nw);
    setActivePreset("");
  };

  const handleCagrOverrideForScenario = (scen: ScenarioId, key: string, val: string) => {
    setCustomReturns(prev => ({
      ...prev,
      [scen]: {
        ...prev[scen],
        [key]: val === "" ? undefined : Number(val)
      }
    }));
    setActivePreset("");
  };

  // Computations using Dynamic compounding DCA Year-by-Year simulator
  const customDynamicSeries51 = useMemo(() => {
    return calcScenarioSeries(init, monthly, stepUp, weights, activeCustomReturns, scenario, crisisOnsetYear, 51);
  }, [init, monthly, stepUp, weights, activeCustomReturns, scenario, crisisOnsetYear]);

  // Unified helper function for portfolio absolute value
  const portfolioAt = (years: number) => {
    if (years === 0) return init;
    const lower = Math.floor(years);
    const upper = Math.ceil(years);
    if (lower === upper) {
      return customDynamicSeries51[lower].portfolio;
    }
    const valL = customDynamicSeries51[lower].portfolio;
    const valU = customDynamicSeries51[upper].portfolio;
    return valL + (valU - valL) * (years - lower);
  };

  const effectiveCagr = useMemo(() => {
    if (!isValid) return 0;
    return ASSETS.reduce((sum, a) => {
      const returns = getScenarioReturns(scenario, a.key, crisisOnsetYear, 20);
      const defaultCagr = getReturnsCagr(returns);
      const rate = activeCustomReturns[a.key] !== undefined 
        ? (activeCustomReturns[a.key] as number) 
        : defaultCagr;
      return sum + (weights[a.key] || 0) * rate;
    }, 0) / 100;
  }, [weights, scenario, crisisOnsetYear, activeCustomReturns, isValid]);

  const realCagr = effectiveCagr - inflation;

  const maximizedChartData = useMemo(() => {
    if (!isChartMaximized) return [];
    const length = maximizedHorizon + 1;
    return Array.from({ length }, (_, year) => {
      const nominal = portfolioAt(year);
      const real = realValue(nominal, inflation, year);
      const invested = totalInvested(init, monthly, year, stepUp);
      
      // Calculate Confidence Interval
      const zScore = confidenceBand === "95" ? 1.96 : 1.0;
      const sigma = portfolioVolatility / 100;
      const upperFactor = Math.exp(zScore * sigma * Math.sqrt(year));
      const lowerFactor = Math.exp(-zScore * sigma * Math.sqrt(year));
      
      return {
        year,
        nominal,
        real,
        invested,
        confidenceLower: confidenceBand !== "none" ? nominal * lowerFactor : undefined,
        confidenceUpper: confidenceBand !== "none" ? nominal * upperFactor : undefined,
      };
    });
  }, [maximizedHorizon, customDynamicSeries51, init, monthly, inflation, stepUp, confidenceBand, portfolioVolatility, isChartMaximized]);

  const maximizedAllScenData = useMemo(() => {
    if (!isValid || !isChartMaximized) return null;
    const length = maximizedHorizon + 1;
    const sN  = calcSeries(weights, "normal",     crisisOnsetYear, customReturns.normal, length);
    const sG  = calcSeries(weights, "goldilocks", crisisOnsetYear, customReturns.goldilocks, length);
    const sAI = calcSeries(weights, "aiboom",     crisisOnsetYear, customReturns.aiboom, length);
    const sM  = calcSeries(weights, "mild",       crisisOnsetYear, customReturns.mild, length);
    const sSt = calcSeries(weights, "stagflasi",  crisisOnsetYear, customReturns.stagflasi, length);
    const sOS = calcSeries(weights, "oilshock",   crisisOnsetYear, customReturns.oilshock, length);
    const sD  = calcSeries(weights, "dalio",      crisisOnsetYear, customReturns.dalio, length);
    return Array.from({ length }, (_, i) => ({ 
      year: i, 
      normal:     sN[i].value, 
      goldilocks: sG[i].value,
      aiboom:     sAI[i].value,
      mild:       sM[i].value, 
      stagflasi:  sSt[i].value,
      oilshock:   sOS[i].value,
      dalio:      sD[i].value,
    }));
  }, [weights, customReturns, crisisOnsetYear, isValid, maximizedHorizon, isChartMaximized]);

  const maximizedPresetChartData = useMemo(() => {
    if (!isChartMaximized) return null;
    const length = maximizedHorizon + 1;
    const ser: Record<string, { year: number; value: number }[]> = {};
    PRESETS.forEach((p) => {
      const w = { ...emptyWeights(), ...p.weights } as WeightMap;
      ser[p.id] = calcSeries(w, scenario, crisisOnsetYear, {}, length);
    });

    const customSer = calcSeries(weights, scenario, crisisOnsetYear, activeCustomReturns, length);

    const chart = Array.from({ length }, (_, i) => {
      const row: Record<string, number> = { year: i };
      PRESETS.forEach((p) => { row[p.id] = ser[p.id][i].value; });
      row.custom = customSer[i].value;
      return row;
    });
    return chart;
  }, [weights, scenario, crisisOnsetYear, activeCustomReturns, maximizedHorizon, isChartMaximized]);

  const handleExportCsv = () => {
    const headers = ["Tahun", "Nominal Proyeksi (Rp)", "Nilai Riil (Rp)", "Total Modal Masuk (Rp)"];
    if (confidenceBand !== "none") {
      headers.push("Batas Bawah Keyakinan (Rp)", "Batas Atas Keyakinan (Rp)");
    }
    
    const rows = maximizedChartData.map(d => {
      const row = [
        d.year,
        Math.round(d.nominal * 100) / 100,
        Math.round(d.real * 100) / 100,
        Math.round(d.invested * 100) / 100
      ];
      if (confidenceBand !== "none") {
        row.push(
          Math.round((d.confidenceLower ?? 0) * 100) / 100,
          Math.round((d.confidenceUpper ?? 0) * 100) / 100
        );
      }
      return row.join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_simulasi_proyeksi_${maximizedHorizon}thn.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthlyYear10 = monthly * Math.pow(1 + stepUp / 100, 9);
  const yearsForBreakdown = selectedHorizon ?? 10;

  const currentValue = portfolioAt(0);
  const selectedYears = selectedHorizon ?? 1;
  const futureValue = portfolioAt(selectedYears);
  const totalGrowth = futureValue - currentValue;

  const monthGrowth = selectedHorizon === null 
    ? (portfolioAt(1) - currentValue) / 12 
    : totalGrowth / (selectedYears * 12);

  const yearGrowth = selectedHorizon === null 
    ? portfolioAt(1) - currentValue 
    : totalGrowth / selectedYears;

  // FIRE Calculator computations
  const withdrawalMultiplier = withdrawalRate > 0 ? 100 / withdrawalRate : 0;
  const fireNumber = fireTarget > 0 && withdrawalMultiplier > 0 ? fireTarget * 12 * withdrawalMultiplier : 0;
  const fireProgress = fireNumber > 0 ? Math.min(100, (currentValue / fireNumber) * 100) : 0;
  const fireGap = Math.max(0, fireNumber - currentValue);
  
  let fireYear: number | null = null;
  let fireNominalTarget = 0;
  for (let year = 0; year <= 50; year++) {
    const inflatedTarget = fireNumber * Math.pow(1 + inflation / 100, year);
    if (customDynamicSeries51[year].portfolio >= inflatedTarget) { 
      fireYear = year; 
      fireNominalTarget = inflatedTarget; 
      break; 
    }
  }

  // All Scenarios comparisons in base 100
  const allScenData = useMemo(() => {
    if (!isValid) return null;
    const sN  = calcSeries(weights, "normal",     crisisOnsetYear, customReturns.normal);
    const sG  = calcSeries(weights, "goldilocks", crisisOnsetYear, customReturns.goldilocks);
    const sAI = calcSeries(weights, "aiboom",     crisisOnsetYear, customReturns.aiboom);
    const sM  = calcSeries(weights, "mild",       crisisOnsetYear, customReturns.mild);
    const sSt = calcSeries(weights, "stagflasi",  crisisOnsetYear, customReturns.stagflasi);
    const sOS = calcSeries(weights, "oilshock",   crisisOnsetYear, customReturns.oilshock);
    const sD  = calcSeries(weights, "dalio",      crisisOnsetYear, customReturns.dalio);
    return Array.from({ length: 21 }, (_, i) => ({ 
      year: i, 
      normal:     sN[i].value, 
      goldilocks: sG[i].value,
      aiboom:     sAI[i].value,
      mild:       sM[i].value, 
      stagflasi:  sSt[i].value,
      oilshock:   sOS[i].value,
      dalio:      sD[i].value,
    }));
  }, [weights, customReturns, crisisOnsetYear, isValid]);

  // Presets and Custom comparisons in base 100
  const presetChartData = useMemo(() => {
    const ser: Record<string, { year: number; value: number }[]> = {};
    const mets: Record<string, ReturnType<typeof getMetrics>> = {};
    PRESETS.forEach((p) => {
      const w = { ...emptyWeights(), ...p.weights } as WeightMap;
      ser[p.id] = calcSeries(w, scenario, crisisOnsetYear);
      mets[p.id] = getMetrics(ser[p.id]);
    });

    const customSer = calcSeries(weights, scenario, crisisOnsetYear, activeCustomReturns);
    const customMets = getMetrics(customSer);

    const chart = Array.from({ length: 21 }, (_, i) => {
      const row: Record<string, number> = { year: i };
      PRESETS.forEach((p) => { row[p.id] = ser[p.id][i].value; });
      row.custom = customSer[i].value;
      return row;
    });
    return { chart, metrics: mets, customMetrics: customMets };
  }, [weights, scenario, crisisOnsetYear, activeCustomReturns]);

  // FIRE absolute chart data in Rupiah
  const projectionChartData = useMemo(() =>
    Array.from({ length: 21 }, (_, year) => ({
      year,
      nominal: portfolioAt(year),
      real: realValue(portfolioAt(year), inflation, year),
      invested: totalInvested(init, monthly, year, stepUp),
    })), [customDynamicSeries51, init, monthly, inflation, stepUp]);

  // Custom portfolio pure returns metrics
  const customMetrics = useMemo(() => {
    if (!isValid) return null;
    const series = calcSeries(weights, scenario, crisisOnsetYear, activeCustomReturns);
    return getMetrics(series);
  }, [weights, scenario, crisisOnsetYear, activeCustomReturns, isValid]);

  const assetGroups = Array.from(new Set(ASSETS.map((a) => a.group)));

  // Combine rows for comparison table
  const combinedTableRows = useMemo(() => {
    const rows = [];
    if (isValid && presetChartData.customMetrics) {
      rows.push({
        id: "custom",
        label: "ΓÜÖ∩╕Å Custom Portfolio (Anda)",
        desc: "Komposisi dan ekspektasi return yang Anda atur saat ini",
        color: "#f43f5e",
        weights: weights,
        metrics: presetChartData.customMetrics
      });
    }
    PRESETS.forEach(p => {
      rows.push({
        id: p.id,
        label: p.label,
        desc: p.desc,
        color: p.color,
        weights: { ...emptyWeights(), ...p.weights } as WeightMap,
        metrics: presetChartData.metrics[p.id]
      });
    });
    return rows;
  }, [isValid, weights, presetChartData]);

  return (
    <div className="py-2">
      <Card className="overflow-hidden p-5 sm:p-6 bg-zinc-950/70 border-white/10 shadow-2xl backdrop-blur-xl text-zinc-100">
        <div className="space-y-6" id="investment-calculator">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Investment simulator</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Simulasikan portofolio multi-aset</h2>
              <p className="mt-2 text-sm text-zinc-400">Rencanakan modal awal, tabungan bulanan, dan alokasi aset dengan proyeksi otomatis & skenario makro.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-amber-100 max-w-md">
              ✨ Simulasi menggunakan return dinamis per tahun sesuai skenario makro, bukan CAGR statis.
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            {/* ══ LEFT COLUMN (INPUTS) ══ */}
            <div className="space-y-4">
              {/* 1. Modal & tabungan */}
              <Panel title="Modal & tabungan">
                <div className="grid gap-4">
                  <MillionInput label="Modal awal" value={init} onChange={setInit} suffix="jt" />
                  <MillionInput label="Tabungan / bulan" value={monthly} onChange={setMonthly} suffix="jt" />
                </div>
              </Panel>

              {/* 2. Asumsi simulasi */}
              <Panel title="Asumsi simulasi">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberInput 
                    label="Inflasi / tahun" 
                    badge="daya beli riil" 
                    value={inflation} 
                    onChange={setInflation} 
                    suffix="%" 
                    step="0.1" 
                    description="Target inflasi BI sekitar 2.5-3.5%. Digunakan untuk menghitung nilai riil portofolio." 
                  />
                  <NumberInput 
                    label="Kenaikan tabungan / tahun" 
                    badge="step-up DCA" 
                    value={stepUp} 
                    onChange={setStepUp} 
                    suffix="%" 
                    step="0.5" 
                    description="Tabungan bulanan naik tiap tahun mengikuti kenaikan gaji. 0% = tetap." 
                  />
                </div>
              </Panel>

              {/* 3. Skenario Ekonomi */}
              <Panel 
                title="Skenario Ekonomi"
              >
                <div className="space-y-3">
                  {/* Group labels */}
                  {(["bullish", "neutral", "bearish", "crisis"] as const).map((grp) => {
                    const groupScenarios = (Object.entries(SCENARIOS) as [ScenarioId, ScenarioMeta][]).filter(([,s]) => s.group === grp);
                    if (groupScenarios.length === 0) return null;
                    const grpLabel: Record<string, string> = { bullish: "🟢 Optimis", neutral: "🔵 Baseline", bearish: "🟡 Waspada", crisis: "🔴 Krisis" };
                    return (
                      <div key={grp}>
                        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">{grpLabel[grp]}</div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {groupScenarios.map(([id, s]) => {
                            const isSelected = scenario === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => { setScenario(id); setActivePreset(""); }}
                                className={`rounded-lg border p-2.5 text-left transition-all relative group ${
                                  isSelected
                                    ? "border-amber-400/60 bg-amber-400/10 text-white"
                                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-amber-400/40 hover:bg-white/[0.04]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white min-w-0">
                                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                                    <span className="truncate">{s.label}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] text-zinc-600 truncate max-w-[60px]">{s.source}</span>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScenario(id);
                                        setSelectedScenarioForEdit(id);
                                        setIsReturnsModalOpen(true);
                                      }}
                                      className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                      title="Edit Return Skenario Ini"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-1 pl-3 text-[9px] text-zinc-500 leading-normal line-clamp-2">{s.desc.split(".")[0]}.</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Crisis Onset Input */}
                  {scenario !== "normal" && (
                    <div className="mt-3 p-3 bg-black/40 border border-white/10 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Perkiraan Krisis Terjadi
                        </span>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-mono font-bold border border-amber-400/20">
                          Tahun ke-{crisisOnsetYear}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={crisisOnsetYear}
                          onChange={(e) => setCrisisOnsetYear(Number(e.target.value))}
                          className="w-full accent-amber-500 h-1 rounded-full bg-white/10 outline-none cursor-pointer"
                        />
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={crisisOnsetYear}
                          onChange={(e) => setCrisisOnsetYear(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                          className="w-12 rounded border border-white/10 bg-[#0a0c11] px-1 py-0.5 text-center text-xs font-mono text-white outline-none focus:border-amber-400"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        * Sebelum tahun ke-{crisisOnsetYear}, aset akan berkinerja dengan return skenario Normal.
                      </p>
                    </div>
                  )}
                </div>
              </Panel>

              {/* 4. Preset Portofolio */}
              <Panel 
                title="Preset Portofolio"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRESETS.map((p) => {
                    const isSelected = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={`rounded-lg border p-2.5 text-left text-xs transition-all relative group ${
                          isSelected
                            ? "border-amber-400/60 bg-amber-400/10 text-white"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-amber-400/40 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: p.color }} />
                            <span className="font-semibold text-white truncate">{p.label.split(" - ")[0].trim()}</span>
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              applyPreset(p);
                              setIsWeightsModalOpen(true);
                            }}
                            className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Edit Bobot Preset Ini"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </span>
                        </div>
                        <p className="mt-0.5 pl-4 text-[10px] text-zinc-500 leading-normal line-clamp-1">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </Panel>



              {/* 7. Distribusi alokasi */}
              <Panel title="Distribusi alokasi">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200">
                    CAGR Portofolio ({sc.label}): {effectiveCagr.toFixed(2)}%/thn
                  </p>
                  <p className={`text-xs font-medium ${isValid ? "hidden" : "text-rose-300"}`}>
                    Total alokasi tidak 100% - mohon sesuaikan
                  </p>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-[#0a0c11] p-3">
                  <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
                    {ASSETS.filter((a) => (weights[a.key] || 0) > 0).map((asset) => (
                      <div
                        key={asset.key}
                        className="h-full transition-all"
                        style={{ width: `${total === 0 ? 0 : ((weights[asset.key] || 0) / (total || 1)) * 100}%`, background: asset.color }}
                        title={`${asset.label}: ${weights[asset.key]}%`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ASSETS.filter((a) => (weights[a.key] || 0) > 0).map((asset) => (
                    <div key={asset.key} className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: asset.color }} />
                      {asset.label} {(weights[asset.key] || 0).toFixed(0)}%
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* ══ RIGHT COLUMN (PROJECTIONS & CHARTS) ══ */}
            <div className="space-y-4">
              {/* 1. Proyeksi horizon buttons & growth cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                {horizons.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedHorizon(selectedHorizon === year ? null : year)}
                    className={`rounded-lg border bg-[#090b11] p-4 text-center transition hover:border-amber-400/40 hover:bg-white/[0.04] ${
                      selectedHorizon === year
                        ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
                        : "border-white/10"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{year} tahun</p>
                    <p className="mt-3 text-lg font-semibold text-white">{fmtCurrency(portfolioAt(year))}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">nominal</p>
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <p className="text-sm font-medium text-sky-300/80">{fmtCurrency(realValue(portfolioAt(year), inflation, year))}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">nilai riil ({inflation}% inf)</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Growth cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                <GrowthCard
                  tone="emerald"
                  title={selectedHorizon === null ? "Estimasi kenaikan 1 bulan" : `Rata-rata kenaikan / bulan (${selectedYears} tahun)`}
                  value={`+${fmtCurrency(monthGrowth)}`}
                  detail={selectedHorizon === null ? `${(currentValue > 0 ? (monthGrowth / currentValue) * 100 : 0).toFixed(2)}% dari nilai saat ini` : `Rata-rata menuju proyeksi ${selectedYears} tahun`}
                />
                <GrowthCard
                  tone="sky"
                  title={selectedHorizon === null ? "Estimasi kenaikan 1 tahun" : `Rata-rata kenaikan / tahun (${selectedYears} tahun)`}
                  value={`+${fmtCurrency(yearGrowth)}`}
                  detail={selectedHorizon === null ? `${(currentValue > 0 ? (yearGrowth / currentValue) * 100 : 0).toFixed(2)}% dari nilai saat ini` : `${(currentValue > 0 ? (yearGrowth / currentValue) * 100 : 0).toFixed(2)}% rata-rata terhadap nilai saat ini`}
                />
              </div>

              {/* StatCards for Selected Scenario Portfolio Metrics */}
              {isValid && customMetrics && (
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label={`Mult. 20 Thn`} value={`${customMetrics.mult}×`} color={sc.color} sub="dari modal awal" />
                  <StatCard label="CAGR Portofolio" value={`${customMetrics.cagr}%`} color="#34d399" sub="per tahun" />
                  <StatCard label="Max Drawdown" value={`-${customMetrics.maxDD}%`} color="#EF4444" sub="titik terendah" />
                </div>
              )}

              <Panel title="Grafik pertumbuhan" subtitle="Hasil simulasi proyeksi dan perbandingan preset">
                <div className="flex justify-end gap-3 items-center mb-4">
                  <div className="flex gap-1.5 rounded-full border border-white/10 bg-black/40 p-1">
                    {[
                      { id: "portfolio", label: "Proyeksi DCA" },
                      { id: "scenarios", label: "7 Skenario" },
                      { id: "presets",   label: "Bandingkan Preset" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setMode(btn.id as typeof mode)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          mode === btn.id
                            ? "bg-amber-400/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative h-72">
                  <button
                    type="button"
                    onClick={() => setIsChartMaximized(true)}
                    className="absolute top-2 right-2 z-10 rounded-lg border border-white/10 bg-black/60 p-1.5 text-zinc-400 hover:border-amber-400/40 hover:bg-white/5 hover:text-white transition cursor-pointer"
                    title="Maksimalkan Grafik"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  {mode === "portfolio" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectionChartData} margin={{ top: 5, right: 12, bottom: 16, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                        <XAxis dataKey="year" stroke="#556678" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <YAxis stroke="#556678" tick={{ fill: "#a1a1aa", fontSize: 11 }} width={76} tickFormatter={(v) => `Rp ${fmtJuta(Number(v))}`} />
                        <Tooltip
                          contentStyle={{ background: "#07111E", border: "1px solid #1E3A5F", borderRadius: 8 }}
                          formatter={(v: any) => fmtCurrency(Number(v))}
                          labelFormatter={(l: any) => `Tahun ke-${l}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                        <Line type="monotone" dataKey="nominal" name="Nominal" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="real" name="Nilai Riil" stroke="#38BDF8" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="invested" name="Tunai Diinvestasikan" stroke="#556678" strokeDasharray="6 4" strokeWidth={1.5} dot={false} opacity={0.6} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {mode === "scenarios" && (
                    allScenData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={allScenData} margin={{ top: 5, right: 12, bottom: 16, left: 0 }}>
                          <defs>
                            {(["normal","goldilocks","aiboom","mild","stagflasi","oilshock","dalio"] as ScenarioId[]).map((id) => (
                              <linearGradient key={id} id={`g_${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="10%" stopColor={SCENARIOS[id].color} stopOpacity={0.15} />
                                <stop offset="90%" stopColor={SCENARIOS[id].color} stopOpacity={0.01} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                          <XAxis dataKey="year" stroke="#556678" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#556678" tick={{ fontSize: 10 }} width={48} tickFormatter={(v: any) => `${(Number(v) / 100).toFixed(1)}×`} />
                          <Tooltip content={(props: any) => {
                            if (!props.active || !props.payload?.length) return null;
                            // Sort by value descending
                            const sorted = [...props.payload].sort((a: any, b: any) => b.value - a.value);
                            return (
                              <div className="rounded-lg border border-[#1E3A5F] bg-[#07111E] p-3 text-xs shadow-xl min-w-[180px]">
                                <div className="mb-2 font-semibold text-[#8896AB]">Tahun ke-{props.label}</div>
                                {sorted.map((p: any, i: number) => (
                                  <div key={i} style={{ color: SCENARIOS[p.dataKey as ScenarioId]?.color ?? p.stroke }} className="font-mono leading-relaxed flex justify-between gap-3">
                                    <span>{SCENARIOS[p.dataKey as ScenarioId]?.shortLabel || p.dataKey}</span>
                                    <strong>{(p.value / 100).toFixed(2)}×</strong>
                                  </div>
                                ))}
                              </div>
                            );
                          }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} formatter={(v: string) => SCENARIOS[v as ScenarioId]?.shortLabel ?? v} />
                          {/* Bullish group */}
                          <Area type="monotone" dataKey="aiboom"     stroke={SCENARIOS.aiboom.color}     fill={`url(#g_aiboom)`}     strokeWidth={scenario === "aiboom" ? 2.5 : 1.5} dot={false} strokeDasharray="9 3" />
                          <Area type="monotone" dataKey="goldilocks" stroke={SCENARIOS.goldilocks.color} fill={`url(#g_goldilocks)`} strokeWidth={scenario === "goldilocks" ? 2.5 : 1.5} dot={false} strokeDasharray="6 3" />
                          {/* Neutral */}
                          <Area type="monotone" dataKey="normal"     stroke={SCENARIOS.normal.color}     fill={`url(#g_normal)`}     strokeWidth={scenario === "normal" ? 2.5 : 2} dot={false} />
                          {/* Bearish group */}
                          <Area type="monotone" dataKey="mild"       stroke={SCENARIOS.mild.color}       fill={`url(#g_mild)`}       strokeWidth={scenario === "mild" ? 2.5 : 1.5} dot={false} strokeDasharray="7 3" />
                          <Area type="monotone" dataKey="stagflasi"  stroke={SCENARIOS.stagflasi.color}  fill={`url(#g_stagflasi)`}  strokeWidth={scenario === "stagflasi" ? 2.5 : 1.5} dot={false} strokeDasharray="5 3" />
                          {/* Crisis group */}
                          <Area type="monotone" dataKey="oilshock"   stroke={SCENARIOS.oilshock.color}   fill={`url(#g_oilshock)`}   strokeWidth={scenario === "oilshock" ? 2.5 : 1.5} dot={false} strokeDasharray="4 3" />
                          <Area type="monotone" dataKey="dalio"      stroke={SCENARIOS.dalio.color}      fill={`url(#g_dalio)`}      strokeWidth={scenario === "dalio" ? 2.5 : 1.5} dot={false} strokeDasharray="3 3" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#3B5170]">
                        ⚠ Total bobot harus 100% - sesuaikan di panel kiri
                      </div>
                    )
                  )}

                  {mode === "presets" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={presetChartData.chart} margin={{ top: 5, right: 12, bottom: 16, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                        <XAxis dataKey="year" stroke="#556678" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#556678" tick={{ fontSize: 10 }} width={48} tickFormatter={(v: any) => `${(Number(v) / 100).toFixed(1)}×`} />
                        <Tooltip content={(props: any) => {
                          if (!props.active || !props.payload?.length) return null;
                          return (
                            <div className="rounded-lg border border-[#1E3A5F] bg-[#07111E] p-3 text-xs shadow-xl">
                              <div className="mb-2 text-[#8896AB]">Tahun ke-{props.label}</div>
                              {props.payload.map((p: any, i: number) => {
                                if (p.dataKey === "custom") {
                                  return (
                                    <div key={i} style={{ color: p.stroke }} className="font-mono leading-relaxed font-bold">
                                      Custom Portfolio (Anda): <strong>{(p.value / 100).toFixed(2)}×</strong>
                                    </div>
                                  );
                                }
                                const preset = PRESETS.find((pr) => pr.id === p.dataKey);
                                return (
                                  <div key={i} style={{ color: p.stroke }} className="font-mono leading-relaxed">
                                    {preset?.label.split(" - ")[0].trim()}: <strong>{(p.value / 100).toFixed(2)}×</strong>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }} />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                          formatter={(v: string) => {
                            if (v === "custom") return "⚙️ Custom Portfolio (Anda)";
                            return PRESETS.find((p) => p.id === v)?.label.split(" - ")[0].trim() ?? v;
                          }}
                        />
                        {PRESETS.map((p) => (
                          <Line
                            key={p.id}
                            type="monotone"
                            dataKey={p.id}
                            stroke={p.color}
                            strokeWidth={activePreset === p.id ? 2.5 : 1}
                            opacity={activePreset === p.id ? 1 : 0.4}
                            dot={false}
                          />
                        ))}
                        <Line
                          type="monotone"
                          dataKey="custom"
                          stroke="#f43f5e"
                          strokeWidth={activePreset === "" ? 2.5 : 1.5}
                          opacity={activePreset === "" ? 1 : 0.6}
                          strokeDasharray={activePreset !== "" ? "4 4" : undefined}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              {/* 3. Perbandingan presets table (shown below chart if presets mode is active) */}
              {mode === "presets" && (
                <Panel title={`Tabel Perbandingan Preset (${sc.label})`}>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs" style={{ minWidth: 540 }}>
                      <thead>
                        <tr>
                          {["Portfolio", "Alokasi Utama", "5 Thn", "10 Thn", "20 Thn ×", "CAGR", "Max DD"].map((h, i) => (
                            <th
                              key={h}
                              className="border-b border-white/10 px-2 py-2 font-medium text-zinc-500"
                              style={{ textAlign: i >= 2 ? "right" : "left" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {combinedTableRows.map((row) => {
                          const m = row.metrics;
                          const isCustomRow = row.id === "custom";
                          const isActive = activePreset === row.id || (isCustomRow && activePreset === "");
                          const topAssets = Object.entries(row.weights)
                            .filter(([, v]) => (v as number) > 0)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 3)
                            .map(([k, v]) => `${k.toUpperCase()} ${v}%`)
                            .join(" · ");
                          return (
                            <tr
                              key={row.id}
                              onClick={() => {
                                if (isCustomRow) {
                                  setActivePreset("");
                                } else {
                                  const p = PRESETS.find(pr => pr.id === row.id);
                                  if (p) applyPreset(p);
                                }
                              }}
                              className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/[0.02]"
                              style={{ background: isActive ? `${row.color}12` : undefined }}
                            >
                              <td className="px-2 py-2.5">
                                <span className="inline-block h-2 w-2 rounded-sm mr-2" style={{ background: row.color }} />
                                <span className="font-semibold" style={{ color: row.color }}>{row.label.split(" - ")[0].trim()}</span>
                              </td>
                              <td className="px-2 py-2.5 text-[10px] text-zinc-500">{topAssets}</td>
                              <td className="px-2 py-2.5 text-right font-mono text-zinc-400">{(m.y5 / 100).toFixed(2)}×</td>
                              <td className="px-2 py-2.5 text-right font-mono text-zinc-400">{(m.y10 / 100).toFixed(2)}×</td>
                              <td className="px-2 py-2.5 text-right font-mono text-sm font-bold text-white">{m.mult}×</td>
                              <td className="px-2 py-2.5 text-right font-mono text-emerald-400">{m.cagr}%</td>
                              <td className="px-2 py-2.5 text-right font-mono text-red-400">-{m.maxDD}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] italic text-zinc-600">
                    * Klik baris untuk memuat preset ke weight controls di panel kiri. Multiplier dihitung sebagai Nilai Akhir / Modal Awal + Total DCA.
                  </p>
                </Panel>
              )}

              {/* 4. Breakdown X tahun */}
              <Panel title={`Breakdown per Aset - ${yearsForBreakdown} Tahun (${sc.label})`}>
                <div className="space-y-2">
                  {ASSETS.filter((a) => (weights[a.key] || 0) > 0).map((asset) => {
                    const alloc = weights[asset.key] || 0;
                    const nominal = (customDynamicSeries51[yearsForBreakdown] as any)[asset.key] || 0;
                    const real = realValue(nominal, inflation, yearsForBreakdown);
                    const defaultCagr = getReturnsCagr(getScenarioReturns(scenario, asset.key, crisisOnsetYear, 20));
                    const assetCagr = activeCustomReturns[asset.key] !== undefined
                      ? (activeCustomReturns[asset.key] as number)
                      : defaultCagr;
                    return (
                      <div key={asset.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#090b11] p-3">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: asset.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white">{asset.label}</div>
                          <div className="text-[10px] text-zinc-500">{alloc}% · CAGR {assetCagr.toFixed(1)}%/thn</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold text-white">{fmtCurrency(nominal)}</div>
                          <div className="text-[10px] text-sky-300">{fmtCurrency(real)} riil</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* 5. FIRE Calculator (violet card inputs + outputs) */}
              <div className="rounded-lg border border-violet-400/20 bg-violet-500/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300/80">🔥 FIRE Calculator</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Financial Independence - estimasi kapan kamu bisa pensiun dari portofolio ini.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-400/10 px-3 py-1 text-[11px] text-violet-200">
                    {withdrawalRate}% withdrawal rule
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <MillionInput
                    label="Target pengeluaran / bulan"
                    value={fireTarget}
                    onChange={setFireTarget}
                    suffix="jt"
                    description="Pengeluaran rutin saat sudah pensiun (harga hari ini)."
                  />
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500">Withdrawal rule</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {withdrawalRates.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setWithdrawalRate(rate)}
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              withdrawalRate === rate
                                ? "border-violet-300/60 bg-violet-400/15 text-white"
                                : "border-white/10 bg-white/5 text-zinc-400 hover:border-violet-300/30 hover:text-white"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-[#0a0c11] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">FIRE tercapai</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{fireYear ? `Tahun ke-${fireYear}` : ">50 tahun"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0a0c11] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Progress saat ini</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{fireProgress.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0a0c11] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">FIRE Number</p>
                    <p className="mt-1.5 text-sm font-semibold text-amber-200">{fireNumber > 0 ? fmtCurrency(fireNumber) : "-"}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-500"
                      style={{ width: `${fireProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Sisa yang dibutuhkan: <strong className="text-amber-200">{fireGap > 0 ? fmtCurrency(fireGap) : "Tercapai"}</strong></span>
                    {fireYear && (
                      <span className="text-sky-300/80">Target nominal thn {fireYear}: {fmtCurrency(fireNominalTarget)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section: Assumptions Table */}
          <div className="pt-4 border-t border-white/10">
            <AssumptionsTable crisisOnsetYear={crisisOnsetYear} scenario={scenario} />
          </div>
        </div>
      </Card>

      {/* Weights (Proportion) Modal */}
      <Modal
        isOpen={isWeightsModalOpen}
        onClose={() => setIsWeightsModalOpen(false)}
        title="Bobot Aset (Proporsi)"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-lg border border-white/5">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-mono font-bold"
              style={{ 
                background: isValid ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", 
                color: isValid ? "#34D399" : "#EF4444" 
              }}
            >
              Total Alokasi: {total}%
            </span>
            {!isValid && (
              <button
                type="button"
                onClick={handleNormalize}
                className="rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-red-500/20 cursor-pointer"
                style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}
              >
                Normalkan 100%
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {assetGroups.map((group) => (
              <div key={group} className="border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{group}</div>
                <div className="space-y-2">
                  {ASSETS.filter((a) => a.group === group).map((asset) => {
                    const currentAlloc = weights[asset.key] || 0;
                    return (
                      <div key={asset.key} className="rounded-lg border border-white/5 bg-black/40 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: asset.color }} />
                              <span className="text-xs font-semibold text-white truncate">{asset.label}</span>
                            </div>
                            <p className="mt-0.5 pl-3.5 text-[10px] text-zinc-500">{asset.sublabel}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentAlloc || 0}
                              onChange={(e) => setW(asset.key, e.target.value)}
                              className="w-12 rounded border border-white/10 bg-[#0a0c11] px-2 py-1 text-right text-xs font-mono text-white outline-none focus:border-amber-400"
                            />
                            <span className="text-xs text-zinc-500">%</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentAlloc}
                            onChange={(e) => setW(asset.key, e.target.value)}
                            className="w-full accent-amber-500 h-0.5 rounded-full bg-white/10 cursor-pointer"
                          />
                        </div>

                        {/* Expectation CAGR badge for current asset - all 7 scenarios */}
                        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
                          {(["normal","goldilocks","aiboom","mild","stagflasi","oilshock","dalio"] as ScenarioId[]).map((sid) => {
                            const baseRet = getScenarioReturns(sid, asset.key, crisisOnsetYear, 20);
                            const cagr = getReturnsCagr(baseRet);
                            return (
                              <div
                                key={sid}
                                className="rounded px-1.5 py-0.5 text-center bg-white/5 flex-shrink-0"
                                style={{
                                  borderLeft: scenario === sid ? `2px solid ${SCENARIOS[sid].color}` : "2px solid transparent",
                                  minWidth: 40,
                                }}
                              >
                                <div className="text-[7px] uppercase tracking-wide font-semibold leading-tight" style={{ color: SCENARIOS[sid].color }}>
                                  {SCENARIOS[sid].shortLabel.split(" ")[0]}
                                </div>
                                <div className="text-[9px] font-mono text-zinc-400 leading-tight mt-0.5">
                                  {cagr.toFixed(1)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsWeightsModalOpen(false)}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </Modal>

      {/* Returns Override Modal */}
      <Modal
        isOpen={isReturnsModalOpen}
        onClose={() => setIsReturnsModalOpen(false)}
        title={`Estimasi Return - ${SCENARIOS[selectedScenarioForEdit].label}`}
      >
        <div className="space-y-4">
          <p className="text-[11px] text-zinc-500">
            Kustomisasi CAGR per tahun untuk skenario <strong style={{ color: SCENARIOS[selectedScenarioForEdit].color }}>{SCENARIOS[selectedScenarioForEdit].label}</strong>. Kosongkan untuk menggunakan nilai otomatis.
          </p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {ASSETS.map((asset) => {
              const defaultCagr = getReturnsCagr(getScenarioReturns(selectedScenarioForEdit, asset.key, crisisOnsetYear, 20));
              const scenarioCustomReturns = customReturns[selectedScenarioForEdit] || {};
              return (
                <div key={asset.key} className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-white/5 bg-black/20">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: asset.color }} />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white truncate block">{asset.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder={defaultCagr.toFixed(1)}
                      step="0.5"
                      value={scenarioCustomReturns[asset.key] ?? ""}
                      onChange={(e) => handleCagrOverrideForScenario(selectedScenarioForEdit, asset.key, e.target.value)}
                      className="w-16 rounded border border-white/10 bg-[#0a0c11] px-2 py-1 text-right text-xs font-mono text-white outline-none placeholder:text-zinc-600 focus:border-amber-400"
                    />
                    <span className="text-xs text-zinc-500">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
            {Object.values(customReturns[selectedScenarioForEdit] || {}).some((v) => v !== undefined) ? (
              <button
                type="button"
                onClick={() => {
                  setCustomReturns(prev => ({ ...prev, [selectedScenarioForEdit]: {} }));
                  setActivePreset("");
                }}
                className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
              >
                Reset override skenario ini
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setIsReturnsModalOpen(false)}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </Modal>

      {/* Maximized Chart Modal */}
      {isChartMaximized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsChartMaximized(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-6xl transform rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 scale-100 flex flex-col h-[90vh] text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>📊 Proyeksi Grafik Lanjutan & Analisis Risiko</span>
                  <span className="text-xs font-normal text-zinc-500">Mode Maksimal</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Simulasikan ketidakpastian pasar, volatilitas, dan target jangka panjang.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsChartMaximized(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
            
            {/* Main Split Layout */}
            <div className="mt-4 flex-1 grid gap-6 md:grid-cols-[1.3fr_0.7fr] overflow-hidden">
              {/* Left Side: Chart */}
              <div className="flex flex-col h-full overflow-hidden">
                {/* Tabs to select active mode */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-1.5 rounded-full border border-white/10 bg-black/40 p-1">
                    {[
                      { id: "portfolio", label: "Proyeksi DCA" },
                      { id: "scenarios", label: "7 Skenario" },
                      { id: "presets",   label: "Bandingkan Preset" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setMode(btn.id as typeof mode)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          mode === btn.id
                            ? "bg-amber-400/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* The Chart container */}
                <div className="flex-1 w-full bg-black/30 border border-white/5 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
                  {mode === "portfolio" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={maximizedChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                        <XAxis dataKey="year" stroke="#556678" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <YAxis 
                          scale={isLogScale ? "log" : "auto"} 
                          domain={isLogScale ? [Math.max(1, init * 0.1), "auto"] : [0, "auto"]} 
                          stroke="#556678" 
                          tick={{ fill: "#a1a1aa", fontSize: 11 }} 
                          width={85} 
                          tickFormatter={(v) => `Rp ${fmtJuta(Number(v))}`} 
                        />
                        <Tooltip
                          contentStyle={{ background: "#07111E", border: "1px solid #1E3A5F", borderRadius: 8 }}
                          formatter={(v: any) => fmtCurrency(Number(v))}
                          labelFormatter={(l: any) => `Tahun ke-${l}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                        
                        {/* Shaded Area for Confidence Interval */}
                        {confidenceBand !== "none" && (
                          <Area 
                            type="monotone" 
                            dataKey={['confidenceLower', 'confidenceUpper'] as any} 
                            stroke="none" 
                            fill="#F59E0B" 
                            fillOpacity={0.08} 
                            name="Rentang Keyakinan (Confidence Band)" 
                          />
                        )}

                        <Line type="monotone" dataKey="nominal" name="Nominal" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="real" name="Nilai Riil" stroke="#38BDF8" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="invested" name="Tunai Diinvestasikan" stroke="#556678" strokeDasharray="6 4" strokeWidth={1.5} dot={false} opacity={0.6} />
                        
                        {/* FIRE Target line */}
                        {showTargetLine && fireNumber > 0 && (
                          <ReferenceLine 
                            y={fireNumber} 
                            stroke="#8B5CF6" 
                            strokeDasharray="4 4" 
                            strokeWidth={2}
                            label={{ value: `Target FIRE: ${fmtCurrency(fireNumber)}`, fill: "#C084FC", fontSize: 10, position: "top" }} 
                          />
                        )}

                        {/* Additional bounds lines if confidence interval is shown */}
                        {confidenceBand !== "none" && (
                          <Line type="monotone" dataKey="confidenceUpper" name="Batas Atas (Bullish)" stroke="#10B981" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.5} />
                        )}
                        {confidenceBand !== "none" && (
                          <Line type="monotone" dataKey="confidenceLower" name="Batas Bawah (Bearish)" stroke="#EF4444" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.5} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {mode === "scenarios" && (
                    maximizedAllScenData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={maximizedAllScenData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                          <defs>
                            {(["normal","goldilocks","aiboom","mild","stagflasi","oilshock","dalio"] as ScenarioId[]).map((id) => (
                              <linearGradient key={id} id={`max_g_${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="10%" stopColor={SCENARIOS[id].color} stopOpacity={0.15} />
                                <stop offset="90%" stopColor={SCENARIOS[id].color} stopOpacity={0.01} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                          <XAxis dataKey="year" stroke="#556678" tick={{ fontSize: 10 }} />
                          <YAxis 
                            scale={isLogScale ? "log" : "auto"} 
                            domain={isLogScale ? [0.1, "auto"] : [0, "auto"]} 
                            stroke="#556678" 
                            tick={{ fontSize: 10 }} 
                            width={50} 
                            tickFormatter={(v: any) => `${(Number(v) / 100).toFixed(1)}×`} 
                          />
                          <Tooltip content={(props: any) => {
                            if (!props.active || !props.payload?.length) return null;
                            const sorted = [...props.payload].sort((a: any, b: any) => b.value - a.value);
                            return (
                              <div className="rounded-lg border border-[#1E3A5F] bg-[#07111E] p-3 text-xs shadow-xl min-w-[180px]">
                                <div className="mb-2 font-semibold text-[#8896AB]">Tahun ke-{props.label}</div>
                                {sorted.map((p: any, i: number) => (
                                  <div key={i} style={{ color: SCENARIOS[p.dataKey as ScenarioId]?.color ?? p.stroke }} className="font-mono leading-relaxed flex justify-between gap-3">
                                    <span>{SCENARIOS[p.dataKey as ScenarioId]?.shortLabel || p.dataKey}</span>
                                    <strong>{(p.value / 100).toFixed(2)}×</strong>
                                  </div>
                                ))}
                              </div>
                            );
                          }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} formatter={(v: string) => SCENARIOS[v as ScenarioId]?.shortLabel ?? v} />
                          <Area type="monotone" dataKey="aiboom"     stroke={SCENARIOS.aiboom.color}     fill={`url(#max_g_aiboom)`}     strokeWidth={scenario === "aiboom" ? 2.5 : 1.5} dot={false} strokeDasharray="9 3" />
                          <Area type="monotone" dataKey="goldilocks" stroke={SCENARIOS.goldilocks.color} fill={`url(#max_g_goldilocks)`} strokeWidth={scenario === "goldilocks" ? 2.5 : 1.5} dot={false} strokeDasharray="6 3" />
                          <Area type="monotone" dataKey="normal"     stroke={SCENARIOS.normal.color}     fill={`url(#max_g_normal)`}     strokeWidth={scenario === "normal" ? 2.5 : 2} dot={false} />
                          <Area type="monotone" dataKey="mild"       stroke={SCENARIOS.mild.color}       fill={`url(#max_g_mild)`}       strokeWidth={scenario === "mild" ? 2.5 : 1.5} dot={false} strokeDasharray="7 3" />
                          <Area type="monotone" dataKey="stagflasi"  stroke={SCENARIOS.stagflasi.color}  fill={`url(#max_g_stagflasi)`}  strokeWidth={scenario === "stagflasi" ? 2.5 : 1.5} dot={false} strokeDasharray="5 3" />
                          <Area type="monotone" dataKey="oilshock"   stroke={SCENARIOS.oilshock.color}   fill={`url(#max_g_oilshock)`}   strokeWidth={scenario === "oilshock" ? 2.5 : 1.5} dot={false} strokeDasharray="4 3" />
                          <Area type="monotone" dataKey="dalio"      stroke={SCENARIOS.dalio.color}      fill={`url(#max_g_dalio)`}      strokeWidth={scenario === "dalio" ? 2.5 : 1.5} dot={false} strokeDasharray="3 3" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#3B5170]">
                        ⚠ Total bobot harus 100% - sesuaikan di panel kiri
                      </div>
                    )
                  )}

                  {mode === "presets" && (
                    maximizedPresetChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={maximizedPresetChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2942" />
                          <XAxis dataKey="year" stroke="#556678" tick={{ fontSize: 10 }} />
                          <YAxis 
                            scale={isLogScale ? "log" : "auto"} 
                            domain={isLogScale ? [0.1, "auto"] : [0, "auto"]} 
                            stroke="#556678" 
                            tick={{ fontSize: 10 }} 
                            width={50} 
                            tickFormatter={(v: any) => `${(Number(v) / 100).toFixed(1)}×`} 
                          />
                          <Tooltip content={(props: any) => {
                            if (!props.active || !props.payload?.length) return null;
                            return (
                              <div className="rounded-lg border border-[#1E3A5F] bg-[#07111E] p-3 text-xs shadow-xl">
                                <div className="mb-2 text-[#8896AB]">Tahun ke-{props.label}</div>
                                {props.payload.map((p: any, i: number) => {
                                  if (p.dataKey === "custom") {
                                    return (
                                      <div key={i} style={{ color: p.stroke }} className="font-mono leading-relaxed font-bold">
                                        Custom Portfolio (Anda): <strong>{(p.value / 100).toFixed(2)}×</strong>
                                      </div>
                                    );
                                  }
                                  const preset = PRESETS.find((pr) => pr.id === p.dataKey);
                                  return (
                                    <div key={i} style={{ color: p.stroke }} className="font-mono leading-relaxed">
                                      {preset?.label.split(" - ")[0].trim()}: <strong>{(p.value / 100).toFixed(2)}×</strong>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }} />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                            formatter={(v: string) => {
                              if (v === "custom") return "⚙️ Custom Portfolio (Anda)";
                              return PRESETS.find((p) => p.id === v)?.label.split(" - ")[0].trim() ?? v;
                            }}
                          />
                          {PRESETS.map((p) => (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={p.id}
                              stroke={p.color}
                              strokeWidth={activePreset === p.id ? 2.5 : 1}
                              opacity={activePreset === p.id ? 1 : 0.4}
                              dot={false}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="custom"
                            stroke="#f43f5e"
                            strokeWidth={activePreset === "" ? 2.5 : 1.5}
                            opacity={activePreset === "" ? 1 : 0.6}
                            strokeDasharray={activePreset !== "" ? "4 4" : undefined}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : null
                  )}
                </div>
              </div>

              {/* Right Side: Sidebar of Advanced Controls */}
              <div className="overflow-y-auto space-y-4 pr-1">
                {/* Skenario Ekonomi */}
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Skenario Ekonomi</h4>
                  <div className="grid gap-1.5 grid-cols-2">
                    {(Object.entries(SCENARIOS) as [ScenarioId, ScenarioMeta][]).map(([id, s]) => {
                      const isSelected = scenario === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setScenario(id); setActivePreset(""); }}
                          className={`rounded-lg border p-2 text-left transition-all text-xs relative group ${
                            isSelected
                              ? "border-amber-400/60 bg-amber-400/10 text-white"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-amber-400/40 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-white truncate">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Crisis Onset Input */}
                  {scenario !== "normal" && (
                    <div className="mt-2 p-2 bg-black/40 border border-white/10 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          Krisis Tahun ke-
                        </span>
                        <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-400/20">
                          {crisisOnsetYear}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={crisisOnsetYear}
                        onChange={(e) => setCrisisOnsetYear(Number(e.target.value))}
                        className="w-full accent-amber-500 h-1 rounded-full bg-white/10 outline-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Preset Portofolio */}
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Preset Portofolio</h4>
                  <div className="grid gap-1.5 grid-cols-2">
                    {PRESETS.map((p) => {
                      const isSelected = activePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className={`rounded-lg border p-2 text-left text-xs transition-all relative group ${
                            isSelected
                              ? "border-amber-400/60 bg-amber-400/10 text-white"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-amber-400/40 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-white truncate">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-sm" style={{ background: p.color }} />
                            {p.label.split(" - ")[0].trim()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1. Horizon Simulasi */}
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Horizon Proyeksi</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[20, 30, 50].map((years) => (
                      <button
                        key={years}
                        type="button"
                        onClick={() => setMaximizedHorizon(years)}
                        className={`rounded-lg py-2 text-xs font-semibold border transition cursor-pointer ${
                          maximizedHorizon === years
                            ? "border-amber-400/50 bg-amber-400/10 text-white"
                            : "border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {years} Tahun
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">Rentang waktu simulasi pertumbuhan (tahun).</p>
                </div>

                {/* 2. Tingkat Keyakinan & Volatilitas (Hanya untuk DCA) */}
                {mode === "portfolio" && (
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tingkat Keyakinan Proyeksi</h4>
                    
                    {/* Interval selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-medium uppercase">Rentang Keyakinan</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "none", label: "Tidak Ada" },
                          { id: "68",   label: "68% (1σ)" },
                          { id: "95",   label: "95% (2σ)" },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setConfidenceBand(b.id as typeof confidenceBand)}
                            className={`rounded-lg py-1.5 text-[10px] font-semibold border transition cursor-pointer ${
                              confidenceBand === b.id
                                ? "border-amber-400/50 bg-amber-400/10 text-white"
                                : "border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volatility slider */}
                    {confidenceBand !== "none" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] uppercase text-zinc-500 font-medium">
                          <span>Volatilitas Portofolio</span>
                          <span className="text-amber-400 font-mono font-bold">{portfolioVolatility}%</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="30"
                          value={portfolioVolatility}
                          onChange={(e) => setPortfolioVolatility(Number(e.target.value))}
                          className="w-full accent-amber-500 h-1 bg-white/10 rounded-full cursor-pointer"
                        />
                        <p className="text-[9px] text-zinc-500 leading-normal">
                          Volatilitas menentukan margin of error. Volatilitas historis VWRA ~15%, Emas ~12%, Obligasi ~5%.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tweak & Toggles */}
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pengaturan Grafik</h4>
                  
                  {/* Log scale toggle */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/40 border border-white/5 cursor-pointer">
                    <span className="text-xs text-zinc-300">Skala Logaritmik</span>
                    <input 
                      type="checkbox"
                      checked={isLogScale}
                      onChange={(e) => setIsLogScale(e.target.checked)}
                      className="accent-amber-500 h-4 w-4 rounded border-white/10 bg-zinc-900"
                    />
                  </label>

                  {/* FIRE target line toggle (DCA only) */}
                  {mode === "portfolio" && fireNumber > 0 && (
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/40 border border-white/5 cursor-pointer">
                      <span className="text-xs text-zinc-300">Garis Target FIRE</span>
                      <input 
                        type="checkbox"
                        checked={showTargetLine}
                        onChange={(e) => setShowTargetLine(e.target.checked)}
                        className="accent-amber-500 h-4 w-4 rounded border-white/10 bg-zinc-900"
                      />
                    </label>
                  )}
                </div>

                {/* 4. Actions: Export CSV */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold py-3 text-xs transition cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Ekspor Data Proyeksi (CSV)</span>
                  </button>
                </div>

                {/* 5. Edu/Explanation Box */}
                {mode === "portfolio" && confidenceBand !== "none" && (
                  <div className="rounded-xl border border-blue-400/10 bg-blue-500/5 p-4 text-[10px] text-zinc-400 leading-relaxed flex gap-2">
                    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Tentang Rentang Keyakinan:</strong>
                      <p className="mt-1">
                        Skenario investasi nyata tidak linier. Rentang keyakinan mensimulasikan akumulasi ketidakpastian pasar dari waktu ke waktu.
                      </p>
                      <p className="mt-1">
                        - <span className="text-emerald-400 font-semibold">Batas Atas (Bullish):</span> Skenario jika pasar tumbuh di atas rata-rata (kondisi market kondusif).
                      </p>
                      <p className="mt-1">
                        - <span className="text-rose-400 font-semibold">Batas Bawah (Bearish):</span> Risiko penurunan jika pasar dilanda volatilitas / krisis berkepanjangan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════
// ASSUMPTIONS TABLE
// ══════════════════════════════
function AssumptionsTable({ crisisOnsetYear, scenario }: { crisisOnsetYear: number; scenario: ScenarioId }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-[#090b11] p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
      >
        <span>📋 Rincian Skenario & Asumsi Return per Aset (% / tahun)</span>
        <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[10px]" style={{ minWidth: 760 }}>
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-2 text-left font-semibold text-zinc-500 pr-2 sticky left-0 bg-[#090b11]">Aset</th>
                {(["normal","goldilocks","aiboom","mild","stagflasi","oilshock","dalio"] as ScenarioId[]).map((sid) => (
                  <th key={sid} className="pb-2 text-left font-semibold pr-2 min-w-[72px]" style={{ color: SCENARIOS[sid].color }}>
                    <div>{SCENARIOS[sid].shortLabel}</div>
                    <div className="text-[8px] font-normal text-zinc-600 normal-case tracking-normal">{SCENARIOS[sid].source}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((asset) => {
                return (
                  <tr key={asset.key} className="border-b border-white/5 hover:bg-white/[0.01]">
                    <td className="py-2 pr-2 sticky left-0 bg-[#090b11]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: asset.color }} />
                        <span className="font-medium text-white whitespace-nowrap">{asset.label}</span>
                      </div>
                      <div className="pl-3 text-[9px] text-zinc-600 mt-0.5 max-w-[120px] leading-tight">{asset.note}</div>
                    </td>
                    {(["normal","goldilocks","aiboom","mild","stagflasi","oilshock","dalio"] as ScenarioId[]).map((sid) => {
                      const returns = getScenarioReturns(sid, asset.key, crisisOnsetYear, 20);
                      const cagr = getReturnsCagr(returns);
                      const isActive = scenario === sid;
                      const isHigh = cagr >= 10;
                      const isNeg = cagr < 0;
                      return (
                        <td key={sid} className="py-2 pr-2 align-top leading-relaxed"
                          style={{ borderLeft: isActive ? `1px solid ${SCENARIOS[sid].color}30` : undefined }}
                        >
                          <div className={`font-semibold text-[10px] ${isNeg ? "text-rose-400" : isHigh ? "text-emerald-400" : "text-zinc-300"}`}>
                            {cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%
                          </div>
                          <div className="text-[8px] text-zinc-600 mt-0.5 font-mono">
                            {returns[0] === returns[returns.length - 1]
                              ? `${returns[0]}%/yr`
                              : `${returns[0]}%→${returns[returns.length - 1]}%`}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] italic text-zinc-500 leading-relaxed border-t border-white/10 pt-3">
            ⚠️ Semua angka bersifat ilustratif berdasarkan framework Dalio, Roubini, Morgan Stanley, JPMorgan, dan data historis — bukan proyeksi investasi mutlak.<br/>
            💡 <strong className="text-zinc-400">Goldilocks</strong> (Roubini) = pemulihan moderat; <strong className="text-zinc-400">AI Boom</strong> = productivity miracle; <strong className="text-zinc-400">Stagflasi</strong> = inflasi tinggi + tumbuh lambat; <strong className="text-zinc-400">Oil Shock</strong> = konflik energi global; <strong className="text-zinc-400">Dalio</strong> = restrukturisasi sistem moneter. TIPS &amp; komoditas bersinar di stagflasi. Long Bond berbahaya di stagflasi (duration risk). Cash riilnya <strong className="text-rose-400">negatif</strong> di dalio &amp; stagflasi.
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════
// UI ATOMS
// ══════════════════════════════
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#3B5170]">{title}</div>
      {children}
    </div>
  );
}

function MetricChip({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111F35] p-3" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="text-[10px] uppercase tracking-widest text-[#8896AB]">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-[#556678]">{sub}</div>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0A1628] p-3">
      <div className="text-[10px] uppercase tracking-widest text-[#3B5170]">{label}</div>
      <div className="mt-1.5 text-sm font-bold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-[10px] text-[#556678]">{sub}</div>
    </div>
  );
}

function MillionInput({ label, value, onChange, suffix, description }: {
  label: string; value: number; onChange: (v: number) => void; suffix: string; description?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-zinc-400">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full rounded-lg border border-white/10 bg-[#0a0c11] px-4 py-3 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <span className="text-sm text-zinc-500">{suffix}</span>
      </div>
      {description && <p className="text-[11px] text-zinc-600">{description}</p>}
    </label>
  );
}

function NumberInput({ label, badge, value, onChange, suffix, step, description }: {
  label: string; badge?: string; value: number; onChange: (v: number) => void; suffix: string; step: string; description?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-zinc-400">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {badge && <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-300">{badge}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full rounded-lg border border-white/10 bg-[#0a0c11] px-4 py-3 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <span className="text-sm text-zinc-500">{suffix}</span>
      </div>
      {description && <p className="text-[11px] text-zinc-600">{description}</p>}
    </label>
  );
}

function Panel({ 
  title, 
  subtitle, 
  children, 
  headerAction 
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode; 
  headerAction?: React.ReactNode; 
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{title}</div>
        {headerAction}
      </div>
      {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg transform rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 scale-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            {title}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mt-4 overflow-y-auto pr-1 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function GrowthCard({ tone, title, value, detail }: { tone: "emerald" | "sky"; title: string; value: string; detail: string }) {
  const classes = tone === "emerald" ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-300/80" : "border-sky-400/20 bg-sky-500/5 text-sky-300/80";
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <p className="text-xs uppercase tracking-[0.25em]">{title}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{detail}</p>
    </div>
  );
}

