import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Truck, Send, ChevronRight, CheckCircle } from "lucide-react";
import type { TrackedOrder, OrderStage } from "@/lib/order-tracking.functions";

export const Route = createFileRoute("/_app/order-tracking")({
  component: OrderTrackingPage,
});

const ALL_STAGES: OrderStage[] = ["placed","payment_confirmed","processing","credentials_sent","delivered","completed"];
const STAGE_LABELS: Record<OrderStage, string> = { placed: "Order Placed", payment_confirmed: "Payment Confirmed", processing: "Processing", credentials_sent: "Credentials Sent", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" };
const STAGE_ICONS: Record<OrderStage, string> = { placed: "📋", payment_confirmed: "💳", processing: "⚙️", credentials_sent: "🔑", delivered: "📦", completed: "✅", cancelled: "❌" };

function makeOrder(i: number): TrackedOrder {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig"];
  const products = ["ChatGPT Plus","Netflix Premium","Canva Pro","Midjourney Pro","Adobe CC","Spotify Family"];
  const amounts = [3500,2500,1800,4200,5500,1200];
  const stages: OrderStage[] = ["completed","credentials_sent","processing","payment_confirmed","placed","delivered"];
  const stage = stages[i];
  const stageIdx = ALL_STAGES.indexOf(stage);
  const d = new Date(); d.setDate(d.getDate() - i);
  const timeline = ALL_STAGES.slice(0, Math.max(1, stageIdx + 1)).map((s, si) => { const t = new Date(d); t.setHours(t.getHours() + si * 2); return { stage: s, label: STAGE_LABELS[s], timestamp: t.toISOString(), notifiedCustomer: si < stageIdx, note: s === "credentials_sent" ? "Sent via WA" : undefined }; });
  return { id: `to${i+1}`, orderId: `ORD-${4500-i}`, customerName: names[i], whatsapp: `030${i}1234567`, product: products[i], amount: amounts[i], currentStage: stage, timeline, createdAt: d.toISOString() };
}
const MOCK_ORDERS: TrackedOrder[] = Array.from({ length: 6 }, (_, i) => makeOrder(i));

export default function OrderTrackingPage() {
  const [selected, setSelected] = useState<TrackedOrder>(MOCK_ORDERS[0]);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const qc = useQueryClient();

  const { data: orders = MOCK_ORDERS } = useQuery({ queryKey: ["tracked-orders"], queryFn: async () => { const { getTrackedOrders } = await import("@/lib/order-tracking.functions"); return getTrackedOrders(); }, placeholderData: MOCK_ORDERS, staleTime: 30_000 });

  const advanceMut = useMutation({ mutationFn: async (newStage: string) => { const { advanceOrderStage } = await import("@/lib/order-tracking.functions"); return advanceOrderStage({ data: { orderId: selected.id, newStage, note, notifyCustomer } }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracked-orders"] }); setAdvancing(null); setNote(""); } });
  const notifyMut = useMutation({ mutationFn: async () => { const { sendStatusUpdate } = await import("@/lib/order-tracking.functions"); return sendStatusUpdate({ data: { orderId: selected.id, stage: selected.currentStage } }); } });

  const currentIdx = ALL_STAGES.indexOf(selected.currentStage);
  const nextStage = currentIdx < ALL_STAGES.length - 1 ? ALL_STAGES[currentIdx + 1] : null;

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Order Tracking</h1><p className="text-muted-foreground text-sm">Track order progress stage-by-stage — notify customers at each milestone via WhatsApp</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {(orders as typeof MOCK_ORDERS).map(order => (
            <button key={order.id} onClick={() => setSelected(order)} className={`w-full text-left bg-card border rounded-xl p-3 transition-colors ${selected.id === order.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
              <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{order.customerName}</span><span className="text-xs text-muted-foreground">{order.orderId}</span></div>
              <div className="text-xs text-muted-foreground mb-1">{order.product} · PKR {order.amount.toLocaleString()}</div>
              <div className="text-xs font-medium">{STAGE_ICONS[order.currentStage]} {STAGE_LABELS[order.currentStage]}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div><div className="font-bold">{selected.customerName}</div><div className="text-sm text-muted-foreground">{selected.whatsapp} · {selected.orderId} · {selected.product}</div></div>
              <div className="text-right"><div className="font-bold">PKR {selected.amount.toLocaleString()}</div><button onClick={() => notifyMut.mutate()} disabled={notifyMut.isPending} className="flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white rounded text-xs mt-1"><Send className="h-3 w-3" />{notifyMut.isPending ? "…" : "WA Update"}</button></div>
            </div>
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
              {ALL_STAGES.filter(s => s !== "cancelled").map((stage, i) => {
                const done = ALL_STAGES.indexOf(stage) <= currentIdx;
                const current = stage === selected.currentStage;
                return <div key={stage} className="flex items-center gap-1 shrink-0"><div className={`flex flex-col items-center gap-0.5`}><div className={`h-7 w-7 rounded-full flex items-center justify-center text-sm ${current ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{done ? "✓" : i+1}</div><div className="text-xs whitespace-nowrap" style={{ fontSize: "10px" }}>{STAGE_LABELS[stage].split(" ")[0]}</div></div>{i < ALL_STAGES.filter(s=>s!=="cancelled").length-1 && <ChevronRight className={`h-4 w-4 shrink-0 ${done ? "text-primary" : "text-muted"}`} />}</div>;
              })}
            </div>
            <div className="space-y-2">
              {selected.timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center"><div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-xs">{STAGE_ICONS[event.stage]}</div>{i < selected.timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}</div>
                  <div className="pb-3"><div className="text-sm font-medium">{event.label}</div><div className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}{event.note && ` · ${event.note}`}</div>{event.notifiedCustomer && <div className="text-xs text-green-600">✓ Customer notified</div>}</div>
                </div>
              ))}
            </div>
          </div>

          {nextStage && selected.currentStage !== "completed" && (
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <div className="font-medium text-sm">Advance to: {STAGE_ICONS[nextStage]} {STAGE_LABELS[nextStage]}</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note (e.g., sent via Gmail)" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={notifyCustomer} onChange={e => setNotifyCustomer(e.target.checked)} />Notify customer via WhatsApp</label>
                <button onClick={() => advanceMut.mutate(nextStage)} disabled={advanceMut.isPending} className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><CheckCircle className="h-4 w-4" />{advanceMut.isPending ? "Advancing…" : `Mark ${STAGE_LABELS[nextStage]}`}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
