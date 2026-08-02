import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | NutriAI" },
      {
        name: "description",
        content: "Sign in or create your NutriAI account to track meals, macros and progress.",
      },
      { property: "og:title", content: "Sign in | NutriAI" },
      { property: "og:description", content: "Access your NutriAI nutrition dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        console.error("SignIn error:", error);
        return toast.error(error.message || JSON.stringify(error));
      }
      navigate({ to: "/home", replace: true });
    } catch (err: any) {
      setBusy(false);
      console.error("SignIn unexpected error:", err);
      toast.error(err?.message || "An unexpected error occurred during signin");
    }
  }

  async function signUp() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: name },
        },
      });
      setBusy(false);
      if (error) {
        console.error("SignUp error:", error);
        return toast.error(error.message || JSON.stringify(error));
      }
      if (!data.session) {
        setSent(true);
        return;
      }
      navigate({ to: "/home", replace: true });
    } catch (err: any) {
      setBusy(false);
      console.error("SignUp unexpected error:", err);
      toast.error(err?.message || "An unexpected error occurred during signup");
    }
  }

  async function google() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        let pageLoadedListener: any = null;
        let finishedListener: any = null;

        const cleanup = async () => {
          if (pageLoadedListener) await pageLoadedListener.remove();
          if (finishedListener) await finishedListener.remove();
        };

        // Listen for when Google redirect reaches our Vercel domain inside the browser sheet
        pageLoadedListener = await Browser.addListener("browserPageLoaded", async ({ url }) => {
          if (url.includes("code=") || url.includes("my-nutrition-navigator.vercel.app")) {
            await Browser.close();
            await cleanup();

            try {
              const urlObj = new URL(url);
              const code = urlObj.searchParams.get("code");
              if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                  toast.error("Sign-in error: " + error.message);
                  return;
                }
              }
              const { data } = await supabase.auth.getSession();
              if (data.session) {
                navigate({ to: "/home", replace: true });
              }
            } catch (e) {
              console.error("Error parsing callback URL:", e);
            }
          }
        });

        finishedListener = await Browser.addListener("browserFinished", async () => {
          await cleanup();
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            navigate({ to: "/home", replace: true });
          }
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/`,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          await cleanup();
          toast.error("Google sign-in failed: " + error.message);
          return;
        }

        if (data?.url) {
          await Browser.open({ url: data.url });
        }
      } catch (err: any) {
        console.error("Native Google login error:", err);
        toast.error("Failed to start Google sign in");
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error("Google sign-in failed: " + error.message);
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">NutriAI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track meals, scan food and get coaching that adapts to you.
        </p>
      </header>

      {sent ? (
        <div className="panel p-4">
          <p className="text-sm font-semibold">Check your email</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We sent a confirmation link to {email}. Confirm it, then sign in.
          </p>
          <Button variant="outline" className="mt-3 w-full" onClick={() => setSent(false)}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-3 pt-4">
            <EmailFields
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <Button className="w-full" disabled={busy || !email || !password} onClick={signIn}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <EmailFields
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <Button
              className="w-full"
              disabled={busy || !email || password.length < 6}
              onClick={signUp}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
            </Button>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={google}>
        Continue with Google
      </Button>
    </div>
  );
}

function EmailFields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </>
  );
}
