import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, AlertCircle, CheckCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/subscription-calendar")({
  component: SubscriptionCalendarPage,
});

interface SubEvent {
  id: string;
  customerName: string;
  whatsapp: string;
  product: string;
  date: number;
  daysFromNow: number;
  type: "expiry" | "renewal" | "reminder";
  status: "upcoming" | "today" | "overdue";
}

const today = new Date();
const todayDate = today.getDate();

function buildEvents(): SubEvent[] {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik","Zara Baig","Omar Qureshi","Nadia Shah","Faisal Ahmed","Ayesha Butt"];
  const products = ["ChatGPT Plus","Midjourney Pro","Canva Pro","Netflix Premium","Spotify Family","Adobe CC","LinkedIn Premium","Grammarly Pro"];
  const events: SubEvent[] = [];
  for (let i = 0; i < 10; i++) {
    const d = todayDate + (i - 2);
    const diff = d - todayDate;
    events.push({ id: `e${i}`, customerName: names[i % names.length], whatsapp: `030${i}1234567`, product: products[i % products.length], date: d, daysFromNow: diff, type: diff <= 0 ? "expiry" : diff <= 3 ? "reminder" : "renewal", status: diff < 0 ? "overdue" : diff === 0 ? "today" : "upcoming" });
  }
  return events;
}

const EVENTS = buildEvents();
const STATUS_COLORS = { upcoming: "bg-blue-50 text-blue-700", today: "bg-amber-50 text-amber-700 border-amber-300", overdue: "bg-red-50 text-red-700 border-red-300" };
const TYPE_COLORS = { expiry: "bg-red-100 text-red-600", renewal: "bg-green-100 text-green-600", reminder: "bg-yellow-100 text-yellow-600" };

export default function SubscriptionCalendarPage() {
  const [filter, setFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const filtered = EVENTS.filter(e => filter === "all" || e.status === filter).filter(e => selectedDay === null || e.date === selectedDay);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const eventsByDay: Record<number, SubEvent[]> = {};
  EVENTS.forEach(e => { if (!eventsByDay[e.date]) eventsByDay[e.date] = []; eventsByDay[e.date].push(e); });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> Subscription Calendar</h1>
        <p className="text-muted-foreground text-sm">Track subscription renewals, expiries and send reminders on time</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{EVENTS.filter(e=>e.status==="overdue").length}</div><div className="text-xs text-red-600">Overdue</div></div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-amber-700">{EVENTS.filter(e=>e.status==="today").length}</div><div className="text-xs text-amber-600">Today</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-700">{EVENTS.filter(e=>e.status==="upcoming").length}</div><div className="text-xs text-blue-600">Upcoming (30d)</div></div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="text-sm font-semibold mb-3">{today.toLocaleString("en-PK", { month: "long", year: "numeric" })}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() }).map((_,i) => <div key={`empty${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i+1).map(d => {
            const evs = eventsByDay[d] ?? [];
            const isToday = d === todayDate;
            const hasOverdue = evs.some(e => e.status === "overdue");
            const hasToday = evs.some(e => e.status === "today");
            return (
              <button key={d} onClick={() => setSelectedDay(selectedDay === d ? null : d)} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition-colors ${isToday ? "bg-primary text-primary-foreground" : selectedDay === d ? "border-primary" : "hover:bg-accent border-transparent"} ${evs.length > 0 ? "border" : ""}`}>
                <span>{d}</span>
                {evs.length > 0 && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${hasOverdue ? "bg-red-500" : hasToday ? "bg-amber-400" : "bg-blue-400"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all","upcoming","today","overdue"].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{f}</button>)}
        {selectedDay !== null && <button onClick={() => setSelectedDay(null)} className="px-3 py-1.5 rounded-full text-xs border bg-muted">Day {selectedDay} ×</button>}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30"><tr>{["Customer","WhatsApp","Product","Date","Type","Status"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No events found</td></tr> : filtered.map(e => (
              <tr key={e.id} className="border-b hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{e.customerName}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.whatsapp}</td>
                <td className="px-4 py-3">{e.product}</td>
                <td className="px-4 py-3">{e.daysFromNow === 0 ? "Today" : e.daysFromNow < 0 ? `${Math.abs(e.daysFromNow)}d ago` : `in ${e.daysFromNow}d`}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type]}`}>{e.type}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
