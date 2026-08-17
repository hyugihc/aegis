import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  fetchIbkrGateway,
  IBKR_GATEWAY_BASE_URL,
  ibkrSessionCookieName,
  isIbkrGatewayPortOpen,
} from "@/lib/ibkr-gateway";

export const runtime = "nodejs";

type TicklePayload = {
  session?: string;
  authenticated?: boolean;
  iserver?: {
    authStatus?: {
      authenticated?: boolean;
    };
  };
};

function sessionFromSetCookie(header: string | null) {
  const match = header?.match(/JSESSIONID=([^;]+)/i);
  return match?.[1] ?? "";
}

function isAuthenticated(payload: TicklePayload) {
  return payload.authenticated === true || payload.iserver?.authStatus?.authenticated === true;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
      baseUrl?: string;
    };
    const connectionId = String(body.connectionId ?? "").trim();
    const baseUrl = String(body.baseUrl ?? IBKR_GATEWAY_BASE_URL).trim() || IBKR_GATEWAY_BASE_URL;

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID wajib dikirim." }, { status: 400 });
    }
    
    // First check if port is actually open
    const portOpen = await isIbkrGatewayPortOpen();
    if (!portOpen) {
      console.warn(`IBKR Gateway port 5000 tidak terbuka. Port check result: ${portOpen}`);
      return NextResponse.json(
        { 
          error: "IBKR Gateway belum aktif di port 5000. Klik 'Start Gateway' terlebih dahulu dan tunggu 5-10 detik hingga proses siap.\n\nTanda siap: Portal bisa dibuka dan login berhasil." 
        }, 
        { status: 503 },
      );
    }

    const cookieStore = await cookies();
    const browserSessionToken = cookieStore.get("JSESSIONID")?.value || cookieStore.get(ibkrSessionCookieName(connectionId))?.value;

    // Try to fetch from the gateway with better error handling
    let tickle;
    try {
      tickle = await fetchIbkrGateway<TicklePayload>(baseUrl, "/tickle", browserSessionToken, "POST");
    } catch (fetchError: any) {
      const statusCode = fetchError.statusCode;
      const errorMsg = fetchError.message;
      
      console.warn(`Initial tickle failed (Status ${statusCode}): ${errorMsg}`);

      if (statusCode === 401 || statusCode === 403) {
        try {
          console.log("Attempting re-authentication after 403/401...");
          await fetchIbkrGateway(baseUrl, "/iserver/reauthenticate", undefined, "POST");
          // Wait a bit for the gateway to process
          await new Promise(r => setTimeout(r, 1000));
          tickle = await fetchIbkrGateway<TicklePayload>(baseUrl, "/tickle", undefined, "POST");
        } catch (retryError: any) {
          console.error("Retry after reauthenticate failed:", retryError);
          return NextResponse.json(
            { 
              error: `IBKR Gateway mengembalikan error ${retryError.statusCode ?? "401"} saat mencoba mengambil session secara otomatis.\n\n` +
                     `Hal ini wajar karena browser Anda dan server Aegis berjalan di lingkungan terpisah dan tidak berbagi cookie secara langsung.\n\n` +
                     `Cara Mengatasinya (Input Manual JSESSIONID):\n` +
                     `1. Buka halaman IBKR Gateway di: ${baseUrl}\n` +
                     `2. Pastikan Anda sudah login hingga muncul pesan "Client login succeeds"\n` +
                     `3. Tekan F12 atau klik kanan -> Pilih 'Inspect' (Periksa) untuk membuka Developer Tools\n` +
                     `4. Buka tab 'Application' (di Chrome/Edge/Brave) atau tab 'Storage' (di Firefox)\n` +
                     `5. Di menu sebelah kiri, klik 'Cookies' lalu pilih '${baseUrl}'\n` +
                     `6. Temukan cookie bernama 'JSESSIONID', lalu klik dua kali pada kolom 'Value' dan SALIN (Copy) kodenya\n` +
                     `7. Di Aegis, klik tombol edit (ikon pensil/kunci) pada koneksi IBKR ini\n` +
                     `8. Tempel (Paste) kode tersebut ke kolom 'IBKR JSESSIONID / session token', lalu klik 'Save'.`
            },
            { status: 503 },
          );
        }
      } else {
        // ... handle other errors ...
        if (errorMsg.includes("fetch failed") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ETIMEDOUT")) {
          return NextResponse.json(
            { 
              error: `IBKR Gateway tidak merespons di ${baseUrl}.\n\nKemungkinan:\n1. IBGateway belum benar-benar siap (tunggu 10-15 detik setelah start)\n2. IBGateway crashed/terminated\n3. Port 5000 tertutup oleh firewall\n\nSolusi:\n- Tunggu beberapa detik, lalu coba "Ambil Session" lagi\n- Atau jalankan IBGateway secara manual: C:\\laragon\\www\\aegis\\ibkr-gateway\\bin\\run.bat` 
            }, 
            { status: 503 },
          );
        }
        
        return NextResponse.json(
          { error: `Gagal terhubung ke IBKR Gateway: ${errorMsg}` },
          { status: 503 },
        );
      }
    }

    let payload = tickle.payload;

    if (!isAuthenticated(payload)) {
      try {
        await fetchIbkrGateway(baseUrl, "/iserver/reauthenticate", browserSessionToken, "POST").catch(() => null);
      } catch (error) {
        console.error("Reauthenticate error:", error);
      }
      
      try {
        tickle = await fetchIbkrGateway<TicklePayload>(baseUrl, "/tickle", browserSessionToken, "POST");
        payload = tickle.payload;
      } catch (error) {
        console.error("Tickle after reauthenticate error:", error);
        return NextResponse.json(
          { error: "IBKR Gateway tidak merespons setelah reauthenticate. Coba refresh browser dan login ulang di portal." },
          { status: 503 },
        );
      }
    }

    if (!isAuthenticated(payload)) {
      return NextResponse.json(
        { error: "IBKR Gateway belum authenticated.\n\nLangkah:\n1. Klik 'Buka Portal'\n2. Login dengan Interactive Brokers username & password\n3. Tunggu hingga muncul 'Client login succeeds'\n4. Kembali dan klik 'Ambil Session'" },
        { status: 401 },
      );
    }

    const sessionToken = String(payload.session ?? "") || sessionFromSetCookie(String(tickle.response.get("set-cookie") ?? ""));
    if (!sessionToken) {
      console.error("Session token not found. Payload:", JSON.stringify(payload));
      console.error("Set-Cookie header:", tickle.response.get("set-cookie"));
      
      // Try alternative methods to extract session
      const allHeaders = Object.entries(tickle.response.headers);
      const sessionFromHeaders = allHeaders
        .find(([name]) => name.toLowerCase() === "set-cookie")?.[1];
      
      if (sessionFromHeaders) {
        const altSession = sessionFromSetCookie(Array.isArray(sessionFromHeaders) ? sessionFromHeaders.join("; ") : sessionFromHeaders);
        if (altSession) {
          cookieStore.set(ibkrSessionCookieName(connectionId), altSession, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
            maxAge: 60 * 60,
          });
          return NextResponse.json({ ok: true, message: "Session IBKR tersimpan (dari header)." });
        }
      }
      
      return NextResponse.json(
        { error: "Session token IBKR tidak ditemukan. Coba:\n1. Logout dari portal\n2. Login kembali\n3. Klik 'Ambil Session' lagi" },
        { status: 401 },
      );
    }

    cookieStore.set(ibkrSessionCookieName(connectionId), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    });

    console.log(`Successfully captured IBKR session for connection ${connectionId}`);
    return NextResponse.json({ ok: true, message: "Session IBKR tersimpan. Siap untuk sync!" });
  } catch (error) {
    console.error("IBKR Session capture error:", error);
    const errorMsg = error instanceof Error ? error.message : "Gagal mengambil session IBKR.";
    return NextResponse.json(
      { error: errorMsg },
      { status: 503 },
    );
  }
}
