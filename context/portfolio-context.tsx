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

const PRIVACY_STORAGE_KEY = "aegis:privacy-mode";
const MASKED_VALUE = "****";

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const portfolioKey = user?.email || user?.uid || "anonymous";
  const [data, setData, syncStatus] = usePortfolio(portfolioKey, user);
  const [privacyMode, setPrivacyModeState] = useState(false);
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
    if (weeklyEnsureKeyRef.current === key || activeTaskKeyRef.current === key) return;
    activeTaskKeyRef.current = key;

    async function ensureWeeklySnapshotsWithHistoricalPrices() {
      try {
        const sortedSnapshots = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
        const latestWithLines = [...sortedSnapshots].reverse().find((snapshot) => snapshot.lines.length > 0);
        if (!latestWithLines) return;

        const today = new Date().toISOString().slice(0, 10);
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

        if (user?.uid === userIdRef.current) {
          if (generated.length > 0) {
            setData((current) => ({
              ...current,
              snapshots: [...current.snapshots, ...generated]
                .filter((snapshot, index, snapshots) => snapshots.findIndex((item) => item.date === snapshot.date) === index)
                .sort((a, b) => a.date.localeCompare(b.date)),
            }));
          }
          weeklyEnsureKeyRef.current = key;
        }
      } catch (error) {
        console.error("Auto snapshot creation failed:", error);
      } finally {
        if (activeTaskKeyRef.current === key) {
          activeTaskKeyRef.current = null;
        }
      }
    }

    ensureWeeklySnapshotsWithHistoricalPrices();
  }, [data, loading, setData, syncStatus, user]);

  return (
    <PortfolioContext.Provider value={{ data, setData, syncStatus, user, loading, privacyMode, setPrivacyMode, togglePrivacyMode, maskSensitiveText, formatSensitiveCurrency, formatSensitiveNumber }}>
      {children}
    </PortfolioContext.Provider>
  );
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
