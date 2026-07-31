const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const CHAT_MODEL = "google/gemini-3.6-flash";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export function requireApiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured yet.");
  return key;
}

export async function callGateway(
  body: Record<string, unknown>,
  apiKey: string,
): Promise<Response> {
  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({ model: CHAT_MODEL, ...body }),
  });
}

export function gatewayError(status: number, text: string): Error {
  if (status === 429) return new Error("Too many requests right now. Try again in a moment.");
  if (status === 402) return new Error("AI credits are exhausted. Add credits to continue.");
  console.error(`[ai-gateway ${status}] ${text}`);
  return new Error("The AI service could not complete this request.");
}

export async function completeJSON<T>(messages: ChatMessage[]): Promise<T> {
  const apiKey = requireApiKey();
  const response = await callGateway({ messages, response_format: { type: "json_object" } }, apiKey);
  if (!response.ok) throw gatewayError(response.status, await response.text());
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("[ai-gateway] unparsable response", content.slice(0, 400));
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}
