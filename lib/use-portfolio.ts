"use client";

import { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { loadPortfolioFromFirestore, savePortfolioToFirestore } from "@/lib/firestore-portfolio";
import { emptyPortfolio, normalizePortfolioData, type PortfolioData } from "@/lib/portfolio";

const STORAGE_KEY = "aegis:phase-1:portfolio";

export function usePortfolio(userId: string, authUser?: User | null) {
  const [data, setData] = useState<PortfolioData>(() => emptyPortfolio());
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [syncStatus, setSyncStatus] = useState("Loading Firestore...");
  const dirtyDuringLoadRef = useRef(false);
  const loadIdRef = useRef(0);
  const lastSavedRef = useRef("");
  const scopedStorageKey = `${STORAGE_KEY}:${userId}`;
  const previousUserIdRef = useRef(userId);

  useEffect(() => {
    // Emergency save when user logs out (userId changes from real ID to "anonymous")
    if (previousUserIdRef.current !== "anonymous" && userId === "anonymous") {
      const lastData = data;
      const serialized = JSON.stringify(lastData);
      if (serialized !== lastSavedRef.current && previousUserIdRef.current !== "anonymous") {
        savePortfolioToFirestore(previousUserIdRef.current, lastData).catch((error) => {
          console.error("Emergency save on logout failed:", error);
        });
      }
    }
    previousUserIdRef.current = userId;
  }, [userId, data]);

  useEffect(() => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    dirtyDuringLoadRef.current = false;

    const timer = window.setTimeout(async () => {
      if (userId === "anonymous") {
        const raw = window.localStorage.getItem(scopedStorageKey);
        const cached = raw ? normalizePortfolioData(JSON.parse(raw) as PortfolioData) : null;
        const fallback = cached ?? emptyPortfolio();
        if (loadIdRef.current !== loadId) return;
        setData(fallback);
        lastSavedRef.current = JSON.stringify(fallback);
        setSyncStatus("Sign in to sync with Firestore");
        setLoadedStorageKey(scopedStorageKey);
        return;
      }

      setSyncStatus("Loading Firestore...");
      const raw = window.localStorage.getItem(scopedStorageKey);
      const cached = raw ? normalizePortfolioData(JSON.parse(raw) as PortfolioData) : null;
      if (cached) setData(cached);

      try {
        const remote = await loadPortfolioFromFirestore(userId, authUser?.uid);
        if (loadIdRef.current !== loadId) return;

        if (authUser) {
          remote.profile.displayName = remote.profile.displayName || authUser.displayName || "";
          remote.profile.email = remote.profile.email || authUser.email || "";
        }

        const serializedRemote = JSON.stringify(remote);
        lastSavedRef.current = serializedRemote;

        if (dirtyDuringLoadRef.current) {
          setLoadedStorageKey(scopedStorageKey);
          setSyncStatus("Saving local changes to Firestore...");
          return;
        }

        const isRemoteEmpty =
          remote.holdings.length === 0 &&
          remote.snapshots.length === 0 &&
          remote.autoPortfolio.connections.length === 0 &&
          remote.cashflow.records.length === 0;

        if (isRemoteEmpty) {
          const isCachedNotEmpty =
            cached &&
            (cached.holdings.length > 0 ||
              cached.snapshots.length > 0 ||
              cached.autoPortfolio.connections.length > 0 ||
              cached.cashflow.records.length > 0);

          if (isCachedNotEmpty) {
            if (authUser) {
              cached.profile.displayName = cached.profile.displayName || authUser.displayName || "";
              cached.profile.email = cached.profile.email || authUser.email || "";
            }
            setData(cached);
            window.localStorage.setItem(scopedStorageKey, JSON.stringify(cached));
            setSyncStatus("Saving local changes to Firestore...");
            lastSavedRef.current = "";
            setLoadedStorageKey(scopedStorageKey);
            return;
          }

          const anonRaw = window.localStorage.getItem(`${STORAGE_KEY}:anonymous`);
          const anonData = anonRaw ? normalizePortfolioData(JSON.parse(anonRaw) as PortfolioData) : null;
          const isAnonNotEmpty =
            anonData &&
            (anonData.holdings.length > 0 ||
              anonData.snapshots.length > 0 ||
              anonData.autoPortfolio.connections.length > 0 ||
              anonData.cashflow.records.length > 0);

          if (isAnonNotEmpty) {
            const migrated = {
              ...anonData,
              profile: {
                ...anonData.profile,
                displayName: remote.profile.displayName || authUser?.displayName || anonData.profile.displayName,
                email: remote.profile.email || authUser?.email || anonData.profile.email,
              },
            };
            setData(migrated);
            window.localStorage.setItem(scopedStorageKey, JSON.stringify(migrated));
            setSyncStatus("Saving local changes to Firestore...");
            lastSavedRef.current = "";
            setLoadedStorageKey(scopedStorageKey);
            return;
          }
        }

        setData(remote);
        window.localStorage.setItem(scopedStorageKey, serializedRemote);
        setSyncStatus("Synced with Firestore");
        setLoadedStorageKey(scopedStorageKey);
      } catch (error) {
        if (loadIdRef.current !== loadId) return;
        const fallback = cached ?? emptyPortfolio();
        const normalizedFallback = normalizePortfolioData(fallback);
        setData(normalizedFallback);
        lastSavedRef.current = JSON.stringify(normalizedFallback);
        setSyncStatus(error instanceof Error ? `Firestore unavailable: ${error.message}` : "Firestore unavailable");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scopedStorageKey, userId, authUser?.displayName, authUser?.email]);

  const updateData = useCallback(
    (next: SetStateAction<PortfolioData>) => {
      if (loadedStorageKey !== scopedStorageKey) {
        dirtyDuringLoadRef.current = true;
      }
      setData((current) => normalizePortfolioData(typeof next === "function" ? next(current) : next));
    },
    [loadedStorageKey, scopedStorageKey],
  );

  // Synchronously save to local storage on data change to ensure no data loss on close/refresh
  useEffect(() => {
    if (loadedStorageKey !== scopedStorageKey) return;
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(scopedStorageKey, serialized);
  }, [data, loadedStorageKey, scopedStorageKey]);

  // Debounced save to Firestore
  useEffect(() => {
    if (loadedStorageKey !== scopedStorageKey) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) return;

    const timer = window.setTimeout(async () => {
      setSyncStatus("Saving to Firestore...");
      try {
        await savePortfolioToFirestore(userId, data);
        lastSavedRef.current = serialized;
        setSyncStatus("Synced with Firestore");
      } catch (error) {
        setSyncStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed");
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [data, loadedStorageKey, scopedStorageKey, userId]);

  return [data, updateData, syncStatus] as const;
}
