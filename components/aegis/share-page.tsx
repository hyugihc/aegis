"use client";

import { Copy, Link2, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buildDssPayload } from "@/lib/dss";
import { formatCurrency, latestSnapshot, lineRows, type PortfolioData } from "@/lib/portfolio";

function tokenValue() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function ShareManagerPage({ data, onChange }: { data: PortfolioData; onChange: (next: PortfolioData) => void }) {
  function createToken() {
    onChange({
      ...data,
      shareTokens: [
        ...data.shareTokens,
        { token: tokenValue(), label: "Read-only portfolio", createdAt: new Date().toISOString(), active: true },
      ],
    });
  }

  function revoke(token: string) {
    onChange({ ...data, shareTokens: data.shareTokens.map((item) => (item.token === token ? { ...item, active: false } : item)) });
  }

  function remove(token: string) {
    onChange({ ...data, shareTokens: data.shareTokens.filter((item) => item.token !== token) });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Share Portfolio</h2>
          <p className="mt-1 text-sm text-zinc-500">Buat link read-only untuk dashboard ringkas portofolio.</p>
        </div>
        <button className="primary-button" onClick={createToken}><Link2 size={16} /> Generate Link</button>
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y divide-white/10">
          {data.shareTokens.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">Belum ada share link.</div> : null}
          {data.shareTokens.map((item) => {
            const href = typeof window === "undefined" ? `/share/${item.token}` : `${window.location.origin}/share/${item.token}`;
            return (
              <div key={item.token} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{item.label}</p>
                    <span className={item.active ? "badge badge-green" : "badge badge-muted"}>{item.active ? "Active" : "Revoked"}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500">{href}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button" onClick={() => navigator.clipboard.writeText(href)}><Copy size={16} /> Copy</button>
                  {item.active ? <button className="secondary-button" onClick={() => revoke(item.token)}><RefreshCw size={16} /> Revoke</button> : null}
                  <button className="secondary-button text-rose-300" onClick={() => remove(item.token)}><Trash2 size={16} /> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function SharedPortfolioView({ data, token, loading }: { data: PortfolioData; token: string; loading?: boolean }) {
  const shareToken = data.shareTokens.find((item) => item.token === token && item.active);
  const snapshot = latestSnapshot(data);
  const rows = lineRows(data, snapshot).slice(0, 12);
  const dss = buildDssPayload(data, snapshot?.id);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] p-6 text-zinc-100">
        <Card className="mx-auto mt-20 max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Memuat share link</h1>
          <p className="mt-2 text-sm text-zinc-500">Aegis sedang membaca token read-only.</p>
        </Card>
      </main>
    );
  }

  if (!shareToken) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] p-6 text-zinc-100">
        <Card className="mx-auto mt-20 max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Share link tidak aktif</h1>
          <p className="mt-2 text-sm text-zinc-500">Token read-only ini tidak ditemukan atau sudah dicabut.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4 text-zinc-100 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-2xl font-semibold text-transparent">Aegis Shared Portfolio</h1>
          <p className="mt-1 text-sm text-zinc-500">Read-only snapshot view.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Total</p><p className="mt-3 text-2xl font-semibold text-amber-100">{formatCurrency(snapshot?.totalValue ?? 0)}</p></Card>
          <Card className="p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Snapshot</p><p className="mt-3 text-2xl font-semibold text-white">{snapshot?.date ?? "-"}</p></Card>
          <Card className="p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Risk</p><p className="mt-3 text-2xl font-semibold text-white">{dss ? `${dss.weightedRiskScore}/5` : "-"}</p></Card>
        </div>
        <Card className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4 font-semibold text-white">Top Holdings</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.holdingId}>
                    <td className="px-5 py-3 font-medium text-white">{row.holding.asset}</td>
                    <td className="px-3 py-3 text-zinc-400">{row.holding.platform || "-"}</td>
                    <td className="px-5 py-3 text-right text-amber-100">{formatCurrency(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
