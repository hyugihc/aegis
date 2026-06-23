import { spawn } from "child_process";
import { existsSync } from "fs";
import { NextResponse } from "next/server";
import {
  IBKR_GATEWAY_BATCH,
  IBKR_GATEWAY_CONFIG,
  IBKR_GATEWAY_DIR,
  getIbkrGatewayBatchPath,
  getIbkrGatewayConfigPath,
  getIbkrGatewayDiagnostics,
  isIbkrGatewayPortOpen,
} from "@/lib/ibkr-gateway";

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

    const batchPath = getIbkrGatewayBatchPath();
    const configPath = getIbkrGatewayConfigPath();
    if (!existsSync(batchPath)) {
      const diagnostics = getIbkrGatewayDiagnostics();
      console.error("IBKR Gateway batch file not found:", diagnostics);
      return NextResponse.json(
        { 
          error: `File startup IBGateway tidak ditemukan: ${batchPath}\n\nPastikan IBGateway sudah diunduh di folder:\nC:\\laragon\\www\\aegis\\ibkr-gateway\\\n\nDebug:\n- cwd: ${diagnostics.cwd}\n- platform: ${diagnostics.platform}\n- path dicek: ${diagnostics.candidateBatchPaths.join(", ")}`,
        }, 
        { status: 404 },
      );
    }
    if (!existsSync(configPath)) {
      const diagnostics = getIbkrGatewayDiagnostics();
      console.error("IBKR Gateway config file not found:", diagnostics);
      return NextResponse.json(
        {
          error: `File konfigurasi IBGateway tidak ditemukan: ${configPath}\n\nPastikan file root\\conf.yaml tersedia di folder gateway.\n\nDebug:\n- cwd: ${diagnostics.cwd}\n- path batch: ${diagnostics.resolvedBatchPath}\n- path config: ${diagnostics.resolvedConfigPath}`,
        },
        { status: 404 },
      );
    }

    console.log(`Attempting to start IBKR Gateway from: ${batchPath} ${IBKR_GATEWAY_CONFIG}`);
    const child = spawn("cmd.exe", ["/d", "/c", `bin\\${IBKR_GATEWAY_BATCH}`, IBKR_GATEWAY_CONFIG], {
      cwd: IBKR_GATEWAY_DIR,
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
      message: "IBKR Gateway sedang dinyalakan. Tunggu 5-10 detik hingga portal bisa diakses. Jika portal tidak buka, jalankan manual: C:\\laragon\\www\\aegis\\ibkr-gateway\\bin\\run.bat C:\\laragon\\www\\aegis\\ibkr-gateway\\root\\conf.yaml",
    });
  } catch (error) {
    console.error("Failed to start IBKR Gateway:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? `Gagal menjalankan IBKR Gateway: ${error.message}\n\nCoba jalankan secara manual dari C:\\laragon\\www\\aegis\\ibkr-gateway: bin\\run.bat root\\conf.yaml` 
          : "Gagal menyalakan IBKR Gateway." 
      },
      { status: 500 },
    );
  }
}
