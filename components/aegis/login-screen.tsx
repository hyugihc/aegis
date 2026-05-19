"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
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
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <section className="glass-panel grid w-full overflow-hidden rounded-lg lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[28rem] border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Aegis</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Premium dark portfolio cockpit.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400">
              Masuk dengan akun Google Murub untuk mengakses dashboard, CSV legacy import, holdings table, snapshots,
              dan master data dalam ruang kerja yang terpisah per user.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Glass", "Frosted panels"],
                ["Amber", "Critical actions"],
                ["Secure", "Google Auth"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-5 shadow-[0_0_42px_-26px_rgba(245,158,11,0.95)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Authentication</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Sign in to Aegis</h2>
              <p className="mt-2 text-sm text-zinc-400">Firebase Google OAuth menggunakan konfigurasi `.env.local`.</p>
              <button className="primary-button mt-6 w-full" onClick={loginWithGoogle} disabled={busy}>
                <LogIn size={17} /> {busy ? "Opening Google..." : "Continue with Google"}
              </button>
              {error ? <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
