import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

// ─── Exported Types ────────────────────────────────────────────────────────────

export interface RenewalOrder {
  id: string;
  customer_name?: string;
  whatsapp?: string;
  tool: string;
  plan: string;
  sell_price: number;
  expiry_date: string;       // ISO date string
  days_left: number;         // computed: Math.ceil((expiry_date - now) / 86400000)
  renewal_status: "active" | "expiring_soon" | "expired" | "renewed";
  last_reminder_at?: string;
}

export interface RenewalStats {
  expiringToday: number;
  expiringWeek: number;
  renewedThisMonth: number;
  churnSavedPkr: number;     // sum of sell_price for renewals this month
  totalActive: number;
}

export interface RenewalConfig {
  reminderDays: number[];    // e.g. [3, 1, 0]
  messageTemplate: string;
  autoSend: boolean;
}

// ─── Internal row shape returned from the orders table ────────────────────────

interface OrderRow {
  id: string;
  customer_name: string | null;
  whatsapp: string | null;
  tool: string;
  plan: string;
  sell_price: number | null;
  expiry_date: string | null;
  renewal_status: string | null;
  last_reminder_at: string | null;
  status: string | null;
  created_at: string | null;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const RenewalConfigSchema = z.object({
  reminderDays: z.array(z.number().int().min(-30).max(60)),
  messageTemplate: z.string().min(1).max(2000),
  autoSend: z.boolean(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cast the user-scoped supabase client to an untyped client for tables not in generated types. */
function untyped(supabase: SupabaseClient): SupabaseClient<Record<string, unknown>> {
  return supabase as unknown as SupabaseClient<Record<string, unknown>>;
}

function computeDaysLeft(expiryDate: string): number {
  const now = Date.now();
  const exp = new Date(expiryDate).getTime();
  return Math.ceil((exp - now) / 86_400_000);
}

function computeRenewalStatus(daysLeft: number): RenewalOrder["renewal_status"] {
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 3) return "active";
  return "expiring_soon";
}

// ─── Server Functions ─────────────────────────────────────────────────────────

/**
 * GET — Returns orders that are expiring within the next 14 days
 * or have already expired in the last 3 days.
 */
export const getExpiringSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RenewalOrder[]> => {
    const { supabase, userId } = context;
    const db = untyped(supabase);

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 86_400_000).toISOString();
    const minus3Days = new Date(now.getTime() - 3 * 86_400_000).toISOString();

    const { data, error } = await db
      .from("orders")
      .select(
        "id, customer_name, whatsapp, tool, plan, sell_price, expiry_date, renewal_status, last_reminder_at, status",
      )
      .eq("user_id", userId)
      .in("status", ["delivered", "paid"])
      .not("expiry_date", "is", null)
      .lte("expiry_date", in14Days)
      .gte("expiry_date", minus3Days)
      .order("expiry_date", { ascending: true });

    if (error) throw new Error((error as { message: string }).message);

    const rows = (data ?? []) as OrderRow[];

    return rows.map((row): RenewalOrder => {
      const daysLeft = row.expiry_date ? computeDaysLeft(row.expiry_date) : 0;
      const statusFromDb = row.renewal_status;
      const renewal_status: RenewalOrder["renewal_status"] =
        statusFromDb === "renewed"
          ? "renewed"
          : computeRenewalStatus(daysLeft);

      return {
        id: row.id,
        customer_name: row.customer_name ?? undefined,
        whatsapp: row.whatsapp ?? undefined,
        tool: row.tool,
        plan: row.plan,
        sell_price: Number(row.sell_price ?? 0),
        expiry_date: row.expiry_date ?? "",
        days_left: daysLeft,
        renewal_status,
        last_reminder_at: row.last_reminder_at ?? undefined,
      };
    });
  });

/**
 * GET — Returns aggregated renewal statistics for the dashboard.
 */
export const getRenewalStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RenewalStats> => {
    const { supabase, userId } = context;
    const db = untyped(supabase);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Expiring today
    const { count: expiringToday } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["delivered", "paid"])
      .gte("expiry_date", todayStart)
      .lt("expiry_date", todayEnd);

    // Expiring within 7 days
    const { count: expiringWeek } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["delivered", "paid"])
      .gte("expiry_date", now.toISOString())
      .lte("expiry_date", weekEnd);

    // Renewed this month — fetch rows to sum sell_price
    const { data: renewedRows } = await db
      .from("orders")
      .select("sell_price")
      .eq("user_id", userId)
      .eq("renewal_status", "renewed")
      .gte("updated_at", monthStart)
      .lte("updated_at", monthEnd);

    const renewedList = (renewedRows ?? []) as Array<{ sell_price: number | null }>;
    const renewedThisMonth = renewedList.length;
    const churnSavedPkr = renewedList.reduce(
      (sum, row) => sum + Number(row.sell_price ?? 0),
      0,
    );

    // Total active (delivered/paid with future expiry)
    const { count: totalActive } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["delivered", "paid"])
      .gt("expiry_date", now.toISOString());

    return {
      expiringToday: expiringToday ?? 0,
      expiringWeek: expiringWeek ?? 0,
      renewedThisMonth,
      churnSavedPkr,
      totalActive: totalActive ?? 0,
    };
  });

/**
 * POST — Sends a WhatsApp renewal reminder for a specific order,
 * updates last_reminder_at, and logs an audit event.
 */
export const sendRenewalReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const db = untyped(supabase);

    // Fetch the order
    const { data: orderData, error: fetchErr } = await db
      .from("orders")
      .select(
        "id, customer_name, whatsapp, tool, plan, sell_price, expiry_date",
      )
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !orderData) {
      throw new Error("Order not found");
    }

    const order = orderData as OrderRow;
    const daysLeft = order.expiry_date ? computeDaysLeft(order.expiry_date) : 0;

    // Construct the reminder message
    const message = [
      `Assalam o Alaikum ${order.customer_name ?? ""}!`,
      `Aap ka ${order.tool} (${order.plan}) subscription ${daysLeft <= 0 ? "expire ho chuka hai" : `${daysLeft} din mein expire hone wala hai`}.`,
      `Renewal ke liye humse rabta karein. JazakAllah Khair!`,
    ]
      .join("\n")
      .trim();

    // Send WhatsApp message via internal API
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3000";
    try {
      await fetch(`${apiBase}/api/wa/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: order.whatsapp,
          message,
        }),
      });
    } catch (e: unknown) {
      // Log but don't block — the reminder timestamp update and audit log should still succeed
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[RenewalReminder] WhatsApp send failed:", msg);
    }

    // Update last_reminder_at
    const { error: updateErr } = await db
      .from("orders")
      .update({ last_reminder_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error((updateErr as { message: string }).message);
    }

    // Audit log
    await logAuditEvent({
      data: {
        action: "Renewal reminder sent",
        target: data.orderId,
        targetType: "order",
        severity: "info",
        metadata: {
          tool: order.tool,
          plan: order.plan,
          whatsapp: order.whatsapp ?? "",
          days_left: daysLeft,
        },
      },
    });

    return { ok: true };
  });

/**
 * POST — Marks an order as renewed with a new expiry date.
 */
export const markRenewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        newExpiryDate: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const db = untyped(supabase);

    const { error } = await db
      .from("orders")
      .update({
        status: "renewed",
        expiry_date: data.newExpiryDate,
        renewal_status: "renewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.orderId)
      .eq("user_id", userId);

    if (error) throw new Error((error as { message: string }).message);

    await logAuditEvent({
      data: {
        action: "Subscription renewed",
        target: data.orderId,
        targetType: "order",
        severity: "success",
        metadata: { new_expiry_date: data.newExpiryDate },
      },
    });

    return { ok: true };
  });

/**
 * GET — Loads the renewal configuration from user_settings.
 */
export const getRenewalConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RenewalConfig> => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    const raw = (settings.renewalConfig ?? {}) as Partial<RenewalConfig>;

    // Return with safe defaults
    return {
      reminderDays: Array.isArray(raw.reminderDays) ? (raw.reminderDays as number[]) : [3, 1, 0],
      messageTemplate:
        typeof raw.messageTemplate === "string"
          ? raw.messageTemplate
          : "Assalam o Alaikum! Aap ka {tool} subscription {days_left} din mein expire hone wala hai. Renewal ke liye message karein.",
      autoSend: typeof raw.autoSend === "boolean" ? raw.autoSend : false,
    };
  });

/**
 * POST — Saves the renewal configuration into user_settings.
 */
export const saveRenewalConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RenewalConfigSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();

    const prev = (existing?.settings ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...prev, renewalConfig: data };

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, settings: merged }, { onConflict: "user_id" });

    if (error) throw error;

    await logAuditEvent({
      data: {
        action: "Renewal config saved",
        targetType: "renewal_config",
        severity: "info",
      },
    });

    return { ok: true };
  });
