import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — SuperSender Publisher" },
      { name: "description", content: "Sign in to publish to all your social channels from one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/publisher" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { emailRedirectTo: window.location.origin + "/publisher", data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Account created. Aap sign in ho gaye.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
      nav({ to: "/publisher" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/publisher" });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (r.redirected) return;
    nav({ to: "/publisher" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Social Publisher</h1>
        <p className="text-sm text-muted-foreground mb-5">Aik composer — sab platforms par publish.</p>

        <button onClick={google} disabled={busy} className="w-full h-10 rounded-md bg-white text-black font-medium hover:bg-white/90 mb-3">
          Continue with Google
        </button>
        <div className="text-center text-xs text-muted-foreground my-3">— or —</div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          )}
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <input type="password" required minLength={6} value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <button disabled={busy} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 inline-flex items-center justify-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")} className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center">
          {mode === "signin" ? "Account nahi? Sign up" : "Already have account? Sign in"}
        </button>
      </div>
    </div>
  );
}
