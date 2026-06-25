import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpsellRule {
  id: string;
  name: string;
  triggerProduct: string;
  suggestProduct: string;
  suggestPrice: number;
  delayMinutes: number;
  messageTemplate: string;
  isActive: boolean;
  createdAt?: string;
}

export interface UpsellStats {
  totalAttempts: number;
  conversions: number;
  conversionRate: number;
  revenueGenerated: number;
}

export interface UpsellLog {
  id: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  ruleId: string;
  ruleName?: string;
  status: "sent" | "converted" | "ignored";
  sentAt?: string;
  convertedAt?: string;
  revenue?: number;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const UpsellRuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  triggerProduct: z.string().min(1).max(200),
  suggestProduct: z.string().min(1).max(200),
  suggestPrice: z.number().nonnegative(),
  delayMinutes: z.number().int().nonnegative(),
  messageTemplate: z.string().min(1).max(2000),
  isActive: z.boolean(),
});

const ToggleUpsellRuleSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

const DeleteUpsellRuleSchema = z.object({
  id: z.string().uuid(),
});

const TriggerUpsellSchema = z.object({
  orderId: z.string().uuid(),
  ruleId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Row shapes returned from Supabase (untyped tables use Record<string,unknown>)
// ---------------------------------------------------------------------------

interface UpsellRuleRow {
  id: string;
  name: string;
  trigger_product: string;
  suggest_product: string;
  suggest_price: number;
  delay_minutes: number;
  message_template: string;
  is_active: boolean;
  created_at: string | null;
}

interface UpsellLogRow {
  id: string;
  order_id: string;
  customer_id: string;
  rule_id: string;
  status: string;
  sent_at: string | null;
  converted_at: string | null;
  revenue: number | null;
  customers?: { name: string | null } | null;
  upsell_rules?: { name: string | null } | null;
}

interface OrderRow {
  id: string;
  customer_id: string;
}

// ---------------------------------------------------------------------------
// Helper — cast supabase client to untyped for tables not in generated types
// ---------------------------------------------------------------------------
type UntypedClient = SupabaseClient<Record<string, unknown>>;

function mapRule(row: UpsellRuleRow): UpsellRule {
  return {
    id: row.id,
    name: row.name,
    triggerProduct: row.trigger_product,
    suggestProduct: row.suggest_product,
    suggestPrice: row.suggest_price,
    delayMinutes: row.delay_minutes,
    messageTemplate: row.message_template,
    isActive: row.is_active,
    createdAt: row.created_at ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

/**
 * GET — list all upsell rules for the authenticated user.
 */
export const getUpsellRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpsellRule[]> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const { data, error } = await db
      .from("upsell_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as UpsellRuleRow[]).map(mapRule);
  });

/**
 * POST — create or update an upsell rule.
 */
export const saveUpsellRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsellRuleSchema.parse(d))
  .handler(async ({ data, context }): Promise<UpsellRule> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const payload = {
      user_id: userId,
      name: data.name,
      trigger_product: data.triggerProduct,
      suggest_product: data.suggestProduct,
      suggest_price: data.suggestPrice,
      delay_minutes: data.delayMinutes,
      message_template: data.messageTemplate,
      is_active: data.isActive,
    };

    let savedRow: UpsellRuleRow;

    if (data.id) {
      // UPDATE existing rule
      const { data: updated, error } = await db
        .from("upsell_rules")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      savedRow = updated as UpsellRuleRow;
    } else {
      // INSERT new rule
      const { data: inserted, error } = await db
        .from("upsell_rules")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      savedRow = inserted as UpsellRuleRow;
    }

    try {
      await logAuditEvent({
        data: {
          action: "Upsell rule saved",
          target: savedRow.id,
          targetType: "upsell_rule",
          severity: "info",
        },
      });
    } catch (e: unknown) {
      // Audit failure must not block the response
      console.warn("[upsell] audit log failed:", e);
    }

    return mapRule(savedRow);
  });

/**
 * POST — delete an upsell rule by id.
 */
export const deleteUpsellRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteUpsellRuleSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const { error } = await db
      .from("upsell_rules")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    try {
      await logAuditEvent({
        data: {
          action: "Upsell rule deleted",
          target: data.id,
          targetType: "upsell_rule",
          severity: "warning",
        },
      });
    } catch (e: unknown) {
      console.warn("[upsell] audit log failed:", e);
    }

    return { ok: true };
  });

/**
 * POST — toggle the is_active flag of an upsell rule.
 */
export const toggleUpsellRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleUpsellRuleSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const { error } = await db
      .from("upsell_rules")
      .update({ is_active: data.active })
      .eq("id", data.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return { ok: true };
  });

/**
 * GET — compute aggregate upsell stats for the authenticated user.
 */
export const getUpsellStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpsellStats> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const { data, error } = await db
      .from("upsell_logs")
      .select("status, revenue")
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ status: string; revenue: number | null }>;

    const totalAttempts = rows.length;
    const conversions = rows.filter((r) => r.status === "converted").length;
    const conversionRate =
      totalAttempts > 0 ? Math.round((conversions / totalAttempts) * 100 * 100) / 100 : 0;
    const revenueGenerated = rows.reduce(
      (sum, r) => sum + (r.status === "converted" ? (Number(r.revenue) || 0) : 0),
      0,
    );

    return { totalAttempts, conversions, conversionRate, revenueGenerated };
  });

/**
 * GET — list the 50 most recent upsell log entries, joined with customer name
 * and rule name.
 */
export const getUpsellLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpsellLog[]> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    const { data, error } = await db
      .from("upsell_logs")
      .select(
        "id, order_id, customer_id, rule_id, status, sent_at, converted_at, revenue, customers(name), upsell_rules(name)",
      )
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return ((data ?? []) as UpsellLogRow[]).map((row): UpsellLog => {
      const rawStatus = row.status;
      const status: UpsellLog["status"] =
        rawStatus === "converted" || rawStatus === "ignored" ? rawStatus : "sent";

      return {
        id: row.id,
        orderId: row.order_id,
        customerId: row.customer_id,
        customerName: row.customers?.name ?? undefined,
        ruleId: row.rule_id,
        ruleName: row.upsell_rules?.name ?? undefined,
        status,
        sentAt: row.sent_at ?? undefined,
        convertedAt: row.converted_at ?? undefined,
        revenue: row.revenue ?? undefined,
      };
    });
  });

/**
 * POST — fire an upsell for a given order + rule, log it, and attempt to
 * dispatch a WhatsApp message (failure is non-fatal).
 */
export const triggerUpsell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TriggerUpsellSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; logId: string }> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as UntypedClient;

    // 1. Fetch the order to get the customer_id
    const { data: orderData, error: orderError } = await db
      .from("orders")
      .select("id, customer_id")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .single();

    if (orderError) throw new Error(orderError.message);
    if (!orderData) throw new Error("Order not found");

    const order = orderData as OrderRow;

    // 2. Fetch the rule (verify it belongs to this user)
    const { data: ruleData, error: ruleError } = await db
      .from("upsell_rules")
      .select("id, name, message_template, suggest_product, suggest_price")
      .eq("id", data.ruleId)
      .eq("user_id", userId)
      .single();

    if (ruleError) throw new Error(ruleError.message);
    if (!ruleData) throw new Error("Upsell rule not found");

    // 3. Insert the upsell log entry
    const { data: logEntry, error: logError } = await db
      .from("upsell_logs")
      .insert({
        user_id: userId,
        order_id: order.id,
        customer_id: order.customer_id,
        rule_id: data.ruleId,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (logError) throw new Error(logError.message);
    if (!logEntry) throw new Error("Failed to create upsell log entry");

    const logId = (logEntry as { id: string }).id;

    // 4. Attempt WA message dispatch — non-fatal
    try {
      const apiBase = process.env.API_BASE_URL ?? "http://localhost:3001";
      const response = await fetch(`${apiBase}/api/wa/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          customerId: order.customer_id,
          orderId: order.id,
          ruleId: data.ruleId,
          logId,
        }),
      });

      if (!response.ok) {
        console.warn(
          `[upsell] WA send returned ${response.status} for logId=${logId}`,
        );
      }
    } catch (e: unknown) {
      console.warn("[upsell] WA send failed (non-fatal):", e);
    }

    // 5. Audit
    try {
      await logAuditEvent({
        data: {
          action: "Upsell triggered",
          target: logId,
          targetType: "upsell_log",
          severity: "info",
          metadata: { orderId: order.id, ruleId: data.ruleId },
        },
      });
    } catch (e: unknown) {
      console.warn("[upsell] audit log failed:", e);
    }

    return { ok: true, logId };
  });
