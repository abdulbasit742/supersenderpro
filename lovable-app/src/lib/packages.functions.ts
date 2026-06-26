import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export interface PackageFeature {
  label: string;
  included: boolean;
  limit?: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  color: "blue" | "purple" | "gold";
  features: PackageFeature[];
  maxCustomers: number;
  maxMessages: number;
  maxAgents: number;
  isPopular: boolean;
  isActive: boolean;
  subscriberCount: number;
}

const MOCK_PACKAGES: PricingPackage[] = [
  { id: "pk1", name: "Starter", tagline: "Beginners ke liye — manage apna chhota reseller business", priceMonthly: 2500, priceAnnual: 25000, color: "blue", maxCustomers: 100, maxMessages: 5000, maxAgents: 2, isPopular: false, isActive: true, subscriberCount: 45, features: [{ label: "100 Customers", included: true }, { label: "5,000 WA Messages/month", included: true }, { label: "2 Agents", included: true }, { label: "Basic Analytics", included: true }, { label: "Auto-Reply Engine", included: true }, { label: "Chatbot Builder", included: false }, { label: "AI Smart Suggestions", included: false }, { label: "Priority Support", included: false }] },
  { id: "pk2", name: "Pro", tagline: "Growing businesses ke liye — full automation suite", priceMonthly: 6500, priceAnnual: 65000, color: "purple", maxCustomers: 1000, maxMessages: 50000, maxAgents: 10, isPopular: true, isActive: true, subscriberCount: 123, features: [{ label: "1,000 Customers", included: true }, { label: "50,000 WA Messages/month", included: true }, { label: "10 Agents", included: true }, { label: "Full Analytics Suite", included: true }, { label: "Auto-Reply Engine", included: true }, { label: "Chatbot Builder", included: true }, { label: "AI Smart Suggestions", included: true }, { label: "Drip Campaigns", included: true }, { label: "Priority Support", included: false }] },
  { id: "pk3", name: "Enterprise", tagline: "Large operations — unlimited scale, white-label option", priceMonthly: 15000, priceAnnual: 150000, color: "gold", maxCustomers: 999999, maxMessages: 999999, maxAgents: 999, isPopular: false, isActive: true, subscriberCount: 12, features: [{ label: "Unlimited Customers", included: true, limit: "∞" }, { label: "Unlimited WA Messages", included: true, limit: "∞" }, { label: "Unlimited Agents", included: true, limit: "∞" }, { label: "White-Label Option", included: true }, { label: "All Pro Features", included: true }, { label: "Dedicated Account Manager", included: true }, { label: "Custom Integrations", included: true }, { label: "24/7 Priority Support", included: true }] },
];

export const getPackages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => MOCK_PACKAGES);
export const savePackage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().optional(), name: z.string(), priceMonthly: z.number(), priceAnnual: z.number(), isActive: z.boolean().optional() })).handler(async ({ data }) => ({ success: true, id: data.id ?? `pk_${Date.now()}` }));
export const togglePackage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ packageId: z.string(), isActive: z.boolean() })).handler(async ({ data }) => ({ success: true, ...data }));
