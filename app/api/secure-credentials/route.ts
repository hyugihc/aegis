import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SecureCredentialType = "price_service" | "auto_portfolio" | "ai_service";

type SaveBody = {
  action: "save";
  type: SecureCredentialType;
  connectionId: string;
  credentials: Record<string, string>;
};

type GetBody = {
  action: "get";
  type: SecureCredentialType;
  connectionId: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function credentialSecret() {
  const secret = process.env.AEGIS_CREDENTIAL_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AEGIS_CREDENTIAL_SECRET must be set to at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

function encodeTokenSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/gi, "%252F");
}

function documentId(type: SecureCredentialType, connectionId: string) {
  return `${type}_${connectionId}`;
}

function userIdFromBearerToken(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { sub?: string; user_id?: string; email?: string };
    const email = claims.email;
    const userId = email ?? claims.user_id ?? claims.sub;
    const fallbackUid = claims.user_id ?? claims.sub;
    return userId ? { token, userId, fallbackUid } : null;
  } catch {
    return null;
  }
}

function encryptCredentials(credentials: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialSecret(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decryptCredentials(payload: Record<string, string>) {
  const decipher = createDecipheriv("aes-256-gcm", credentialSecret(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as Record<string, string>;
}

function firestoreString(value: string): FirestoreValue {
  return { stringValue: value };
}

function firestoreCredentialPayload(payload: Record<string, string>): FirestoreValue {
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, firestoreString(value)])),
    },
  };
}

function firestoreUrl(userId: string, type: SecureCredentialType, connectionId: string) {
  const docId = documentId(type, connectionId);
  return `${FIRESTORE_BASE}/users/${encodeTokenSegment(userId)}/aegis_secure_credentials/${encodeTokenSegment(docId)}`;
}

async function saveCredentials(body: SaveBody, token: string, userId: string) {
  const encrypted = encryptCredentials(body.credentials);
  const response = await fetch(firestoreUrl(userId, body.type, body.connectionId), {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        type: firestoreString(body.type),
        connectionId: firestoreString(body.connectionId),
        encrypted: firestoreCredentialPayload(encrypted),
        updatedAt: firestoreString(new Date().toISOString()),
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    console.error("Failed to save secure credentials:", payload);
    return NextResponse.json({ error: "Failed to save secure credentials." }, { status: response.status });
  }

  return NextResponse.json({ ok: true });
}

async function getCredentials(body: GetBody, token: string, userId: string, fallbackUid?: string) {
  let response = await fetch(firestoreUrl(userId, body.type, body.connectionId), {
    headers: { authorization: `Bearer ${token}` },
  });

  if (response.status === 404 && fallbackUid && fallbackUid !== userId) {
    const fallbackResponse = await fetch(firestoreUrl(fallbackUid, body.type, body.connectionId), {
      headers: { authorization: `Bearer ${token}` },
    });
    if (fallbackResponse.ok) {
      response = fallbackResponse;
    }
  }

  if (response.status === 404) {
    return NextResponse.json({ credentials: null });
  }

  if (!response.ok) {
    const payload = await response.text();
    console.error("Failed to load secure credentials:", payload);
    return NextResponse.json({ error: "Failed to load secure credentials." }, { status: response.status });
  }

  const document = (await response.json()) as {
    fields?: {
      encrypted?: {
        mapValue?: {
          fields?: Record<string, { stringValue?: string }>;
        };
      };
    };
  };

  const encryptedFields = document.fields?.encrypted?.mapValue?.fields;
  if (!encryptedFields?.ciphertext?.stringValue || !encryptedFields.iv?.stringValue || !encryptedFields.tag?.stringValue) {
    return NextResponse.json({ credentials: null });
  }

  const credentials = decryptCredentials({
    ciphertext: encryptedFields.ciphertext.stringValue,
    iv: encryptedFields.iv.stringValue,
    tag: encryptedFields.tag.stringValue,
  });

  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  const auth = userIdFromBearerToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveBody | GetBody;
    if (!body.type || !body.connectionId) {
      return NextResponse.json({ error: "Invalid secure credential request." }, { status: 400 });
    }

    if (body.action === "save") {
      return saveCredentials(body, auth.token, auth.userId);
    }

    if (body.action === "get") {
      return getCredentials(body, auth.token, auth.userId, auth.fallbackUid);
    }

    return NextResponse.json({ error: "Unsupported secure credential action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Secure credential request failed.";
    console.error(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
