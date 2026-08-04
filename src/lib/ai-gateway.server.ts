export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

type ProviderConfig = {
  url: string;
  key: string;
  model: string;
  headerName?: string;
};

function isVisionRequest(body: Record<string, unknown>): boolean {
  const str = JSON.stringify(body);
  return str.includes("image_url") || str.includes("data:image");
}

function isValidKey(key: string | undefined, provider: "gemini" | "openai" | "openrouter" | "lovable" | "groq"): boolean {
  if (!key || typeof key !== "string" || key.trim() === "") return false;
  const k = key.trim();
  if (provider === "gemini") {
    // Google Gemini API keys start with AIzaSy
    return k.startsWith("AIzaSy") || (!k.startsWith("AQ.") && !k.startsWith("gsk_") && k.length > 25);
  }
  if (provider === "lovable") {
    return k.startsWith("sk_");
  }
  if (provider === "groq") {
    return k.startsWith("gsk_");
  }
  if (provider === "openrouter") {
    return k.startsWith("sk-or-");
  }
  if (provider === "openai") {
    return k.startsWith("sk-");
  }
  return true;
}

function getAvailableProviders(hasVision: boolean): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // For vision requests (photo scanning), prioritize vision-capable models
  if (hasVision) {
    if (isValidKey(process.env.GEMINI_API_KEY, "gemini")) {
      providers.push({
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: process.env.GEMINI_API_KEY!,
        model: "gemini-2.0-flash",
      });
    }
    if (isValidKey(process.env.OPENAI_API_KEY, "openai")) {
      providers.push({
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY!,
        model: "gpt-4o-mini",
      });
    }
    if (isValidKey(process.env.OPENROUTER_API_KEY, "openrouter")) {
      providers.push({
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-lite-001:free",
      });
    }
    if (isValidKey(process.env.LOVABLE_API_KEY, "lovable")) {
      providers.push({
        url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        key: process.env.LOVABLE_API_KEY!,
        model: "google/gemini-2.5-flash",
        headerName: "Lovable-API-Key",
      });
    }
  } else {
    // For text-only requests (coach chat, diet plans), prioritize Groq
    if (isValidKey(process.env.GROQ_API_KEY, "groq")) {
      providers.push({
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: process.env.GROQ_API_KEY!,
        model: "llama-3.3-70b-versatile",
      });
    }
    if (isValidKey(process.env.GEMINI_API_KEY, "gemini")) {
      providers.push({
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: process.env.GEMINI_API_KEY!,
        model: "gemini-2.0-flash",
      });
    }
    if (isValidKey(process.env.OPENROUTER_API_KEY, "openrouter")) {
      providers.push({
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY!,
        model: "meta-llama/llama-3.3-70b-instruct:free",
      });
    }
    if (isValidKey(process.env.OPENAI_API_KEY, "openai")) {
      providers.push({
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY!,
        model: "gpt-4o-mini",
      });
    }
    if (isValidKey(process.env.LOVABLE_API_KEY, "lovable")) {
      providers.push({
        url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        key: process.env.LOVABLE_API_KEY!,
        model: "google/gemini-2.5-flash",
        headerName: "Lovable-API-Key",
      });
    }
  }

  return providers;
}

export function requireApiKey(): string {
  const providers = getAvailableProviders(false);
  if (providers.length === 0) {
    throw new Error(
      "AI is not configured yet. Please set GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in .env.",
    );
  }
  return providers[0].key;
}

export async function callGateway(
  body: Record<string, unknown>,
  _apiKey?: string,
): Promise<Response> {
  const hasVision = isVisionRequest(body);
  const providers = getAvailableProviders(hasVision);

  if (providers.length === 0) {
    if (hasVision) {
      throw new Error(
        "Photo scanning requires a vision-capable AI key like GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY.",
      );
    }
    throw new Error("No AI API key configured.");
  }

  let lastResponse: Response | null = null;
  let lastErrorText = "";

  for (const provider of providers) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (provider.headerName) {
        headers[provider.headerName] = provider.key;
      } else {
        headers["Authorization"] = `Bearer ${provider.key}`;
      }

      const res = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: provider.model, ...body }),
      });

      if (res.ok) return res;

      lastResponse = res;
      lastErrorText = await res.text().catch(() => "");
      console.warn(
        `[AI Provider ${provider.url} failed ${res.status}] ${lastErrorText.slice(0, 200)}`,
      );
    } catch (err) {
      console.warn(`[AI Provider ${provider.url} fetch error]`, err);
    }
  }

  return lastResponse
    ? new Response(lastErrorText, {
        status: lastResponse.status,
        headers: { "Content-Type": "text/plain" },
      })
    : new Response("AI service unavailable", { status: 500 });
}

export function gatewayError(status: number, text: string): Error {
  if (status === 429) return new Error("Too many AI requests right now. Try again in a moment.");
  if (status === 402) return new Error("AI credits are exhausted.");
  if (
    status === 401 ||
    (status === 400 && (text.includes("API key") || text.includes("unauthorized")))
  ) {
    return new Error("Invalid AI API key. Please check your API key settings in Vercel.");
  }
  console.error(`[ai-gateway ${status}] ${text}`);
  return new Error("The AI service could not complete this request.");
}

export async function completeJSON<T>(messages: ChatMessage[]): Promise<T> {
  const response = await callGateway({
    messages,
    response_format: { type: "json_object" },
  });

  if (!response.ok) throw gatewayError(response.status, await response.text());

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("[ai-gateway] unparsable response", content.slice(0, 400));
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}
