import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";


export const getUserSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return (data?.settings as Record<string, string>) ?? {};
  });

export const saveUserSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.record(z.string(), z.string()).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, settings: data }, { onConflict: "user_id" });

    if (error) throw error;
    await logAuditEvent({ data: { action: "Settings saved", target: userId, targetType: "user_settings", severity: "info" } });
    return { ok: true };
  });
