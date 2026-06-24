"use client";

import { useState } from "react";
import { Flame, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase";

export function LoginScreen() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginWithGoogle() {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_18%,rgba(245,158,11,0.16),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_26rem)]" />
      <div className="login-fire" aria-hidden="true">
        <span className="login-fire-core" />
        <span className="login-fire-tongue login-fire-tongue-1" />
        <span className="login-fire-tongue login-fire-tongue-2" />
        <span className="login-fire-tongue login-fire-tongue-3" />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.62fr)]">
        <section className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-amber-300/20 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
            <ShieldCheck size={14} /> Aegis
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Portfolio clarity, guarded.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
            Satu workspace privat untuk holdings, snapshot, live price, cashflow, dan keputusan alokasi tanpa layar yang berisik.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">Manual</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">Auto-sync</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">Live price</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">Snapshots</span>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/72 shadow-[0_28px_90px_-54px_rgba(245,158,11,0.72)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="p-6 sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-amber-300/25 bg-amber-300/[0.08] text-amber-200">
              <Flame size={22} />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-amber-200">Secure workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Masuk ke Aegis</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Data dipisahkan per akun dan akses dilindungi Google Auth.
            </p>

            <div className="mt-6 rounded-md border border-white/10 bg-black/22 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200">
                  <KeyRound size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Google sign-in</p>
                  <p className="mt-1 text-xs text-zinc-500">Gunakan akun yang sama untuk workspace portfolio kamu.</p>
                </div>
              </div>
            </div>

            <button className="primary-button mt-4 w-full" onClick={loginWithGoogle} disabled={busy}>
              <LogIn size={17} /> {busy ? "Opening Google..." : "Continue with Google"}
            </button>
            {error ? <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
            <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
              <Sparkles size={14} className="text-amber-200" />
              Private command center for your portfolio.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
