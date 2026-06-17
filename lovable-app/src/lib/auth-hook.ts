import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "moderator" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadRoles(uid: string | null) {
      if (!uid) { setRoles([]); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!alive) return;
      setRoles((data ?? []).map((r: any) => r.role as Role));
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid deadlock
      setTimeout(() => loadRoles(s?.user?.id ?? null), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id ?? null).finally(() => alive && setLoading(false));
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const isAdmin = roles.includes("admin");

  return {
    session,
    user,
    roles,
    isAdmin,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    },
  };
}
