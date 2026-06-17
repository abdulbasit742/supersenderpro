import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";


export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.display_name ?? "—",
      email: "",
      role: p.user_roles?.[0]?.role ?? "user",
      avatar_url: p.avatar_url,
      created_at: p.created_at,
    }));
  });

export const updateTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Upsert role
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });

    if (error) throw error;
    await logAuditEvent({ data: { action: "Team role updated", target: data.userId, targetType: "user_role", severity: "info", metadata: { newRole: data.role } } });
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", data.userId);
    if (error) throw error;
    await logAuditEvent({ data: { action: "Team member removed", target: data.userId, targetType: "user_role", severity: "destructive" } });
    return { ok: true };
  });
