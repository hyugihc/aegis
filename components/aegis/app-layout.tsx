"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { 
  BarChart3, 
  Bot,
  CalendarDays,
  Calculator,
  Landmark, 
  Link2, 
  LogOut, 
  Menu, 
  Settings, 
  X,
  Eye,
  EyeOff,
  Cloud,
  CloudOff,
  CloudAlert,
  Loader2
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase";
import { usePortfolioContext } from "@/context/portfolio-context";
import { LoginScreen } from "@/components/aegis/login-screen";
import { appRelease } from "@/components/aegis/constants";

function renderSyncBadge(status: string) {
  const normalized = status.toLowerCase();
  
  if (normalized.startsWith("loading") || normalized.includes("saving") || normalized.includes("syncing")) {
    return (
      <div 
        className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.05)] transition-all sm:px-2.5 sm:py-1"
        title={status}
      >
        <Loader2 size={12} className="animate-spin text-amber-400" />
        <span className="hidden xl:inline font-medium">Syncing...</span>
      </div>
    );
  }

  if (normalized.includes("failed") || normalized.includes("unavailable") || normalized.includes("error")) {
    return (
      <div 
        className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all sm:px-2.5 sm:py-1 animate-pulse"
        title={status}
      >
        <CloudAlert size={12} className="text-rose-400" />
        <span className="hidden xl:inline font-medium">Sync Error</span>
      </div>
    );
  }

  if (normalized.includes("sign in") || normalized.includes("local")) {
    return (
      <div 
        className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/40 px-2 py-0.5 text-xs text-zinc-400 transition-all sm:px-2.5 sm:py-1"
        title={status}
      >
        <CloudOff size={12} className="text-zinc-500" />
        <span className="hidden xl:inline font-medium">Local Mode</span>
      </div>
    );
  }

  // Synced state
  return (
    <div 
      className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.1)] transition-all sm:px-2.5 sm:py-1"
      title={status}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <Cloud size={12} className="text-emerald-400" />
      <span className="hidden xl:inline font-medium">Saved to Cloud</span>
    </div>
  );
}

function renderSyncBadgeMobile(status: string) {
  const normalized = status.toLowerCase();
  
  if (normalized.startsWith("loading") || normalized.includes("saving") || normalized.includes("syncing")) {
    return (
      <div 
        className="flex items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 p-1.5 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.05)] transition-all"
        title={status}
      >
        <Loader2 size={12} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (normalized.includes("failed") || normalized.includes("unavailable") || normalized.includes("error")) {
    return (
      <div 
        className="flex items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all animate-pulse"
        title={status}
      >
        <CloudAlert size={12} className="text-rose-400" />
      </div>
    );
  }

  if (normalized.includes("sign in") || normalized.includes("local")) {
    return (
      <div 
        className="flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/40 p-1.5 text-zinc-400 transition-all"
        title={status}
      >
        <CloudOff size={12} className="text-zinc-500" />
      </div>
    );
  }

  // Synced state
  return (
    <div 
      className="flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.1)] transition-all"
      title={status}
    >
      <Cloud size={12} className="text-emerald-400" />
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, syncStatus, privacyMode, togglePrivacyMode } = usePortfolioContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-sm text-amber-100">
        <div className="glass-panel rounded-lg px-5 py-4">Checking session...</div>
      </main>
    );
  }

  if (!user) return <LoginScreen />;

  const navItems = [
    { id: "holdings", href: "/holdings", Icon: BarChart3, label: "Holdings" },
    { id: "snapshots", href: "/snapshots", Icon: CalendarDays, label: "Snapshots" },
    { id: "auto-portfolio", href: "/auto-portfolio", Icon: Link2, label: "Auto Sync" },
    { id: "cashflow", href: "/cashflow", Icon: Landmark, label: "Cashflow" },
    { id: "dss", href: "/dss", Icon: Bot, label: "DSS" },
    { id: "simulator", href: "/simulator", Icon: Calculator, label: "Simulator" },
    { id: "settings", href: "/settings", Icon: Settings, label: "Settings" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex min-w-0 items-center gap-3 lg:gap-5 xl:gap-8">
              <Link href="/dashboard" className="group flex shrink-0 items-center gap-2">
                <span className="bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-lg font-semibold tracking-tight text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                  Aegis
                </span>
              </Link>

              <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
                {navItems.map(({ id, href, Icon, label }) => (
                  <Link
                    key={id}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`portfolio-nav-link ${isActive(href) ? "portfolio-nav-active" : ""}`}
                  >
                    <Icon size={15} className="hidden xl:block" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <button
                type="button"
                onClick={togglePrivacyMode}
                aria-pressed={privacyMode}
                aria-label={privacyMode ? "Tampilkan nilai portfolio" : "Sembunyikan nilai portfolio"}
                title={privacyMode ? "Tampilkan nilai portfolio" : "Sembunyikan nilai portfolio"}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  privacyMode
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-amber-500/30 hover:text-white"
                }`}
              >
                {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {renderSyncBadge(syncStatus)}
              <button
                className="inline-flex max-w-[12rem] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
                onClick={() => signOut(firebaseAuth)}
                title={user.email ?? "Sign out"}
              >
                <span className="truncate">{user.displayName ?? user.email ?? "User"}</span>
                <LogOut size={14} className="shrink-0 text-zinc-500" />
              </button>
            </div>

            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={togglePrivacyMode}
                aria-pressed={privacyMode}
                aria-label={privacyMode ? "Tampilkan nilai portfolio" : "Sembunyikan nilai portfolio"}
                title={privacyMode ? "Tampilkan nilai portfolio" : "Sembunyikan nilai portfolio"}
                className={`rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                  privacyMode ? "bg-amber-400/10 text-amber-100" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {renderSyncBadgeMobile(syncStatus)}
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-white/10 bg-black/50 backdrop-blur-xl lg:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navItems.map(({ id, href, Icon, label }) => (
                <Link
                  key={id}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`portfolio-mobile-link ${isActive(href) ? "portfolio-mobile-active" : ""}`}
                >
                  <Icon size={17} /> {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/10 px-4 pb-3 pt-3">
              <div className="font-medium text-zinc-200">{user.displayName ?? "Aegis user"}</div>
              <div className="text-sm text-zinc-500">{user.email}</div>
              <button className="mt-3 w-full rounded-lg px-3 py-2 text-start text-zinc-400 transition hover:bg-white/5 hover:text-white" onClick={() => signOut(firebaseAuth)}>
                Log Out
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 py-5 sm:py-6">
          {children}
        </div>
      </div>
      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8">
          Aegis v{appRelease.version} @{appRelease.month} {appRelease.year} - Code name {appRelease.codeName}
        </div>
      </footer>
    </main>
  );
}
