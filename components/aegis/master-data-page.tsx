"use client";

import { SetStateAction, useState } from "react";
import { Check, Database, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { masterLabels } from "@/components/aegis/constants";
import { shouldShowSymbol } from "@/components/aegis/client-utils";
import { type MasterKey, type PortfolioData } from "@/lib/portfolio";

export function MasterDataPage({ data, onChange }: { data: PortfolioData; onChange: (next: SetStateAction<PortfolioData>) => void }) {
  const [active, setActive] = useState<MasterKey>("assets");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const items = data.masters[active];
  const cleanName = name.trim();
  const nameExists = items.some((item) => item.name.toLowerCase() === cleanName.toLowerCase());

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  async function testAssetPrice(item: (typeof items)[number]) {
    if (active !== "assets") return;
    setTestingId(item.id);
    setTestResult((prev) => ({
      ...prev,
      [item.id]: { success: true, message: "Fetching price..." },
    }));
    try {
      const response = await fetch("/api/prices/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [
            {
              assetSymbol: item.symbol || item.name,
              asset: item.name,
              priceSource: item.priceSource,
              priceTicker: item.priceTicker,
              priceUnit: item.priceUnit,
            },
          ],
          alphaVantageApiKey: data.settings.priceServices.alphaVantageApiKey,
          finnhubApiKey: data.settings.priceServices.finnhubApiKey,
          metalsDevApiKey: data.settings.priceServices.metalsDevApiKey,
          coinGeckoApiKey: data.settings.priceServices.coinGeckoApiKey,
          coinMarketCapApiKey: data.settings.priceServices.coinMarketCapApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const symbol = (item.symbol || item.name).trim().toUpperCase();
      const price = payload.prices?.[symbol];
      const source = payload.sources?.[symbol];

      if (Number.isFinite(price)) {
        setTestResult((prev) => ({
          ...prev,
          [item.id]: {
            success: true,
            message: `Success: Rp ${new Intl.NumberFormat("id-ID").format(Number(price))} (${source})`,
          },
        }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [item.id]: {
            success: false,
            message: "Failed: Price not returned",
          },
        }));
      }
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [item.id]: {
          success: false,
          message: `Error: ${err instanceof Error ? err.message : "Request failed"}`,
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  function updateMasterItem(id: string, patch: Partial<(typeof items)[number]>) {
    onChange((current) => ({
      ...current,
      masters: {
        ...current.masters,
        [active]: current.masters[active].map((item) => (item.id === id ? { ...item, ...patch } : item)),
      },
    }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Card className="p-3">
        {Object.entries(masterLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActive(key as MasterKey);
              setName("");
              setEditingId(null);
            }}
            className={`nav-item w-full ${active === key ? "nav-active" : ""}`}
          >
            <Database size={16} /> {label}
          </button>
        ))}
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold text-white">{masterLabels[active]}</h2>
        <div className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`New ${masterLabels[active].toLowerCase()}`}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            className="primary-button whitespace-nowrap"
            onClick={() => {
              if (!cleanName) return;
              onChange((current) => {
                const currentItems = current.masters[active];
                const exists = currentItems.some((item) => item.name.toLowerCase() === cleanName.toLowerCase());
                if (exists) return current;
                const newItem = {
                  id: crypto.randomUUID(),
                  name: cleanName,
                  symbol: "",
                  type: "",
                  priceSource: "auto" as const,
                  priceTicker: "",
                  priceUnit: "toz" as const,
                };
                return {
                  ...current,
                  masters: {
                    ...current.masters,
                    [active]: [newItem, ...currentItems],
                  },
                };
              });
              setName("");
            }}
            disabled={!cleanName || nameExists}
          >
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {items.map((item, index) => (
            <div key={`${active}:${item.id}:${index}`} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={item.name}
                    onChange={(event) => updateMasterItem(item.id, { name: event.target.value })}
                    className="flex-1 rounded border border-white/20 bg-zinc-900 px-2 py-1 text-sm text-white outline-none focus:border-amber-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-200">
                    {item.name}
                    {shouldShowSymbol(item.name, item.symbol) ? <span className="ml-2 text-zinc-500">{item.symbol}</span> : null}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    className={`icon-button ${editingId === item.id ? "text-green-400" : "text-zinc-400"}`}
                    title={editingId === item.id ? "Save" : "Edit name"}
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                  >
                    {editingId === item.id ? <Check size={15} /> : <Pencil size={15} />}
                  </button>
                  <button
                    className="icon-button text-rose-300"
                    title="Delete"
                    onClick={() => {
                      if (confirm(`Hapus ${item.name}?`)) {
                        onChange({
                          ...data,
                          masters: { ...data.masters, [active]: items.filter((candidate) => candidate.id !== item.id) },
                        });
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {active === "assets" ? (
                <div className="mt-3 rounded-lg border border-white/5 bg-zinc-950/40 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Basic Info Column */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>Basic Info</span>
                        <span className="text-[10px] text-zinc-500 font-normal normal-case">(Informasi Aset)</span>
                      </h4>
                      <div className="grid gap-3 grid-cols-2">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Symbol
                          <span className="ml-1 text-zinc-500 cursor-help" title="Simbol ticker standar aset (misal: BTC, AAPL, PAXG, atau VWRA). Digunakan sebagai acuan sinkronisasi dan pencocokan.">ⓘ</span>
                          <input
                            value={item.symbol}
                            onChange={(event) => updateMasterItem(item.id, { symbol: event.target.value.toUpperCase() })}
                            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                            placeholder="PAXG"
                          />
                        </label>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Type
                          <span className="ml-1 text-zinc-500 cursor-help" title="Kategori jenis instrumen aset Anda (contoh: Crypto, Stock, Metal, Mutual Fund, Cash).">ⓘ</span>
                          <input
                            value={item.type}
                            onChange={(event) => updateMasterItem(item.id, { type: event.target.value })}
                            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                            placeholder="Crypto"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Price Configuration Column */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>Auto-Price Source</span>
                        <span className="text-[10px] text-zinc-500 font-normal normal-case">(Sumber Harga Otomatis)</span>
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Price Source
                          <span className="ml-1 text-zinc-500 cursor-help" title="Layanan API eksternal yang akan digunakan untuk mengambil data harga aset ini secara real-time.">ⓘ</span>
                          <select
                            value={item.priceSource}
                            onChange={(event) =>
                              updateMasterItem(item.id, {
                                priceSource: event.target.value as "auto" | "coingecko" | "coinmarketcap" | "alpha_vantage" | "finnhub" | "metals_dev" | "yahoo_finance",
                              })
                            }
                            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                          >
                            <option value="auto">Auto (Otomatis)</option>
                            <option value="coingecko">CoinGecko (Kripto)</option>
                            <option value="coinmarketcap">CoinMarketCap (Kripto)</option>
                            <option value="alpha_vantage">Alpha Vantage (Saham/ETF)</option>
                            <option value="finnhub">Finnhub (Saham US)</option>
                            <option value="metals_dev">Metals.dev (Logam Mulia)</option>
                            <option value="yahoo_finance">Yahoo Finance (ETF/Reksadana)</option>
                          </select>
                        </label>

                        {item.priceSource === "metals_dev" ? (
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Metal Unit
                            <span className="ml-1 text-zinc-500 cursor-help" title="Satuan berat fisik untuk logam mulia yang Anda miliki (Gram, Kilogram, atau Troy Ounce).">ⓘ</span>
                            <select
                              value={item.priceUnit}
                              onChange={(event) => updateMasterItem(item.id, { priceUnit: event.target.value as "toz" | "g" | "kg" })}
                              className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                            >
                              <option value="toz">Troy ounce (toz)</option>
                              <option value="g">Gram (g)</option>
                              <option value="kg">Kilogram (kg)</option>
                            </select>
                          </label>
                        ) : item.priceSource === "coingecko" ? (
                          <>
                            <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                              Price Ticker
                              <span className="ml-1 text-zinc-500 cursor-help" title="API ID CoinGecko. Untuk PAXG bisa isi pax-gold, PAXG, atau PAXGOLD.">â“˜</span>
                              <input
                                value={item.priceTicker}
                                onChange={(event) => updateMasterItem(item.id, { priceTicker: event.target.value })}
                                className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                                placeholder="contoh: pax-gold, bitcoin"
                              />
                            </label>
                            <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                              Gold Unit
                              <span className="ml-1 text-zinc-500 cursor-help" title="Untuk token emas seperti PAXG/XAUT, CoinGecko memberi harga per troy ounce. Pilih Gram jika jumlah aset Anda dicatat dalam gram.">â“˜</span>
                              <select
                                value={item.priceUnit}
                                onChange={(event) => updateMasterItem(item.id, { priceUnit: event.target.value as "toz" | "g" | "kg" })}
                                className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                              >
                                <option value="toz">Troy ounce (toz)</option>
                                <option value="g">Gram (g)</option>
                                <option value="kg">Kilogram (kg)</option>
                              </select>
                            </label>
                          </>
                        ) : (
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Price Ticker
                            <span className="ml-1 text-zinc-500 cursor-help" title="Simbol kode/ID spesifik yang dikenali oleh layanan price source yang dipilih.">ⓘ</span>
                            <input
                              value={item.priceTicker}
                              onChange={(event) => updateMasterItem(item.id, { priceTicker: event.target.value })}
                              className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                              placeholder={
                                item.priceSource === "coinmarketcap" ? "contoh: BTC, ETH, 1027" :
                                item.priceSource === "yahoo_finance" ? "contoh: VWRA.L" :
                                "contoh: AAPL, BTC"
                              }
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metal Ticker specifically for metals_dev */}
                  {item.priceSource === "metals_dev" && (
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400">
                        Metal Code
                        <span className="ml-1 text-zinc-500 cursor-help" title="Kode jenis logam mulia pada API Metals.dev (contoh: gold, silver, platinum, atau palladium).">ⓘ</span>
                        <input
                          value={item.priceTicker}
                          onChange={(event) => updateMasterItem(item.id, { priceTicker: event.target.value })}
                          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
                          placeholder="gold / silver / platinum"
                        />
                      </label>
                    </div>
                  )}

                  {/* Interactive Dynamic Help Box */}
                  <div className="rounded-lg border border-white/5 bg-white/[0.015] p-3 text-xs text-zinc-400 space-y-1">
                    {item.priceSource === "auto" && (
                      <>
                        <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          <span>Auto Mode (Deteksi Otomatis)</span>
                        </p>
                        <p>Aegis akan mendeteksi sumber harga secara otomatis menggunakan <strong>Symbol</strong> aset yang Anda masukkan. Pastikan kolom Symbol diisi dengan benar.</p>
                      </>
                    )}
                    {item.priceSource === "coingecko" && (
                      <>
                        <p className="font-semibold text-amber-300">CoinGecko (Kripto & Token)</p>
                        <p>Cocok untuk aset kripto dan token emas seperti PAXG. Untuk PAXG/XAUT, pilih <strong>Gold Unit</strong> sesuai satuan jumlah aset Anda; harga CoinGecko akan dikonversi dari troy ounce ke gram atau kilogram bila diperlukan.</p>
                      </>
                    )}
                    {item.priceSource === "coinmarketcap" && (
                      <>
                        <p className="font-semibold text-amber-300">CoinMarketCap (Kripto & Token)</p>
                        <p>Cocok untuk aset kripto. Isi kolom <strong>Price Ticker</strong> dengan <em>Symbol</em> koin (contoh: <code>BTC</code>, <code>ETH</code>, <code>PAXG</code>) atau ID koin (contoh: <code>1</code> untuk BTC, <code>1027</code> untuk ETH) dari CoinMarketCap.</p>
                      </>
                    )}
                    {item.priceSource === "alpha_vantage" && (
                      <>
                        <p className="font-semibold text-amber-300">Alpha Vantage (Saham Global & ETF)</p>
                        <p>Sangat baik untuk saham pasar utama dan ETF global. Isi <strong>Price Ticker</strong> dengan simbol ticker saham reguler (contoh: <code>AAPL</code>, <code>MSFT</code>, <code>VWRA</code>).</p>
                      </>
                    )}
                    {item.priceSource === "finnhub" && (
                      <>
                        <p className="font-semibold text-amber-300">Finnhub (Saham US)</p>
                        <p>Dikhususkan untuk data harga saham pasar Amerika Serikat yang berkecepatan tinggi. Isi kolom <strong>Price Ticker</strong> dengan simbol ticker saham US (contoh: <code>AAPL</code>, <code>TSLA</code>).</p>
                      </>
                    )}
                    {item.priceSource === "metals_dev" && (
                      <>
                        <p className="font-semibold text-amber-300">Metals.dev (Logam Mulia Fisik)</p>
                        <p>Gunakan untuk aset fisik emas, perak, atau platina batangan. Isi <strong>Metal Code</strong> dengan jenis logam (<code>gold</code>, <code>silver</code>, <code>platinum</code>) dan pilih <strong>Metal Unit</strong> sesuai satuan berat fisik logam mulia Anda.</p>
                      </>
                    )}
                    {item.priceSource === "yahoo_finance" && (
                      <>
                        <p className="font-semibold text-amber-300">Yahoo Finance (Reksadana, ETF Global, & Saham Internasional)</p>
                        <p>Sangat fleksibel untuk reksadana lokal/global, saham internasional, atau ETF di luar bursa AS. Isi kolom <strong>Price Ticker</strong> dengan kode ticker lengkap dari Yahoo Finance (contoh: <code>VWRA.L</code>, <code>EIMI.AS</code>, <code>BTC-USD</code>).</p>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
              {active === "assets" && (
                <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-3">
                  <button
                    onClick={() => testAssetPrice(item)}
                    className="rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-3 py-1.5 text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1.5"
                    disabled={testingId === item.id}
                  >
                    {testingId === item.id ? "Testing..." : "Test price fetch"}
                  </button>
                  {testResult[item.id] && (
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${testResult[item.id].success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                      {testResult[item.id].message}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
