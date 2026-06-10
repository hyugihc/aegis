import { firebaseAuth } from "@/lib/firebase";

export type SecureCredentialType = "price_service" | "auto_portfolio" | "ai_service";

async function secureCredentialRequest<T>(body: Record<string, unknown>) {
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Login diperlukan untuk menyimpan credentials aman.");
  }

  const response = await fetch("/api/secure-credentials", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error ?? "Secure credential request failed.");
  }

  return payload;
}

export async function saveSecureCredentials(type: SecureCredentialType, connectionId: string, credentials: Record<string, string>) {
  await secureCredentialRequest({ action: "save", type, connectionId, credentials });
}

export async function getSecureCredentials(type: SecureCredentialType, connectionId: string) {
  const result = await secureCredentialRequest<{ credentials: Record<string, string> | null }>({
    action: "get",
    type,
    connectionId,
  });
  return result.credentials;
}
