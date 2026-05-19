# Implementation Plan: CoinGecko & CoinMarketCap API Integration

Integrasi API CoinGecko dan CoinMarketCap dengan mekanisme fallback, pengaturan (Settings) API key default, pemilihan source pada Master Data Assets, enkripsi credentials (secure Firestore), validasi API, serta optimasi client-side caching pada dashboard.

## User Review Required

> [!IMPORTANT]
> 1. **Default API Keys**:
>    - CoinGecko: `CG-wpg7DzyKxV5jfLegWZPymQqe` (Demo API Key)
>    - CoinMarketCap: `b036e5a40e704f609cdc24e797ddad32` (Pro API Key)
>    Kedua API Key ini akan diset sebagai default awal. Pengguna dapat mengubahnya lewat tab **Price APIs** di menu **Settings**.
> 
> 2. **Client-Side Caching (Dashboard)**:
>    - Live prices pada dashboard akan disimpan ke `localStorage` dengan TTL 5 menit.
>    - Saat dashboard direfresh, aplikasi akan memuat data harga dari cache jika masih fresh dan daftar aset tidak berubah, mencegah pemanggilan API berulang-ulang secara mubazir.
>    - Disediakan tombol **Refresh** manual di dashboard untuk memaksa pembaharuan harga live secara real-time.
>    - Informasi pengambilan harga (kapan data diambil, dari API mana, detail aset) akan ditampilkan secara detail lewat panel ekspansi (**Live Price Details**) di dashboard.

## Proposed Changes

---

### Core Data Models & Helpers

#### [MODIFY] [portfolio.ts](file:///c:/laragon/www/aegis/lib/portfolio.ts)
- Tambahkan default constants: `DEFAULT_COINGECKO_API_KEY` dan `DEFAULT_COINMARKETCAP_API_KEY`.
- Update skema `priceServices` di settings type untuk menampung `coinGeckoApiKey` and `coinMarketCapApiKey`.
- Update `emptyPortfolio` untuk inisialisasi default API keys baru.
- Update `normalizePortfolioData` untuk memproses, membersihkan, dan memastikan key `coinGeckoApiKey` dan `coinMarketCapApiKey` tersimpan.
- Perluas tipe `priceSource` pada `MasterItem` untuk mendukung opsi `"coinmarketcap"`.

#### [MODIFY] [firestore-portfolio.ts](file:///c:/laragon/www/aegis/lib/firestore-portfolio.ts)
- Update `loadPortfolioFromFirestore` untuk mendukung decoding secure credentials dari Firestore bagi `coinGeckoApiKey` dan `coinMarketCapApiKey`.
- Update `savePortfolioToFirestore` untuk mendukung encoding secure credentials dari Firestore bagi `coinGeckoApiKey` dan `coinMarketCapApiKey` (menggunakan placeholder `[SECURE]`).

---

### Settings & Master Data Views

#### [MODIFY] [settings-page.tsx](file:///c:/laragon/www/aegis/components/aegis/settings-page.tsx)
- Tambahkan dua card API key baru untuk **CoinGecko** dan **CoinMarketCap** pada tab **Price APIs**.
- Tambahkan logic validation state dan penanganan check API masing-masing API Key.

#### [MODIFY] [master-data-page.tsx](file:///c:/laragon/www/aegis/components/aegis/master-data-page.tsx)
- Pada detail item Master Assets:
  - Tambahkan opsi `"coinmarketcap"` ke dropdown **Price Source**.
  - Tambahkan kolom informasi penjelas interaktif untuk opsi CoinMarketCap pada panel dynamic help box.
  - Teruskan API Key `coinGeckoApiKey` dan `coinMarketCapApiKey` dari setting sewaktu memanggil `/api/prices/live` untuk fitur **Test price fetch**.

---

### Client-Side API Utility

#### [MODIFY] [client-utils.ts](file:///c:/laragon/www/aegis/components/aegis/client-utils.ts)
- Perluas tipe source di `PriceUpdateDetail`, `LivePricePayload`, dan `displaySource` helper agar mencakup `"coinmarketcap"`.
- Perbarui `fetchLatestPrices` dan `fetchLiveSymbolPrices` untuk mengirimkan `coinGeckoApiKey` dan `coinMarketCapApiKey` ke backend API.

---

### Backend API Services

#### [MODIFY] [live/route.ts](file:///c:/laragon/www/aegis/app/api/prices/live/route.ts)
- Tambahkan pendefinisian default keys dari `portfolio.ts`.
- Perluas type `PriceSource` dengan `"coinmarketcap"`.
- Modifikasi `fetchCoinGeckoPrices` dan `fetchCoinGeckoUsdToIdrRate` untuk menerima API key dan menyisipkannya sebagai header `x-cg-demo-api-key`.
- Buat fungsi pembantu baru `fetchCoinMarketCapPrices` untuk mengambil harga crypto dari CoinMarketCap API (`/v2/cryptocurrency/quotes/latest?symbol=...&convert=IDR` atau `id=...&convert=IDR` jika priceTicker numerik).
- Update POST handler:
  1. Ambil `coinGeckoApiKey` dan `coinMarketCapApiKey` dari request body (fallback ke default).
  2. Kelompokkan kandidat aset yang memiliki `priceSource === "coinmarketcap"`. Cari harganya langsung melalui CoinMarketCap API.
  3. Kelompokkan kandidat crypto untuk CoinGecko (yang bertipe `coingecko` atau `auto` yang non-fiat, non-metals).
  4. Ambil harga CoinGecko. Jika terjadi error (kuota habis/rate limit), lakukan fallback otomatis dengan memanggil CoinMarketCap API untuk mengambil harga aset tersebut.

#### [MODIFY] [validate-api/route.ts](file:///c:/laragon/www/aegis/app/api/validate-api/route.ts)
- Tambahkan pendeteksian dan validasi API key untuk layanan:
  - `"coingecko"`: Memanggil endpoint `/ping` dengan header `x-cg-demo-api-key`.
  - `"coinMarketCap"`: Memanggil endpoint `/v1/key/info` dengan header `X-CMC_PRO_API_KEY`.

---

### Dashboard Live Price Optimization

#### [MODIFY] [dashboard-page.tsx](file:///c:/laragon/www/aegis/components/aegis/dashboard-page.tsx)
- Implementasikan inisialisasi state `livePrices` dan `liveStatus` dari client-side cache (`localStorage`).
- Modifikasi `useEffect` price update agar tidak memicu fetch otomatis jika cache di browser masih berumur kurang dari 5 menit dan list simbol aset tidak berubah.
- Tambahkan tombol **Refresh** manual di dashboard valuation card.
- Tampilkan panel detail ekspansi (**Live Price Details**) yang memuat informasi lengkap kapan harga diambil, dari API mana, dan detail tiap aset.

---

## Verification Plan

### Automated Tests
- Jalankan aplikasi (`npm run dev`) dan lakukan pengujian interaktif.

### Manual Verification
1. **Settings Tab (Price APIs)**:
   - Pastikan API Key default CoinGecko dan CoinMarketCap tampil.
   - Klik **Check API** untuk memverifikasi validasi kunci CoinGecko & CoinMarketCap (harus mengembalikan sukses "API key valid").
2. **Master Data Assets**:
   - Pilih satu aset kripto, edit. Pilih price source **CoinMarketCap**. Set Price Ticker ke `BTC` atau `1`. Klik **Test price fetch** (harus sukses).
   - Edit aset kripto lain, pilih price source **CoinGecko**. Klik **Test price fetch** (harus sukses).
3. **Fallback Mechanism (CoinGecko Quota Exhausted)**:
   - Matikan sementara API Key CoinGecko di setting (berikan key dummy) lalu lakukan fetch. Aset harus tetap terupdate harganya dengan status sumber beralih ke **CoinMarketCap**.
4. **Dashboard Caching**:
   - Refresh halaman dashboard beberapa kali. Periksa tab Network: request ke `/api/prices/live` tidak boleh dikirim lagi setelah pemanggilan pertama (selama cache < 5 menit).
   - Klik tombol **Refresh** manual di dashboard. Periksa tab Network: request harus dikirimkan kembali dan cache diupdate.
   - Buka panel detail ekspansi live price untuk memastikan waktu data diambil dan daftar aset yang diambil tampil dengan benar.
