"use client";

import { useState, type SetStateAction } from "react";
import { ExternalLink, Eye, KeyRound, Link2, Play, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formInputClass, formSelectClass } from "@/components/aegis/constants";
import { usePortfolioContext } from "@/context/portfolio-context";
import { type AutoPortfolioConnection, type AutoPortfolioPlatform, type PortfolioData } from "@/lib/portfolio";
import { saveSecureCredentials, getSecureCredentials } from "@/lib/firebase-functions";

type CredentialDraft = {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  sessionToken: string;
};

type MetadataField = "publicAddress" | "network" | "baseUrl";

const emptyCredentials: CredentialDraft = { apiKey: "", apiSecret: "", passphrase: "", sessionToken: "" };

const platforms: Array<{
  id: AutoPortfolioPlatform;
  label: string;
  fields: Array<keyof CredentialDraft>;
  metadataFields?: MetadataField[];
}> = [
  { id: "binance", label: "Binance", fields: ["apiKey", "apiSecret"] },
  { id: "okx", label: "OKX", fields: ["apiKey", "apiSecret", "passphrase"] },
  { id: "mexc", label: "MEXC", fields: ["apiKey", "apiSecret"] },
  { id: "ibkr", label: "IBKR", fields: ["sessionToken"], metadataFields: ["publicAddress", "baseUrl"] },
  { id: "wallet", label: "Wallet", fields: ["apiKey"], metadataFields: ["publicAddress", "network"] },
];

const networkOptions = [
  { value: "ethereum", label: "Ethereum" },
  { value: "bsc", label: "BNB Smart Chain" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "avalanche", label: "Avalanche" },
];

function statusClass(status: AutoPortfolioConnection["status"]) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "error") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

export function AutoPortfolioPage({ data, onChange }: { data: PortfolioData; onChange: (next: SetStateAction<PortfolioData>) => void }) {
  const { privacyMode, formatSensitiveCurrency } = usePortfolioContext();
  const [editing, setEditing] = useState<AutoPortfolioConnection | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [credentials, setCredentials] = useState<Record<string, CredentialDraft>>({});
  const [syncingId, setSyncingId] = useState("");
  const [status, setStatus] = useState("");
  const connections = data.autoPortfolio.connections;
  const selectedConnection = connections.find((connection) => connection.id === selectedConnectionId) ?? connections[0];
  const totalValue = data.autoPortfolio.assets.reduce((sum, asset) => sum + asset.value, 0);
  const formatQuantity = (value: number) => privacyMode
    ? "****"
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 12 }).format(Number.isFinite(value) ? value : 0);

  async function saveConnection(connection: AutoPortfolioConnection, credentialDraft: CredentialDraft) {
    const exists = connections.some((item) => item.id === connection.id);
    
    // Save to Firestore (metadata only)
    onChange({
      ...data,
      autoPortfolio: {
        ...data.autoPortfolio,
        connections: exists
          ? connections.map((item) => (item.id === connection.id ? connection : item))
          : [connection, ...connections],
      },
    });

    // Save credentials securely
    if (connection.hasCredentials) {
      try {
        setStatus("Saving credentials securely...");
        await saveSecureCredentials("auto_portfolio", connection.id, credentialDraft as Record<string, string>);
        setCredentials((current) => ({ ...current, [connection.id]: credentialDraft }));
        setStatus("Koneksi dan credentials tersimpan aman.");
      } catch {
        setStatus("Gagal menyimpan credentials secara aman.");
      }
    } else {
      setStatus("Koneksi tersimpan.");
    }
    
    setEditing(null);
  }

  function deleteConnection(connectionId: string) {
    onChange({
      ...data,
      autoPortfolio: {
        connections: connections.filter((connection) => connection.id !== connectionId),
        assets: data.autoPortfolio.assets.filter((asset) => asset.connectionId !== connectionId),
      },
    });
    setCredentials((current) => {
      const next = { ...current };
      delete next[connectionId];
      return next;
    });
  }

  async function syncConnection(connection: AutoPortfolioConnection) {
    let credentialDraft = credentials[connection.id];
    
    // If not in memory, try to load from secure storage
    if (!credentialDraft && connection.hasCredentials) {
      setStatus(`Loading credentials for ${connection.platform.toUpperCase()}...`);
      try {
        const secure = await getSecureCredentials("auto_portfolio", connection.id);
        if (secure) {
          credentialDraft = secure as CredentialDraft;
          setCredentials((current) => ({ ...current, [connection.id]: credentialDraft }));
        }
      } catch {
        setStatus("Gagal mengambil credentials aman.");
        return;
      }
    }

    setSyncingId(connection.id);
    setStatus(`Sync ${connection.platform.toUpperCase()} berjalan...`);
    try {
      const response = await fetch("/api/auto-portfolio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: connection.platform,
          connectionId: connection.id,
          publicAddress: connection.publicAddress,
          network: connection.network,
          baseUrl: connection.baseUrl,
          ...credentialDraft,
        }),
      });
      // ... rest of sync logic ...
      const payload = (await response.json()) as {
        assets?: Array<{ assetType: string; symbol: string; name: string; quantity: number; currentPrice: number; value: number }>;
        syncedAt?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Sync gagal.");
      const syncedAt = payload.syncedAt ?? new Date().toISOString();
      const assets = (payload.assets ?? []).map((asset) => ({
        id: `${connection.id}-${asset.assetType}-${asset.symbol}`,
        connectionId: connection.id,
        platform: connection.platform,
        assetType: asset.assetType,
        symbol: asset.symbol,
        name: asset.name,
        quantity: asset.quantity,
        currentPrice: asset.currentPrice,
        value: asset.value,
        syncedAt,
      }));
      onChange({
        ...data,
        autoPortfolio: {
          connections: connections.map((item) =>
            item.id === connection.id
              ? { ...item, status: "active", isVerified: true, hasCredentials: connection.platform === "ibkr" ? false : true, lastSyncedAt: syncedAt, lastError: undefined }
              : item,
          ),
          assets: [...data.autoPortfolio.assets.filter((asset) => asset.connectionId !== connection.id), ...assets],
        },
      });
      setStatus(`${connection.platform.toUpperCase()} sync selesai: ${assets.length} aset.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync gagal.";
      onChange({
        ...data,
        autoPortfolio: {
          ...data.autoPortfolio,
          connections: connections.map((item) => (item.id === connection.id ? { ...item, status: "error", lastError: message } : item)),
        },
      });
      setStatus(message);
    } finally {
      setSyncingId("");
    }
  }

  async function syncAll() {
    for (const connection of connections) {
      await syncConnection(connection);
    }
  }

  async function startIbkrGateway() {
    setStatus("Menyalakan IBKR Gateway...");
    try {
      const response = await fetch("/api/auto-portfolio/ibkr/start", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Gagal menyalakan IBKR Gateway.");
      setStatus(payload.message ?? "IBKR Gateway sedang dinyalakan.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyalakan IBKR Gateway.");
    }
  }

  function openIbkrPortal(connection: AutoPortfolioConnection) {
    window.open(connection.baseUrl ?? "https://localhost:5000", "_blank", "noopener,noreferrer");
  }

  async function captureIbkrSession(connection: AutoPortfolioConnection) {
    setStatus("Mengambil session IBKR...");
    try {
      const response = await fetch("/api/auto-portfolio/ibkr/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, baseUrl: connection.baseUrl ?? "https://localhost:5000" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Gagal mengambil session IBKR.");
      onChange({
        ...data,
        autoPortfolio: {
          ...data.autoPortfolio,
          connections: connections.map((item) =>
            item.id === connection.id
              ? { ...item, status: "active", isVerified: true, lastError: undefined }
              : item,
          ),
        },
      });
      setStatus(payload.message ?? "Session IBKR tersimpan.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengambil session IBKR.";
      onChange({
        ...data,
        autoPortfolio: {
          ...data.autoPortfolio,
          connections: connections.map((item) => (item.id === connection.id ? { ...item, status: "error", lastError: message } : item)),
        },
      });
      setStatus(message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Auto Portfolio</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manual sync exchange. Total hasil sync: <span className="font-semibold text-amber-200">{formatSensitiveCurrency(totalValue)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" onClick={syncAll} disabled={syncingId !== "" || connections.length === 0}>
            <RefreshCw size={16} /> Sync all
          </button>
          <button
            className="primary-button"
            onClick={() =>
              setEditing({
                id: `connection-${crypto.randomUUID()}`,
                platform: "binance",
                label: "",
                status: "pending",
                isVerified: false,
                hasCredentials: false,
                createdAt: new Date().toISOString(),
                network: "ethereum",
                baseUrl: "https://localhost:5000",
              })
            }
          >
            <Plus size={16} /> Add connection
          </button>
        </div>
      </div>

      {status ? (
        <div className={`rounded-md border px-4 py-3 text-sm whitespace-pre-wrap ${
          status.toLowerCase().includes("gagal") || status.toLowerCase().includes("error")
            ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
            : "border-amber-400/20 bg-amber-400/10 text-amber-100"
        }`}>
          {status}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connections.map((connection) => {
          const connectionAssets = data.autoPortfolio.assets.filter((asset) => asset.connectionId === connection.id);
          const connectionTotal = connectionAssets.reduce((sum, asset) => sum + asset.value, 0);
          return (
            <Card key={connection.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">{connection.platform}</p>
                  <h3 className="mt-1 font-semibold text-white">{connection.label || connection.platform.toUpperCase()}</h3>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(connection.status)}`}>{connection.status}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-amber-100">{formatSensitiveCurrency(connectionTotal)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {connectionAssets.length} aset {connection.lastSyncedAt ? `- sync ${new Date(connection.lastSyncedAt).toLocaleString("id-ID")}` : "- belum sync"}
              </p>
              {connection.lastError ? <p className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-200 whitespace-pre-wrap">{connection.lastError}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {connection.platform === "ibkr" ? (
                  <>
                    <button className="icon-button" title="Start Gateway" onClick={startIbkrGateway}>
                      <Play size={15} />
                    </button>
                    <button className="icon-button" title="Buka Portal" onClick={() => openIbkrPortal(connection)}>
                      <ExternalLink size={15} />
                    </button>
                    <button className="icon-button" title="Ambil Session" onClick={() => captureIbkrSession(connection)}>
                      <ShieldCheck size={15} />
                    </button>
                  </>
                ) : null}
                <button className="icon-button text-amber-200" title="Sync" onClick={() => syncConnection(connection)} disabled={syncingId === connection.id}>
                  <RefreshCw size={15} />
                </button>
                <button className="icon-button" title="Detail" onClick={() => setSelectedConnectionId(connection.id)}>
                  <Eye size={15} />
                </button>
                <button className="icon-button" title="Edit credentials" onClick={() => setEditing(connection)}>
                  <KeyRound size={15} />
                </button>
                <button className="icon-button text-rose-300" title="Delete" onClick={() => deleteConnection(connection.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {connections.length === 0 ? (
        <Card className="p-8 text-center">
          <Link2 className="mx-auto text-zinc-600" size={42} />
          <p className="mt-3 font-medium text-zinc-300">Belum ada koneksi platform.</p>
          <p className="mt-1 text-sm text-zinc-500">Tambahkan exchange, wallet, atau IBKR untuk mulai sync manual.</p>
        </Card>
      ) : null}

      {selectedConnection ? (
        <Card className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="font-semibold text-white">{selectedConnection.platform.toUpperCase()} assets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3 text-right">Quantity</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.autoPortfolio.assets.filter((asset) => asset.connectionId === selectedConnection.id).map((asset) => (
                  <tr key={asset.id} className="text-zinc-300">
                    <td className="px-5 py-3"><span className="badge badge-muted">{asset.assetType}</span></td>
                    <td className="px-3 py-3 font-semibold text-white">{asset.symbol}</td>
                    <td className="px-3 py-3 text-zinc-500">{asset.name || "-"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatQuantity(asset.quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{formatSensitiveCurrency(asset.currentPrice)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-100">{formatSensitiveCurrency(asset.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {editing ? (
        <ConnectionEditor
          connection={editing}
          credentials={credentials[editing.id] ?? emptyCredentials}
          onCancel={() => setEditing(null)}
          onSave={saveConnection}
        />
      ) : null}
    </div>
  );
}

function ConnectionEditor({
  connection,
  credentials,
  onCancel,
  onSave,
}: {
  connection: AutoPortfolioConnection;
  credentials: CredentialDraft;
  onCancel: () => void;
  onSave: (connection: AutoPortfolioConnection, credentials: CredentialDraft) => void;
}) {
  const [draft, setDraft] = useState(connection);
  const [credentialDraft, setCredentialDraft] = useState(credentials);
  const platform = platforms.find((item) => item.id === draft.platform) ?? platforms[0];
  const requiresCredentials = draft.platform !== "wallet" || credentialDraft.apiKey.trim() !== "";
  const hasCredentials =
    draft.platform === "ibkr"
      ? false
      : draft.platform === "wallet"
      ? credentialDraft.apiKey.trim() !== ""
      : credentialDraft.apiKey.trim() !== "" && credentialDraft.apiSecret.trim() !== "" && (draft.platform !== "okx" || credentialDraft.passphrase.trim() !== "");

  function updatePlatform(nextPlatform: AutoPortfolioPlatform) {
    setDraft((current) => ({
      ...current,
      platform: nextPlatform,
      network: current.network ?? "ethereum",
      baseUrl: current.baseUrl ?? "https://localhost:5000",
    }));
  }

  function credentialLabel(field: keyof CredentialDraft) {
    if (field === "apiKey") return draft.platform === "wallet" ? "Explorer API Key (optional)" : "API Key";
    if (field === "apiSecret") return "Secret Key";
    if (field === "sessionToken") return "IBKR JSESSIONID / session token";
    return "Passphrase";
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 p-3 sm:p-5">
      <div className="glass-panel h-full w-full max-w-2xl overflow-y-auto rounded-lg">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-950/75 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Platform connection</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{draft.label || draft.platform.toUpperCase()}</h2>
          </div>
          <button className="ghost-button" onClick={onCancel}>Close</button>
        </div>
        <div className="grid gap-4 p-5">
          <label className="text-sm text-zinc-400">
            Platform
            <select value={draft.platform} onChange={(event) => updatePlatform(event.target.value as AutoPortfolioPlatform)} className={formSelectClass}>
              {platforms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            Label
            <input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} className={formInputClass} placeholder={`${platform.label} utama`} />
          </label>
          {platform.metadataFields?.includes("publicAddress") ? (
            <label className="text-sm text-zinc-400">
              {draft.platform === "ibkr" ? "IBKR Account ID" : "Wallet Address"}
              <input
                value={draft.publicAddress ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, publicAddress: event.target.value }))}
                className={formInputClass}
                placeholder={draft.platform === "ibkr" ? "U20334846" : "0x..."}
              />
            </label>
          ) : null}
          {platform.metadataFields?.includes("network") ? (
            <label className="text-sm text-zinc-400">
              Network
              <select
                value={draft.network ?? "ethereum"}
                onChange={(event) => setDraft((current) => ({ ...current, network: event.target.value }))}
                className={formSelectClass}
              >
                {networkOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          ) : null}
          {platform.metadataFields?.includes("baseUrl") ? (
            <label className="text-sm text-zinc-400">
              Gateway Base URL
              <input
                value={draft.baseUrl ?? "http://localhost:5000"}
                onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
                className={formInputClass}
                placeholder="http://localhost:5000"
              />
            </label>
          ) : null}
          {platform.fields.map((field) => (
            <label key={field} className="text-sm text-zinc-400">
              {credentialLabel(field)}
              <input
                type={field === "apiKey" ? "text" : "password"}
                value={credentialDraft[field]}
                onChange={(event) => setCredentialDraft((current) => ({ ...current, [field]: event.target.value }))}
                className={formInputClass}
                autoComplete="off"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button className="ghost-button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" onClick={() => onSave({ ...draft, hasCredentials: requiresCredentials ? hasCredentials : false, status: hasCredentials ? draft.status : "pending" }, credentialDraft)}>
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
