# PRD — Aegis Module
**Next.js + Firebase | v2.2ng **
Tanggal: Mei 2026 | Status: Revised

---

## 1. Ringkasan Produk

Aegis adalah modul manajemen portofolio investasi pribadi yang dibangun dengan **Next.js (App Router) + Firebase**. Modul ini memungkinkan user mencatat, memantau, dan menganalisis portofolio investasi multi-aset secara terstruktur — dengan dukungan snapshot historis, live price, manual sync dari exchange/wallet, dan decision support berbasis AI.

Aegis adalah bagian dari ekosistem Murub yang lebih besar, berbagi **satu Firebase project** dengan modul Suluk (personal growth/diary). Dibangun sebagai aplikasi multi-user dengan Firebase Auth, di mana setiap user memiliki data portofolionya sendiri secara terisolasi di bawah namespace `users/{userId}`.

---

## 2. Tech Stack

| Layer | Pilihan |
|---|---|
| Frontend | Next.js 14+ (App Router, React Server Components) |
| Styling | Tailwind CSS v4 |
| Database | Firestore (primary) |
| Auth | Firebase Auth (**Google OAuth sebagai primary sign-in**, Email/Password opsional) |
| Backend logic | Firebase Functions (Node.js) |
| Price fetching | Firebase Functions proxy + Firestore cache |
| Hosting | Firebase Hosting (free tier) |
| State management | Zustand + SWR untuk data fetching |
| Tabel holdings | **@tanstack/react-table** (sorting, filtering, column pinning) |
| CSV parsing | Papa Parse |
| Charts — history | **lightweight-charts** (stacked area, line overlay cashflow) |
| Charts — breakdown | Recharts (pie/donut, bar, area — SSR-friendly) |
| AI Analyst | Gemini API (default) / Claude API / ChatGPT — user pilih provider & isi API key sendiri |
| Credential encryption | AES-256 via Firebase Functions + Secret Manager |
| Mobile | Responsive web (mobile-first Tailwind), tidak ada React Native |
| Offline | Tidak ada PWA; Firestore offline persistence opsional ditambah nanti |

### Design System: Premium Dark-Mode Glassmorphism + Amber Glow

Aegis wajib menggunakan tema **Premium Dark-Mode Glassmorphism** dengan aksen **Amber Glow (Cahaya Ambar)** agar selaras dengan identitas Murub: gelap, tenang, modern, dan terasa menyala pada elemen penting.

#### Skema warna
- **Background utama**: Deep Slate / Charcoal / Jet Black dengan rentang `#0A0A0A` sampai `#121212`. Background harus memberi kontras tinggi untuk efek kaca.
- **Surface glass**: `bg-white/5`, `bg-black/20`, `border-white/10`, `backdrop-blur`, dan shadow halus. Surface tidak boleh solid terang.
- **Accent glow**: Amber / orange hangat, terutama `#F59E0B` dan `#D97706`. Dipakai untuk CTA, live valuation, status sync, active nav, dan highlight penting.
- **Semantic positive**: Emerald / teal lembut untuk profit, kenaikan portfolio, dan cashflow positif.
- **Semantic negative**: Crimson / rose untuk minus, drawdown, error, dan cashflow negatif.
- **Cashflow overlay chart**: putih tegas `#FFFFFF` saat digunakan sebagai overlay di atas stacked area.

#### Implementasi UI
- **Hero Card Dashboard**: gunakan frosted-glass panel dengan `backdrop-blur`, `bg-white/5`, `border-white/10`, shadow lembut, dan amber highlight pada total/live valuation.
- **Market Price Tiles**: gunakan glass tiles untuk VWRA, PAXG, BTC, dan simbol lain yang dikonfigurasi user.
- **Slide-over Edit Holdings**: panel edit inline muncul dari kanan, semi-transparan, `backdrop-blur`, dan menyatu dengan background gelap.
- **Sticky Snapshot Reminder**: banner backfill mingguan menggunakan border amber tipis, background amber transparan, dan glow halus agar menarik perhatian tanpa merusak estetika gelap.
- **Primary buttons** (`Sync All`, `Create Snapshot`, `Import CSV`, aksi utama): gunakan amber fill/gradient dan soft amber box-shadow. Hover boleh menaikkan glow, bukan mengubah layout.
- **Secondary buttons**: tetap glass/dark dengan border rendah dan amber hover ring/glow.

#### Chart dan tabel
- **History Chart** (`lightweight-charts`): stacked area memakai fill semi-transparan/gradient; cashflow overlay memakai line putih `#FFFFFF`, tidak di-stack.
- **Breakdown Charts** (`Recharts`): gunakan palette multiwarna yang tetap terbaca di dark mode; jangan hanya variasi amber agar kategori mudah dibedakan.
- **Holdings Table** (`@tanstack/react-table`): kolom Actions paling kiri wajib fixed/sticky. Beri border vertikal `border-white/10` dan shadow/blur rendah agar pemisah jelas saat scroll horizontal tanpa terasa kaku.
- **Status badges**: active/profit hijau emerald, inactive netral zinc, error/minus rose/crimson, linked/sync amber.

### Firebase project sharing dengan Suluk

Aegis dan Suluk menggunakan **Firebase project yang sama** (`projects/427875650989`). Implikasinya:
- Auth user sama — user yang sama bisa akses kedua modul dengan satu akun
- Firestore namespace terpisah: Aegis di `users/{id}/aegis_...`, Suluk di sub-koleksi `users/{id}/suluk_...` (misal: `suluk_diaries`)
- Firebase Functions di-deploy dalam satu project, diorganisir per modul (prefix `aegis_` dan `suluk_`)
- Firestore Security Rules mengcover semua collection dalam satu file rules

### Mengapa Firebase Functions untuk live price?

- API key CoinGecko, Alpha Vantage, Finnhub, Gold API tidak boleh exposed ke browser
- Semua user berbagi cache harga yang sama di Firestore (hemat quota API)
- Strategi cache: harga per simbol di-cache 5 menit di Firestore `/cache/prices/{symbol}`
- Alpha Vantage & Finnhub (untuk VWRA, ICLN, saham) hanya aman di-call dari server
- Estimasi usage dalam free tier Firebase untuk ~20 user aktif: aman

---

## 3. Integrasi Harga Eksternal

Konfigurasi price source mengikuti pola yang sudah ada di sistem Laravel (lihat `services.php` sebagai rujukan mapping).

| Sumber | Dipakai untuk | Endpoint | Catatan |
|---|---|---|---|
| CoinGecko (free) | Semua crypto: BTC, ETH, SOL, PAXG, USDC, USDT, ARB, MATIC, BNB, AVAX, dan LD-prefix Binance Earn tokens | `/simple/price` | Symbol map harus mencakup token LD prefix (LDBTC → bitcoin, LDETH → ethereum, dst.) |
| Alpha Vantage | VWRA.L (ETF saham) | `TIME_SERIES_DAILY` | Free tier sangat terbatas; hanya untuk VWRA |
| Finnhub | VWRA.L, VOO, ICLN, GLD (fallback/tambahan) | `/quote` | Fallback dari Alpha Vantage |
| Gold API | XAU spot price | `/price/{symbol}` | Untuk aset emas fisik |
| Etherscan V2 | Wallet EVM: ETH + ERC-20 balance | `tokentx`, `balance` | |
| BscScan | Wallet BSC | sama seperti Etherscan | |

### Symbol map (CoinGecko)

Mapping symbol uppercase → CoinGecko ID. Wajib mencakup token Binance Earn (LD prefix):

```
BTC → bitcoin, ETH → ethereum, SOL → solana, PAXG → pax-gold,
USDC → usd-coin, USDT → tether, ARB → arbitrum, MATIC → matic-network,
BNB → binancecoin, AVAX → avalanche-2,
LDBTC → bitcoin, LDETH → ethereum, LDUSDT → tether, LDUSDC → usd-coin,
LDSOL → solana, LDPAXG → pax-gold, LDPEPE → pepe, LDFDUSD → first-digital-usd,
LDWBETH → wrapped-beacon-eth, LDSTRK → strike, LDSXT → stakestone
```

Fiat yang sama dengan `vs_currency` (default: IDR) menggunakan harga 1.0 tanpa API call.

### Price caching strategy

```
Request harga BTC
  → Cek /cache/prices/BTC
  → Jika ada dan updatedAt < 5 menit → return cached
  → Jika tidak → hit CoinGecko API → simpan ke cache → return
```

---

## 4. Struktur Data Firestore

### Prinsip utama
- Semua data user di-scope di bawah `users/{userId}/...`
- **Master data global** — risk_factors, liquidities, account_categories, investment_types, asset_mediums punya dokumen default di `/globals/defaults/{collection}/`. Saat user pertama kali register, Firebase Function `aegis_onUserCreate` meng-copy semua default ke namespace user. User bisa edit, tambah, atau hapus kopian mereka sendiri tanpa mempengaruhi default global.
- Struktur dirancang agar CSV export/import tetap kompatibel dengan format sistem Laravel lama

```
firestore/
├── globals/
│   └── defaults/
│       ├── risk_factors/{id}
│       ├── liquidities/{id}
│       ├── account_categories/{id}
│       ├── investment_types/{id}
│       └── asset_mediums/{id}
├── users/{userId}/
│   ├── profile                           # settings: currency, AI provider & key, dll
│   ├── aegis_assets/{assetId}            # master aset
│   ├── aegis_platforms/{platformId}      # master platform
│   ├── aegis_labels/{labelId}            # account labels
│   ├── aegis_account_categories/{id}     # copy dari globals, bisa diedit user
│   ├── aegis_investment_types/{id}
│   ├── aegis_asset_mediums/{id}
│   ├── aegis_risk_factors/{id}
│   ├── aegis_liquidities/{id}
│   ├── aegis_holdings/{holdingId}        # definisi holding
│   ├── aegis_snapshots/{snapshotId}      # snapshot header
│   │   └── holding_snapshots/{id}        # subcollection: nilai per holding per snapshot
│   ├── aegis_platform_connections/{id}   # credentials auto-sync (AES-256 ciphertext)
│   │   └── portfolio_assets/{id}         # aset hasil sync exchange (quantity, price, dll)
│   ├── aegis_cashflow_records/{recordId} # catatan bulanan (income + alokasi)
│   │   ├── incomes/{id}                  # subcollection: income per sumber
│   │   └── allocations/{id}             # subcollection: alokasi per kategori
│   ├── aegis_income_sources/{id}         # master sumber pendapatan
│   ├── aegis_expense_categories/{id}     # master kategori alokasi (is_portfolio_cashflow flag)
│   └── suluk_diaries/{id}                # data diary dari modul Suluk
├── cache/
│   └── prices/{symbol}                  # harga live, TTL 5 menit
```

### Schema: `users/{userId}/profile`

```json
{
  "displayName": "string",
  "email": "string",
  "currency": "IDR",
  "weeklyReminderEnabled": false,
  "aiEnabled": false,
  "aiProvider": "gemini | claude | openai | disabled",
  "aiApiKey": "AES-256 encrypted ciphertext",
  "shareTokens": {},
  "createdAt": "timestamp"
}
```

### Schema: `aegis_holdings/{holdingId}`

```json
{
  "assetId": "string",
  "assetName": "string",
  "assetSymbol": "string",
  "assetType": "string",
  "platformId": "string | null",
  "platformName": "string | null",
  "accountLabel": "string | null",
  "accountCategoryId": "string | null",
  "accountCategoryName": "string | null",
  "investmentTypeId": "string | null",
  "investmentTypeName": "string | null",
  "assetMediumId": "string | null",
  "assetMediumName": "string | null",
  "riskFactorId": "string | null",
  "riskFactorName": "string | null",
  "liquidityId": "string | null",
  "liquidityName": "string | null",
  "source": "manual | binance | okx | mexc | ibkr | wallet",
  "externalId": "string | null",
  "autoPortfolioAssetId": "string | null",
  "notes": "string | null",
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Schema: `snapshots/{snapshotId}`

```json
{
  "date": "timestamp",
  "notes": "string | null",
  "totalValue": 1234567.0,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Schema: `snapshots/{id}/holding_snapshots/{id}`

```json
{
  "holdingId": "string",
  "amount": 1.234,
  "price": 980000.0,
  "value": 1209320.0,
  "useCalculated": true
}
```

### Schema: `cashflow_records/{recordId}`

```json
{
  "year": 2025,
  "month": 7,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Schema: `cashflow_records/{id}/incomes/{id}`

```json
{
  "sourceId": "string",
  "sourceName": "string",
  "amount": 5000000
}
```

### Schema: `cashflow_records/{id}/allocations/{id}`

```json
{
  "categoryId": "string",
  "categoryName": "string",
  "amount": 2000000,
  "isPortfolioCashflow": false
}
```

### Schema: `expense_categories/{id}`

```json
{
  "name": "string",
  "description": "string | null",
  "isAllocation": true,
  "isPortfolioCashflow": false,
  "createdAt": "timestamp"
}
```

---

## 5. Format CSV Import/Export

Format CSV **harus 100% kompatibel** dengan export dari sistem Laravel lama.

### Spesifikasi
- Delimiter: **semicolon (`;`)**
- Encoding: **UTF-8 dengan BOM** (`\xEF\xBB\xBF`)
- Baris pertama = header

### Struktur header
```
active;label;asset;liquidity;risk_factor;account_category;asset_medium;platform;investment_type;notes;[DATE_1];[DATE_2];...
```

Kolom metadata (10 kolom pertama) diikuti kolom tanggal dinamis dalam format `DD/MM/YYYY`.

### Aturan nilai
- Setiap sel tanggal berisi **nilai holding dalam currency default user (IDR)**, integer tanpa desimal
- Sel kosong = holding tidak ada di snapshot tersebut
- Kolom `active`: `1` atau `0`

### Contoh baris
```
1;yoga;Bitcoin;HIGH;"HIGH RISK";"Alternativ Equiv";Bitcoin;BINANCE;"Exchange Earn";Bitcoin;17580983;20040680;;;
```

### Logika import
1. Parse header → ambil 10 kolom metadata + semua kolom tanggal
2. Per baris: cari/buat holding yang cocok berdasarkan `(label + asset + platform + investment_type)`
3. Per kolom tanggal: cari/buat snapshot untuk tanggal tersebut, upsert `holding_snapshot` dengan nilai yang ada
4. Sel kosong: skip (tidak buat holding_snapshot untuk tanggal itu)
5. Nilai `0` tetap disimpan (holding ada tapi nilai nol)
6. Jika holding belum ada di Firestore: buat holding baru dengan metadata dari CSV
7. Conflict resolution: import tidak overwrite snapshot yang sudah ada kecuali user pilih "overwrite"

### Logika export
Kebalikan import — semua snapshot diurutkan ascending by date sebagai kolom, semua holding aktif sebagai baris. Holding tidak aktif tetap diekspor (kolom `active=0`) agar history terjaga.

### CSV Cashflow
Format terpisah untuk modul cashflow:
- Header: `bulan;[income] Gaji;[income] Tunjangan;[expense] Kebutuhan;[expense] Portofolio;...`
- Baris: `01/07/2024;5000000;500000;2000000;1500000;...`
- Import: `firstOrCreate` income source dan expense category berdasarkan nama

---

## 6. Modul & Fitur

### 6.1 Dashboard

**Halaman utama** portofolio setelah login.

Dashboard harus menjadi showcase utama tema Premium Dark-Mode Glassmorphism:
- Hero total portfolio menggunakan frosted-glass surface, amber valuation highlight, dan subtle amber glow.
- Mini stat positif memakai emerald/teal; negatif memakai rose/crimson.
- Snapshot selector dan market price tiles memakai glass controls dengan border putih opacity rendah.
- Tidak menggunakan tampilan marketing/landing; layar pertama langsung berupa dashboard kerja.

#### Komponen
- **Hero card** — Total portfolio (live valuation), perubahan vs snapshot terakhir (Rp + %)
- **Mini stat** — 30-day movement, perubahan vs snapshot sebelumnya
- **Snapshot selector** — Dropdown pilih snapshot untuk analisis breakdown
- **Holdings table** — Daftar holding dari snapshot terpilih: symbol, amount, price, value (menggunakan `@tanstack/react-table`, lihat spesifikasi di §6.2)
- **Chart breakdowns** (pie/donut) — Per: Account Category, Platform, Risk Factor, Asset Medium, Liquidity
- **History chart** — Stacked area chart semua snapshot menggunakan **lightweight-charts**, bisa di-group by: Asset, Platform, Label, Account Category, Investment Type, Asset Medium, Risk Factor, Liquidity, Source. Overlay cashflow line (putih) dari modul cashflow
- **Market price tiles** — Harga live VWRA, PAXG, BTC (extensible, dikonfigurasi dari settings)

#### History chart (lightweight-charts)
Implementasi mengikuti pola `dashboard-history-chart.js` dari sistem Laravel:
- `AreaSeries` per group, di-stack secara kumulatif
- `LineSeries` terpisah untuk cashflow overlay (warna `#ffffff`, tidak di-stack)
- Group selector dropdown → re-render chart dengan data yang sama
- Legend interaktif: toggle visibility, drag-reorder, color picker per series
- Preferensi legend di-persist ke localStorage dengan key `murub:portfolio-history:{groupKey}:legend-preferences`
- Tooltip custom menampilkan nilai per series saat hover crosshair
- Color assignment per keyword (platform, risk_factor, investment_type, dll) mengikuti color map yang sudah ada

#### Logika live valuation
- Ambil holding dari snapshot terbaru
- Fetch live price per simbol dari `/cache/prices` Firestore (TTL 5 menit)
- Jika cache miss → Firebase Function hit CoinGecko/Alpha Vantage/Finnhub → simpan ke cache
- Jika holding punya `autoPortfolioAsset` yang aktif dan sudah di-sync → pakai quantity dari sana (bukan dari snapshot)
- Live value = Σ (quantity × live_price)

---

### 6.2 Holdings

Manajemen definisi holding (bukan nilai; nilai ada di snapshot).

#### Tabel holdings (menggunakan `@tanstack/react-table`)

Tabel komprehensif dengan fitur:
- **Kolom action paling kiri dan fixed/sticky** (tidak scroll saat horizontal scroll)
- Kolom action sticky memakai pembatas vertikal `border-white/10`, background glass/dark semi-transparan, dan shadow horizontal rendah agar tetap terbaca saat scroll.
- Sorting multi-kolom
- Filter: search text, platform, status (active/inactive), source (manual/auto), linked/unlinked ke auto-portfolio asset
- Column visibility toggle (user bisa hide kolom yang tidak dibutuhkan)
- Pagination client-side (data di-load semua, filter & sort di frontend via Zustand)
- Bulk select + bulk delete

Kolom default (urutan dari kiri):
| # | Kolom | Keterangan |
|---|---|---|
| 1 | **Actions** | Fixed/sticky kiri. Tombol: Edit (slide-over), Detail, Delete |
| 2 | Asset | Symbol + nama aset |
| 3 | Platform | Platform/exchange |
| 4 | Label | Account label |
| 5 | Investment Type | Jenis investasi |
| 6 | Account Category | Kategori akun (Bond Equiv, Stock Equiv, dll) |
| 7 | Asset Medium | Medium (Rupiah, USD, Gold, dll) |
| 8 | Risk Factor | Level risiko |
| 9 | Liquidity | Level likuiditas |
| 10 | Source | manual / binance / okx / mexc / ibkr / wallet |
| 11 | Auto-Sync | Badge: linked / unlinked |
| 12 | Status | Active / Inactive badge |
| 13 | Notes | Truncated, tooltip on hover |

#### Inline edit
- Klik Edit di kolom action → buka slide-over panel di sisi kanan
- Form lengkap dalam panel, tidak perlu navigasi ke halaman baru
- Save → optimistic update via SWR mutation + Firestore patch
- Cancel → revert ke state sebelumnya

#### Form holding (halaman `/holdings/new` dan `/holdings/[id]/edit`)
Fields:
- Asset (dropdown dari master assets, searchable)
- Platform (dropdown, nullable)
- Auto portfolio asset link (dropdown dari synced assets, nullable)
- Account label
- Account category
- Investment type
- Asset medium
- Risk factor
- Liquidity
- Source (manual/exchange/wallet)
- External ID
- Notes
- Active toggle

#### Relasi ke snapshot
Holding tidak menyimpan quantity/value. Nilai direkam saat buat snapshot.

---

### 6.3 Assets

Master data aset yang dipakai di holding.

#### Fields
- Name
- Symbol (uppercase, digunakan untuk price API mapping)
- Type (Crypto, Stock, Gold, Cash, dll — bisa custom)

#### Halaman index
- Tabel: name, symbol, type, jumlah holdings yang pakai
- Asset yang masih dipakai holding tidak bisa dihapus
- Search & filter by type

---

### 6.4 Snapshots

Rekaman nilai portofolio di titik waktu tertentu.

#### Halaman index
- Tabel: date, notes, total value, perubahan vs snapshot sebelumnya
- Stacked area chart — portfolio over time (mini preview, bukan interactive penuh)
- Export CSV, Import CSV
- Bulk delete dengan checkbox

#### Buat/edit snapshot
Form berisi:
- Date picker
- Notes
- Tabel holding per holding aktif: kolom Amount, Price, Value
  - Toggle "use calculated" → value = amount × price (otomatis)
  - Toggle off → isi value manual (untuk aset tanpa price market yang jelas)
  - Auto-fill dari `portfolio_assets` jika holding punya link aktif ke auto-sync
  - Auto-fill price dari live price API (prefill, bisa di-override)
  - Prefill seluruh form dari snapshot sebelumnya jika ada

#### Detail snapshot
- Total value, perubahan vs snapshot sebelumnya (Rp + %)
- Tabel holding dengan comparison ke snapshot sebelumnya
- Bar chart: current vs previous per holding
- Breakdown pie charts: Platform, Risk, Account Category, Asset Medium, Liquidity

---

### 6.5 Auto-Sync (Portfolio Connections)

Koneksi ke exchange/wallet eksternal untuk fetch balance. **Sync bersifat manual** — user harus menekan tombol "Sync" untuk mengambil data terbaru. Tidak ada auto-sync otomatis di background.

#### Platform yang didukung

| Platform | Auth method | Data yang diambil |
|---|---|---|
| Binance | API Key + Secret | Spot balance + Earn (LD-prefix tokens) |
| OKX | API Key + Secret + Passphrase | Spot balance |
| MEXC | Access Key + Secret | Spot balance |
| IBKR | Account ID (session-based via Gateway) | Portfolio positions |
| Wallet (EVM) | Wallet address | ERC-20 balances via Etherscan/BscScan |

#### Alur sync
1. User klik "Sync" pada koneksi yang diinginkan (atau "Sync All")
2. Client call Firebase Function `aegis_syncPlatform`
3. Function dekripsi credential dari Firestore → call exchange API → simpan hasil ke `portfolio_assets`
4. Status koneksi diupdate: `last_synced_at`, `status` (active/error), `error_message`
5. UI reload data `portfolio_assets` dan tampilkan hasil terbaru

#### Fitur
- Tambah koneksi per platform (tab selector per platform)
- Label koneksi (opsional)
- Test connection saat simpan
- "Simpan saja" tanpa test (`skip_test`)
- Sync manual per koneksi atau sync all
- Status: active, error, pending
- Last synced timestamp
- Error message display
- Hapus koneksi

#### Penyimpanan credentials
- API key, secret, passphrase **dienkripsi AES-256** sebelum disimpan ke Firestore
- **Flow enkripsi:** client kirim plaintext ke Firebase Function via HTTPS callable → Function enkripsi menggunakan master key dari Secret Manager → simpan ciphertext ke Firestore → plaintext tidak pernah menyentuh Firestore
- **Flow dekripsi:** saat sync, Function ambil ciphertext → dekripsi dengan Secret Manager key → call exchange API → hapus plaintext dari memory
- AI API key user (Gemini/Claude/OpenAI) menggunakan enkripsi yang sama

#### Portfolio assets schema

```json
{
  "connectionId": "string",
  "platform": "binance | okx | mexc | ibkr | wallet",
  "symbol": "string",
  "name": "string | null",
  "quantity": 1.234,
  "currentPrice": 980000.0,
  "valueUsd": 1209320.0,
  "syncedAt": "timestamp"
}
```

---

### 6.6 Cashflow Manager

Modul pencatatan keuangan bulanan — income vs alokasi. Dibangun mengikuti logika yang sudah ada di sistem Laravel (rujukan: `MonthlyFinancialRecordController.php`, `PortfolioCashFlowController.php`, `ExpenseCategoryController.php`, `IncomeSourceController.php`, dan blade templates terkait).

#### Sub-fitur

**6.6.1 Income Sources**
- CRUD sumber pendapatan user (Gaji, Tunjangan, Bonus, dll)
- Tidak bisa dihapus jika masih dipakai di catatan bulanan

**6.6.2 Expense Categories (Allocation Categories)**
- CRUD kategori alokasi (`is_allocation = true`)
- Flag `is_portfolio_cashflow`: satu kategori bisa ditandai sebagai "alokasi portofolio", digunakan untuk cashflow overlay di history chart
- Tidak bisa dihapus jika masih dipakai di catatan bulanan

**6.6.3 Monthly Records**
- Input per bulan/tahun: income per sumber + alokasi per kategori
- Validasi: tidak boleh ada dua record untuk bulan+tahun yang sama
- Tampilkan selisih (sisa) = total income − total alokasi; warna merah jika negatif
- CRUD lengkap: list, create, show, edit, delete
- Import CSV dengan format: `bulan;[income] NamaSumber;[expense] NamaKategori;...`
- Export CSV

**6.6.4 Portfolio Cashflow View**
- Filter catatan bulanan berdasarkan kategori yang ditandai `is_portfolio_cashflow`
- Tampilkan daftar bulanan: berapa alokasi ke portofolio per bulan
- Data ini digunakan sebagai cashflow overlay line di history chart dashboard

#### Firestore untuk cashflow
Data cashflow disimpan di `users/{userId}/cashflow_records/` (lihat §4 untuk schema lengkap). Master data `income_sources` dan `expense_categories` juga di-scope per user.

---

### 6.7 Platform Taxonomy (Master Data)

Master data yang dipakai sebagai klasifikasi holding. Semua per-user, bisa custom.

Entitas:
- **Labels** — account label (yoga, aya, Wallet…3688, dll)
- **Account Categories** — Bond Equiv, Stock Equiv, Alternativ Equiv, Physical Equiv
- **Investment Types** — Cash, Stock ETF, Crypto, Gold Token, Exchange Earn, USD Token, Lending Protocol, Deposito Bank Digital, Prediction Market, Gold, Tabungan
- **Asset Mediums** — Rupiah, US Dollar, Stock, Bitcoin, Crypto, Gold
- **Risk Factors** — VERY LOW RISK, LOW RISK, MEDIUM RISK, HIGH RISK, VERY HIGH RISK
- **Liquidities** — VERY LOW, LOW, MEDIUM, HIGH, VERY HIGH

Semua punya CRUD standar. Entitas yang masih dipakai holding tidak bisa dihapus.

---

### 6.8 Snapshot Reminder (Weekly Backfill)

Sistem reminder non-otomatis untuk memastikan ada snapshot rutin.

#### Behavior
- Saat user buka Dashboard/Snapshots/Holdings: Server Component cek gap antara snapshot terakhir dan hari ini
- Jika gap > 7 hari: tampilkan banner sticky amber-glow: *"Belum ada snapshot minggu ini. Buat sekarang?"*
- Klik → navigate ke `/snapshots/new` dengan prefill dari snapshot terakhir
- **Tidak ada auto-create snapshot tanpa interaksi user**
- Firebase Function terjadwal (Pub/Sub cron, Senin pagi) bisa kirim email reminder mingguan (opt-in di Settings)

#### Implementasi
- Server Component fetch snapshot terbaru → hitung gap → set prop `needsBackfill: boolean`
- Client component render banner berdasarkan prop tersebut
- Tidak ada cron di server Next.js; semua scheduling via Firebase Functions

---

### 6.9 Investment Simulator

Tool interaktif untuk simulasi pertumbuhan portofolio dengan model 4 kantong.

#### Inputs
- Modal awal (juta IDR)
- Tabungan per bulan (juta IDR)
- Inflasi per tahun (%)
- Step-up DCA per tahun (%)
- Durasi simulasi (tahun)
- Alokasi 4 kantong: persentase + expected return per tahun per kantong
- Nama kantong bisa custom (default: Kas & Likuid, Obligasi Ekuiv, Saham Ekuiv, Alternatif)

#### Outputs
- Proyeksi portfolio total (nominal dan real/inflasi-adjusted)
- Chart line per kantong (stacked area atau multi-line)
- Tabel milestones: kapan mencapai 1M, 2M, 5M, dst.
- Breakdown alokasi akhir
- Results update real-time saat input berubah (no submit)

#### Implementasi
- Pure client-side calculation, tidak butuh server/Firestore
- State lokal per sesi; bisa di-save ke Firestore sebagai "scenario" (fase berikutnya)

---

### 6.10 Decision Support System (DSS)

Dashboard analitik lanjutan berbasis snapshot untuk mendukung keputusan investasi.

#### Tab-based UI
Semua tab membaca data snapshot yang dipilih dari dropdown.

**Tab 1: Overview**
- Total value, breakdown per risk, account category
- Ringkasan posisi aktif vs target alokasi

**Tab 2: Rebalancing**
- Tabel target alokasi per category (settable di Tab DSS Settings)
- Current allocation vs target (%)
- Delta: berapa yang perlu ditambah/dikurangi per kategori
- "Hard rebalance" indicator: jika deviasi > threshold

**Tab 3: DCA Helper**
- Berapa yang harus di-DCA per bulan per kantong berdasarkan target alokasi
- Input: budget DCA bulan ini
- Output: distribusi per kategori

**Tab 4: Risk Monitor**
- Breakdown nilai per risk factor
- Flag jika konsentrasi di HIGH/VERY HIGH RISK melebihi threshold (settable)
- Visual gauge atau bar chart

**Tab 5: Assets**
- Tabel semua holding dari snapshot terpilih
- Detail: symbol, platform, quantity, price, value, % of total, P&L vs previous

**Tab 6: AI Analyst**
- Input snapshot data ke AI
- User bisa pilih provider sesuai konfigurasi di Settings → AI Configuration
- Jika AI disabled atau belum dikonfigurasi → tampilkan banner setup
- Prompt template bisa dikustomisasi per user
- Output: analisis teks — strengths, weaknesses, rekomendasi alokasi
- Response di-stream ke UI via Server-Sent Events
- History analisis disimpan di Firestore (opsional, bisa di-clear)

**Tab 7: Settings (DSS)**
- Set target alokasi per account category (%)
- Set threshold hard rebalance (%)
- Set threshold risk warning (%)

---

### 6.11 Settings Aplikasi

Halaman setting per user, dibagi beberapa seksi.

**General**
- Quote currency — default IDR, bisa ganti ke USD dll

**AI Configuration**
- Enable / disable AI Analyst (`aiEnabled` toggle)
- Pilih provider:
  - **Gemini** (Google) — default; API key: `GEMINI_API_KEY`, project: `GEMINI_PROJECT`
  - **Claude** (Anthropic)
  - **ChatGPT** (OpenAI)
- Input API key (field password, dienkripsi AES-256 saat disimpan via Firebase Function)
- Test API key → verifikasi dengan call minimal ke API provider
- Hapus API key tersimpan
- Catatan: user yang tidak ingin mengkonfigurasi AI bisa tetap menggunakan semua fitur non-AI secara penuh

**Notifications**
- Opt-in weekly snapshot reminder via email

**Account**
- Display name, email

**Danger zone**
- Hapus semua data portfolio (holdings, snapshots, connections)
- Hapus semua data cashflow
- Hapus akun

---

### 6.12 Share Portfolio (Read-only view)

Memungkinkan user share view portofolio ke orang lain.

- User generate share link (token unik)
- Penerima link bisa lihat dashboard dalam mode read-only, tanpa login
- Tidak ada aksi write; semua form dan tombol edit disembunyikan
- User bisa revoke link kapan saja
- Token disimpan di `users/{id}/share_tokens/{token}` dengan expiry opsional
- Firestore rules: allow read jika token valid di `users/{id}/share_tokens/`

---

## 7. Navigasi & Routing (App Router)

```
/                           → redirect ke /dashboard
/login                      → Firebase Auth login
/register

/dashboard                  → Dashboard utama
/holdings                   → Daftar holdings (@tanstack/react-table)
/holdings/new               → Form buat holding
/holdings/[id]              → Detail holding
/holdings/[id]/edit         → Edit holding (juga via slide-over dari tabel)

/assets                     → Master assets
/assets/new
/assets/[id]/edit

/snapshots                  → Daftar snapshots
/snapshots/new              → Buat snapshot (dengan prefill)
/snapshots/[id]             → Detail snapshot
/snapshots/[id]/edit        → Edit snapshot

/auto-portfolio             → Daftar koneksi exchange/wallet
/auto-portfolio/connect     → Tambah koneksi (tab per platform)
/auto-portfolio/[id]        → Detail platform + asset list + tombol Sync
/auto-portfolio/[id]/edit   → Edit koneksi

/cashflow                   → Dashboard cashflow (ringkasan bulanan)
/cashflow/records           → Daftar catatan bulanan
/cashflow/records/new       → Buat catatan bulanan
/cashflow/records/[id]      → Detail catatan bulanan
/cashflow/records/[id]/edit → Edit catatan bulanan
/cashflow/income-sources    → CRUD sumber pendapatan
/cashflow/categories        → CRUD kategori alokasi

/simulator                  → Investment Simulator
/dss                        → Decision Support System

/settings                   → Settings user (termasuk AI Configuration)
/share/[token]              → Read-only share view (no auth required)

/master/labels              → CRUD labels
/master/account-categories  → CRUD account categories
/master/investment-types    → CRUD investment types
/master/asset-mediums       → CRUD asset mediums
/master/risk-factors        → CRUD risk factors
/master/liquidities         → CRUD liquidities
```

---

## 8. Firebase Functions (API Endpoints)

| Function | Trigger | Deskripsi |
|---|---|---|
| `aegis_onUserCreate` | Auth onCreate | Copy global defaults ke namespace user baru |
| `aegis_getPrice` | HTTPS callable | Fetch live price 1 simbol, dengan cache 5 mnt |
| `aegis_getBatchPrices` | HTTPS callable | Fetch banyak simbol sekaligus |
| `aegis_syncPlatform` | HTTPS callable | **Manual trigger** sync 1 koneksi exchange/wallet |
| `aegis_syncAllPlatforms` | HTTPS callable | **Manual trigger** sync semua koneksi user |
| `aegis_testConnection` | HTTPS callable | Test koneksi tanpa menyimpan data |
| `aegis_saveEncryptedCredential` | HTTPS callable | Enkripsi & simpan API key (exchange/AI) |
| `aegis_analyzePortfolio` | HTTPS callable | Proxy ke Gemini/Claude/OpenAI untuk DSS AI Analyst, stream response via SSE |
| `aegis_weeklyReminder` | Pub/Sub cron (Senin) | Kirim email reminder snapshot mingguan (opt-in) |

Semua function menggunakan prefix `aegis_` untuk membedakan dari function modul Suluk dalam satu Firebase project.

---

## 9. AI Configuration Detail

### Provider yang didukung
User bisa memilih salah satu dari tiga provider, atau disable AI sama sekali.

| Provider | Model default | Env var konfigurasi |
|---|---|---|
| Gemini (Google) | `gemini-2.0-flash` | `GEMINI_API_KEY`, `GEMINI_PROJECT_NAME`, `GEMINI_BASE_URL` |
| Claude (Anthropic) | `claude-sonnet-4-20250514` | User provide key sendiri |
| ChatGPT (OpenAI) | `gpt-4o-mini` | User provide key sendiri |

### Alur AI Analyst
1. User klik "Analyze" di Tab AI Analyst DSS
2. Client call `aegis_analyzePortfolio` Firebase Function
3. Function ambil `aiProvider` dan `aiApiKey` (dekripsi) dari `users/{id}/profile`
4. Function buat prompt dari data snapshot + prompt template user
5. Function call API provider yang dipilih → stream response ke client via SSE
6. Client render response teks secara streaming

### Gemini sebagai default
Untuk skenario di mana user belum mengkonfigurasi AI key sendiri (misal: development atau demo), tersedia API key Gemini default di environment Firebase Functions:
```
GEMINI_API_KEY=<from Secret Manager>
GEMINI_PROJECT=projects/427875650989
```
User tetap bisa override dengan key mereka sendiri.

---

## 10. Autentikasi & Authorization

- Firebase Auth: **Google OAuth wajib tersedia dan menjadi primary sign-in**. Email/Password boleh disediakan sebagai opsi tambahan setelah Google Auth stabil.
- Login screen memakai tema Premium Dark-Mode Glassmorphism + Amber Glow: glass card, CTA amber, dan pesan error rose/crimson.
- Setelah login Google, semua data user discope ke `users/{userId}` di Firestore. Selama mode local/dev, storage/cache client juga wajib dipisah per `uid`.
- Semua Firestore rules: data hanya bisa diakses oleh `userId` yang match
- Firebase Functions: verify auth token di setiap callable function
- Share token: `/share/[token]` tidak butuh auth — Firestore rules allow read jika token valid

### Firestore Security Rules (ringkasan)

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
match /cache/{document=**} {
  allow read: if request.auth != null;
  allow write: if false; // hanya Functions yang bisa write cache
}
match /globals/defaults/{document=**} {
  allow read: if request.auth != null;
  allow write: if false; // hanya seeded via admin SDK
}
// Share token read access
match /users/{userId}/snapshots/{snapshotId} {
  allow read: if isValidShareToken(userId, request.query.token);
}
```

---

## 11. Pertimbangan Free Tier Firebase

| Resource | Free tier | Estimasi usage (20 user) |
|---|---|---|
| Firestore reads | 50.000/hari | ~5.000–15.000/hari ✅ |
| Firestore writes | 20.000/hari | ~500–3.000/hari ✅ |
| Functions invocations | 125.000/bulan | ~10.000–20.000/bulan ✅ |
| Functions compute | 40.000 GHz-detik/bulan | Aman dengan cache ✅ |
| Hosting | 10 GB/bulan | Aman ✅ |
| Auth | Unlimited | ✅ |

Kunci: **aggressive caching** di level price fetch. Satu CoinGecko call di-share ke semua user selama 5 menit.

---

## 12. Prioritas Development (Phased)

### Phase 1 — Core (MVP)
1. Auth (Firebase Auth Google OAuth primary) + `aegis_onUserCreate` seed defaults
2. Master data CRUD (assets, labels, categories, dll)
3. Holdings CRUD + tabel `@tanstack/react-table`
4. Snapshots CRUD + form dengan auto-fill
5. CSV Export & Import (compatible dengan format lama)
6. Dashboard dasar (total value dari snapshot, breakdown charts Recharts)
7. Premium Dark-Mode Glassmorphism + Amber Glow diterapkan konsisten pada shell, dashboard, holdings table, snapshot reminder, dan auth screen

### Phase 2 — Live & Charts
7. Live price integration (Firebase Functions + cache)
8. Dashboard live valuation
9. History chart dengan lightweight-charts (stacked area + cashflow overlay)
10. Snapshot reminder banner (weekly backfill detection)

### Phase 3 — Sync & Cashflow
11. Auto-sync connections (Binance, OKX, MEXC) — manual sync trigger
12. Cashflow Manager (income sources, expense categories, monthly records)
13. Cashflow overlay di history chart
14. Portfolio Cashflow View

### Phase 4 — Analytics & AI
15. Decision Support System (semua tab)
16. Investment Simulator
17. DSS AI Analyst (Gemini/Claude/OpenAI proxy via Firebase Function)
18. Share portfolio (read-only link)
19. Weekly email reminder via Functions

### Phase 5 — Extended
20. IBKR integration
21. Wallet/Blockchain integration (Etherscan V2)
22. Export PDF laporan bulanan
23. Firestore offline persistence

---

## 13. Keputusan Arsitektur (Sudah Dikunci)

| Topik | Keputusan |
|---|---|
| Firebase project | **Satu project bersama Suluk** (`projects/427875650989`); Functions dibedakan dengan prefix `aegis_` |
| Master data | Global defaults di `/globals/defaults/`, di-copy ke user saat register via `aegis_onUserCreate` |
| Credential encryption | AES-256 di Firebase Functions, master key di Secret Manager |
| AI Analyst | Gemini (default), Claude, OpenAI — user pilih provider dan isi key sendiri, tersimpan terenkripsi. Bisa di-enable/disable. |
| AI default key | Gemini tersedia dari Firebase Secret Manager untuk fallback/development |
| Offline/PWA | Tidak untuk v1 |
| Mobile | Responsive web mobile-first, tidak ada React Native |
| Currency | Configurable per user, default IDR |
| Auto-sync | **Manual trigger** (user harus klik Sync); tidak ada background auto-sync |
| Snapshot backfill | Banner reminder + prefill form; tidak auto-create snapshot |
| Holdings table | `@tanstack/react-table`; kolom action fixed di kiri |
| History chart | `lightweight-charts` (AreaSeries stacked + LineSeries cashflow overlay) |
| Breakdown charts | `Recharts` (pie/donut, bar) |
| Cashflow module | Terintegrasi dalam Aegis; data cashflow di Firestore namespace yang sama |
| Investment Simulator | Pure client-side calculation |
| DSS | Termasuk AI tab; hanya aktif jika AI dikonfigurasi |
| Share portfolio | Read-only link dengan token, no auth required |

---

## 14. Default Global Master Data

Data ini di-seed ke `/globals/defaults/` dan di-copy ke setiap user baru via `aegis_onUserCreate`.

**Risk Factors**
- VERY LOW RISK, LOW RISK, MEDIUM RISK, HIGH RISK, VERY HIGH RISK

**Liquidities**
- VERY LOW, LOW, MEDIUM, HIGH, VERY HIGH

**Account Categories**
- Bond Equiv, Stock Equiv, Alternativ Equiv, Physical Equiv

**Investment Types**
- Cash, Stock ETF, Crypto, Gold Token, Exchange Earn, USD Token, Lending Protocol, Deposito Bank Digital, Prediction Market, Gold, Tabungan

**Asset Mediums**
- Rupiah, US Dollar, Stock, Bitcoin, Crypto, Gold

---

*PRD v2.0 — Direvisi Mei 2026. Perubahan dari v1.2: menambahkan modul Cashflow Manager, klarifikasi auto-sync sebagai manual trigger, mengganti Recharts ke lightweight-charts untuk history chart, menentukan @tanstack/react-table untuk tabel holdings dengan kolom action fixed di kiri, menambahkan OpenAI sebagai AI provider ketiga, klarifikasi shared Firebase project dengan Suluk, dan detail AI configuration dengan Gemini sebagai default.*
