import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircleReply, Plus, Trash2, TestTube, ToggleLeft, ToggleRight } from "lucide-react";
import type { AutoReplyRule, AutoReplyConfig } from "@/lib/auto-reply.functions";

export const Route = createFileRoute("/_app/auto-reply")({
  component: AutoReplyPage,
});

type Tab = "rules" | "add" | "settings" | "test";

const MOCK_RULES: AutoReplyRule[] = [
  { id: "ar1", name: "Price Inquiry", keywords: ["price","rate","kitna"], condition: "contains", isCaseSensitive: false, response: "Aaj ki prices: ChatGPT PKR 3500, Netflix PKR 2500", action: "send_message", priority: 1, isActive: true, matchCount: 234, lastMatchAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "ar2", name: "Order Keyword", keywords: ["buy","order","khareedna"], condition: "contains", isCaseSensitive: false, response: "Order ke liye agent se baat karein ya product ka naam reply karein!", action: "send_message", priority: 2, isActive: true, matchCount: 189, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "ar3", name: "Support Request", keywords: ["help","problem","issue","masla"], condition: "contains", isCaseSensitive: false, response: "Support ticket ban gaya! Agent 15-30 min mein reply karega.", action: "create_ticket", priority: 3, isActive: true, matchCount: 67, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "ar4", name: "Human Agent", keywords: ["agent","human","insan"], condition: "contains", isCaseSensitive: false, response: "Human agent se connect kar raha hoon!", action: "forward_agent", priority: 4, isActive: true, matchCount: 45, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "ar5", name: "Payment Link", keywords: ["payment link","send link"], condition: "contains", isCaseSensitive: false, response: "Payment link bhej raha hoon!", action: "send_payment_link", priority: 5, isActive: false, matchCount: 23, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];
const MOCK_CONFIG: AutoReplyConfig = { isActive: true, respondOutsideHours: true, businessHoursStart: 9, businessHoursEnd: 22, outsideHoursMessage: "Abhi office hours nahi hain. Kal subah 9 baje reply milegi!", defaultFallbackMessage: "Shukriya! Ek agent jald reply karega. 😊" };

const ACTION_LABELS: Record<string, string> = { send_message: "Reply Message", send_catalog: "Send Catalog", create_ticket: "Create Ticket", forward_agent: "Forward to Agent", send_payment_link: "Send Payment Link" };
const ACTION_COLORS: Record<string, string> = { send_message: "bg-blue-100 text-blue-700", send_catalog: "bg-purple-100 text-purple-700", create_ticket: "bg-orange-100 text-orange-700", forward_agent: "bg-green-100 text-green-700", send_payment_link: "bg-yellow-100 text-yellow-700" };

export default function AutoReplyPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [config, setConfig] = useState(MOCK_CONFIG);
  const [newRule, setNewRule] = useState({ name: "", keywords: "", response: "", action: "send_message" });
  const [testMsg, setTestMsg] = useState("");
  const [testResult, setTestResult] = useState<{ matched: boolean; ruleName?: string; response: string; action: string } | null>(null);
  const qc = useQueryClient();

  const { data: rules = MOCK_RULES } = useQuery({ queryKey: ["auto-reply-rules"], queryFn: async () => { const { getAutoReplyRules } = await import("@/lib/auto-reply.functions"); return getAutoReplyRules(); }, placeholderData: MOCK_RULES, staleTime: 60_000 });

  const saveMut = useMutation({ mutationFn: async () => { const { saveAutoReplyRule } = await import("@/lib/auto-reply.functions"); return saveAutoReplyRule({ data: { name: newRule.name, keywords: newRule.keywords.split(",").map(k => k.trim()), condition: "contains", response: newRule.response, action: newRule.action } }); }, onSuccess: () => { setTab("rules"); setNewRule({ name: "", keywords: "", response: "", action: "send_message" }); } });
  const deleteMut = useMutation({ mutationFn: async (ruleId: string) => { const { deleteAutoReplyRule } = await import("@/lib/auto-reply.functions"); return deleteAutoReplyRule({ data: { ruleId } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["auto-reply-rules"] }) });
  const configMut = useMutation({ mutationFn: async () => { const { saveAutoReplyConfig } = await import("@/lib/auto-reply.functions"); return saveAutoReplyConfig({ data: config as unknown as Record<string, unknown> }); } });
  const testMut = useMutation({ mutationFn: async () => { const { testAutoReply } = await import("@/lib/auto-reply.functions"); return testAutoReply({ data: { message: testMsg } }); }, onSuccess: (r) => setTestResult(r as typeof testResult) });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircleReply className="h-6 w-6 text-primary" /> Auto-Reply Engine</h1><p className="text-muted-foreground text-sm">Keyword-triggered instant replies — never miss a customer message</p></div>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{config.isActive ? "Running" : "Off"}</span><button onClick={() => { setConfig(p => ({ ...p, isActive: !p.isActive })); configMut.mutate(); }} className="p-1">{config.isActive ? <ToggleRight className="h-7 w-7 text-green-500" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}</button></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{rules.filter(r => r.isActive).length}</div><div className="text-xs text-muted-foreground">Active Rules</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{rules.reduce((s, r) => s + r.matchCount, 0)}</div><div className="text-xs text-green-600">Total Matches</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-xl font-bold">{rules[0]?.lastMatchAt ? "Just now" : "N/A"}</div><div className="text-xs text-muted-foreground">Last Trigger</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">&lt;1s</div><div className="text-xs text-muted-foreground">Response Time</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["rules","add","settings","test"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "add" ? "Add Rule" : t === "settings" ? "Settings" : t === "test" ? "Test" : "Rules"}</button>)}
      </div>

      {tab === "rules" && (
        <div className="space-y-2">
          {(rules as typeof MOCK_RULES).map(rule => (
            <div key={rule.id} className={`bg-card border rounded-xl p-4 ${!rule.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">#{rule.priority}</span><span className="font-semibold">{rule.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[rule.action]}`}>{ACTION_LABELS[rule.action]}</span>{!rule.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Paused</span>}</div>
                  <div className="flex gap-1 flex-wrap mb-1">{rule.keywords.map(k => <span key={k} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 font-mono">{k}</span>)}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{rule.response}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{rule.matchCount}x</span>
                  <button onClick={() => deleteMut.mutate(rule.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setTab("add")} className="w-full py-3 border-2 border-dashed rounded-xl text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"><Plus className="h-4 w-4" />Add New Rule</button>
        </div>
      )}

      {tab === "add" && (
        <div className="max-w-lg space-y-3 bg-card border rounded-xl p-4">
          <h3 className="font-semibold">Add Auto-Reply Rule</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Rule Name</label><input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Price Inquiry" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Trigger Keywords (comma separated)</label><input value={newRule.keywords} onChange={e => setNewRule(p => ({ ...p, keywords: e.target.value }))} placeholder="price, rate, kitna" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Action</label><select value={newRule.action} onChange={e => setNewRule(p => ({ ...p, action: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{Object.entries(ACTION_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Auto Response Message</label><textarea value={newRule.response} onChange={e => setNewRule(p => ({ ...p, response: e.target.value }))} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <button onClick={() => saveMut.mutate()} disabled={!newRule.name || !newRule.keywords || !newRule.response || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Saving…" : "Save Rule"}</button>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4 bg-card border rounded-xl p-4">
          <h3 className="font-semibold">Auto-Reply Settings</h3>
          <div className="flex items-center justify-between"><div><div className="font-medium text-sm">System Active</div><div className="text-xs text-muted-foreground">Master on/off switch</div></div><button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className="p-1">{config.isActive ? <ToggleRight className="h-7 w-7 text-green-500" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}</button></div>
          <div className="flex items-center justify-between"><div><div className="font-medium text-sm">Respond Outside Hours</div><div className="text-xs text-muted-foreground">Send outside-hours message</div></div><button onClick={() => setConfig(p => ({ ...p, respondOutsideHours: !p.respondOutsideHours }))} className="p-1">{config.respondOutsideHours ? <ToggleRight className="h-7 w-7 text-green-500" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}</button></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-muted-foreground block mb-1">Business Hours Start</label><input type="number" min={0} max={23} value={config.businessHoursStart} onChange={e => setConfig(p => ({ ...p, businessHoursStart: +e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div><div><label className="text-xs text-muted-foreground block mb-1">End Hour</label><input type="number" min={0} max={23} value={config.businessHoursEnd} onChange={e => setConfig(p => ({ ...p, businessHoursEnd: +e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Outside Hours Message</label><textarea value={config.outsideHoursMessage} onChange={e => setConfig(p => ({ ...p, outsideHoursMessage: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Default Fallback (no rule matched)</label><textarea value={config.defaultFallbackMessage} onChange={e => setConfig(p => ({ ...p, defaultFallbackMessage: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <button onClick={() => configMut.mutate()} disabled={configMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{configMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}

      {tab === "test" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" /><h3 className="font-semibold">Test Auto-Reply</h3></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Simulate customer message:</label><input value={testMsg} onChange={e => setTestMsg(e.target.value)} placeholder="e.g., price kitna hai ChatGPT ka?" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <button onClick={() => testMut.mutate()} disabled={!testMsg || testMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{testMut.isPending ? "Processing…" : "Test Message"}</button>
          </div>
          {testResult && (
            <div className="space-y-2">
              <div className={`px-3 py-2 rounded-lg text-xs font-medium ${testResult.matched ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>{testResult.matched ? `✓ Rule matched: ${testResult.ruleName ?? ""} → Action: ${ACTION_LABELS[testResult.action] ?? testResult.action}` : "No rule matched → Using fallback message"}</div>
              <div className="bg-[#ECE5DD] p-4 rounded-xl"><div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs text-sm whitespace-pre-line shadow-sm">{testResult.response}</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
