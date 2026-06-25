import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TicketIcon, Plus, Send, MessageSquare, Clock, CheckCircle } from "lucide-react";
import type { SupportTicket, TicketCategory, TicketPriority } from "@/lib/support-tickets.functions";

export const Route = createFileRoute("/_app/support-tickets")({
  component: SupportTicketsPage,
});

const MOCK_TICKETS: SupportTicket[] = [
  { id: "tk1", ticketNo: "TKT-0001", customerName: "Ahmed Khan", whatsapp: "03001234567", subject: "ChatGPT credentials not working", description: "The email and password you sent are not working.", category: "delivery", priority: "urgent", status: "open", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), slaDeadline: new Date(Date.now() + 12 * 3600000).toISOString(), messages: [{ id: "m1", ticketId: "tk1", author: "Ahmed Khan", authorType: "customer", message: "Please fix ASAP!", sentAt: new Date(Date.now() - 3600000).toISOString() }] },
  { id: "tk2", ticketNo: "TKT-0002", customerName: "Sara Ali", whatsapp: "03111234567", subject: "Refund request - double order", description: "Accidentally ordered twice.", category: "refund", priority: "normal", status: "in_progress", assignedTo: "Support Team", createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), messages: [{ id: "m2", ticketId: "tk2", author: "Sara Ali", authorType: "customer", message: "Please process refund", sentAt: new Date(Date.now() - 7200000).toISOString() }, { id: "m3", ticketId: "tk2", author: "Support", authorType: "agent", message: "Noted! Processing within 24 hours. 😊", sentAt: new Date(Date.now() - 3600000).toISOString() }] },
  { id: "tk3", ticketNo: "TKT-0003", customerName: "Bilal Raza", whatsapp: "03211234567", subject: "How to change profile picture", description: "Can't change Midjourney profile picture", category: "technical", priority: "low", status: "resolved", resolvedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), messages: [] },
];

const PRIORITY_COLORS = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", normal: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-600" };
const STATUS_COLORS = { open: "bg-red-100 text-red-700", in_progress: "bg-blue-100 text-blue-700", waiting_customer: "bg-yellow-100 text-yellow-700", resolved: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-500" };
const CATEGORIES: TicketCategory[] = ["billing","technical","account","delivery","refund","other"];

export default function SupportTicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendToCustomer, setSendToCustomer] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ customerName: "", whatsapp: "", subject: "", description: "", category: "technical" as TicketCategory, priority: "normal" as TicketPriority });
  const qc = useQueryClient();

  const { data: tickets = MOCK_TICKETS } = useQuery({ queryKey: ["tickets", filterStatus], queryFn: async () => { const { getTickets } = await import("@/lib/support-tickets.functions"); return getTickets({ data: { status: filterStatus } }); }, placeholderData: MOCK_TICKETS, staleTime: 30_000 });

  const replyMut = useMutation({ mutationFn: async () => { const { replyToTicket } = await import("@/lib/support-tickets.functions"); return replyToTicket({ data: { ticketId: selectedTicket?.id ?? "", message: replyText, sendToCustomer } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); setReplyText(""); } });
  const statusMut = useMutation({ mutationFn: async ({ ticketId, status }: { ticketId: string; status: SupportTicket["status"] }) => { const { updateTicketStatus } = await import("@/lib/support-tickets.functions"); return updateTicketStatus({ data: { ticketId, status } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }) });
  const createMut = useMutation({ mutationFn: async () => { const { createTicket } = await import("@/lib/support-tickets.functions"); return createTicket({ data: newTicket }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); setShowCreate(false); } });

  const filtered = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);
  const openCount = tickets.filter(t => t.status === "open").length;
  const urgentCount = tickets.filter(t => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TicketIcon className="h-6 w-6 text-primary" /> Support Tickets</h1>
          <p className="text-muted-foreground text-sm">Manage customer support issues with SLA tracking and WhatsApp replies</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Ticket</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className={`rounded-xl p-3 text-center ${urgentCount > 0 ? "bg-red-50 border border-red-200" : "bg-card border"}`}><div className={`text-2xl font-bold ${urgentCount > 0 ? "text-red-700" : ""}`}>{urgentCount}</div><div className={`text-xs ${urgentCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>Urgent</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-600">{openCount}</div><div className="text-xs text-muted-foreground">Open</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-600">{tickets.filter(t => t.status === "in_progress").length}</div><div className="text-xs text-muted-foreground">In Progress</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-600">{tickets.filter(t => t.status === "resolved").length}</div><div className="text-xs text-muted-foreground">Resolved</div></div>
      </div>

      {showCreate && (
        <div className="bg-card border-2 border-primary rounded-xl p-4 max-w-2xl space-y-3">
          <h3 className="font-semibold">New Support Ticket</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input value={newTicket.customerName} onChange={e => setNewTicket(p => ({ ...p, customerName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={newTicket.whatsapp} onChange={e => setNewTicket(p => ({ ...p, whatsapp: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Subject</label><input value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Description</label><textarea value={newTicket.description} onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Category</label><select value={newTicket.category} onChange={e => setNewTicket(p => ({ ...p, category: e.target.value as TicketCategory }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Priority</label><select value={newTicket.priority} onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value as TicketPriority }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{["low","normal","high","urgent"].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div className="flex gap-2"><button onClick={() => createMut.mutate()} disabled={!newTicket.subject || createMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? "Creating…" : "Create Ticket"}</button><button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button></div>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {["all","open","in_progress","resolved","closed"].map(s => <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{s.replace("_"," ")}</button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map(t => (
            <button key={t.id} onClick={() => setSelectedTicket(t)} className={`w-full text-left bg-card border rounded-xl p-3 hover:border-primary/50 transition-colors ${selectedTicket?.id === t.id ? "border-primary" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">{t.ticketNo}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace("_"," ")}</span>
              </div>
              <div className="font-medium text-sm truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground">{t.customerName} · {new Date(t.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-card border rounded-xl p-4 space-y-3 sticky top-6">
              <div className="flex items-start justify-between gap-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-semibold">{selectedTicket.subject}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedTicket.priority]}`}>{selectedTicket.priority}</span></div><div className="text-sm text-muted-foreground">{selectedTicket.customerName} · {selectedTicket.whatsapp} · {selectedTicket.category}</div></div>
                <select value={selectedTicket.status} onChange={e => statusMut.mutate({ ticketId: selectedTicket.id, status: e.target.value as SupportTicket["status"] })} className="px-2 py-1 border rounded text-xs bg-background">{["open","in_progress","waiting_customer","resolved","closed"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}</select>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-sm">{selectedTicket.description}</div>
              {selectedTicket.slaDeadline && <div className={`flex items-center gap-1.5 text-xs ${new Date(selectedTicket.slaDeadline) < new Date() ? "text-red-600" : "text-muted-foreground"}`}><Clock className="h-3.5 w-3.5" />SLA: {new Date(selectedTicket.slaDeadline).toLocaleString()}</div>}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTicket.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.authorType === "agent" ? "justify-end" : ""}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.authorType === "agent" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"}`}>
                      <div className="text-xs opacity-70 mb-0.5">{msg.author}</div>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-3">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Type reply…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={sendToCustomer} onChange={e => setSendToCustomer(e.target.checked)} /><span>Send to customer via WhatsApp</span></label>
                  <button onClick={() => replyMut.mutate()} disabled={!replyText.trim() || replyMut.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"><Send className="h-3.5 w-3.5" />Send</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Select a ticket to view details</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
