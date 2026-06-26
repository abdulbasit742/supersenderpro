import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type CustomerTag = "VIP" | "Bulk Buyer" | "Risky" | "Inactive" | "New" | "Champion" | "Referring" | "Discount Seeker" | "COD Only" | "Loyal";

export interface CustomerNote {
  id: string;
  customerId: string;
  agentName: string;
  note: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface CustomerWithNotes {
  id: string;
  name: string;
  whatsapp: string;
  tags: CustomerTag[];
  notes: CustomerNote[];
  totalOrders: number;
  totalRevenue: number;
  lastOrderAt: string;
}

const MOCK_CUSTOMERS: CustomerWithNotes[] = [
  { id: "c1", name: "Ahmed Khan", whatsapp: "03001234567", tags: ["VIP","Bulk Buyer","Loyal"], notes: [{ id: "n1", customerId: "c1", agentName: "Imran", note: "Prefers JazzCash payment. Always orders in bulk for resale. Keep discount rate at 10%.", isPrivate: false, createdAt: new Date(Date.now() - 86400000).toISOString() }, { id: "n2", customerId: "c1", agentName: "Ayesha", note: "Called 3x about Netflix issue — resolved. Gave free month as compensation.", isPrivate: true, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }], totalOrders: 42, totalRevenue: 159600, lastOrderAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "c2", name: "Sara Ali", whatsapp: "03111234567", tags: ["Loyal","Champion"], notes: [{ id: "n3", customerId: "c2", agentName: "Imran", note: "Refers friends regularly — gave her 5% referral code. Track referrals manually.", isPrivate: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }], totalOrders: 38, totalRevenue: 110200, lastOrderAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "c3", name: "Bilal Raza", whatsapp: "03211234567", tags: ["COD Only","Risky"], notes: [{ id: "n4", customerId: "c3", agentName: "Usman", note: "Twice refused delivery. Mark as high risk — require advance payment for orders > 2000.", isPrivate: true, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() }], totalOrders: 12, totalRevenue: 38400, lastOrderAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "c4", name: "Fatima Noor", whatsapp: "03321234567", tags: ["New","Discount Seeker"], notes: [], totalOrders: 3, totalRevenue: 9000, lastOrderAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "c5", name: "Hassan Malik", whatsapp: "03421234567", tags: ["Inactive"], notes: [{ id: "n5", customerId: "c5", agentName: "Ayesha", note: "Last seen 3 months ago. Sent 2 win-back messages, no reply. Try WhatsApp voice.", isPrivate: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() }], totalOrders: 8, totalRevenue: 24000, lastOrderAt: new Date(Date.now() - 90 * 86400000).toISOString() },
];

const ALL_TAGS: CustomerTag[] = ["VIP","Bulk Buyer","Risky","Inactive","New","Champion","Referring","Discount Seeker","COD Only","Loyal"];

export const getCustomersWithNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_CUSTOMERS);

export const getAllTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ALL_TAGS);

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerId: z.string(), note: z.string(), isPrivate: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, id: `n_${Date.now()}`, ...data, agentName: "You", createdAt: new Date().toISOString() }));

export const updateCustomerTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ customerId: z.string(), tags: z.array(z.string()) }))
  .handler(async ({ data }) => ({ success: true, ...data }));

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ noteId: z.string() }))
  .handler(async () => ({ success: true }));
