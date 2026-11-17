import { NextRequest, NextResponse } from "next/server";
import { AEGIS_MCP_TOOLS, executeAegisTool } from "@/lib/mcp/tools";
import { getAdminFirestore } from "@/lib/mcp/firebase-admin";
import { getPortfolioForUser } from "@/lib/mcp/portfolio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standard CORS headers for Claude Web and Remote MCP clients
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-User-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function resolveUserAndAuth(request: NextRequest): Promise<{ authenticated: boolean; userId: string; error?: string }> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const xApiKey = request.headers.get("x-api-key");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("key") || url.searchParams.get("apiKey");
  const queryUserId = url.searchParams.get("userId") || request.headers.get("x-user-id");

  const providedToken = bearerToken || xApiKey || queryToken;
  const configuredSecret = process.env.AEGIS_MCP_API_KEY;
  const defaultUserId = process.env.AEGIS_DEFAULT_USER_ID;
  const candidateUserId = queryUserId || defaultUserId;
  const adminDb = getAdminFirestore();

  // 1. If AEGIS_MCP_API_KEY is configured in Vercel environment variables
  if (configuredSecret) {
    if (!providedToken) {
      return {
        authenticated: false,
        userId: "",
        error: "Missing API key. Provide via 'Authorization: Bearer <key>', 'x-api-key', or '?key=<key>'.",
      };
    }
    if (providedToken !== configuredSecret) {
      return {
        authenticated: false,
        userId: "",
        error: "Invalid API key provided.",
      };
    }
    if (!candidateUserId) {
      return {
        authenticated: false,
        userId: "",
        error: "Authenticated successfully, but no userId provided. Add '?userId=<your_firebase_uid>' to the URL or set AEGIS_DEFAULT_USER_ID in Vercel.",
      };
    }
    return { authenticated: true, userId: candidateUserId };
  }

  // 2. If token is provided and Admin Firestore is available, verify against user profiles
  if (providedToken && adminDb) {
    try {
      if (candidateUserId) {
        const snap = await adminDb.collection("users").doc(candidateUserId).collection("aegis_profile").doc("main").get();
        if (snap.exists) {
          const profileData = snap.data();
          const userMcpKey = profileData?.settings?.mcp?.apiKey;
          if (userMcpKey && userMcpKey === providedToken) {
            return { authenticated: true, userId: candidateUserId };
          }
        }
      }

      // If no candidateUserId was provided or not yet matched, scan user profiles
      const usersSnap = await adminDb.collection("users").limit(20).get();
      for (const uDoc of usersSnap.docs) {
        const profileSnap = await uDoc.ref.collection("aegis_profile").doc("main").get();
        if (profileSnap.exists) {
          const profileData = profileSnap.data();
          const userMcpKey = profileData?.settings?.mcp?.apiKey;
          if (userMcpKey && userMcpKey === providedToken) {
            return { authenticated: true, userId: uDoc.id };
          }
        }
      }

      // If only 1 user exists in Firestore and token was provided, associate with that user
      if (usersSnap.docs.length === 1) {
        return { authenticated: true, userId: usersSnap.docs[0].id };
      }
    } catch (err) {
      console.warn("[Aegis MCP] Firestore key validation error:", err);
    }
  }

  // 3. If candidateUserId is provided along with providedToken
  if (candidateUserId && providedToken) {
    return {
      authenticated: true,
      userId: candidateUserId,
    };
  }

  // 4. If candidateUserId is provided (e.g. personal portfolio link)
  if (candidateUserId) {
    return {
      authenticated: true,
      userId: candidateUserId,
    };
  }

  return {
    authenticated: false,
    userId: "",
    error: "Authentication required. Please include '?userId=<your_uid>' in the URL (copy directly from Aegis Settings -> Claude / MCP) or set AEGIS_DEFAULT_USER_ID and AEGIS_MCP_API_KEY in Vercel.",
  };
}

// GET: Supports SSE transport negotiation & browser healthcheck
export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") || "";
  const isSse = acceptHeader.includes("text/event-stream") || request.nextUrl.searchParams.get("transport") === "sse";

  if (isSse) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const url = new URL(request.url);
    const postEndpoint = `${url.pathname}?sessionId=${sessionId}${url.search ? `&${url.search.slice(1)}` : ""}`;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Emit the MCP endpoint event
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`));
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Regular browser inspection / health check response
  const auth = await resolveUserAndAuth(request);
  const hasFirebaseAdmin = Boolean(getAdminFirestore());

  let snapshotDebug: { latestSnapshotDate?: string; snapshotsCount?: number } = {};
  if (auth.authenticated && auth.userId) {
    try {
      const p = await getPortfolioForUser(auth.userId);
      snapshotDebug = {
        latestSnapshotDate: p.snapshots[0]?.date || "None",
        snapshotsCount: p.snapshots.length,
      };
    } catch {
      // Ignore if error during debug query
    }
  }

  return NextResponse.json(
    {
      name: "Aegis Investment Portfolio MCP Server",
      version: "1.0.0",
      protocol: "Model Context Protocol (JSON-RPC 2.0)",
      status: "online",
      serverless: "Vercel Native",
      authStatus: {
        authenticated: auth.authenticated,
        activeUserId: auth.authenticated ? auth.userId : null,
        firebaseAdminConfigured: hasFirebaseAdmin,
        ...snapshotDebug,
      },
      availableTools: AEGIS_MCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      usage: {
        claudeWebUrl: request.url.split("?")[0],
        supportedTransports: ["HTTP (Streamable / Direct JSON-RPC)", "Server-Sent Events (SSE)"],
        headers: {
          "Authorization": "Bearer <YOUR_AEGIS_MCP_API_KEY>",
          "Content-Type": "application/json",
        },
      },
    },
    { headers: corsHeaders },
  );
}

// POST: Main MCP JSON-RPC 2.0 handler
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON." },
      },
      { status: 400, headers: corsHeaders },
    );
  }

  // Handle single request or batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((req) => handleSingleRpcRequest(req, request)));
    return NextResponse.json(responses, { headers: corsHeaders });
  }

  const response = await handleSingleRpcRequest(body, request);
  if (!response) {
    // For notifications (no id)
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  return NextResponse.json(response, { headers: corsHeaders });
}

async function handleSingleRpcRequest(rpc: any, request: NextRequest) {
  const { id, method, params } = rpc || {};

  // If this is a notification (e.g. notifications/initialized), no response required
  if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return null;
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "aegis-mcp-server",
          version: "1.0.0",
        },
      },
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: AEGIS_MCP_TOOLS,
      },
    };
  }

  if (method === "tools/call") {
    const auth = await resolveUserAndAuth(request);
    if (!auth.authenticated) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Authentication failed: ${auth.error || "Unauthorized"}`,
            },
          ],
          isError: true,
        },
      };
    }

    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    const targetUserId = toolArgs.userId || auth.userId;

    const execution = await executeAegisTool(toolName, toolArgs, targetUserId);

    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: execution.text,
          },
        ],
        isError: execution.isError ?? false,
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method '${method}' not found.`,
    },
  };
}
