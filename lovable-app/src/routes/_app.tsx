import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { X, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { AIAssistant } from "@/components/ai-assistant";
import { CommandPalette } from "@/components/command-palette";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hook";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } as never });
    }
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (error || !isAdmin) {
      throw redirect({ to: "/unauthorized" });
    }
  },
  component: AppLayout,
  errorComponent: LayoutError,
});

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, user } = useAuth();

  if (loading && !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen overflow-hidden">
        <AppSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-full shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute -right-10 top-2 h-8 w-8 grid place-items-center bg-card rounded-md z-10"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <AIAssistant />
      <CommandPalette />
    </div>
  );
}

function LayoutError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-destructive/15 grid place-items-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-secondary text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
