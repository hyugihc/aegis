import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AnalyzeBody = {
  provider: "gemini" | "claude" | "openai" | "disabled";
  apiKey: string;
  model: string;
  prompt: string;
  portfolio: unknown;
};

function buildPrompt(body: AnalyzeBody) {
  return [
    "Kamu adalah analis Decision Support System untuk portofolio pribadi.",
    "Balas dalam Bahasa Indonesia, ringkas, data-driven, dan actionable.",
    "Bahas strengths, weaknesses, rebalancing, DCA bulan ini, risk monitor, dan 3 action items.",
    "",
    `Instruksi user: ${body.prompt}`,
    "",
    `Data snapshot JSON: ${JSON.stringify(body.portfolio)}`,
  ].join("\n");
}

async function callGemini(body: AnalyzeBody) {
  const model = body.model || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(body) }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 900 },
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "Gemini request failed");
  return json.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
}

async function callOpenAi(body: AnalyzeBody) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${body.apiKey}` },
    body: JSON.stringify({
      model: body.model || "gpt-4o-mini",
      temperature: 0.35,
      messages: [{ role: "user", content: buildPrompt(body) }],
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "OpenAI request failed");
  return json.choices?.[0]?.message?.content ?? "";
}

async function callClaude(body: AnalyzeBody) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": body.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model || "claude-sonnet-4-20250514",
      max_tokens: 900,
      temperature: 0.35,
      messages: [{ role: "user", content: buildPrompt(body) }],
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "Claude request failed");
  return json.content?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    if (!body.apiKey || body.provider === "disabled") {
      return NextResponse.json({ error: "AI provider belum dikonfigurasi." }, { status: 400 });
    }

    const analysis =
      body.provider === "gemini" ? await callGemini(body) :
      body.provider === "openai" ? await callOpenAi(body) :
      await callClaude(body);

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI analysis failed." }, { status: 500 });
  }
}
