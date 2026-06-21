import { execFile } from "child_process";
import { existsSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { promisify } from "util";
import https from "https";
import { URL } from "url";

export const IBKR_GATEWAY_BASE_URL = "https://localhost:5000";
export const IBKR_GATEWAY_BATCH = "run.bat";
export const IBKR_GATEWAY_CONFIG = "root\\conf.yaml";
export const IBKR_GATEWAY_DIR =
  process.env.IBKR_GATEWAY_DIR ?? resolve(process.cwd(), "ibkr-gateway");
export const IBKR_GATEWAY_BIN_DIR = resolveGatewayBinDir();

const execFileAsync = promisify(execFile);

type IbkrGatewayError = Error & { statusCode?: number };

function resolveGatewayBinDir() {
  const configuredDir = process.env.IBKR_GATEWAY_BIN_DIR;
  const candidates = [
    configuredDir,
    join(IBKR_GATEWAY_DIR, "bin"),
    resolve(process.cwd(), "ibkr-gateway", "bin"),
    "C:\\laragon\\www\\aegis\\ibkr-gateway\\bin",
  ].filter((path): path is string => Boolean(path));

  return candidates.find((path) => existsSync(join(path, IBKR_GATEWAY_BATCH))) ?? candidates[0];
}

export function getIbkrGatewayBatchPath() {
  return join(IBKR_GATEWAY_BIN_DIR, IBKR_GATEWAY_BATCH);
}

export function getIbkrGatewayConfigPath() {
  return join(IBKR_GATEWAY_DIR, IBKR_GATEWAY_CONFIG);
}

export function getIbkrGatewayDiagnostics() {
  const candidateBinDirs = [
    process.env.IBKR_GATEWAY_BIN_DIR,
    join(IBKR_GATEWAY_DIR, "bin"),
    resolve(process.cwd(), "ibkr-gateway", "bin"),
    "C:\\laragon\\www\\aegis\\ibkr-gateway\\bin",
  ].filter((path): path is string => Boolean(path));

  const candidateBatchPaths = Array.from(
    new Set(candidateBinDirs.map((path) => join(path, IBKR_GATEWAY_BATCH))),
  );

  return {
    cwd: process.cwd(),
    platform: process.platform,
    configuredGatewayDir: process.env.IBKR_GATEWAY_DIR,
    configuredGatewayBinDir: process.env.IBKR_GATEWAY_BIN_DIR,
    resolvedBinDir: IBKR_GATEWAY_BIN_DIR,
    resolvedBatchPath: getIbkrGatewayBatchPath(),
    resolvedConfigPath: getIbkrGatewayConfigPath(),
    candidateBatchPaths,
    candidateExists: candidateBatchPaths.map((path) => ({
      path,
      exists: existsSync(path),
      isAbsolute: isAbsolute(path),
      directory: dirname(path),
    })),
  };
}

export function ibkrSessionCookieName(connectionId: string) {
  const safeId = connectionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `aegis_ibkr_session_${safeId}`;
}

export async function isIbkrGatewayPortOpen() {
  try {
    const { stdout } = await execFileAsync("netstat.exe", ["-ano", "-p", "tcp"], {
      timeout: 5_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return stdout
      .split(/\r?\n/)
      .some((line) => line.includes(":5000") && /\bLISTENING\b/i.test(line));
  } catch {
    return false;
  }
}

export async function fetchIbkrGateway<T>(
  baseUrl: string,
  path: string,
  sessionToken?: string,
  method: "GET" | "POST" = "GET",
): Promise<{
  payload: T;
  response: {
    headers: Record<string, string | string[] | undefined>;
    statusCode: number;
    get: (name: string) => string | string[] | undefined;
  };
}> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": baseUrl.replace(/\/$/, ""),
    "Referer": `${baseUrl.replace(/\/$/, "")}/`,
  };
  const body = method === "POST" ? "{}" : "";

  if (sessionToken) {
    headers.cookie = `JSESSIONID=${sessionToken}`;
  }
  if (body) {
    headers["content-length"] = String(Buffer.byteLength(body));
  }

  const url = `${baseUrl.replace(/\/$/, "")}/v1/api${path}`;
  const parsedUrl = new URL(url);
  
  // For self-signed certificates on localhost, set rejectUnauthorized to false
  const isLocalhost = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
      timeout: 15_000,
      rejectUnauthorized: !isLocalhost, // Allow self-signed certs on localhost
    };

    const request = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        let payload: unknown = null;
        if (data) {
          try {
            payload = JSON.parse(data);
          } catch {
            payload = data;
          }
        }

        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          const message = typeof payload === "object" && payload && "error" in payload
            ? String((payload as { error?: unknown }).error)
            : `IBKR Gateway error ${response.statusCode} from ${path}.`;
          
          const error: IbkrGatewayError = new Error(message);
          error.statusCode = response.statusCode;
          reject(error);
          return;
        }

        resolve({ 
          payload: payload as T, 
          response: {
            headers: response.headers,
            statusCode: response.statusCode,
            get: (name: string) => response.headers[name.toLowerCase()],
          },
        });
      });
    });

    request.on("error", (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      reject(new Error(`Failed to connect to ${url}: ${errorMsg}`));
    });

    request.on("timeout", () => {
      request.destroy();
      reject(new Error(`Request timeout to ${url}`));
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}
