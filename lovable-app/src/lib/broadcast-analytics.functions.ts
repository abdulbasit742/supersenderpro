import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";

export interface BroadcastStat {
  id: string;
  name: string;
  sentAt: string;
  segment: string;
  total: number;
  delivered: number;
  read: number;
  replied: number;
  converted: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  conversionRate: number;
  revenue: number;
}

function makeStat(i: number): BroadcastStat {
  const names = ["Eid Mubarak Offer","Netflix Flash Deal","ChatGPT Renewal Reminder","Monthly Promo Blast","New Arrivals Alert","Weekend Special","VIP Customer Exclusive","Canva Pro Launch","Adobe CC Discount","Ramadan Bundle"];
  const total = [456, 234, 789, 1200, 567, 345, 123, 678, 456, 890][i];
  const delivered = Math.round(total * (0.92 + Math.random() * 0.06));
  const read = Math.round(delivered * (0.65 + Math.random() * 0.15));
  const replied = Math.round(read * (0.18 + Math.random() * 0.12));
  const converted = Math.round(replied * (0.45 + Math.random() * 0.2));
  const failed = total - delivered;
  const d = new Date(); d.setDate(d.getDate() - i * 3);
  return { id: `bc${i+1}`, name: names[i], sentAt: d.toISOString(), segment: ["All Customers","Netflix Subscribers","ChatGPT Users","All Customers","New Customers","Weekend Shoppers","VIP","Canva Users","Adobe Users","All Customers"][i], total, delivered, read, replied, converted, failed, deliveryRate: Math.round(delivered/total*100), readRate: Math.round(read/delivered*100), replyRate: Math.round(replied/read*100), conversionRate: Math.round(converted/replied*100), revenue: converted * [3500, 2500, 3500, 2800, 1500, 2200, 4500, 1800, 5500, 3800][i] };
}

const MOCK_STATS: BroadcastStat[] = Array.from({ length: 10 }, (_, i) => makeStat(i));

export const getBroadcastStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_STATS);
