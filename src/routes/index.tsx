import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NutriAI — AI Nutrition & Calorie Tracker" },
      {
        name: "description",
        content:
          "NutriAI tracks calories and macros, scans meals from photos, builds diet plans and coaches you daily.",
      },
      { property: "og:title", content: "NutriAI — AI Nutrition & Calorie Tracker" },
      {
        property: "og:description",
        content: "NutriAI tracks calories and macros, scans meals from photos, builds diet plans and coaches you daily.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function init() {
      // Handle PKCE OAuth callback — Supabase returns ?code= after Google sign-in
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          console.error("OAuth code exchange failed:", error.message);
          navigate({ to: "/auth", replace: true });
          return;
        }
        // Remove ?code= from the URL without triggering a reload
        window.history.replaceState({}, "", "/");
      }

      // Normal session check
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      navigate({ to: data.session ? "/home" : "/auth", replace: true });
    }

    init();
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading NutriAI…</p>
      </div>
    </div>
  );
}

