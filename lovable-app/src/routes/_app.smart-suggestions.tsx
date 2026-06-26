import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Send, X, RefreshCw } from "lucide-react";
import type { SmartSuggestion, SuggestionType, SuggestionPriority } from "@/lib/smart-suggestions.functions";

export const Route = createFileRoute("/_app/smart-suggestions")({
  component: SmartSuggestionsPage,
});

const MOCK_SUGGESTIONS: SmartSuggestion[] = [
  { id: "ss1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", type: "upsell", priority: "urgent", title: "Upsell to Annual Plan", reason: "Ahmed has renewed monthly 8 times — annual saves 25%", suggestedMessage: "Ahmed bhai! 8 mahine se ChatGPT le rahe hain. Annual pe switch karein — PKR 38,000 mein 12 mahine! Abhi reply karein.", potentialRevenue: 38000, confidence: 87, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "ss2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", type: "cross_sell", priority: "high", title: "Cross-sell Canva Pro", reason: "72% of ChatGPT buyers also buy Canva Pro", suggestedMessage: "Sara ji, ChatGPT ke saath Canva Pro bhi try karein! AI + Design = 💪 PKR 1800/month. Interested?", potentialRevenue: 1800, confidence: 72, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "ss3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", type: "renewal", priority: "urgent", title: "Renewal Due in 3 Days", reason: "Subscription expires soon, no renewal order yet", suggestedMessage: "Bilal bhai! Netflix 3 din mein expire hoga. Abhi renew karein PKR 2500. Reply: RENEW", potentialRevenue: 2500, confidence: 95, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "ss4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", type: "winback", priority: "medium", title: "Win Back — 21 Days Inactive", reason: "Last order 21 days ago, usual frequency is 10 days", suggestedMessage: "Fatima ji, yaad kar rahe hain! 😊 Kuch chahiye? Reply karein!", potentialRevenue: 2800, confidence: 54, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: "ss5", customerId: "c5", customerName: "Hassan Malik", whatsapp: "03421234567", type: "celebration", priority: "low", title: "1-Year Anniversary 🎉", reason: "Hassan became a customer exactly 1 year ago today", suggestedMessage: "Hassan bhai, ek saal hogaya! 🎉 Shukriya — 10% OFF next order. Code: YEAR1", potentialRevenue: 350, confidence: 90, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "ss6", customerId: "c6", customerName: "Zara Baig", whatsapp: "03521234567", type: "retention", priority: "high", title: "3 Complaints — Churn Risk 78%", reason: "Zara filed 3 support tickets this month", suggestedMessage: "Zara ji, experience se maafi chahta hoon. Free month de raha hoon aur personally fix karunga!", potentialRevenue: 2500, confidence: 78, isDismissed: false, isActedOn: false, generatedAt: new Date(Date.now() - 86400000).toISOString() },
];

const TYPE_LABELS: Record<SuggestionType, string> = { upsell: "Upsell", winback: "Win-Back", renewal: "Renewal", cross_sell: "Cross-sell", retention: "Retention", celebration: "Celebration" };
const TYPE_COLORS: Record<SuggestionType, string> = { upsell: "bg-green-100 text-green-700", winback: "bg-blue-100 text-blue-700", renewal: "bg-red-100 text-red-700", cross_sell: "bg-purple-100 text-purple-700", retention: "bg-orange-100 text-orange-700", celebration: "bg-yellow-100 text-yellow-700" };
const PRIORITY_BORDER: Record<SuggestionPriority, string> = { urgent: "border-l-red-500", high: "border-l-orange-400", medium: "border-l-yellow-400", low: "border-l-blue-300" };

export default function SmartSuggestionsPage() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [actedOn, setActedOn] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("all");
  const [preview, setPreview] = useState<SmartSuggestion | null>(null);
  const qc = useQueryClient();

  const { data: suggestions = MOCK_SUGGESTIONS } = useQuery({ queryKey: ["smart-suggestions"], queryFn: async () => { const { getSmartSuggestions } = await import("@/lib/smart-suggestions.functions"); return getSmartSuggestions(); }, placeholderData: MOCK_SUGGESTIONS, staleTime: 60_000 });

  const actMut = useMutation({ mutationFn: async (id: string) => { const { actOnSuggestion } = await import("@/lib/smart-suggestions.functions"); await actOnSuggestion({ data: { suggestionId: id } }); return id; }, onSuccess: (id) => { setActedOn(p => new Set([...p, id])); setPreview(null); } });
  const dismissMut = useMutation({ mutationFn: async (id: string) => { const { dismissSuggestion } = await import("@/lib/smart-suggestions.functions"); await dismissSuggestion({ data: { suggestionId: id } }); return id; }, onSuccess: (id) => setDismissed(p => new Set([...p, id])) });
  const refreshMut = useMutation({ mutationFn: async () => { const { regenerateSuggestions } = await import("@/lib/smart-suggestions.functions"); return regenerateSuggestions(); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-suggestions"] }) });

  const visible = (suggestions as typeof MOCK_SUGGESTIONS).filter(s => !s.isDismissed && !dismissed.has(s.id)).filter(s => typeFilter === "all" || s.type === typeFilter).sort((a, b) => { const p = ["urgent","high","medium","low"]; return p.indexOf(a.priority) - p.indexOf(b.priority); });
  const totalPotential = visible.reduce((s, sg) => s + sg.potentialRevenue, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Smart Suggestions</h1><p className="text-muted-foreground text-sm">AI-powered next-best-action per customer — send one message, close more sales</p></div>
        <button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent"><RefreshCw className={`h-4 w-4 ${refreshMut.isPending ? "animate-spin" : ""}`} />{refreshMut.isPending ? "Refreshing…" : "Refresh AI"}</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{visible.length}</div><div className="text-xs text-muted-foreground">Suggestions</div></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-700">{visible.filter(s => s.priority === "urgent").length}</div><div className="text-xs text-red-600">Urgent</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {(totalPotential/1000).toFixed(0)}K</div><div className="text-xs text-green-600">Potential Revenue</div></div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-purple-700">{actedOn.size}</div><div className="text-xs text-purple-600">Acted On</div></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(TYPE_LABELS)].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{t === "all" ? "All" : TYPE_LABELS[t as SuggestionType]}</button>)}
      </div>

      <div className="space-y-3">
        {visible.map(sg => {
          const done = actedOn.has(sg.id);
          return (
            <div key={sg.id} className={`bg-card border-l-4 border rounded-xl p-4 ${PRIORITY_BORDER[sg.priority]} ${done ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{sg.customerName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[sg.type]}`}>{TYPE_LABELS[sg.type]}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${sg.priority === "urgent" ? "bg-red-100 text-red-700" : sg.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>{sg.priority}</span>
                  </div>
                  <div className="font-medium text-sm mb-0.5">{sg.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">{sg.reason}</div>
                  <div className="bg-[#ECE5DD] p-2 rounded-lg"><div className="bg-white rounded-lg rounded-tl-none px-2 py-1.5 text-xs max-w-sm whitespace-pre-line">{sg.suggestedMessage}</div></div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right"><div className="text-sm font-bold text-green-700">PKR {sg.potentialRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">{sg.confidence}% confidence</div></div>
                  {!done ? (
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(sg)} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded text-xs font-medium"><Send className="h-3 w-3" />Send</button>
                      <button onClick={() => dismissMut.mutate(sg.id)} className="p-1.5 border rounded text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : <span className="text-xs text-green-600 font-medium">✓ Sent</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-3">
            <h3 className="font-bold">Send to {preview.customerName}?</h3>
            <div className="text-xs text-muted-foreground">{preview.whatsapp}</div>
            <div className="bg-[#ECE5DD] p-3 rounded-xl"><div className="bg-white rounded-xl rounded-tl-none px-3 py-2 text-sm whitespace-pre-line shadow-sm">{preview.suggestedMessage}</div></div>
            <div className="flex gap-2"><button onClick={() => actMut.mutate(preview.id)} disabled={actMut.isPending} className="flex-1 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium">{actMut.isPending ? "Sending…" : "Send via WhatsApp"}</button><button onClick={() => setPreview(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
