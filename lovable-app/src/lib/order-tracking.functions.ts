import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type OrderStage = "placed" | "payment_confirmed" | "processing" | "credentials_sent" | "delivered" | "completed" | "cancelled";

export interface TrackingEvent {
  stage: OrderStage;
  label: string;
  timestamp: string;
  note?: string;
  notifiedCustomer: boolean;
}

export interface TrackedOrder {
  id: string;
  orderId: string;
  customerName: string;
  whatsapp: string;
  product: string;
  amount: number;
  currentStage: OrderStage;
  timeline: TrackingEvent[];
  createdAt: string;
}

const STAGE_LABELS: Record<OrderStage, string> = { placed: "Order Placed", payment_confirmed: "Payment Confirmed", processing: "Processing", credentials_sent: "Credentials Sent", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" };
const ALL_STAGES: OrderStage[] = ["placed","payment_confirmed","processing","credentials_sent","delivered","completed"];

function makeOrder(i: number): TrackedOrder {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig"];
  const products = ["ChatGPT Plus","Netflix Premium","Canva Pro","Midjourney Pro","Adobe CC","Spotify Family"];
  const amounts = [3500,2500,1800,4200,5500,1200];
  const stages: OrderStage[] = ["completed","credentials_sent","processing","payment_confirmed","placed","delivered"];
  const stage = stages[i];
  const stageIdx = ALL_STAGES.indexOf(stage);
  const d = new Date(); d.setDate(d.getDate() - i);
  const timeline: TrackingEvent[] = ALL_STAGES.slice(0, Math.max(1, stageIdx + 1)).map((s, si) => {
    const t = new Date(d); t.setHours(t.getHours() + si * 2);
    return { stage: s, label: STAGE_LABELS[s], timestamp: t.toISOString(), notifiedCustomer: si < stageIdx, note: s === "credentials_sent" ? "Email and password sent via WA" : undefined };
  });
  return { id: `to${i+1}`, orderId: `ORD-${4500-i}`, customerName: names[i], whatsapp: `030${i}1234567`, product: products[i], amount: amounts[i], currentStage: stage, timeline, createdAt: d.toISOString() };
}
const MOCK_ORDERS: TrackedOrder[] = Array.from({ length: 6 }, (_, i) => makeOrder(i));

export { STAGE_LABELS, ALL_STAGES };
export const getTrackedOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_ORDERS);
export const advanceOrderStage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ orderId: z.string(), newStage: z.string(), note: z.string().optional(), notifyCustomer: z.boolean().optional() })).handler(async ({ data }) => ({ success: true, ...data, timestamp: new Date().toISOString() }));
export const sendStatusUpdate = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ orderId: z.string(), stage: z.string() })).handler(async () => ({ success: true, note: "Demo: Status update sent via WhatsApp" }));
