import { createServerFn } from "@tanstack/start";
import { requireSupabaseAuth } from "@/lib/auth-hook";
import { z } from "zod";

export type NodeType = "trigger" | "message" | "button_menu" | "condition" | "action" | "end";

export interface BotNode {
  id: string;
  type: NodeType;
  label: string;
  content?: string;
  buttons?: { id: string; label: string; nextNodeId?: string }[];
  keywords?: string[];
  condition?: { field: string; op: string; value: string };
  action?: { type: "send_wa" | "tag_customer" | "create_order" | "notify_agent"; value?: string };
  nextNodeId?: string;
  position: { x: number; y: number };
}

export interface ChatbotFlow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerKeywords: string[];
  nodes: BotNode[];
  totalSessions: number;
  totalCompleted: number;
  createdAt: string;
  updatedAt: string;
}

const MOCK_FLOWS: ChatbotFlow[] = [
  {
    id: "cf1", name: "Price Inquiry Bot", description: "Handles price questions automatically", isActive: true, triggerKeywords: ["price", "rate", "kitna", "cost", "qeemat"],
    nodes: [
      { id: "n1", type: "trigger", label: "Price Keyword", keywords: ["price","rate","kitna","cost"], position: { x: 50, y: 50 }, nextNodeId: "n2" },
      { id: "n2", type: "button_menu", label: "Product Menu", content: "Assalam Alaikum! Aap kaunse product ki price janana chahte hain?", buttons: [{ id: "b1", label: "ChatGPT Plus", nextNodeId: "n3" }, { id: "b2", label: "Netflix Premium", nextNodeId: "n4" }, { id: "b3", label: "Canva Pro", nextNodeId: "n5" }], position: { x: 250, y: 50 } },
      { id: "n3", type: "message", label: "ChatGPT Price", content: "ChatGPT Plus:\n1 Month: PKR 3,500\n3 Months: PKR 9,500\n\nReply ORDER to buy!", position: { x: 450, y: 0 }, nextNodeId: "n6" },
      { id: "n4", type: "message", label: "Netflix Price", content: "Netflix Premium:\n1 Month: PKR 2,500\n3 Months: PKR 7,000\n\nReply ORDER to buy!", position: { x: 450, y: 100 }, nextNodeId: "n6" },
      { id: "n5", type: "message", label: "Canva Price", content: "Canva Pro:\n1 Month: PKR 1,800\nAnnual: PKR 18,000\n\nReply ORDER to buy!", position: { x: 450, y: 200 }, nextNodeId: "n6" },
      { id: "n6", type: "end", label: "End", position: { x: 650, y: 100 } },
    ],
    totalSessions: 456, totalCompleted: 312, createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "cf2", name: "Order Flow Bot", description: "Guides customers through ordering process", isActive: true, triggerKeywords: ["order", "buy", "khareedna", "lena"],
    nodes: [
      { id: "n1", type: "trigger", label: "Buy Keyword", keywords: ["order","buy"], position: { x: 50, y: 100 }, nextNodeId: "n2" },
      { id: "n2", type: "message", label: "Collect Info", content: "Order ke liye apna naam aur product ka naam bhejein!", position: { x: 250, y: 100 }, nextNodeId: "n3" },
      { id: "n3", type: "action", label: "Notify Agent", action: { type: "notify_agent", value: "New order inquiry received" }, position: { x: 450, y: 100 }, nextNodeId: "n4" },
      { id: "n4", type: "end", label: "End", position: { x: 650, y: 100 } },
    ],
    totalSessions: 234, totalCompleted: 198, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
];

export const getChatbotFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => MOCK_FLOWS);

export const saveChatbotFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().optional(), name: z.string(), description: z.string(), triggerKeywords: z.array(z.string()), isActive: z.boolean().optional() }))
  .handler(async ({ data }) => ({ success: true, id: data.id ?? `cf_${Date.now()}` }));

export const toggleFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ flowId: z.string(), isActive: z.boolean() }))
  .handler(async ({ data }) => ({ success: true, ...data }));

export const testFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ flowId: z.string(), testMessage: z.string() }))
  .handler(async ({ data }) => {
    const flow = MOCK_FLOWS.find(f => f.id === data.flowId);
    if (!flow) throw new Error("Flow not found");
    const matched = flow.triggerKeywords.some(k => data.testMessage.toLowerCase().includes(k));
    return { triggered: matched, flowName: flow.name, firstResponse: matched ? flow.nodes.find(n => n.type === "button_menu" || n.type === "message")?.content ?? "" : "No match found" };
  });
