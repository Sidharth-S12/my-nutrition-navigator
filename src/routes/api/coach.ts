import { createFileRoute } from "@tanstack/react-router";

type IncomingMessage = { role: "user" | "assistant"; content: string };
type Body = { messages?: IncomingMessage[]; imageDataUrl?: string | null; context?: string };

const SYSTEM_PROMPT = `You are NutriAI Coach, a pragmatic nutrition and fitness coach inside a food tracking app.
Answer in short, structured markdown. Be specific with numbers and portions.
Never give medical diagnoses; suggest seeing a clinician for medical concerns.`;

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const authClient = createClient(supabaseUrl, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              headers.delete("Authorization");
              headers.set("apikey", publishableKey);
              return fetch(input, { ...init, headers });
            },
          },
        });
        const token = authHeader.slice(7);
        const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as Body;
        const history = (body.messages ?? []).slice(-20);
        if (history.length === 0) return new Response("No messages", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const messages: Array<Record<string, unknown>> = [
          {
            role: "system",
            content: SYSTEM_PROMPT + (body.context ? `\n\nUser context: ${body.context}` : ""),
          },
          ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        ];

        const last = history[history.length - 1]!;
        messages.push(
          body.imageDataUrl
            ? {
                role: "user",
                content: [
                  { type: "text", text: last.content || "What is in this photo?" },
                  { type: "image_url", image_url: { url: body.imageDataUrl } },
                ],
              }
            : { role: "user", content: last.content },
        );

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({ model: "google/gemini-3.6-flash", messages, stream: true }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          console.error(`[coach ${upstream.status}] ${text}`);
          const message =
            upstream.status === 429
              ? "Too many requests. Please wait a moment."
              : upstream.status === 402
                ? "AI credits are exhausted."
                : "The coach is unavailable right now.";
          return new Response(message, { status: upstream.status || 500 });
        }

        // Convert the upstream SSE into a plain text stream of deltas.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                /* partial frame, ignore */
              }
            }
          },
        });

        return new Response(upstream.body.pipeThrough(stream), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
