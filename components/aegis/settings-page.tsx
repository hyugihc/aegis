"use client";

import { SetStateAction, useState } from "react";
import type React from "react";
import { AlertCircle, Bell, Brain, CheckCircle2, Database, Globe2, KeyRound, Loader2, RefreshCw, Settings, Share2, Lock, Eye, EyeOff, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formInputClass } from "@/components/aegis/constants";
import { ShareManagerPage } from "@/components/aegis/share-page";
import {
  DEFAULT_ALPHA_VANTAGE_API_KEY,
  DEFAULT_FINNHUB_API_KEY,
  DEFAULT_METALS_DEV_API_KEY,
  DEFAULT_COINGECKO_API_KEY,
  DEFAULT_COINMARKETCAP_API_KEY,
  type PortfolioData,
} from "@/lib/portfolio";
import { MasterDataPage } from "./master-data-page";
import { firebaseAuth } from "@/lib/firebase";
import { updatePassword, linkWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { deleteAllUserData, clearLocalStorageForUser } from "@/lib/firestore-portfolio";

type ValidationState = { loading: boolean; success?: boolean; message?: string };
type SettingsTab = "general" | "prices" | "ai" | "share" | "masters";

const tabs: Array<{ id: SettingsTab; label: string; Icon: typeof Settings }> = [
  { id: "general", label: "General", Icon: Settings },
  { id: "prices", label: "Price APIs", Icon: Globe2 },
  { id: "ai", label: "AI Analyst", Icon: Brain },
  { id: "share", label: "Share Links", Icon: Share2 },
  { id: "masters", label: "Master Data", Icon: Database },
];

export function SettingsPage({ data, onChange, userId }: { data: PortfolioData; onChange: (next: SetStateAction<PortfolioData>) => void; userId?: string }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [validation, setValidation] = useState<Record<string, ValidationState>>({
    alphaVantage: { loading: false },
    finnhub: { loading: false },
    metalsDev: { loading: false },
    coinGecko: { loading: false },
    coinMarketCap: { loading: false },
  });

  const maskValue = (value: string) => value === "[SECURE]" ? "••••••••••••••••" : value;

  async function validateApiKey(service: string, key: string) {
    const currentKey = key || (
      service === "alphaVantage" ? DEFAULT_ALPHA_VANTAGE_API_KEY :
      service === "finnhub" ? DEFAULT_FINNHUB_API_KEY :
      service === "metalsDev" ? DEFAULT_METALS_DEV_API_KEY :
      service === "coinGecko" ? DEFAULT_COINGECKO_API_KEY :
      DEFAULT_COINMARKETCAP_API_KEY
    );
    setValidation((prev) => ({ ...prev, [service]: { loading: true } }));

    try {
      const response = await fetch("/api/validate-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, apiKey: currentKey }),
      });
      const result = await response.json();
      setValidation((prev) => ({
        ...prev,
        [service]: {
          loading: false,
          success: result.success,
          message: result.success ? "API key valid" : result.error || "API key invalid",
        },
      }));
    } catch {
      setValidation((prev) => ({ ...prev, [service]: { loading: false, success: false, message: "Validation service unavailable" } }));
    }
  }

  function updatePriceService(field: keyof PortfolioData["settings"]["priceServices"], value: string | string[]) {
    onChange((current) => ({
      ...current,
      settings: {
        ...current.settings,
        priceServices: {
          ...current.settings.priceServices,
          [field]: value,
        },
      },
    }));
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">Aegis control room</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Settings</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Kelola konfigurasi aplikasi, provider harga, AI Analyst, share link read-only, dan master data portofolio.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/20 p-1 sm:flex">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeTab === id ? "bg-amber-400/10 text-amber-100 shadow-[0_0_24px_-16px_rgba(245,158,11,1)]" : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {activeTab === "general" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard icon={<Bell size={18} />} title="Notifications" eyebrow="Reminder">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <span>
                <span className="font-medium text-white">Weekly snapshot reminder</span>
                <span className="mt-1 block text-xs text-zinc-500">Banner backfill aktif saat snapshot terakhir lebih dari 7 hari.</span>
              </span>
              <input
                type="checkbox"
                checked={data.settings.weeklyReminderEnabled}
                onChange={(event) => onChange((current) => ({ ...current, settings: { ...current.settings, weeklyReminderEnabled: event.target.checked } }))}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </SectionCard>
          <SectionCard icon={<Settings size={18} />} title="Profile" eyebrow="Account">
            <div className="grid gap-3">
              <InfoRow label="Name" value={data.profile.displayName} />
              <InfoRow label="Email" value={data.profile.email} />
              <InfoRow label="Currency" value={data.profile.currency} />
            </div>
          </SectionCard>
          <PasswordSettingsCard />
          {userId && userId !== "anonymous" ? <DeleteAccountCard userId={userId} /> : null}
        </div>
      ) : null}

      {activeTab === "prices" ? (
        <div className="space-y-4">
          <ApiKeyCard
            title="CoinGecko"
            value={maskValue(data.settings.priceServices.coinGeckoApiKey)}
            defaultValue={DEFAULT_COINGECKO_API_KEY}
            validation={validation.coinGecko}
            onChange={(value) => updatePriceService("coinGeckoApiKey", value)}
            onValidate={() => validateApiKey("coinGecko", data.settings.priceServices.coinGeckoApiKey)}
            onDefault={() => updatePriceService("coinGeckoApiKey", DEFAULT_COINGECKO_API_KEY)}
          />
          <ApiKeyCard
            title="CoinMarketCap"
            value={maskValue(data.settings.priceServices.coinMarketCapApiKey)}
            defaultValue={DEFAULT_COINMARKETCAP_API_KEY}
            validation={validation.coinMarketCap}
            onChange={(value) => updatePriceService("coinMarketCapApiKey", value)}
            onValidate={() => validateApiKey("coinMarketCap", data.settings.priceServices.coinMarketCapApiKey)}
            onDefault={() => updatePriceService("coinMarketCapApiKey", DEFAULT_COINMARKETCAP_API_KEY)}
          />
          <ApiKeyCard
            title="Alpha Vantage"
            value={maskValue(data.settings.priceServices.alphaVantageApiKey)}
            defaultValue={DEFAULT_ALPHA_VANTAGE_API_KEY}
            validation={validation.alphaVantage}
            onChange={(value) => updatePriceService("alphaVantageApiKey", value)}
            onValidate={() => validateApiKey("alphaVantage", data.settings.priceServices.alphaVantageApiKey)}
            onDefault={() => updatePriceService("alphaVantageApiKey", DEFAULT_ALPHA_VANTAGE_API_KEY)}
          />
          <ApiKeyCard
            title="Finnhub"
            value={maskValue(data.settings.priceServices.finnhubApiKey)}
            defaultValue={DEFAULT_FINNHUB_API_KEY}
            validation={validation.finnhub}
            onChange={(value) => updatePriceService("finnhubApiKey", value)}
            onValidate={() => validateApiKey("finnhub", data.settings.priceServices.finnhubApiKey)}
            onDefault={() => updatePriceService("finnhubApiKey", DEFAULT_FINNHUB_API_KEY)}
          />
          <ApiKeyCard
            title="Metals.dev"
            value={maskValue(data.settings.priceServices.metalsDevApiKey)}
            defaultValue={DEFAULT_METALS_DEV_API_KEY}
            validation={validation.metalsDev}
            onChange={(value) => updatePriceService("metalsDevApiKey", value)}
            onValidate={() => validateApiKey("metalsDev", data.settings.priceServices.metalsDevApiKey)}
            onDefault={() => updatePriceService("metalsDevApiKey", DEFAULT_METALS_DEV_API_KEY)}
          />
          <SectionCard icon={<Globe2 size={18} />} title="Market Tiles" eyebrow="Dashboard">
            <label className="text-sm text-zinc-400">
              Symbols
              <input
                value={data.settings.priceServices.marketTileSymbols.join(", ")}
                onChange={(event) => updatePriceService("marketTileSymbols", event.target.value.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))}
                className={formInputClass}
                placeholder="VWRA, PAXG, BTC"
                spellCheck={false}
              />
            </label>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "ai" ? (
        <SectionCard icon={<Brain size={18} />} title="AI Analyst" eyebrow="DSS">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <span>
                <span className="font-medium text-white">Enable AI Analyst</span>
                <span className="mt-1 block text-xs text-zinc-500">Dipakai oleh tab AI Analyst di DSS.</span>
              </span>
              <input
                type="checkbox"
                checked={data.settings.ai.enabled}
                onChange={(event) => onChange((current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    ai: {
                      ...current.settings.ai,
                      enabled: event.target.checked,
                      provider: event.target.checked && current.settings.ai.provider === "disabled" ? "gemini" : current.settings.ai.provider,
                    },
                  },
                }))}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
            <label className="text-sm text-zinc-400">
              Provider
              <select
                value={data.settings.ai.provider}
                onChange={(event) => onChange((current) => ({ ...current, settings: { ...current.settings, ai: { ...current.settings.ai, provider: event.target.value as typeof current.settings.ai.provider } } }))}
                className={formInputClass}
              >
                <option value="disabled">Disabled</option>
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
                <option value="openai">ChatGPT</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">
              Model
              <input value={data.settings.ai.model} onChange={(event) => onChange((current) => ({ ...current, settings: { ...current.settings, ai: { ...current.settings.ai, model: event.target.value } } }))} className={formInputClass} placeholder="gemini-2.0-flash" />
            </label>
            <label className="text-sm text-zinc-400">
              API key
              <input
                type="password"
                value={maskValue(data.settings.ai.apiKey)}
                onChange={(event) => onChange((current) => ({ ...current, settings: { ...current.settings, ai: { ...current.settings.ai, apiKey: event.target.value } } }))}
                onFocus={(event) => data.settings.ai.apiKey === "[SECURE]" && event.target.select()}
                className={formInputClass}
                placeholder="Masukkan API key provider"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm text-zinc-400">
            Prompt template
            <textarea value={data.settings.ai.promptTemplate} onChange={(event) => onChange((current) => ({ ...current, settings: { ...current.settings, ai: { ...current.settings.ai, promptTemplate: event.target.value } } }))} className={formInputClass} rows={4} />
          </label>
        </SectionCard>
      ) : null}

      {activeTab === "share" ? <ShareManagerPage data={data} onChange={(next) => onChange(next)} /> : null}
      {activeTab === "masters" ? <MasterDataPage data={data} onChange={onChange} /> : null}
    </div>
  );
}

function SectionCard({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-200">{icon}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
      </div>
      {children}
    </Card>
  );
}

function ApiKeyCard({ title, value, defaultValue, validation, onChange, onValidate, onDefault }: { title: string; value: string; defaultValue: string; validation: ValidationState; onChange: (value: string) => void; onValidate: () => void; onDefault: () => void }) {
  return (
    <SectionCard icon={<KeyRound size={18} />} title={title} eyebrow="Price provider">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <label className="text-sm text-zinc-400">
          API key
          <input value={value} onChange={(event) => onChange(event.target.value)} className={formInputClass} placeholder={defaultValue} spellCheck={false} />
        </label>
        <button className="secondary-button" onClick={onValidate} disabled={validation.loading}>Check API</button>
        <button className="secondary-button" onClick={onDefault}><RefreshCw size={16} /> Default</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-500">Default: {defaultValue}</div>
        <ValidationStatus state={validation} />
      </div>
    </SectionCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm"><span className="text-zinc-500">{label}</span><span className="truncate font-medium text-white">{value || "-"}</span></div>;
}

function ValidationStatus({ state }: { state: ValidationState }) {
  if (state.loading) return <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Loader2 size={12} className="animate-spin" /> Validating...</div>;
  if (state.success === true) return <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 size={12} /> {state.message}</div>;
  if (state.success === false) return <div className="flex items-center gap-1.5 text-xs text-rose-400"><AlertCircle size={12} /> {state.message}</div>;
  return null;
}

function PasswordSettingsCard() {
  const currentUser = firebaseAuth.currentUser;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!currentUser) return null;

  const hasPasswordProvider = currentUser.providerData.some(
    (provider) => provider.providerId === "password"
  );

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = firebaseAuth.currentUser;
    if (!user) {
      setStatus({ success: false, message: "Pengguna tidak terautentikasi." });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ success: false, message: "Password harus minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ success: false, message: "Password konfirmasi tidak cocok." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      if (hasPasswordProvider) {
        await updatePassword(user, newPassword);
        setStatus({ success: true, message: "Kata sandi Anda berhasil diperbarui!" });
      } else {
        if (!user.email) {
          throw new Error("Email tidak ditemukan pada akun Anda.");
        }
        const credential = EmailAuthProvider.credential(user.email, newPassword);
        await linkWithCredential(user, credential);
        setStatus({ success: true, message: "Kata sandi berhasil dibuat! Anda sekarang bisa login dengan email dan password ini." });
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      let msg = "Gagal memperbarui kata sandi.";
      if (error instanceof Error) {
        const code = (error as any).code;
        if (code === "auth/requires-recent-login") {
          msg = "Untuk keamanan, silakan logout dan login kembali sebelum mengatur atau mengubah kata sandi.";
        } else if (code === "auth/weak-password") {
          msg = "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
        } else if (code === "auth/provider-already-linked") {
          msg = "Akun email ini sudah terhubung dengan kata sandi.";
        } else {
          msg = error.message;
        }
      }
      setStatus({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard icon={<KeyRound size={18} />} title="Kata Sandi" eyebrow="Keamanan">
      <p className="mb-4 text-xs text-zinc-500 leading-relaxed">
        {hasPasswordProvider
          ? "Ubah kata sandi akun Aegis Anda. Gunakan kata sandi yang aman dan sulit ditebak."
          : "Akun Anda saat ini hanya terhubung dengan Google. Buat kata sandi baru agar Anda dapat masuk menggunakan alamat email dan kata sandi."}
      </p>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Kata Sandi Baru</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
              <Lock size={16} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={formInputClass + " pl-10 pr-10"}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Konfirmasi Kata Sandi Baru</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
              <Lock size={16} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={formInputClass + " pl-10 pr-4"}
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="primary-button w-full cursor-pointer" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1.5 justify-center"><Loader2 size={16} className="animate-spin" /> Memproses...</span>
          ) : hasPasswordProvider ? (
            "Ubah Kata Sandi"
          ) : (
            "Buat Kata Sandi Baru"
          )}
        </button>

        {status && (
          <div className={`mt-3 rounded-md border p-3 text-xs flex items-start gap-2 ${
            status.success
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : "border-rose-400/25 bg-rose-400/10 text-rose-100"
          }`}>
            {status.success ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}
      </form>
    </SectionCard>
  );
}

function DeleteAccountCard({ userId }: { userId: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const CONFIRM_PHRASE = "HAPUS AKUN";

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText !== CONFIRM_PHRASE) {
      setStatus({ success: false, message: `Ketik "${CONFIRM_PHRASE}" untuk mengkonfirmasi penghapusan.` });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await deleteAllUserData(userId);
      clearLocalStorageForUser(userId);
      setStatus({ success: true, message: "Seluruh data berhasil dihapus. Anda akan logout..." });
      setTimeout(() => {
        signOut(firebaseAuth);
      }, 1500);
    } catch (error) {
      console.error("Delete account failed:", error);
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Gagal menghapus data akun.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-rose-500/20 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/10 text-rose-300">
          <Trash2 size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-400">Danger zone</p>
          <h3 className="font-semibold text-white">Hapus Akun</h3>
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500 leading-relaxed">
        Tindakan ini akan menghapus <span className="text-rose-300 font-medium">seluruh data</span> Anda dari Aegis secara permanen, termasuk holdings, snapshots, master data, cashflow, dan semua konfigurasi. Data yang sudah dihapus tidak dapat dikembalikan.
      </p>

      <form onSubmit={handleDelete} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Ketik <span className="text-rose-300 font-bold">{CONFIRM_PHRASE}</span> untuk konfirmasi
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={formInputClass + " border-rose-500/20 focus:border-rose-500/40"}
            placeholder={CONFIRM_PHRASE}
            disabled={loading}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="w-full cursor-pointer rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || confirmText !== CONFIRM_PHRASE}
        >
          {loading ? (
            <span className="flex items-center gap-1.5 justify-center"><Loader2 size={16} className="animate-spin" /> Menghapus data...</span>
          ) : (
            "Hapus Seluruh Data & Logout"
          )}
        </button>

        {status && (
          <div className={`mt-3 rounded-md border p-3 text-xs flex items-start gap-2 ${
            status.success
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : "border-rose-400/25 bg-rose-400/10 text-rose-100"
          }`}>
            {status.success ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}
      </form>
    </Card>
  );
}
