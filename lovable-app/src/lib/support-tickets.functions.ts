import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type TicketCategory = "billing" | "technical" | "account" | "delivery" | "refund" | "other";

export interface SupportTicket {
  id: string;
  ticketNo: string;
  customerId?: string;
  customerName?: string;
  whatsapp?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  author: string;
  authorType: "customer" | "agent" | "system";
  message: string;
  sentAt: string;
}

const MOCK_TICKETS: SupportTicket[] = [
  { id: "tk1", ticketNo: "TKT-0001", customerName: "Ahmed Khan", whatsapp: "03001234567", subject: "ChatGPT credentials not working", description: "The email and password you sent are not working. Getting invalid credentials error.", category: "delivery", priority: "urgent", status: "open", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), slaDeadline: new Date(Date.now() + 12 * 3600000).toISOString(), messages: [{ id: "m1", ticketId: "tk1", author: "Ahmed Khan", authorType: "customer", message: "The credentials are not working, please fix ASAP!", sentAt: new Date(Date.now() - 3600000).toISOString() }] },
  { id: "tk2", ticketNo: "TKT-0002", customerName: "Sara Ali", whatsapp: "03111234567", subject: "Want refund for Claude Pro", description: "I accidentally ordered twice, please refund one order.", category: "refund", priority: "normal", status: "in_progress", assignedTo: "Support Team", createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), slaDeadline: new Date(Date.now() + 24 * 3600000).toISOString(), messages: [{ id: "m2", ticketId: "tk2", author: "Sara Ali", authorType: "customer", message: "Please process refund urgently", sentAt: new Date(Date.now() - 7200000).toISOString() }, { id: "m3", ticketId: "tk2", author: "Support", authorType: "agent", message: "Noted! We'll process within 24 hours. 😊", sentAt: new Date(Date.now() - 3600000).toISOString() }] },
  { id: "tk3", ticketNo: "TKT-0003", customerName: "Bilal Raza", whatsapp: "03211234567", subject: "How to change profile picture", description: "Can't change my Midjourney profile picture", category: "technical", priority: "low", status: "resolved", resolvedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), messages: [] },
];

export const getTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional(), priority: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    let tickets = MOCK_TICKETS;
    if (data.status && data.status !== "all") tickets = tickets.filter(t => t.status === data.status);
    if (data.priority && data.priority !== "all") tickets = tickets.filter(t => t.priority === data.priority);
    return tickets;
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerName: z.string().optional(), whatsapp: z.string().optional(), subject: z.string().min(1), description: z.string().min(1), category: z.enum(["billing","technical","account","delivery","refund","other"]), priority: z.enum(["low","normal","high","urgent"]).optional() }).parse(d))
  .handler(async () => ({ ok: true, ticketNo: `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}`, id: `tk_${Date.now()}` }));

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ticketId: z.string(), message: z.string().min(1), sendToCustomer: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    const ticket = MOCK_TICKETS.find(t => t.id === data.ticketId);
    if (data.sendToCustomer && ticket?.whatsapp) {
      const token = process.env.META_WHATSAPP_TOKEN ?? "";
      const phoneId = process.env.META_PHONE_NUMBER_ID ?? "";
      if (token && phoneId) {
        await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: ticket.whatsapp.replace(/\D/g, ""), type: "text", text: { body: `[Ticket ${ticket.ticketNo}]: ${data.message}` } }) });
      }
    }
    return { ok: true };
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ticketId: z.string(), status: z.enum(["open","in_progress","waiting_customer","resolved","closed"]) }).parse(d))
  .handler(async () => ({ ok: true }));
