import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface ScheduledBroadcast {
  id: string;
  name: string;
  message: string;
  segment: string;
  estimatedRecipients: number;
  scheduledAt: string;
  status: "scheduled" | "sending" | "sent" | "cancelled" | "failed";
  sentCount?: number;
  createdAt: string;
}

function makeBroadcast(i: number): ScheduledBroadcast {
  const names = ["Eid Special Offer","Monthly Newsletter","Flash Sale Alert","Renewal Reminder Blast","Weekend Promo"];
  const segments = ["All Customers","VIP Customers","ChatGPT Subscribers","Expiring This Week","Weekend Shoppers"];
  const recipients = [1200,89,234,67,345];
  const statuses: ScheduledBroadcast["status"][] = ["sent","scheduled","scheduled","sent","cancelled"];
  const d = new Date(); d.setDate(d.getDate() + (i - 2));
  return { id: `sb${i+1}`, name: names[i], message: `🔥 Special message for ${segments[i]}! Reply for details.`, segment: segments[i], estimatedRecipients: recipients[i], scheduledAt: d.toISOString(), status: statuses[i], sentCount: statuses[i]==="sent" ? recipients[i]-Math.round(recipients[i]*0.05) : undefined, createdAt: new Date(Date.now() - (5-i)*86400000).toISOString() };
}
const MOCK_BROADCASTS: ScheduledBroadcast[] = Array.from({ length: 5 }, (_, i) => makeBroadcast(i));

export const getScheduledBroadcasts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_BROADCASTS);
export const scheduleBoradcast = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ name: z.string(), message: z.string(), segment: z.string(), scheduledAt: z.string() })).handler(async ({ data }) => ({ success: true, id: `sb_${Date.now()}`, ...data, status: "scheduled" }));
export const cancelScheduled = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ broadcastId: z.string() })).handler(async ({ data }) => ({ success: true, broadcastId: data.broadcastId, status: "cancelled" }));
export const sendNow = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ broadcastId: z.string() })).handler(async () => ({ success: true, note: "Demo: Broadcast sent immediately" }));
