"use client";

import { useState } from "react";
import { Flame, KeyRound, LogIn, ShieldCheck, Sparkles, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase";

export function LoginScreen() {
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    
    if (!email || !email.includes("@")) {
      setError("Masukkan email yang valid.");
      return;
    }
    if (password.length < 6) {
      setError("Password harus minimal 6 karakter.");
      return;
    }
    if (emailMode === "signup" && password !== confirmPassword) {
      setError("Password konfirmasi tidak cocok.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (emailMode === "signin") {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      }
    } catch (authError: any) {
      console.error(authError);
      let IndonesianMessage = "Autentikasi gagal.";
      if (authError instanceof Error) {
        const code = (authError as any).code;
        if (code === "auth/email-already-in-use") {
          IndonesianMessage = "Email ini sudah digunakan oleh akun lain.";
        } else if (code === "auth/invalid-email") {
          IndonesianMessage = "Format email tidak valid.";
        } else if (code === "auth/weak-password") {
          IndonesianMessage = "Password harus minimal 6 karakter.";
        } else if (code === "auth/user-not-found") {
          IndonesianMessage = "Akun dengan email ini tidak ditemukan. Silakan daftar terlebih dahulu.";
        } else if (code === "auth/wrong-password") {
          IndonesianMessage = "Password yang Anda masukkan salah.";
        } else if (code === "auth/invalid-credential") {
          IndonesianMessage = "Email atau password salah. Periksa kembali dan coba lagi.";
        } else if (code === "auth/too-many-requests") {
          IndonesianMessage = "Terlalu banyak percobaan login. Silakan tunggu beberapa saat sebelum mencoba lagi.";
        } else if (code === "auth/network-request-failed") {
          IndonesianMessage = "Koneksi jaringan gagal. Periksa koneksi internet Anda.";
        } else if (code === "auth/user-disabled") {
          IndonesianMessage = "Akun ini telah dinonaktifkan. Hubungi administrator.";
        } else if (code === "auth/operation-not-allowed") {
          IndonesianMessage = "Metode login ini belum diaktifkan. Hubungi administrator.";
        } else {
          IndonesianMessage = authError.message;
        }
      }
      setError(IndonesianMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_18%,rgba(245,158,11,0.16),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_26rem)]" />
      
      {/* Animated Fire Effect */}
      <div className="login-fire" aria-hidden="true">
        <span className="login-fire-core" />
        <span className="login-fire-tongue login-fire-tongue-1" />
        <span className="login-fire-tongue login-fire-tongue-2" />
        <span className="login-fire-tongue login-fire-tongue-3" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.65fr)]">
        {/* Pitch / Hero Section */}
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

        {/* Unified Credentials Box */}
        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/72 shadow-[0_28px_90px_-54px_rgba(245,158,11,0.72)] backdrop-blur-xl">
          {/* Top Amber Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          
          <div className="p-6 sm:p-7">
            {/* Header */}
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-amber-300/25 bg-amber-300/[0.08] text-amber-200">
              <Flame size={22} />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-amber-200">Secure workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Masuk ke Aegis</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Akses akun privat Anda dilindungi oleh Firebase Auth.
            </p>

            {/* Email and Password Form */}
            <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/25 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-10 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/25 transition-all"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (only visible on signup) */}
              {emailMode === "signup" && (
                <div className="transition-all duration-300 ease-in-out">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Konfirmasi Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Ulangi password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/25 transition-all"
                      disabled={busy}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="primary-button w-full cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]" disabled={busy}>
                {emailMode === "signin" ? (
                  <>
                    <LogIn size={17} /> {busy ? "Memproses..." : "Masuk"}
                  </>
                ) : (
                  <>
                    <UserPlus size={17} /> {busy ? "Mendaftar..." : "Daftar Akun Baru"}
                  </>
                )}
              </button>
            </form>

            {/* OAuth Separator (Only on Sign In) */}
            {emailMode === "signin" && (
              <>
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/5 bg-gradient-to-r from-transparent via-zinc-800 to-transparent h-[1px]" />
                  </div>
                  <span className="relative bg-zinc-950/90 px-3 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">atau masuk dengan</span>
                </div>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={busy}
                  className="flex items-center justify-center gap-2.5 w-full border border-white/10 bg-white/[0.025] hover:bg-white/[0.06] text-zinc-200 rounded-md py-2 text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.9 3C17.782 1.145 15.055 0 12 0 7.339 0 3.38 2.659 1.4 6.545l3.866 3.22z"
                    />
                    <path
                      fill="#34A853"
                      d="M16.04 15.343c-1.107.728-2.484 1.157-4.04 1.157a7.096 7.096 0 0 1-6.734-4.855L1.4 14.865C3.38 18.755 7.339 21.4 12 21.4c3.055 0 5.864-1.09 7.9-2.945l-3.86-3.112z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.273c0-.818-.082-1.609-.227-2.364H12v4.51h6.464a5.527 5.527 0 0 1-2.4 3.627l3.86 3.113c2.254-2.082 3.566-5.145 3.566-8.886z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 11.635a7.027 7.027 0 0 1 0-2.364L1.4 6.05a11.936 11.936 0 0 0 0 9.3l3.866-3.715z"
                    />
                  </svg>
                  <span>Google Account</span>
                </button>
              </>
            )}

            {/* Error Message */}
            {error ? (
              <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100 animate-fade-in">
                {error}
              </p>
            ) : null}

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEmailMode(emailMode === "signin" ? "signup" : "signin");
                  setError("");
                }}
                className="text-xs text-amber-200/70 hover:text-amber-200 transition-colors underline decoration-dotted underline-offset-4 cursor-pointer"
                disabled={busy}
              >
                {emailMode === "signin"
                  ? "Belum punya akun? Daftar di sini"
                  : "Sudah punya akun? Masuk di sini"}
              </button>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 flex items-center gap-2 border-t border-white/5 pt-4 text-xs text-zinc-500">
              <Sparkles size={14} className="text-amber-200" />
              Private command center for your portfolio.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
