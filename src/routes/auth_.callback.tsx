import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically exchanges the code for a session in the background on the web.
    // We listen for the auth state change to know when it's done.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate({ to: "/home", replace: true });
      } else if (event === "SIGNED_OUT") {
        navigate({ to: "/auth", replace: true });
      }
    });

    // Fallback: check session immediately in case the exchange already happened
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) {
        navigate({ to: "/home", replace: true });
      } else if (error) {
        console.error("Auth callback error:", error.message);
        navigate({ to: "/auth", replace: true });
      }
    });

    // Also check for errors in the URL hash (e.g., email link expired)
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      const params = new URLSearchParams(hash.substring(1));
      console.error("Auth error:", params.get("error_description"));
      navigate({ to: "/auth", replace: true });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
