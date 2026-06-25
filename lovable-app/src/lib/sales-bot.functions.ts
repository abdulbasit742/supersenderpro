import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

const BotConfigSchema = z.object({
  enabled:        z.boolean().optional(),
  greeting:       z.string().max(1000).optional(),
  tone:           z.enum(["formal_urdu", "casual_urdu", "english", "mixed"]).optional(),
  handoffKeywords:z.array(z.string()).max(20).optional(),
  paymentJazzCash:z.string().max(20).optional(),
  paymentEasyPaisa:z.string().max(20).optional(),
  paymentBank:    z.string().max(100).optional(),
  enabledCategories: z.array(z.string()).optional(),
  enabledProductIds: z.array(z.string()).optional(),
  businessHours:  z.object({
    enabled: z.boolean(),
    open:    z.string().max(5),
    close:   z.string().max(5),
  }).optional(),
  enabledFlowIds: z.array(z.string()).optional(),
});

export type BotConfig = z.infer<typeof BotConfigSchema>;

export const getSalesBotConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();
    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    return (settings.salesBot ?? {}) as BotConfig;
  });

export const saveSalesBotConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BotConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();

    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    const merged = { ...prev, salesBot: { ...(prev.salesBot as object ?? {}), ...data } };

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, settings: merged }, { onConflict: "user_id" });

    if (error) throw error;
    await logAuditEvent({ data: { action: "Sales bot config saved", targetType: "bot_config", severity: "info" } });
    return { ok: true };
  });

export const getSalesBotStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Pull today's bot-sourced orders (source = 'bot')
    const today = new Date().toISOString().slice(0, 10);
    const { data: orders } = await supabase
      .from("orders")
      .select("id, sell_price, status")
      .eq("user_id", userId)
      .eq("source", "bot")
      .gte("created_at", today);

    const botOrders = orders ?? [];
    const revenue = botOrders.reduce((s, o) => s + (Number(o.sell_price) || 0), 0);
    const confirmed = botOrders.filter((o) => o.status !== "pending" && o.status !== "cancelled").length;
    const convRate = botOrders.length > 0 ? Math.round((confirmed / botOrders.length) * 100) : 0;

    // Pull today's bot conversations (channel = 'whatsapp_bot')
    const { count: convCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", today);

    return {
      conversations: convCount ?? 0,
      orders: botOrders.length,
      revenue,
      conversionRate: convRate,
    };
  });

export const getBotConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("conversations")
      .select("id, customer_name, phone, status, last_message, intent, created_at, revenue")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
