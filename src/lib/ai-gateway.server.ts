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

function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // 1. Groq (14,400 requests/day FREE)
  if (process.env.GROQ_API_KEY) {
    providers.push({
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
    });
  }

  // 2. OpenRouter (Free models)
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: "meta-llama/llama-3.3-70b-instruct:free",
    });
  }

  // 3. OpenAI (gpt-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    });
  }

  // 4. Google Gemini
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash",
    });
  }

  // 5. Lovable Gateway
  if (process.env.LOVABLE_API_KEY) {
    providers.push({
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: process.env.LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash",
      headerName: "Lovable-API-Key",
    });
  }

  return providers;
}

export function requireApiKey(): string {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw new Error(
      "AI is not configured yet. Please set GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.",
    );
  }
  return providers[0].key;
}

export async function callGateway(
  body: Record<string, unknown>,
  _apiKey?: string,
): Promise<Response> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
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
      console.warn(`[AI Provider ${provider.url} failed ${res.status}] ${lastErrorText.slice(0, 200)}`);
    } catch (err) {
      console.warn(`[AI Provider ${provider.url} fetch error]`, err);
    }
  }

  return lastResponse ?? new Response("AI unavailable", { status: 500 });
}

export function gatewayError(status: number, text: string): Error {
  if (status === 429) return new Error("Too many AI requests right now. Try again in a moment.");
  if (status === 402) return new Error("AI credits are exhausted.");
  if (status === 401 || (status === 400 && (text.includes("API key") || text.includes("unauthorized")))) {
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
