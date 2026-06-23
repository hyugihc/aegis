"use client";

import { useState } from "react";
import { BarChart3, Database, KeyRound, LineChart, Link2, LogIn, ShieldCheck } from "lucide-react";
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
    <main className="min-h-screen overflow-hidden bg-[#070707] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),transparent_18rem),radial-gradient(90%_80%_at_72%_14%,rgba(20,184,166,0.16),transparent_46%),radial-gradient(80%_70%_at_18%_78%,rgba(245,158,11,0.12),transparent_50%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.72fr)]">
        <section className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
              <ShieldCheck size={14} /> Aegis
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Portfolio command center untuk aset manual dan auto-sync.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Pantau holdings, nilai terkini, snapshot historis, live price, cashflow, dan keputusan alokasi dalam satu ruang kerja pribadi. Aegis membantu melihat posisi portofolio dari exchange, wallet, IBKR, dan data manual tanpa kehilangan konteks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { Icon: Link2, title: "Auto-sync assets", text: "Hubungkan exchange, wallet, dan IBKR lalu jadikan asset synced sebagai holding." },
              { Icon: BarChart3, title: "Live valuation", text: "Gabungkan quantity snapshot terbaru dengan harga live atau fallback snapshot." },
              { Icon: Database, title: "Snapshot history", text: "Simpan jejak portfolio dari CSV, input manual, dan snapshot mingguan." },
              { Icon: LineChart, title: "Allocation insight", text: "Baca breakdown kategori, risk, liquidity, dan movement portofolio." },
            ].map(({ Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_52px_-42px_rgba(245,158,11,0.85)] backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-300/25 bg-amber-300/[0.08] text-amber-200">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-1 block text-sm leading-5 text-zinc-500">{text}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-lg">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Secure workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Masuk ke Aegis</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Data portofolio dipisahkan per akun dan akses dilindungi Google Auth.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200">
                  <KeyRound size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Google sign-in</p>
                  <p className="mt-1 text-xs text-zinc-500">Gunakan akun yang sama untuk membuka workspace portfolio kamu.</p>
                </div>
              </div>
            </div>
            <button className="primary-button w-full" onClick={loginWithGoogle} disabled={busy}>
              <LogIn size={17} /> {busy ? "Opening Google..." : "Continue with Google"}
            </button>
            {error ? <p className="rounded-md border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
