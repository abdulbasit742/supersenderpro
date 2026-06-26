import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Plus, X, Send, Clock } from "lucide-react";
import type { ScheduledBroadcast } from "@/lib/broadcast-scheduler.functions";

export const Route = createFileRoute("/_app/broadcast-scheduler")({
  component: BroadcastSchedulerPage,
});

type Tab = "schedule" | "create";

function makeBroadcast(i: number): ScheduledBroadcast {
  const names = ["Eid Special","Monthly Newsletter","Flash Sale Alert","Renewal Reminder","Weekend Promo"];
  const segments = ["All Customers","VIP Customers","ChatGPT Subscribers","Expiring This Week","Weekend Shoppers"];
  const statuses: ScheduledBroadcast["status"][] = ["sent","scheduled","scheduled","sent","cancelled"];
  const d = new Date(); d.setDate(d.getDate() + (i - 2));
  return { id: `sb${i+1}`, name: names[i], message: `Khususi paigham for ${segments[i]}! Reply for details.`, segment: segments[i], estimatedRecipients: [1200,89,234,67,345][i], scheduledAt: d.toISOString(), status: statuses[i], sentCount: statuses[i]==="sent"?[1140,0,0,64,0][i]:undefined, createdAt: new Date(Date.now()-(5-i)*86400000).toISOString() };
}
const MOCK_BROADCASTS: ScheduledBroadcast[] = Array.from({ length: 5 }, (_, i) => makeBroadcast(i));

const STATUS_COLORS: Record<ScheduledBroadcast["status"], string> = { scheduled: "bg-blue-100 text-blue-700", sending: "bg-yellow-100 text-yellow-700", sent: "bg-green-100 text-green-700", cancelled: "bg-gray-100 text-gray-600", failed: "bg-red-100 text-red-700" };
const SEGMENTS = ["All Customers","VIP Customers","ChatGPT Subscribers","Netflix Subscribers","Expiring This Week","Weekend Shoppers","New Customers","Inactive 30+ Days"];

export default function BroadcastSchedulerPage() {
  const [tab, setTab] = useState<Tab>("schedule");
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [newBcast, setNewBcast] = useState({ name: "", message: "", segment: "All Customers", scheduledAt: "" });
  const qc = useQueryClient();

  const { data: broadcasts = MOCK_BROADCASTS } = useQuery({ queryKey: ["scheduled-broadcasts"], queryFn: async () => { const { getScheduledBroadcasts } = await import("@/lib/broadcast-scheduler.functions"); return getScheduledBroadcasts(); }, placeholderData: MOCK_BROADCASTS, staleTime: 30_000 });

  const scheduleMut = useMutation({ mutationFn: async () => { const { scheduleBoradcast } = await import("@/lib/broadcast-scheduler.functions"); return scheduleBoradcast({ data: { ...newBcast } }); }, onSuccess: () => { setTab("schedule"); setNewBcast({ name: "", message: "", segment: "All Customers", scheduledAt: "" }); qc.invalidateQueries({ queryKey: ["scheduled-broadcasts"] }); } });
  const cancelMut = useMutation({ mutationFn: async (id: string) => { const { cancelScheduled } = await import("@/lib/broadcast-scheduler.functions"); await cancelScheduled({ data: { broadcastId: id } }); return id; }, onSuccess: (id) => setCancelled(p => new Set([...p, id])) });
  const sendNowMut = useMutation({ mutationFn: async (id: string) => { const { sendNow } = await import("@/lib/broadcast-scheduler.functions"); return sendNow({ data: { broadcastId: id } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-broadcasts"] }) });

  const visible = (broadcasts as typeof MOCK_BROADCASTS).map(b => cancelled.has(b.id) ? { ...b, status: "cancelled" as const } : b);
  const upcomingCount = visible.filter(b => b.status === "scheduled").length;
  const sentCount = visible.filter(b => b.status === "sent").length;

  const minDatetime = new Date(); minDatetime.setMinutes(minDatetime.getMinutes() + 30);
  const minStr = minDatetime.toISOString().slice(0, 16);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6 text-primary" /> Broadcast Scheduler</h1><p className="text-muted-foreground text-sm">Schedule WhatsApp blasts in advance — right message, right time, right audience</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Schedule Broadcast</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{upcomingCount}</div><div className="text-xs text-blue-600">Scheduled</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{sentCount}</div><div className="text-xs text-green-600">Sent</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{visible.reduce((s,b) => s + b.estimatedRecipients, 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Recipients</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["schedule","create"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Schedule New" : "All Broadcasts"}</button>)}
      </div>

      {tab === "schedule" && (
        <div className="space-y-3">
          {visible.map(b => (
            <div key={b.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{b.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Segment: {b.segment} · ~{b.estimatedRecipients.toLocaleString()} recipients</div>
                  <div className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3 text-muted-foreground" /><span className={b.status === "scheduled" ? "text-blue-700 font-medium" : "text-muted-foreground"}>{new Date(b.scheduledAt).toLocaleString()}</span></div>
                  {b.sentCount !== undefined && <div className="text-xs text-green-600 mt-0.5">{b.sentCount} delivered</div>}
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.message}</div>
                </div>
                {b.status === "scheduled" && !cancelled.has(b.id) && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => sendNowMut.mutate(b.id)} disabled={sendNowMut.isPending} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded text-xs"><Send className="h-3 w-3" />Now</button>
                    <button onClick={() => cancelMut.mutate(b.id)} disabled={cancelMut.isPending} className="p-1.5 text-muted-foreground border rounded hover:text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Schedule New Broadcast</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Campaign Name</label><input value={newBcast.name} onChange={e => setNewBcast(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Monday Morning Offer" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Target Segment</label><select value={newBcast.segment} onChange={e => setNewBcast(p => ({ ...p, segment: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Message</label><textarea value={newBcast.message} onChange={e => setNewBcast(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Your WhatsApp broadcast message…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Schedule Date & Time</label><input type="datetime-local" value={newBcast.scheduledAt} min={minStr} onChange={e => setNewBcast(p => ({ ...p, scheduledAt: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          {newBcast.scheduledAt && <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Sends: {new Date(newBcast.scheduledAt).toLocaleString()}</div>}
          <button onClick={() => scheduleMut.mutate()} disabled={!newBcast.name || !newBcast.message || !newBcast.scheduledAt || scheduleMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{scheduleMut.isPending ? "Scheduling…" : "Schedule Broadcast"}</button>
        </div>
      )}
    </div>
  );
}
