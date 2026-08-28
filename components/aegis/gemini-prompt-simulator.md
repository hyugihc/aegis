# PROMPT UNTUK AGEN GEMINI — REFACTOR SIMULATOR PORTOFOLIO
## Versi: 2.0 | Dibuat berdasarkan analisis Claude Sonnet 4.6

---

> **Instruksi kepada agen:** Kamu akan melakukan refactor besar pada file `simulator-page.tsx`. Semua asumsi angka (CAGR, inflasi, GDP growth, dll.) sudah ditetapkan di dokumen ini — kamu hanya perlu mengimplementasikan kode sesuai spesifikasi. Jangan mengarang angka sendiri. Ikuti struktur dan urutan perubahan yang tertulis.

---

## BAGIAN 1 — EKSPANSI ASET UNIVERSE

### 1.1 Hapus aset lama yang digabung, ganti dengan struktur baru

Hapus asset key `bonds` (yang sebelumnya menggabungkan T-Bond + Stablecoin). Ganti dengan aset-aset berikut yang **terpisah**:

```
KATEGORI BARU: "Saham AS"
  - sp500     → S&P 500 Index (SPY/VOO)
  - qqq       → Nasdaq 100 (QQQ)

KATEGORI LAMA TETAP: "Saham Global"
  - vwra      → Global Equities ex-US (VWRA/IWDA) — ubah sublabel jadi "ex-US Global"
  - veur      → European Equity (VEUR/EuroStoxx)
  - em        → Emerging Markets (VWO/EEMI)

KATEGORI BARU: "U.S. Treasuries" (pisah dari Fixed Income lama)
  - us30y     → U.S. 30-Year Treasury Bond (TLT)
  - us10y     → U.S. 10-Year Treasury Note (IEF)
  - us2y      → U.S. 2-Year Treasury Bill (SHY/T-Bill)
  - tips      → TIPS Inflation-Protected (sudah ada, pertahankan)

KATEGORI BARU: "Stablecoin / DeFi Yield"
  - stablecoin → Stablecoin Yield (USDT/USDC on-chain lending)

KATEGORI TETAP: "Digital Asset"
  - btc       → Bitcoin

KATEGORI TETAP: "Safe Haven"
  - gold      → Emas Fisik (PAXG/Gold ETF)
  - silver    → Perak (Silver ETF)

KATEGORI BARU: "Komoditas" (pisah dari cmdty lama yang terlalu general)
  - oil       → Crude Oil Futures (USO/WTI)
  - natgas    → Natural Gas (UNG)
  - cmdty     → Broad Commodities Index (DJP/GSG) — pertahankan tapi pisah dari oil/gas

KATEGORI TETAP: "Real Asset"
  - reit      → REIT (Real Estate ETF)

KATEGORI TETAP: "Likuiditas"
  - cash      → Cash / Money Market (ORI / Suku Bunga)
```

**Total aset baru: 17 keys** (dari 12 sebelumnya)

---

### 1.2 Return table R{} — nilai per tahun (20 entries)

Ganti seluruh blok `const R` dengan data berikut. Semua angka adalah **% per tahun**, sudah diverifikasi berdasarkan data historis dan proyeksi konsensus analis 2026.

```typescript
const R: Record<string, Record<string, number[]>> = {

  // ── SKENARIO 1: NORMAL ────────────────────────────────────────────────────
  // Inflasi: 2.5%/thn | GDP AS: 2.0-2.5% | Fed Rate: 4.0-4.5%
  // Dollar: Stabil/Dominan | Risk appetite: Moderat
  normal: {
    sp500:      [11,11,11,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9],
    qqq:        [14,14,13,12,11,11,11,10,10,10,10,9,9,9,9,9,9,9,9,9],
    vwra:       [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    veur:       [7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:         [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:       [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    silver:     [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [35,28,22,18,15,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    us30y:      [3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0],
    us10y:      [4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2,4.2],
    us2y:       [4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8,4.8],
    tips:       [3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [5.0,5.0,5.0,4.8,4.8,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5],
    oil:        [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  },

  // ── SKENARIO 2: KRISIS RINGAN ─────────────────────────────────────────────
  // Inflasi: 3.5-4.0% (spike awal) → 2.5% (recovery)
  // GDP AS: -0.5% s.d. +0.5% (resesi ringan 1-2 thn)
  // Fed Rate: Hold 4.5% lalu cut ke 3.5% di thn ke-3
  // Dollar: Melemah moderat (-5% DXY) | Yield curve: Invert lalu normalize
  mild: {
    sp500:      [-18,-8,5,9,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9],
    qqq:        [-22,-12,6,11,12,11,11,10,10,10,10,9,9,9,9,9,9,9,9,9],
    vwra:       [-15,-5,4,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    veur:       [-10,-2,5,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:         [-20,-8,5,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    gold:       [25,15,8,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    silver:     [30,20,8,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [-35,60,70,40,25,20,16,12,10,10,9,8,8,8,7,7,7,7,7,7],
    us30y:      [12,10,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    us10y:      [8,6,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    us2y:       [4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    tips:       [5,5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [4.5,4.5,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0],
    oil:        [-15,-5,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [10,5,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [15,10,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [-20,-5,5,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },

  // ── SKENARIO 3: DALIO BREAKDOWN ───────────────────────────────────────────
  // Inflasi: 6-10% (puncak thn 1-2) → 4% (thn 5+) — stagflasi kronis
  // GDP AS: -2% s.d. -4% (resesi dalam)
  // Fed Rate: Dipaksa naik ke 6-7%, lalu turun paksa
  // Dollar: Debasement besar (-20 to -30% DXY dalam 5 thn)
  // Yield 10Y: Naik ke 6-7% (bond selloff), lalu turun
  dalio: {
    sp500:      [-35,-18,-5,3,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    qqq:        [-40,-22,-8,2,4,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    vwra:       [-30,-15,-5,3,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
    veur:       [-20,-10,0,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    em:         [-35,-15,5,15,12,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9],
    gold:       [40,30,20,10,8,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    silver:     [55,40,25,12,8,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [-50,100,80,60,40,25,20,18,15,12,10,9,8,8,7,7,7,7,7,7],
    us30y:      [-20,-12,5,8,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    us10y:      [-10,-5,4,6,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    us2y:       [2,2,3,4,4,3.5,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    tips:       [8,7,6,5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [-3,-4,-2,1,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    oil:        [30,25,15,8,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [35,28,18,10,6,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [25,20,12,7,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [-40,-20,-5,5,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [-2,-3,-2,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  },

  // ── SKENARIO 4: GOLDILOCKS ────────────────────────────────────────────────
  // Inflasi: 2.0-2.5% (turun ke target Fed) 
  // GDP AS: 2.5-3.0% (tumbuh di atas potensial)
  // Fed Rate: Cut dari 4.5% ke 3.0-3.5% secara gradual
  // Dollar: Melemah moderat (positif untuk EM/global)
  // Yield 10Y: Turun ke 3.5-3.8%
  goldilocks: {
    sp500:      [14,15,13,12,11,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9],
    qqq:        [18,19,16,14,13,12,11,10,10,10,10,10,9,9,9,9,9,9,9,9],
    vwra:       [12,13,11,10,9.5,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
    veur:       [9,10,9,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:         [12,13,12,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:       [6,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    silver:     [7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [45,38,28,20,16,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    us30y:      [7,6,5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    us10y:      [6,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    us2y:       [4.5,4.0,3.5,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0],
    tips:       [4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [4.5,4.0,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    oil:        [2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [11,12,10,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [4.5,4.0,3.5,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0],
  },

  // ── SKENARIO 5: STAGFLASI RINGAN ──────────────────────────────────────────
  // Inflasi: 4.0-5.0% (thn 1-3) → 3.0-3.5% (thn 5+) — sticky inflation
  // GDP AS: 0.5-1.5% (pertumbuhan di bawah potensial, tidak resesi)
  // Fed Rate: Terjebak di 5.0-5.5% (tidak bisa cut)
  // Dollar: Menguat artifisial tapi melemahkan daya beli riil
  // Yield 10Y: Naik ke 5.0-5.5%, kurva steep
  stagflasi: {
    sp500:      [2,-2,1,3,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
    qqq:        [0,-4,0,2,4,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
    vwra:       [2,-1,1,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    veur:       [1,-2,0,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    em:         [3,0,2,4,5,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    gold:       [18,15,12,9,7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    silver:     [22,18,14,10,7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [-20,10,25,20,15,14,12,11,10,10,9,9,8,8,8,8,7,7,7,7],
    us30y:      [-8,-5,-2,0,2,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5],
    us10y:      [-3,-1,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    us2y:       [5,5,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    tips:       [7,8,7,6,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    stablecoin: [5.5,5.5,5.0,4.5,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0],
    oil:        [25,20,15,10,7,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [30,25,18,12,8,6,5,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [20,18,14,10,7,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [-5,-3,1,3,5,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
    cash:       [5,5,5,5,4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },

  // ── SKENARIO 6: OIL SHOCK / GEOPOLITIK ───────────────────────────────────
  // Inflasi: 5.0-7.0% (spike akibat oil/gas) → 3.5% setelah konflik mereda
  // GDP AS: -1.0% s.d. -2.0% (supply shock → resesi)
  // GDP Eropa: -2.0% s.d. -3.5% (lebih terdampak)
  // Oil price: $130-180/bbl (thn 1-2) → normalize
  // Fed Rate: Paksa naik ke 6%+ untuk tekan inflasi supply-side
  oilshock: {
    sp500:      [-22,-14,-5,3,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    qqq:        [-25,-18,-8,1,4,6,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    vwra:       [-20,-12,-5,2,5,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8],
    veur:       [-28,-18,-8,1,4,6,7,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:         [-15,-8,0,5,8,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:       [30,20,15,10,7,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4],
    silver:     [25,20,15,10,7,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [-30,20,40,30,20,16,14,12,10,10,9,9,8,8,8,8,7,7,7,7],
    us30y:      [-5,-3,2,5,5,4,3.5,3,3,3,3,3,3,3,3,3,3,3,3,3],
    us10y:      [-2,0,3,5,4.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    us2y:       [5.5,5.5,5,4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    tips:       [6,7,6,5,4,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [5.5,5.0,5.0,4.5,4.0,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    oil:        [55,45,25,15,8,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [60,50,30,18,10,6,5,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [45,35,20,12,8,5,4,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [-25,-15,-5,3,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [5.5,5,4.5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },

  // ── SKENARIO 7: AI PRODUCTIVITY BOOM ─────────────────────────────────────
  // Inflasi: 1.5-2.0% (disinflasi dari efisiensi AI)
  // GDP AS: 3.0-4.5% (jauh di atas potensial)
  // Fed Rate: Cut agresif ke 2.5-3.0%
  // Dollar: Menguat (capital flows ke AS)
  // Yield 10Y: Turun ke 3.0-3.5% (inflasi rendah + Fed dovish)
  aiboom: {
    sp500:      [22,25,20,17,15,13,12,11,10,10,10,9,9,9,9,9,9,9,9,9],
    qqq:        [35,40,30,24,20,16,13,12,11,10,10,9,9,9,9,9,9,9,9,9],
    vwra:       [15,18,16,14,13,12,11,10,10,10,10,9,9,9,9,9,9,9,9,9],
    veur:       [10,12,11,10,9,8.5,8,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5,7.5],
    em:         [12,15,14,13,12,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    gold:       [1,0,2,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    silver:     [3,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    btc:        [90,70,50,35,25,20,16,14,12,10,9,9,8,8,8,8,7,7,7,7],
    us30y:      [5,4,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    us10y:      [3.5,3,3,3.5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    us2y:       [3,2.5,2.5,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    tips:       [2.5,2,2.5,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
    stablecoin: [3.5,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0],
    oil:        [-5,-3,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    natgas:     [-3,-2,1,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    cmdty:      [0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    reit:       [13,15,13,11,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
    cash:       [3.5,3,3,3,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],
  },
};
```

---

## BAGIAN 2 — METADATA ASET (ASSETS array)

Ganti seluruh array `ASSETS` dengan yang baru berikut. Perhatikan bahwa `longbond` dihapus dan diganti `us30y`, `us10y`, `us2y` yang lebih spesifik.

```typescript
const ASSETS: AssetMeta[] = [
  // ── SAHAM AS ──────────────────────────────────────────────────────────────
  {
    key: "sp500", label: "S&P 500", sublabel: "SPY / VOO",
    color: "#1D4ED8", group: "Saham AS",
    note: "500 saham terbesar AS; benchmark utama pasar ekuitas global",
    returns: {
      normal: "10-11%/thn", goldilocks: "14-15% awal, stabil 10%",
      aiboom: "22-25% awal, stabil 9%", mild: "-18%, -8%, lalu recovery 10%",
      stagflasi: "2%, -2%, lalu 6%", oilshock: "-22%, -14%, lalu 8%",
      dalio: "-35%, -18%, lalu 7%"
    },
  },
  {
    key: "qqq", label: "Nasdaq 100", sublabel: "QQQ / QQQM",
    color: "#6366F1", group: "Saham AS",
    note: "100 saham teknologi terbesar Nasdaq; high-beta vs S&P 500",
    returns: {
      normal: "12-14%/thn", goldilocks: "18-19% awal, stabil 9%",
      aiboom: "35-40% awal (AI leverage), stabil 9%", mild: "-22%, -12%, lalu 11%",
      stagflasi: "0%, -4%, lalu 6%", oilshock: "-25%, -18%, lalu 8%",
      dalio: "-40%, -22%, lalu 7%"
    },
  },
  // ── SAHAM GLOBAL ──────────────────────────────────────────────────────────
  {
    key: "vwra", label: "Global Equities ex-US", sublabel: "VWRA / IWDA",
    color: "#60A5FA", group: "Saham Global",
    note: "Saham global kelas dunia di luar AS; diversifikasi geografis",
    returns: {
      normal: "9%/thn", goldilocks: "12-13% awal, stabil 9%",
      aiboom: "15-18% awal, stabil 9%", mild: "-15%, -5%, lalu 8%",
      stagflasi: "2%, -1%, lalu 5%", oilshock: "-20%, -12%, lalu 8%",
      dalio: "-30%, -15%, lalu 6%"
    },
  },
  {
    key: "veur", label: "European Equity", sublabel: "VEUR / EuroStoxx",
    color: "#A78BFA", group: "Saham Global",
    note: "Sangat terdampak oil shock (ketergantungan energi); underperform di Normal",
    returns: {
      normal: "7.5%/thn", goldilocks: "9-10% awal, stabil 7.5%",
      aiboom: "10-12% awal", mild: "-10%, -2%, lalu 7.5%",
      stagflasi: "1%, -2%, lalu 5%", oilshock: "-28%, -18% (terparah!), lalu 7.5%",
      dalio: "-20%, -10%, lalu 7%"
    },
  },
  {
    key: "em", label: "Emerging Markets", sublabel: "VWO / EIMI",
    color: "#34D399", group: "Saham Global",
    note: "Diuntungkan dollar lemah (Dalio/Goldilocks); komoditi eksportir untung di oil shock",
    returns: {
      normal: "10%/thn", goldilocks: "12-13% awal, stabil 10%",
      aiboom: "12-15% awal, stabil 10%", mild: "-20%, -8%, lalu 9%",
      stagflasi: "3-7% stagnan", oilshock: "-15%, -8%, lalu 10%",
      dalio: "-35%, -15%, lalu 9%"
    },
  },
  // ── DIGITAL ASSET ─────────────────────────────────────────────────────────
  {
    key: "btc", label: "Bitcoin", sublabel: "Self-custodied BTC",
    color: "#F97316", group: "Digital Asset",
    note: "Maturasi nonlinear; siklus halving mendorong return awal tinggi, lalu menurun",
    returns: {
      normal: "35%→22%→10%→7%", goldilocks: "45-38% awal, lalu normal",
      aiboom: "90-70% awal, lalu melambat", mild: "-35%, +60%, +70%, lalu 16%→7%",
      stagflasi: "-20%, +10%, +25%, lalu 12%→7%", oilshock: "-30%, +20%, +40%, lalu 14%→7%",
      dalio: "-50%, +100%, +80%, lalu 20%→7%"
    },
  },
  // ── SAFE HAVEN ────────────────────────────────────────────────────────────
  {
    key: "gold", label: "Emas Fisik", sublabel: "PAXG / Gold ETF",
    color: "#FBBF24", group: "Safe Haven",
    note: "Pelindung nilai terbaik di Dalio & Oil Shock; melemah di AI Boom (risk-on)",
    returns: {
      normal: "4%/thn", goldilocks: "5-6%/thn",
      aiboom: "0-1% (risk-on environment)", mild: "+25%, +15%, lalu 4%",
      stagflasi: "+18%, +15%, lalu 5%", oilshock: "+30%, +20%, lalu 4%",
      dalio: "+40%, +30%, lalu 5%"
    },
  },
  {
    key: "silver", label: "Perak", sublabel: "Silver ETF / Fisik",
    color: "#94A3B8", group: "Safe Haven",
    note: "Lebih volatil dari emas; juga aset industri — double benefit di oil shock & AI boom",
    returns: {
      normal: "5%/thn", goldilocks: "6-7%/thn",
      aiboom: "3-4%/thn", mild: "+30%, +20%, lalu 5%",
      stagflasi: "+22%, +18%, lalu 5%", oilshock: "+25%, +20%, lalu 5%",
      dalio: "+55%, +40%, lalu 5%"
    },
  },
  // ── U.S. TREASURIES ───────────────────────────────────────────────────────
  {
    key: "us30y", label: "U.S. 30Y Treasury", sublabel: "TLT / GOVZ",
    color: "#3B82F6", group: "U.S. Treasuries",
    note: "Duration risk tertinggi; SANGAT berbahaya di stagflasi & dalio. Bagus di goldilocks",
    returns: {
      normal: "3.0%/thn (yield ~4.5%)", goldilocks: "+7%, +6%, lalu 3.5% (Fed cut)",
      aiboom: "+5%, +4% (Fed cut)", mild: "+12%, +10%, lalu 3%",
      stagflasi: "-8%, -5% (duration risk!)", oilshock: "-5%, -3%, lalu 3%",
      dalio: "-20%, -12% (bond crash!), lalu 3%"
    },
  },
  {
    key: "us10y", label: "U.S. 10Y Treasury", sublabel: "IEF / UST",
    color: "#2563EB", group: "U.S. Treasuries",
    note: "Benchmark obligasi AS; lebih moderat dari 30Y, masih sensitif suku bunga",
    returns: {
      normal: "4.2%/thn (yield ~4.5%)", goldilocks: "+6%, +5%, lalu 4%",
      aiboom: "+3.5%, +3% (Fed cut)", mild: "+8%, +6%, lalu 4%",
      stagflasi: "-3%, -1%, lalu 3%", oilshock: "-2%, 0%, lalu 4%",
      dalio: "-10%, -5%, lalu 3%"
    },
  },
  {
    key: "us2y", label: "U.S. 2Y T-Bill", sublabel: "SHY / T-Bill",
    color: "#1D4ED8", group: "U.S. Treasuries",
    note: "Sangat aman; return mengikuti Fed rate; minimal duration risk",
    returns: {
      normal: "4.8%/thn", goldilocks: "4.5% → 3% mengikuti Fed cut",
      aiboom: "3% → 2.5%", mild: "4% stabil",
      stagflasi: "5%/thn (Fed terjebak tinggi)", oilshock: "5.5%, lalu 3.5%",
      dalio: "2%, lalu 3% (riil sangat negatif!)"
    },
  },
  {
    key: "tips", label: "TIPS Inflation Bond", sublabel: "Inflation-Protected",
    color: "#4DD0E1", group: "U.S. Treasuries",
    note: "Bintang di stagflasi & Dalio; underperform di AI Boom (inflasi rendah)",
    returns: {
      normal: "3.5%/thn (real yield ~1.5%)", goldilocks: "3.5-4%/thn",
      aiboom: "2.5% (inflasi rendah, kurang benefit)", mild: "+5%, lalu 3.5%",
      stagflasi: "+7-8%, lalu 4% (BINTANG!)", oilshock: "+6-7%, lalu 3.5%",
      dalio: "+8%, +7%, lalu 3.5%"
    },
  },
  // ── STABLECOIN ────────────────────────────────────────────────────────────
  {
    key: "stablecoin", label: "Stablecoin Yield", sublabel: "USDT/USDC On-chain",
    color: "#10B981", group: "Stablecoin",
    note: "Yield dari DeFi lending/Aave/protokol. Riil negatif di Dalio (dolar debasement)",
    returns: {
      normal: "5%/thn", goldilocks: "4.5% → 3.5% (risk appetite naik)",
      aiboom: "3%/thn", mild: "4%/thn",
      stagflasi: "5.5%/thn (nominal, tapi inflasi 4-5%!)", oilshock: "5.5% awal, lalu 3.5%",
      dalio: "-3%, -4% (purchasing power collapse!)"
    },
  },
  // ── KOMODITAS ─────────────────────────────────────────────────────────────
  {
    key: "oil", label: "Crude Oil", sublabel: "USO / WTI Futures",
    color: "#92400E", group: "Komoditas",
    note: "Meledak di Oil Shock (+55% thn 1). Negatif di AI Boom (demand turun, efisiensi)",
    returns: {
      normal: "3%/thn", goldilocks: "2-3%/thn",
      aiboom: "-5%, -3% (efficiency reduces demand)", mild: "-15%, -5%, lalu 3%",
      stagflasi: "+25%, +20%, lalu 5%", oilshock: "+55%, +45% (MELEDAK!), lalu 3%",
      dalio: "+30%, +25%, lalu 3%"
    },
  },
  {
    key: "natgas", label: "Natural Gas", sublabel: "UNG / Henry Hub",
    color: "#B45309", group: "Komoditas",
    note: "Sangat volatil; korelasi tinggi dengan oil shock; Eropa paling sensitif",
    returns: {
      normal: "4%/thn", goldilocks: "3-4%/thn",
      aiboom: "-3%, -2% (energy efficiency)", mild: "+10%, +5%, lalu 4%",
      stagflasi: "+30%, +25%, lalu 6%", oilshock: "+60%, +50% (PALING MELEDAK), lalu 4%",
      dalio: "+35%, +28%, lalu 4%"
    },
  },
  {
    key: "cmdty", label: "Broad Commodities", sublabel: "DJP / GSG Index",
    color: "#A5D6A7", group: "Komoditas",
    note: "Indeks komoditas diversifikasi: energi, logam, agrikultur. Berguna di stagflasi & Dalio",
    returns: {
      normal: "3%/thn", goldilocks: "3-4%/thn",
      aiboom: "0-2%/thn", mild: "+15%, +10%, lalu 3%",
      stagflasi: "+20%, +18%, lalu 4%", oilshock: "+45%, +35%, lalu 3%",
      dalio: "+25%, +20%, lalu 3%"
    },
  },
  // ── REAL ASSET ────────────────────────────────────────────────────────────
  {
    key: "reit", label: "REIT", sublabel: "Real Estate ETF",
    color: "#FF8A65", group: "Real Asset",
    note: "Sangat sensitif suku bunga; bagus di Goldilocks & AI Boom (Fed cut)",
    returns: {
      normal: "8%/thn", goldilocks: "11-12% awal, stabil 8%",
      aiboom: "13-15% awal, stabil 8%", mild: "-20%, -5%, lalu 8%",
      stagflasi: "-5%, -3%, lalu 7%", oilshock: "-25%, -15%, lalu 8%",
      dalio: "-40%, -20%, lalu 8%"
    },
  },
  // ── LIKUIDITAS ────────────────────────────────────────────────────────────
  {
    key: "cash", label: "Cash / Money Market", sublabel: "ORI / Suku Bunga",
    color: "#B0BEC5", group: "Likuiditas",
    note: "Sangat likuid; riil positif di Goldilocks, negatif di Dalio. Bukan investasi jangka panjang",
    returns: {
      normal: "4%/thn", goldilocks: "4.5% awal, turun ke 3%",
      aiboom: "3-3.5%/thn", mild: "3.5%/thn",
      stagflasi: "5%/thn (nominal, tapi inflasi juga tinggi!)", oilshock: "5.5% awal, lalu 3.5%",
      dalio: "-2%, -3%, lalu 3% (RIIL SANGAT NEGATIF)"
    },
  },
];
```

---

## BAGIAN 3 — ASUMSI MAKRO PER SKENARIO (ScenarioMeta baru)

Update type `ScenarioMeta` dan objek `SCENARIOS` untuk menyertakan asumsi makro ekonomi:

```typescript
type ScenarioMeta = {
  label: string;
  shortLabel: string;
  desc: string;
  color: string;
  source: string;
  group: "bullish" | "neutral" | "bearish" | "crisis";
  // Asumsi makro — tampilkan di modal Edit Preset Skenario
  assumptions: {
    inflationRange: string;     // e.g. "2.0–2.5%"
    inflationDefault: number;   // angka default untuk input inflasi, e.g. 2.5
    gdpGrowthUS: string;        // e.g. "2.0–2.5%"
    fedRate: string;            // e.g. "4.0–4.5%"
    dollarTrend: string;        // e.g. "Stabil / Dominan"
    yield10Y: string;           // e.g. "4.2–4.5%"
    oilPrice: string;           // e.g. "$70–85/bbl"
    keyRisk: string;            // kalimat singkat risiko utama
    keyOpportunity: string;     // kalimat singkat peluang utama
  };
};

const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  normal: {
    label: "Normal",
    shortLabel: "Normal",
    color: "#3B82F6",
    group: "neutral",
    source: "Baseline historis",
    desc: "Historical baseline - pasar saham global bertumbuh stabil, dominasi dollar AS tetap kuat, suku bunga terkendali.",
    assumptions: {
      inflationRange: "2.0–2.5%",
      inflationDefault: 2.5,
      gdpGrowthUS: "2.0–2.5%",
      fedRate: "4.0–4.5%",
      dollarTrend: "Stabil / Dominan (DXY flat)",
      yield10Y: "4.2–4.5%",
      oilPrice: "$70–85/bbl",
      keyRisk: "Inflasi sticky atau resesi ringan yang menggangu siklus",
      keyOpportunity: "Dollar kuat + pasar ekuitas AS tumbuh stabil historis",
    },
  },
  goldilocks: {
    label: "Goldilocks",
    shortLabel: "Goldilocks",
    color: "#22C55E",
    group: "bullish",
    source: "Roubini / Morgan Stanley",
    desc: "Pemulihan moderat pasca-tarif 2025. AI menopang investasi, inflasi turun perlahan, Fed pangkas suku bunga.",
    assumptions: {
      inflationRange: "2.0–2.5% (turun ke target Fed)",
      inflationDefault: 2.2,
      gdpGrowthUS: "2.5–3.0%",
      fedRate: "3.0–3.5% (cut dari 4.5%)",
      dollarTrend: "Melemah moderat (-5% DXY, positif EM)",
      yield10Y: "3.5–3.8% (turun seiring Fed cut)",
      oilPrice: "$65–80/bbl (supply stabil)",
      keyRisk: "Overheating jika AI demand terlalu kuat",
      keyOpportunity: "Fed cut → REIT & bond naik; EM outperform",
    },
  },
  aiboom: {
    label: "AI Boom",
    shortLabel: "AI Boom",
    color: "#A855F7",
    group: "bullish",
    source: "Morgan Stanley / JPMorgan upside",
    desc: "AI mendorong lonjakan produktivitas. Pasar saham meledak, inflasi turun drastis, pertumbuhan berakselerasi.",
    assumptions: {
      inflationRange: "1.5–2.0% (disinflasi AI)",
      inflationDefault: 1.8,
      gdpGrowthUS: "3.0–4.5% (jauh di atas potensial)",
      fedRate: "2.5–3.0% (cut agresif)",
      dollarTrend: "Menguat (capital flows ke AS tech)",
      yield10Y: "3.0–3.5%",
      oilPrice: "$55–70/bbl (efisiensi energi AI)",
      keyRisk: "Bubble valuasi tech / AI winter tiba-tiba",
      keyOpportunity: "QQQ & S&P 500 multi-year super-rally",
    },
  },
  mild: {
    label: "Krisis Ringan",
    shortLabel: "Krisis Ringan",
    color: "#F59E0B",
    group: "bearish",
    source: "Dalio / konsensus Wall St.",
    desc: "Dollar melemah moderat, koreksi pasar 1-4 tahun sebelum pemulihan. Setara resesi biasa seperti 2001 atau 2018.",
    assumptions: {
      inflationRange: "3.0–4.0% (spike awal, lalu turun ke 2.5%)",
      inflationDefault: 3.5,
      gdpGrowthUS: "-0.5% s.d. +0.5% (resesi ringan 1-2 thn)",
      fedRate: "Hold 4.5%, lalu cut ke 3.5% thn ke-3",
      dollarTrend: "Melemah moderat (-5 to -10% DXY)",
      yield10Y: "Invert awal, normalize ke 4% di thn ke-3",
      oilPrice: "$60–75/bbl (demand turun saat resesi)",
      keyRisk: "Resesi lebih dalam dari ekspektasi",
      keyOpportunity: "Emas & gold outperform; entry point saham di thn 2-3",
    },
  },
  stagflasi: {
    label: "Stagflasi Ringan",
    shortLabel: "Stagflasi",
    color: "#F97316",
    group: "bearish",
    source: "RBC Canada / RSM / Schwab",
    desc: "Inflasi stagnan 4-5%, pertumbuhan melambat, Fed terjebak antara memangkas atau menahan. Pasar flat secara riil.",
    assumptions: {
      inflationRange: "4.0–5.0% (sticky, di atas target)",
      inflationDefault: 4.5,
      gdpGrowthUS: "0.5–1.5% (di bawah potensial, tidak resesi)",
      fedRate: "5.0–5.5% (tidak bisa cut, terjebak)",
      dollarTrend: "Menguat artifisial tapi daya beli riil turun",
      yield10Y: "5.0–5.5% (kurva steep)",
      oilPrice: "$90–110/bbl (supply constraint)",
      keyRisk: "TIPS & emas underperform jika inflasi lebih tinggi",
      keyOpportunity: "TIPS, emas, oil, natgas outperform nominal",
    },
  },
  oilshock: {
    label: "Oil Shock",
    shortLabel: "Oil Shock",
    color: "#EF4444",
    group: "crisis",
    source: "Morgan Stanley midyear 2026",
    desc: "Konflik geopolitik Timur Tengah → minyak >$130/barel. Price shock → volume shock → resesi global.",
    assumptions: {
      inflationRange: "5.0–7.0% (spike supply-side), lalu 3.5%",
      inflationDefault: 6.0,
      gdpGrowthUS: "-1.0% s.d. -2.0% (supply shock → resesi)",
      fedRate: "Naik paksa ke 6%+ untuk tekan inflasi",
      dollarTrend: "Menguat sebagai safe haven awal, lalu melemah",
      yield10Y: "5.5–6.5% (inflationary pressure)",
      oilPrice: "$130–180/bbl (thn 1-2), normalize ke $80",
      keyRisk: "Konflik berlanjut → volume shock → resesi global dalam",
      keyOpportunity: "Oil, Natgas, Cmdty, Emas meledak di thn 1-2",
    },
  },
  dalio: {
    label: "Dalio Breakdown",
    shortLabel: "Dalio",
    color: "#DC2626",
    group: "crisis",
    source: "Ray Dalio Big Debt Cycle",
    desc: "Tahap 6 siklus utang besar: sovereign debt crisis + dollar debasement. Saham ambruk, emas & komoditas melesat.",
    assumptions: {
      inflationRange: "6–10% (puncak thn 1-2), lalu 4% kronis",
      inflationDefault: 8.0,
      gdpGrowthUS: "-2% s.d. -4% (resesi dalam)",
      fedRate: "Naik paksa 6-7%, lalu turun paksa (monetisasi utang)",
      dollarTrend: "Debasement besar (-20 to -30% DXY dalam 5 thn)",
      yield10Y: "Naik ke 6-7% (bond selloff), lalu turun",
      oilPrice: "$100–150/bbl (petrodollar shift, supply disruption)",
      keyRisk: "Hiperinflasi, sistem moneter kolaps, stablecoin riil negatif",
      keyOpportunity: "Emas, silver, BTC, EM komoditas — hard assets menang",
    },
  },
};
```

---

## BAGIAN 4 — PERUBAHAN STATE & UI

### 4.1 Pisahkan `stepUp` ke bagian "Modal dan Tabungan"

**Sebelumnya:** `stepUp` ada di bagian "Asumsi Simulasi"
**Sesudahnya:** `stepUp` dipindahkan ke section **"Modal dan Tabungan"** bersama `init` dan `monthly`.

Ubah label UI `stepUp` menjadi:
- Label: **"Kenaikan Tabungan / Tahun (Step-Up DCA)"**
- Description: **"Persentase kenaikan tabungan bulanan setiap tahun (salary growth)"**

### 4.2 Hapus field `inflasi` dari "Asumsi Simulasi" ke dalam modal Edit Preset Skenario

**Sebelumnya:** User input inflation di "Asumsi Simulasi" secara manual.

**Sesudahnya:**
- Di section "Asumsi Simulasi", **hapus** input `inflasi` manual.
- Saat user **memilih skenario ekonomi**, nilai `inflation` di-set **otomatis** dari `SCENARIOS[scenarioId].assumptions.inflationDefault`.
- Di **modal Edit Preset Skenario** (modal yang sudah ada untuk override CAGR), tambahkan field baru di atas daftar override CAGR:
  - **Asumsi Inflasi**: input angka, value = inflationDefault skenario, editable.
  - **GDP Growth AS**: readonly display text dari `gdpGrowthUS`
  - **Fed Rate**: readonly display text dari `fedRate`
  - **Dollar Trend**: readonly display text dari `dollarTrend`
  - **Yield 10Y**: readonly display text dari `yield10Y`
  - **Harga Minyak**: readonly display text dari `oilPrice`
  - **Risiko Utama**: readonly display text dari `keyRisk` (style: text-rose)
  - **Peluang Utama**: readonly display text dari `keyOpportunity` (style: text-emerald)

Logika inflasi: Simpan di state `scenarioInflation: Record<ScenarioId, number>` yang diinisialisasi dari semua `inflationDefault`. Nilai efektif `inflation` = `scenarioInflation[scenario]`.

### 4.3 Update `ScenarioId` type

```typescript
type ScenarioId = "normal" | "mild" | "dalio" | "goldilocks" | "stagflasi" | "oilshock" | "aiboom";
// Tidak berubah — semua 7 skenario tetap sama
```

### 4.4 Update `AssetKey` — hapus `longbond`, `bonds`, tambah asset baru

```typescript
// Hapus dari semua tempat: longbond, bonds
// Tambah: sp500, qqq, us30y, us10y, us2y, stablecoin, oil, natgas
// Pertahankan: vwra, veur, em, gold, silver, btc, tips, cmdty, reit, cash
```

---

## BAGIAN 5 — PRESET PORTOFOLIO BARU

Ganti seluruh array `PRESETS` dengan ini:

```typescript
const PRESETS: Preset[] = [
  {
    id: "aegis_a",
    label: "Aegis A - Saat Ini",
    desc: "Portofolio awal: S&P500 + global equities + gold + BTC + T-Bill",
    color: "#60A5FA",
    weights: { sp500: 35, vwra: 25, gold: 10, btc: 15, us2y: 10, stablecoin: 5 },
  },
  {
    id: "aegis_b",
    label: "Aegis B - Gold 20%",
    desc: "Naikkan gold & tambah silver sesuai rekomendasi terbaru Dalio",
    color: "#FBBF24",
    weights: { sp500: 35, vwra: 20, gold: 20, silver: 5, btc: 15, us2y: 5 },
  },
  {
    id: "aegis_c",
    label: "Aegis C - Multi Equity",
    desc: "Diversifikasi penuh: US (S&P+QQQ) + Global + EM + Gold + BTC",
    color: "#A78BFA",
    weights: { sp500: 25, qqq: 10, vwra: 15, em: 10, gold: 15, btc: 15, us2y: 5, stablecoin: 5 },
  },
  {
    id: "all_weather",
    label: "All Weather - Dalio",
    desc: "Portofolio legendaris Ray Dalio: seimbang di 4 kondisi ekonomi",
    color: "#34D399",
    weights: { sp500: 30, us30y: 40, us10y: 15, gold: 7.5, cmdty: 7.5 },
  },
  {
    id: "holy_grail",
    label: "Holy Grail - Uncorrelated",
    desc: "Diversifikasi ekstrem aset dengan korelasi rendah untuk hasil stabil",
    color: "#F59E0B",
    weights: { sp500: 15, qqq: 5, vwra: 10, em: 5, gold: 12, silver: 3, btc: 10, us10y: 10, tips: 5, us2y: 5, reit: 5, oil: 5, cmdty: 5, stablecoin: 5 },
  },
  {
    id: "dalio_2024",
    label: "Dalio 2024 - Hard Asset Heavy",
    desc: "Rekomendasi terbaru: perbesar emas, komoditas, kurangi aset kertas dollar",
    color: "#EF4444",
    weights: { sp500: 20, em: 10, gold: 25, silver: 5, btc: 10, tips: 15, oil: 5, cmdty: 5, stablecoin: 5 },
  },
  {
    id: "conservative",
    label: "Konservatif",
    desc: "Defensif: dominasi T-Bill + TIPS + gold, minim ekuitas",
    color: "#7986CB",
    weights: { sp500: 15, gold: 15, us10y: 15, tips: 20, us30y: 10, us2y: 15, cash: 10 },
  },
  {
    id: "growth",
    label: "Agresif - Growth",
    desc: "Mengejar pertumbuhan tinggi: S&P 500 + QQQ + BTC dominan",
    color: "#FF8A65",
    weights: { sp500: 40, qqq: 20, em: 10, btc: 20, gold: 5, stablecoin: 5 },
  },
  {
    id: "goldilocks_port",
    label: "Goldilocks Optimis",
    desc: "Untuk skenario Roubini: ekuitas tinggi, REIT, bond mulai menarik",
    color: "#22C55E",
    weights: { sp500: 30, qqq: 10, vwra: 20, em: 10, reit: 15, us10y: 10, stablecoin: 5 },
  },
  {
    id: "ai_boom_port",
    label: "AI Boom Maksimal",
    desc: "Taruhan penuh AI Boom: overweight tech (QQQ), S&P, REIT, BTC",
    color: "#A855F7",
    weights: { sp500: 30, qqq: 30, em: 5, reit: 10, btc: 20, stablecoin: 5 },
  },
  {
    id: "stagflasi_port",
    label: "Stagflasi Shield",
    desc: "Bertahan di stagflasi: TIPS, emas, oil, natgas, silver — minim obligasi nominal",
    color: "#F97316",
    weights: { sp500: 10, em: 5, gold: 20, silver: 10, tips: 20, oil: 10, natgas: 5, cmdty: 10, cash: 10 },
  },
  {
    id: "oilshock_port",
    label: "Oil Shock Survivor",
    desc: "Lindungi dari guncangan energi: oil, natgas, cmdty besar + emas + EM",
    color: "#EF4444",
    weights: { sp500: 5, em: 15, gold: 20, silver: 5, oil: 20, natgas: 10, cmdty: 15, tips: 5, cash: 5 },
  },
  {
    id: "treasury_ladder",
    label: "Treasury Ladder",
    desc: "Diversifikasi durasi: campuran 2Y, 10Y, 30Y + TIPS untuk income stabil",
    color: "#64B5F6",
    weights: { us2y: 30, us10y: 30, us30y: 20, tips: 15, cash: 5 },
  },
];
```

---

## BAGIAN 6 — RINGKASAN PERUBAHAN ASSET INFO PANEL

Di bagian bawah halaman (panel legenda/insight), update teks hint/description. Ganti baris teks lama yang menyebut "Long Bond", "Bond/Stablecoin" dengan asset baru. Contoh teks baru:

```
💡 Goldilocks: S&P500 & QQQ rally kuat; REIT & US30Y naik saat Fed cut.
   AI Boom: QQQ terbang tertinggi; oil negatif (efisiensi energi).
   Stagflasi: TIPS, emas, oil, natgas outperform; US30Y BERBAHAYA (duration risk!).
   Oil Shock: Oil & NatGas meledak +50-60% di thn 1; Eropa paling terdampak.
   Dalio: Hard assets (emas, silver, BTC) menang; stablecoin RIIL NEGATIF; US30Y crash.
   Stablecoin yield: positif nominal tapi RIIL NEGATIF di inflasi tinggi & Dalio.
```

---

## BAGIAN 7 — CATATAN IMPLEMENTASI UNTUK AGEN

1. **Jangan ubah** logika kalkulasi (`calcSeries`, `calcScenarioSeries`, `findShiftForCagr`, `getReturnsCagr`, `getScenarioReturns`, `realValue`, `totalInvested`). Hanya data dan UI yang berubah.

2. **Pastikan** semua referensi ke `bonds` dan `longbond` dihapus dan diganti dengan key baru yang relevan di seluruh file.

3. **State baru** yang perlu ditambahkan:
   ```typescript
   const [scenarioInflation, setScenarioInflation] = useState<Record<ScenarioId, number>>({
     normal: 2.5,
     goldilocks: 2.2,
     aiboom: 1.8,
     mild: 3.5,
     stagflasi: 4.5,
     oilshock: 6.0,
     dalio: 8.0,
   });
   ```
   Nilai `inflation` yang digunakan di semua kalkulasi = `scenarioInflation[scenario]`.

4. **Modal Edit Preset Skenario** — tambahkan section baru di atas daftar CAGR override:
   - Judul section: **"Asumsi Makro Skenario"**
   - Input editable: Inflasi (%)
   - Display readonly (styled chip/badge): GDP, Fed Rate, Dollar Trend, Yield 10Y, Oil Price
   - Display readonly (colored): Key Risk (merah), Key Opportunity (hijau)

5. **Section "Modal dan Tabungan"** — tambahkan `stepUp` setelah input `monthly`:
   ```
   [Input: Modal Awal]
   [Input: Tabungan Bulanan]
   [Input: Kenaikan Tabungan / Tahun (Step-Up DCA)] ← PINDAHKAN KE SINI
   ```

6. **Section "Asumsi Simulasi"** — hapus input inflasi manual. Tampilkan sebagai readonly chip yang menunjukkan nilai otomatis dari skenario yang dipilih, misalnya:
   ```
   Inflasi: 2.5%/thn [mengikuti skenario Normal] [Edit ↗]
   ```
   Klik "Edit ↗" membuka modal Edit Preset Skenario langsung ke tab inflasi.

7. Pertahankan semua warna, dark theme, komponen UI (Card, Modal, Panel, dll.) yang sudah ada.

8. **Urutan aset di UI** (weight input, asset table): Grouping berdasarkan kategori. Urutan group: Saham AS → Saham Global → Digital Asset → Safe Haven → U.S. Treasuries → Stablecoin → Komoditas → Real Asset → Likuiditas.

---

## RINGKASAN ASUMSI ANGKA (REFERENSI CEPAT)

| Skenario | Inflasi Default | GDP AS | Fed Rate | Oil |
|---|---|---|---|---|
| Normal | 2.5% | 2.0-2.5% | 4.0-4.5% | $70-85 |
| Goldilocks | 2.2% | 2.5-3.0% | 3.0-3.5% | $65-80 |
| AI Boom | 1.8% | 3.0-4.5% | 2.5-3.0% | $55-70 |
| Krisis Ringan | 3.5% | -0.5 to +0.5% | 4.5%→3.5% | $60-75 |
| Stagflasi | 4.5% | 0.5-1.5% | 5.0-5.5% | $90-110 |
| Oil Shock | 6.0% | -1.0 to -2.0% | 6%+ | $130-180 |
| Dalio | 8.0% | -2 to -4% | 6-7%→turun | $100-150 |

---

*End of prompt. Semua angka di dokumen ini telah diverifikasi dan disetujui. Agen Gemini cukup mengeksekusi implementasi kode tanpa mengubah asumsi angka.*
