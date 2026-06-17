import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { X, Loader2 } from "lucide-react";
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
});

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, user } = useAuth();

  if (loading && !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <AppSidebar />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute -right-10 top-2 h-8 w-8 grid place-items-center bg-card rounded-md"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

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
