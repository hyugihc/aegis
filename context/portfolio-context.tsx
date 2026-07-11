"use client";

import React, { createContext, useContext, useEffect, useRef, useState, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { usePortfolio } from "@/lib/use-portfolio";
import { useAuthUser } from "@/lib/use-auth-user";
import { buildSnapshotFromHoldings, formatCurrency, formatNumber, type PortfolioData, type Snapshot } from "@/lib/portfolio";
import { fetchHistoricalPrices } from "@/components/aegis/client-utils";

type PortfolioContextType = {
  data: PortfolioData;
  setData: (next: SetStateAction<PortfolioData>) => void;
  syncStatus: string;
  user: User | null;
  loading: boolean;
  privacyMode: boolean;
  setPrivacyMode: (next: boolean) => void;
  togglePrivacyMode: () => void;
  maskSensitiveText: (value?: string | number | null) => string;
  formatSensitiveCurrency: (value: number) => string;
  formatSensitiveNumber: (value: number) => string;
};

type WeeklySnapshotPrompt = {
  key: string;
  dates: string[];
};

const PRIVACY_STORAGE_KEY = "aegis:privacy-mode";
const MASKED_VALUE = "****";

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const portfolioKey = user?.email || user?.uid || "anonymous";
  const [data, setData, syncStatus] = usePortfolio(portfolioKey, user);
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [weeklySnapshotPrompt, setWeeklySnapshotPrompt] = useState<WeeklySnapshotPrompt | null>(null);
  const [weeklySnapshotStatus, setWeeklySnapshotStatus] = useState("");
  const [isWeeklySnapshotRunning, setIsWeeklySnapshotRunning] = useState(false);
  const weeklyEnsureKeyRef = useRef("");
  const activeTaskKeyRef = useRef<string | null>(null);
  const userIdRef = useRef(user?.uid);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setPrivacyModeState(window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "true");
      } catch {
        setPrivacyModeState(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function setPrivacyMode(next: boolean) {
    setPrivacyModeState(next);
    try {
      window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
    } catch {
      // Privacy mode still works for the current session if storage is unavailable.
    }
  }

  function togglePrivacyMode() {
    setPrivacyMode(!privacyMode);
  }

  function maskSensitiveText(value?: string | number | null) {
    if (privacyMode) return MASKED_VALUE;
    return value === undefined || value === null ? "" : String(value);
  }

  function formatSensitiveCurrency(value: number) {
    return privacyMode ? MASKED_VALUE : formatCurrency(value);
  }

  function formatSensitiveNumber(value: number) {
    return privacyMode ? MASKED_VALUE : formatNumber(value);
  }

  useEffect(() => {
    userIdRef.current = user?.uid;
  }, [user]);

  useEffect(() => {
    if (!user || loading || syncStatus.startsWith("Loading") || syncStatus.startsWith("Sign in")) return;
    const latestDate = data.snapshots.map((snapshot) => snapshot.date).sort().at(-1) ?? "";
    const latestAutoSync = data.autoPortfolio.assets.map((asset) => asset.syncedAt).sort().at(-1) ?? "";
    const key = `${user.uid}:${latestDate}:${latestAutoSync}:${data.holdings.length}:${data.snapshots.length}`;
    if (weeklyEnsureKeyRef.current === key || activeTaskKeyRef.current === key || weeklySnapshotPrompt?.key === key) return;

    const dates = missingWeeklySnapshotDates(data);
    if (dates.length === 0) {
      weeklyEnsureKeyRef.current = key;
      return;
    }

    const timer = window.setTimeout(() => {
      setWeeklySnapshotPrompt({ key, dates });
      setWeeklySnapshotStatus("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [data, loading, setData, syncStatus, user, weeklySnapshotPrompt?.key]);

  async function ensureWeeklySnapshotsWithHistoricalPrices(prompt: WeeklySnapshotPrompt) {
    if (!user || activeTaskKeyRef.current === prompt.key) return;
    activeTaskKeyRef.current = prompt.key;
    setIsWeeklySnapshotRunning(true);
    setWeeklySnapshotStatus("Membuat snapshot weekly...");

    try {
      const sortedSnapshots = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
      const latestWithLines = [...sortedSnapshots].reverse().find((snapshot) => snapshot.lines.length > 0);
      if (!latestWithLines) return;

      const existingDates = new Set(sortedSnapshots.map((snapshot) => snapshot.date));
      const generated: Snapshot[] = [];
      let baseSnapshot = latestWithLines;
      let nextDate = addDaysIso(latestWithLines.date, 7);
      let iterations = 0;

      while (nextDate <= todayIso() && iterations < 104) {
        const existing = sortedSnapshots.find((snapshot) => snapshot.date === nextDate) ?? generated.find((snapshot) => snapshot.date === nextDate);
        if (existing) {
          baseSnapshot = existing;
        } else if (!existingDates.has(nextDate)) {
          const activeHoldings = data.holdings.filter((holding) => holding.active);
          const historicalPrices = await fetchHistoricalPrices(data, nextDate, activeHoldings).catch(() => ({ prices: {} }));
          const snapshot = buildSnapshotFromHoldings(
            data,
            nextDate,
            "auto weekly snapshot",
            baseSnapshot,
            historicalPrices.prices ?? {},
          );
          if (snapshot) {
            generated.push(snapshot);
            existingDates.add(nextDate);
            baseSnapshot = snapshot;
          }
        }

        nextDate = addDaysIso(nextDate, 7);
        iterations += 1;
      }

      if (user.uid === userIdRef.current) {
        if (generated.length > 0) {
          setData((current) => ({
            ...current,
            snapshots: [...current.snapshots, ...generated]
              .filter((snapshot, index, snapshots) => snapshots.findIndex((item) => item.date === snapshot.date) === index)
              .sort((a, b) => a.date.localeCompare(b.date)),
          }));
        }
        weeklyEnsureKeyRef.current = prompt.key;
        setWeeklySnapshotPrompt(null);
      }
    } catch (error) {
      console.error("Auto snapshot creation failed:", error);
      setWeeklySnapshotStatus("Auto snapshot gagal dibuat. Coba lagi nanti.");
    } finally {
      if (activeTaskKeyRef.current === prompt.key) {
        activeTaskKeyRef.current = null;
      }
      setIsWeeklySnapshotRunning(false);
    }
  }

  function postponeWeeklySnapshots(prompt: WeeklySnapshotPrompt) {
    weeklyEnsureKeyRef.current = prompt.key;
    setWeeklySnapshotPrompt(null);
    setWeeklySnapshotStatus("");
  }

  return (
    <PortfolioContext.Provider value={{ data, setData, syncStatus, user, loading, privacyMode, setPrivacyMode, togglePrivacyMode, maskSensitiveText, formatSensitiveCurrency, formatSensitiveNumber }}>
      {children}
      {weeklySnapshotPrompt ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Auto weekly snapshot</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Isi minggu snapshot yang kosong?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Aegis menemukan {weeklySnapshotPrompt.dates.length} minggu kosong sejak snapshot terakhir. Aplikasi dapat membuat snapshot weekly otomatis memakai harga historis untuk melengkapi riwayat.
            </p>
            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
              <span className="text-zinc-300">Periode:</span> {weeklySnapshotPrompt.dates[0]} sampai {weeklySnapshotPrompt.dates.at(-1)}
            </div>
            {weeklySnapshotStatus ? <p className="mt-3 text-xs text-amber-200/80">{weeklySnapshotStatus}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => postponeWeeklySnapshots(weeklySnapshotPrompt)}
                disabled={isWeeklySnapshotRunning}
              >
                Nanti
              </button>
              <button
                type="button"
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => ensureWeeklySnapshotsWithHistoricalPrices(weeklySnapshotPrompt)}
                disabled={isWeeklySnapshotRunning}
              >
                Buat snapshot
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortfolioContext.Provider>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function missingWeeklySnapshotDates(data: PortfolioData) {
  const sortedSnapshots = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latestWithLines = [...sortedSnapshots].reverse().find((snapshot) => snapshot.lines.length > 0);
  if (!latestWithLines) return [];

  const existingDates = new Set(sortedSnapshots.map((snapshot) => snapshot.date));
  const dates: string[] = [];
  let nextDate = addDaysIso(latestWithLines.date, 7);
  let iterations = 0;

  while (nextDate <= todayIso() && iterations < 104) {
    if (!existingDates.has(nextDate)) dates.push(nextDate);
    nextDate = addDaysIso(nextDate, 7);
    iterations += 1;
  }

  return dates;
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolioContext must be used within a PortfolioProvider");
  }
  return context;
}
