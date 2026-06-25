import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SegmentConditionField = "last_order_days" | "total_spent" | "order_count" | "product" | "plan" | "status" | "tags" | "city" | "churn_risk";
export type SegmentConditionOp = "gt" | "lt" | "eq" | "contains" | "not_contains" | "in";

export interface SegmentCondition {
  field: SegmentConditionField;
  op: SegmentConditionOp;
  value: string | number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  color: string;
  conditions: SegmentCondition[];
  logic: "AND" | "OR";
  customerCount: number;
  isSystem: boolean;
  createdAt: string;
  lastUpdated: string;
}

const MOCK_SEGMENTS: CustomerSegment[] = [
  { id: "seg1", name: "VIP Customers", description: "High-value, frequent buyers", color: "#f59e0b", conditions: [{ field: "total_spent", op: "gt", value: 20000 }, { field: "order_count", op: "gt", value: 5 }], logic: "AND", customerCount: 34, isSystem: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg2", name: "At-Risk", description: "No order in 30+ days", color: "#ef4444", conditions: [{ field: "last_order_days", op: "gt", value: 30 }], logic: "AND", customerCount: 67, isSystem: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg3", name: "New Customers", description: "First order in last 7 days", color: "#22c55e", conditions: [{ field: "order_count", op: "eq", value: 1 }, { field: "last_order_days", op: "lt", value: 7 }], logic: "AND", customerCount: 18, isSystem: true, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg4", name: "ChatGPT Buyers", description: "Bought ChatGPT Plus", color: "#3b82f6", conditions: [{ field: "product", op: "contains", value: "ChatGPT" }], logic: "AND", customerCount: 89, isSystem: false, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), lastUpdated: new Date().toISOString() },
  { id: "seg5", name: "Dormant", description: "No order in 60+ days", color: "#6b7280", conditions: [{ field: "last_order_days", op: "gt", value: 60 }], logic: "AND", customerCount: 23, isSystem: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), lastUpdated: new Date().toISOString() },
];

export const getSegments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_SEGMENTS);

export const saveSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional(),
    conditions: z.array(z.record(z.string(), z.unknown())),
    logic: z.enum(["AND","OR"]),
  }).parse(d))
  .handler(async () => ({ ok: true, id: `seg_${Date.now()}` }));

export const deleteSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async () => ({ ok: true }));

export const getSegmentCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ segmentId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: customers } = await supabase.from("customers").select("id, name, whatsapp, status").eq("user_id", userId).limit(200);
    const seg = MOCK_SEGMENTS.find(s => s.id === data.segmentId);
    return { customers: customers ?? [], segment: seg, count: customers?.length ?? 0 };
  });

export const broadcastToSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ segmentId: z.string(), message: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const seg = MOCK_SEGMENTS.find(s => s.id === data.segmentId);
    return { ok: true, queued: seg?.customerCount ?? 0, demo: true };
  });
