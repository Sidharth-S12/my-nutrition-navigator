import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/shared/widgets/states";
import { supabase } from "@/integrations/supabase/client";
import {
  clearCoachMessages,
  listCoachMessages,
  saveCoachMessage,
} from "@/core/services/content-service";
import { getDaySummary } from "@/core/services/nutrition-service";
import { todayISO } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach | NutriAI" },
      {
        name: "description",
        content:
          "Ask NutriAI's coach about meals, macros, training and habits — with photo support.",
      },
      { property: "og:title", content: "AI Coach | NutriAI" },
      {
        property: "og:description",
        content: "Chat with a nutrition coach that knows what you ate today.",
      },
    ],
  }),
  component: CoachPage,
});

type Bubble = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I eat for dinner tonight?",
  "How do I hit my protein goal?",
  "Is my calorie target right for fat loss?",
];

function CoachPage() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const history = useQuery({ queryKey: ["coach-messages"], queryFn: listCoachMessages });
  const summary = useQuery({
    queryKey: ["day-summary", todayISO()],
    queryFn: () => getDaySummary(),
  });

  const messages: Bubble[] = [
    ...(history.data ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    ...pending,
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, draft]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setStreaming(true);
    setDraft("");
    const userBubble: Bubble = { role: "user", content: trimmed };
    setPending([userBubble]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");

      const s = summary.data;
      const context = s
        ? `Today: ${Math.round(s.consumed.calories)}/${s.goal.calories} kcal, protein ${Math.round(s.consumed.protein)}/${s.goal.protein} g, water ${s.waterMl}/${s.goal.waterMl} ml.`
        : undefined;

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [...messages, userBubble].map((m) => ({ role: m.role, content: m.content })),
          imageDataUrl: image,
          context,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error((await response.text()) || "The coach is unavailable right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setDraft(full);
      }

      await saveCoachMessage("user", trimmed);
      await saveCoachMessage("assistant", full);
      setImage(null);
      setDraft("");
      setPending([]);
      await queryClient.invalidateQueries({ queryKey: ["coach-messages"] });
    } catch (error) {
      setPending([]);
      setDraft("");
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setStreaming(false);
    }
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <header className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Coach</h1>
          <p className="text-xs text-muted-foreground">Knows today's numbers</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Clear conversation"
          onClick={async () => {
            await clearCoachMessages();
            queryClient.invalidateQueries({ queryKey: ["coach-messages"] });
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !draft ? (
          <div className="space-y-3">
            <EmptyState
              title="Ask your coach anything"
              description="Meals, macros, training or habits — with photos if you like."
            />
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="panel w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {draft ? <MessageBubble role="assistant" content={draft} /> : null}
        {streaming && !draft ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </div>
        ) : null}
      </div>

      <div className="border-t border-border p-3">
        {image ? (
          <div className="mb-2 flex items-center gap-2">
            <img src={image} alt="Attached" className="size-12 rounded-md object-cover" />
            <button
              className="text-xs font-medium text-muted-foreground underline"
              onClick={() => setImage(null)}
            >
              Remove
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Attach photo"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
          </Button>
          <Textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your nutrition…"
            className="max-h-32 min-h-10 flex-1 resize-none"
          />
          <Button
            size="icon"
            aria-label="Send message"
            disabled={streaming || !input.trim()}
            onClick={() => send(input)}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: Bubble) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "prose-chat max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
        }
      >
        {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
    </div>
  );
}
