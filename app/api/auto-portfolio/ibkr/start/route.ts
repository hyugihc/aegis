import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { IBKR_GATEWAY_BATCH, IBKR_GATEWAY_BIN_DIR, isIbkrGatewayPortOpen } from "@/lib/ibkr-gateway";

export const runtime = "nodejs";

export async function POST() {
  try {
    const portOpen = await isIbkrGatewayPortOpen();
    if (portOpen) {
      console.log("IBKR Gateway already running on port 5000");
      return NextResponse.json({ 
        ok: true, 
        alreadyRunning: true, 
        message: "IBKR Gateway sudah aktif di port 5000. Buka portal untuk login." 
      });
    }

    const batchPath = join(IBKR_GATEWAY_BIN_DIR, IBKR_GATEWAY_BATCH);
    if (!existsSync(batchPath)) {
      console.error(`Batch file not found: ${batchPath}`);
      return NextResponse.json(
        { 
          error: `File startup IBGateway tidak ditemukan: ${batchPath}\n\nPastikan IBGateway sudah diunduh di folder:\nC:\\laragon\\www\\aegis\\ibkr-gateway\\` 
        }, 
        { status: 404 },
      );
    }

    console.log(`Attempting to start IBKR Gateway from: ${batchPath}`);
    const child = spawn("cmd.exe", ["/c", "start", "/B", IBKR_GATEWAY_BATCH], {
      cwd: IBKR_GATEWAY_BIN_DIR,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();

    console.log("IBKR Gateway process spawned, waiting for port to open...");
    
    // Try to detect if the process actually started by waiting a bit
    let attempts = 0;
    let started = false;
    while (attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (await isIbkrGatewayPortOpen()) {
        started = true;
        break;
      }
      attempts++;
    }

    if (started) {
      return NextResponse.json({
        ok: true,
        alreadyRunning: false,
        message: "IBKR Gateway sudah siap. Buka portal dan login dengan akun Anda.",
      });
    }

    return NextResponse.json({
      ok: true,
      alreadyRunning: false,
      message: "IBKR Gateway sedang dinyalakan. Tunggu 5-10 detik hingga portal bisa diakses. Jika portal tidak buka, periksa folder C:\\laragon\\www\\aegis\\ibkr-gateway\\bin\\",
    });
  } catch (error) {
    console.error("Failed to start IBKR Gateway:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? `Gagal menjalankan IBKR Gateway: ${error.message}\n\nCoba jalankan secara manual: C:\\laragon\\www\\aegis\\ibkr-gateway\\bin\\run.bat` 
          : "Gagal menyalakan IBKR Gateway." 
      },
      { status: 500 },
    );
  }
}
