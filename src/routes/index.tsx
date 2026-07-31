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
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/home" : "/auth", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading NutriAI…</p>
    </div>
  );
}
