import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const logAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        action: z.string(),
        target: z.string().optional(),
        targetType: z.string().optional(),
        severity: z.enum(["info", "success", "warning", "destructive", "muted"]).optional(),
        metadata: z.any().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const { error } = await (supabase as any).from("audit_events").insert({
      user_id: userId,
      user_name: profile?.display_name ?? "Unknown",
      action: data.action,
      target: data.target,
      target_type: data.targetType,
      severity: data.severity ?? "info",
      metadata: data.metadata ?? {},
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });


export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let query = (supabase as any)
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Check if user is admin — if not, filter to own events
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      query = query.eq("user_id", userId);
    }

    const { data: events, error } = await query;
    if (error) throw new Error(error.message);
    return events ?? [];
  });


export const getAuditStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    let query = (supabase as any).from("audit_events").select("severity", { count: "exact" });
    if (!roleData) {
      query = query.eq("user_id", userId);
    }

    const { data: rows, count } = await query;
    if (!rows) return { total: 0, breakdown: {} };

    const breakdown: Record<string, number> = {};
    for (const row of rows) {
      breakdown[row.severity] = (breakdown[row.severity] ?? 0) + 1;
    }

    return { total: count ?? 0, breakdown };
  });
