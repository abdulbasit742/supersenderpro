import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface SegmentFilter {
  inactiveDays?: number;
  productCategory?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpend?: number;
  tags?: string[];
  expiringDays?: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  filter: SegmentFilter;
  estimatedCount: number;
}

export interface AudiencePreview {
  count: number;
  sampleNames: string[];
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const SegmentFilterSchema = z.object({
  inactiveDays: z.number().int().positive().optional(),
  productCategory: z.string().max(100).optional(),
  minOrders: z.number().int().nonnegative().optional(),
  maxOrders: z.number().int().nonnegative().optional(),
  minSpend: z.number().nonnegative().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiringDays: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Pre-built segment definitions (filter only — counts are resolved at runtime)
// ---------------------------------------------------------------------------

interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  filter: SegmentFilter;
}

const SEGMENT_DEFINITIONS: SegmentDefinition[] = [
  {
    id: "chatgpt-buyers",
    name: "ChatGPT Buyers",
    description: "Customers who purchased AI tools or ChatGPT subscriptions",
    filter: { productCategory: "ai" },
  },
  {
    id: "inactive-30",
    name: "Inactive 30 Days",
    description: "Customers who haven't placed an order in the last 30 days",
    filter: { inactiveDays: 30 },
  },
  {
    id: "vip-customers",
    name: "VIP Customers",
    description: "Loyal customers with 5 or more orders",
    filter: { minOrders: 5 },
  },
  {
    id: "new-customers",
    name: "New Customers",
    description: "First-time buyers with only 1 order",
    filter: { maxOrders: 1 },
  },
  {
    id: "big-spenders",
    name: "Big Spenders",
    description: "High-value customers who have spent PKR 20,000 or more",
    filter: { minSpend: 20000 },
  },
  {
    id: "expiring-this-week",
    name: "Expiring This Week",
    description: "Customers whose subscription expires within the next 7 days",
    filter: { expiringDays: 7 },
  },
];

// ---------------------------------------------------------------------------
// Helper: resolve estimated count for a single filter
// ---------------------------------------------------------------------------

async function resolveEstimatedCount(
  supabase: SupabaseClient,
  userId: string,
  filter: SegmentFilter,
): Promise<number> {
  try {
    // Use an untyped client so we can query tables not in the generated schema
    const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    if (filter.inactiveDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filter.inactiveDays);

      // Customers whose most recent order is older than the cutoff
      const { count } = await db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .lt("last_order_at", cutoff.toISOString());

      return count ?? 0;
    }

    if (filter.expiringDays !== undefined) {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filter.expiringDays);

      const { count } = await db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("subscription_expires_at", now.toISOString())
        .lte("subscription_expires_at", cutoff.toISOString());

      return count ?? 0;
    }

    if (filter.productCategory !== undefined) {
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("product_category", filter.productCategory);

      return count ?? 0;
    }

    if (filter.minOrders !== undefined || filter.maxOrders !== undefined) {
      let query = db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (filter.minOrders !== undefined) {
        query = query.gte("total_orders", filter.minOrders);
      }
      if (filter.maxOrders !== undefined) {
        query = query.lte("total_orders", filter.maxOrders);
      }

      const { count } = await query;
      return count ?? 0;
    }

    if (filter.minSpend !== undefined) {
      const { count } = await db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("total_spend", filter.minSpend);

      return count ?? 0;
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      const { count } = await db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .overlaps("tags", filter.tags);

      return count ?? 0;
    }

    // No filter — return total customer count
    const { count } = await db
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return count ?? 0;
  } catch (e: unknown) {
    console.error("[smart-broadcast] resolveEstimatedCount error:", e);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Helper: query customers matching a filter, return rows with name + id
// ---------------------------------------------------------------------------

async function queryMatchingCustomers(
  supabase: SupabaseClient,
  userId: string,
  filter: SegmentFilter,
  limit: number,
): Promise<Array<{ id: string; name: string }>> {
  const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;

  if (filter.inactiveDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.inactiveDays);

    const { data } = await db
      .from("customers")
      .select("id, name")
      .eq("user_id", userId)
      .lt("last_order_at", cutoff.toISOString())
      .limit(limit);

    return (data ?? []) as Array<{ id: string; name: string }>;
  }

  if (filter.expiringDays !== undefined) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + filter.expiringDays);

    const { data } = await db
      .from("customers")
      .select("id, name")
      .eq("user_id", userId)
      .gte("subscription_expires_at", now.toISOString())
      .lte("subscription_expires_at", cutoff.toISOString())
      .limit(limit);

    return (data ?? []) as Array<{ id: string; name: string }>;
  }

  if (filter.productCategory !== undefined) {
    // Distinct customers who have orders in this category
    const { data } = await db
      .from("orders")
      .select("customer_id, customers!inner(id, name)")
      .eq("user_id", userId)
      .eq("product_category", filter.productCategory)
      .limit(limit);

    return ((data ?? []) as Array<{ customers: { id: string; name: string } }>).map(
      (row) => row.customers,
    );
  }

  let customerQuery = db
    .from("customers")
    .select("id, name")
    .eq("user_id", userId);

  if (filter.minOrders !== undefined) {
    customerQuery = customerQuery.gte("total_orders", filter.minOrders);
  }
  if (filter.maxOrders !== undefined) {
    customerQuery = customerQuery.lte("total_orders", filter.maxOrders);
  }
  if (filter.minSpend !== undefined) {
    customerQuery = customerQuery.gte("total_spend", filter.minSpend);
  }
  if (filter.tags !== undefined && filter.tags.length > 0) {
    customerQuery = customerQuery.overlaps("tags", filter.tags);
  }

  const { data } = await customerQuery.limit(limit);
  return (data ?? []) as Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// getAudienceSegments — GET
// ---------------------------------------------------------------------------

export const getAudienceSegments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AudienceSegment[]> => {
    const { supabase, userId } = context;

    const segments = await Promise.all(
      SEGMENT_DEFINITIONS.map(async (def): Promise<AudienceSegment> => {
        const estimatedCount = await resolveEstimatedCount(
          supabase,
          userId,
          def.filter,
        );
        return { ...def, estimatedCount };
      }),
    );

    return segments;
  });

// ---------------------------------------------------------------------------
// buildAudiencePreview — POST
// ---------------------------------------------------------------------------

export const buildAudiencePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SegmentFilterSchema.parse(d))
  .handler(async ({ data, context }): Promise<AudiencePreview> => {
    const { supabase, userId } = context;

    try {
      const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      // Get total count
      const count = await resolveEstimatedCount(supabase, userId, data);

      // Get up to 3 sample names
      const samples = await queryMatchingCustomers(db, userId, data, 3);
      const sampleNames = samples
        .map((c) => (typeof c.name === "string" ? c.name : ""))
        .filter((n) => n.length > 0);

      return { count, sampleNames };
    } catch (e: unknown) {
      console.error("[smart-broadcast] buildAudiencePreview error:", e);
      throw new Error(
        e instanceof Error ? e.message : "Failed to build audience preview",
      );
    }
  });

// ---------------------------------------------------------------------------
// sendSmartBroadcast — POST
// ---------------------------------------------------------------------------

const SendSmartBroadcastSchema = z.object({
  segmentId: z.string().min(1).max(100),
  filter: SegmentFilterSchema,
  message: z.string().min(1).max(4096),
  scheduleAt: z.string().datetime().optional(),
  via: z.enum(["whatsapp", "wa_channel"]),
});

export type SendSmartBroadcastInput = z.infer<typeof SendSmartBroadcastSchema>;

export const sendSmartBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendSmartBroadcastSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; campaignId: string }> => {
    const { supabase, userId } = context;

    try {
      const db = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      const status = data.scheduleAt ? "scheduled" : "running";

      const { data: inserted, error } = await db
        .from("campaigns")
        .insert({
          name: `Smart Broadcast - ${data.segmentId}`,
          status,
          message: data.message,
          scheduled_at: data.scheduleAt ?? null,
          user_id: userId,
          metadata: {
            filter: data.filter,
            via: data.via,
          },
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      const campaignId = (inserted as { id: string }).id;

      // Fire-and-forget audit log (non-blocking — do not await result)
      void db.from("audit_events").insert({
        user_id: userId,
        action: "Smart broadcast created",
        target: campaignId,
        target_type: "campaign",
        severity: "info",
        metadata: {
          segmentId: data.segmentId,
          via: data.via,
          status,
        },
      });

      return { ok: true, campaignId };
    } catch (e: unknown) {
      console.error("[smart-broadcast] sendSmartBroadcast error:", e);
      throw new Error(
        e instanceof Error ? e.message : "Failed to create smart broadcast",
      );
    }
  });

// ---------------------------------------------------------------------------
// generateBroadcastMessage — POST
// ---------------------------------------------------------------------------

const GenerateBroadcastMessageSchema = z.object({
  segment: z.string().min(1).max(200),
  tone: z.enum(["friendly", "urgent", "promotional"]),
});

export type GenerateBroadcastMessageInput = z.infer<
  typeof GenerateBroadcastMessageSchema
>;

interface GatewayMessage {
  role: string;
  content: string;
}

interface GatewayChoice {
  message: GatewayMessage;
}

interface GatewayResponse {
  choices: GatewayChoice[];
}

export const generateBroadcastMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateBroadcastMessageSchema.parse(d))
  .handler(async ({ data }): Promise<{ message: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing LOVABLE_API_KEY environment variable. Set it in Lovable Cloud.",
      );
    }

    const systemPrompt =
      "You are a WhatsApp marketing copywriter specializing in Pakistani businesses. " +
      "Always respond with valid JSON only — no markdown, no extra text.";

    const userPrompt =
      `Generate a WhatsApp broadcast message in Urdu+English mixed (Roman Urdu) for Pakistani customers.\n` +
      `Segment: ${data.segment}\n` +
      `Tone: ${data.tone}\n` +
      `Requirements:\n` +
      `- Include {{name}} personalization at the start\n` +
      `- Under 300 characters total\n` +
      `- Include 1-2 relevant emoji\n` +
      `- Sound natural and conversational\n` +
      `- If promotional, mention a call-to-action (e.g. "Reply ORDER")\n` +
      `Respond with JSON: { "message": "<your message here>" }`;

    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`AI Gateway error ${response.status}: ${errorText}`);
      }

      const json: GatewayResponse = (await response.json()) as GatewayResponse;

      const rawContent = json.choices?.[0]?.message?.content ?? "";

      // Strip markdown code fences if the model adds them
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed: unknown = JSON.parse(cleaned);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("message" in parsed) ||
        typeof (parsed as Record<string, unknown>).message !== "string"
      ) {
        throw new Error("AI Gateway returned an unexpected response shape");
      }

      return { message: (parsed as { message: string }).message };
    } catch (e: unknown) {
      console.error("[smart-broadcast] generateBroadcastMessage error:", e);
      throw new Error(
        e instanceof Error
          ? e.message
          : "Failed to generate broadcast message via AI Gateway",
      );
    }
  });
