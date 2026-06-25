import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, Users, Clock, AlertCircle, CheckCircle, MessageSquare, Filter, UserCheck } from "lucide-react";
import type { Conversation, SLAConfig } from "@/lib/team-inbox.functions";

export const Route = createFileRoute("/_app/team-inbox")({
  component: TeamInboxPage,
});

type Tab = "all" | "open" | "pending" | "resolved" | "sla" | "settings";

const PRIORITY_COLORS = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", normal: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-500" };
const STATUS_COLORS = { open: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", resolved: "bg-gray-100 text-gray-500", snoozed: "bg-purple-100 text-purple-700" };

const MOCK_CONVOS: Conversation[] = [
  { id: "c1", customerId: "u1", customerName: "Ahmed Khan", whatsapp: "03001234567", lastMessage: "bhai chatgpt ka price kya hai?", lastMessageAt: new Date(Date.now() - 300000).toISOString(), assignedTo: undefined, status: "open", priority: "high", tags: ["price_inquiry"], unreadCount: 3, slaBreached: false },
  { id: "c2", customerId: "u2", customerName: "Sara Ali", whatsapp: "03111234567", lastMessage: "payment ho gai hai screenshot dekho", lastMessageAt: new Date(Date.now() - 900000).toISOString(), assignedTo: "agent1", assignedName: "Ahsan", status: "pending", priority: "urgent", tags: ["payment"], unreadCount: 1, slaBreached: true },
  { id: "c3", customerId: "u3", customerName: "Bilal Raza", whatsapp: "03211234567", lastMessage: "theek hai bhai shukriya", lastMessageAt: new Date(Date.now() - 3600000).toISOString(), assignedTo: "agent1", assignedName: "Ahsan", status: "resolved", priority: "normal", tags: [], unreadCount: 0, slaBreached: false },
  { id: "c4", customerId: "u4", customerName: "Fatima Noor", whatsapp: "03321234567", lastMessage: "mera order kab aayega?", lastMessageAt: new Date(Date.now() - 1800000).toISOString(), status: "open", priority: "normal", tags: ["order_status"], unreadCount: 2, slaBreached: false },
  { id: "c5", customerId: "u5", customerName: "Usman Shah", whatsapp: "03451234567", lastMessage: "galat item aaya hai complaint", lastMessageAt: new Date(Date.now() - 600000).toISOString(), status: "open", priority: "urgent", tags: ["complaint"], unreadCount: 5, slaBreached: false },
];

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export default function TeamInboxPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [noteText, setNoteText] = useState("");
  const qc = useQueryClient();

  const { data: convos = MOCK_CONVOS } = useQuery({
    queryKey: ["inbox-conversations", tab],
    queryFn: async () => { const { getInboxConversations } = await import("@/lib/team-inbox.functions"); return getInboxConversations({ data: { status: tab === "all" ? "all" : tab as Conversation["status"] } }); },
    placeholderData: MOCK_CONVOS,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["inbox-stats"],
    queryFn: async () => { const { getInboxStats } = await import("@/lib/team-inbox.functions"); return getInboxStats(); },
    placeholderData: { open: 3, pending: 1, resolved: 8, slaBreached: 1, avgResponseMins: 12, totalToday: 18 },
    staleTime: 15_000,
  });

  const { data: slaConfig } = useQuery({
    queryKey: ["sla-config"],
    queryFn: async () => { const { getSLAConfig } = await import("@/lib/team-inbox.functions"); return getSLAConfig(); },
    placeholderData: { urgentMinutes: 15, highMinutes: 60, normalMinutes: 240, lowMinutes: 1440, autoAssign: true, autoEscalate: true, workingHoursStart: 9, workingHoursEnd: 21 } as SLAConfig,
    staleTime: 300_000,
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Conversation["status"] }) => {
      const { updateConversationStatus } = await import("@/lib/team-inbox.functions");
      return updateConversationStatus({ data: { conversationId: id, status } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-conversations"] }),
  });

  const noteMut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { addConversationNote } = await import("@/lib/team-inbox.functions");
      return addConversationNote({ data: { conversationId: id, note } });
    },
    onSuccess: () => setNoteText(""),
  });

  const filtered = tab === "all" ? convos : convos.filter((c) => c.status === tab);
  const breached = convos.filter((c) => c.slaBreached);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6 text-primary" /> Team Inbox & SLA</h1>
        <p className="text-muted-foreground text-sm">Assign conversations, track SLA, collaborate with team</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Open", value: stats?.open ?? 0, color: "bg-green-100 text-green-700" },
          { label: "Pending", value: stats?.pending ?? 0, color: "bg-yellow-100 text-yellow-700" },
          { label: "Resolved", value: stats?.resolved ?? 0, color: "bg-gray-100 text-gray-600" },
          { label: "SLA Breached", value: stats?.slaBreached ?? 0, color: "bg-red-100 text-red-700" },
          { label: "Avg Response", value: `${stats?.avgResponseMins ?? 0}m`, color: "bg-blue-100 text-blue-700" },
          { label: "Today", value: stats?.totalToday ?? 0, color: "bg-purple-100 text-purple-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-xl p-3 text-center`}>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* SLA breached alert */}
      {breached.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700 font-medium">{breached.length} conversation{breached.length > 1 ? "s" : ""} breached SLA — immediate attention needed!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b flex-wrap">
        {(["all","open","pending","resolved","sla","settings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "sla" ? "SLA Breached" : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "open" && stats && stats.open > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">{stats.open}</span>}
          </button>
        ))}
      </div>

      {tab !== "settings" && tab !== "sla" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversation List */}
          <div className="lg:col-span-1 space-y-2">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => setSelected(c)} className={`bg-card border rounded-xl p-3 cursor-pointer transition-colors hover:border-primary ${selected?.id === c.id ? "border-primary bg-primary/5" : ""} ${c.slaBreached ? "border-red-300" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.customerName}</span>
                      {c.unreadCount > 0 && <span className="h-5 w-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center shrink-0">{c.unreadCount}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      {c.slaBreached && <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">SLA!</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : "—"}</div>
                </div>
                {c.assignedName && <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="h-3 w-3" />{c.assignedName}</div>}
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No conversations in this filter</div>}
          </div>

          {/* Conversation Detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="h-full bg-card border rounded-xl flex items-center justify-center text-muted-foreground">
                <div className="text-center"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Select a conversation</p></div>
              </div>
            ) : (
              <div className="bg-card border rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selected.customerName}</h3>
                    <p className="text-sm text-muted-foreground">{selected.whatsapp}</p>
                  </div>
                  <div className="flex gap-2">
                    {(["open","pending","resolved"] as Conversation["status"][]).map((s) => (
                      <button key={s} onClick={() => statusMut.mutate({ id: selected.id, status: s })} className={`px-2.5 py-1 rounded text-xs font-medium ${STATUS_COLORS[s]} hover:opacity-80`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Priority:</span> <span className={`px-1.5 py-0.5 rounded text-xs ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[selected.status]}`}>{selected.status}</span></div>
                  <div><span className="text-muted-foreground">Assigned to:</span> <span className="font-medium">{selected.assignedName ?? "Unassigned"}</span></div>
                  <div><span className="text-muted-foreground">SLA:</span> <span className={selected.slaBreached ? "text-red-600 font-medium" : "text-green-600"}>{selected.slaBreached ? "BREACHED" : "On time"}</span></div>
                </div>
                {selected.tags.length > 0 && (
                  <div className="flex gap-1">{selected.tags.map((t) => <span key={t} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">{t.replace("_"," ")}</span>)}</div>
                )}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Internal Notes</h4>
                  <div className="flex gap-2">
                    <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background" />
                    <button onClick={() => noteMut.mutate({ id: selected.id, note: noteText })} disabled={!noteText || noteMut.isPending} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">Add</button>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <a href={`https://wa.me/${selected.whatsapp?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                    <MessageSquare className="h-4 w-4" /> Open in WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "sla" && (
        <div className="space-y-3">
          {breached.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-green-700 font-medium">No SLA breaches! All conversations are on time.</p></div>
          ) : breached.map((c) => (
            <div key={c.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{c.customerName} <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs ml-1">SLA BREACHED</span></div>
                <div className="text-sm text-muted-foreground">{c.whatsapp} · {c.lastMessage}</div>
                <div className="text-xs text-muted-foreground mt-1">Last activity: {c.lastMessageAt ? timeAgo(c.lastMessageAt) : "—"} ago</div>
              </div>
              <button onClick={() => statusMut.mutate({ id: c.id, status: "open" })} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Escalate Now</button>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && slaConfig && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> SLA Response Times</h3>
            {(["urgentMinutes","highMinutes","normalMinutes","lowMinutes"] as (keyof SLAConfig)[]).map((key) => {
              const label = key.replace("Minutes","").charAt(0).toUpperCase() + key.replace("Minutes","").slice(1);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium">{label}</span>
                  <input type="number" defaultValue={slaConfig[key] as number} className="w-28 px-3 py-1.5 border rounded text-sm bg-background" />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
              );
            })}
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Automation</h3>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked={slaConfig.autoAssign} className="rounded" /><span className="text-sm">Auto-assign new conversations to team members</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked={slaConfig.autoEscalate} className="rounded" /><span className="text-sm">Auto-escalate SLA breaches</span></label>
            <div className="flex items-center gap-3">
              <span className="text-sm">Working hours:</span>
              <input type="number" defaultValue={slaConfig.workingHoursStart} className="w-16 px-2 py-1 border rounded text-sm bg-background" min={0} max={23} />
              <span className="text-sm text-muted-foreground">to</span>
              <input type="number" defaultValue={slaConfig.workingHoursEnd} className="w-16 px-2 py-1 border rounded text-sm bg-background" min={0} max={23} />
            </div>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Save SLA Settings</button>
        </div>
      )}
    </div>
  );
}
