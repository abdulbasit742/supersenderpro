import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Plus, Play, Pause, Zap, TestTube, MessageSquare } from "lucide-react";
import type { ChatbotFlow } from "@/lib/chatbot-builder.functions";

export const Route = createFileRoute("/_app/chatbot-builder")({
  component: ChatbotBuilderPage,
});

type Tab = "flows" | "create" | "test";

const MOCK_FLOWS: ChatbotFlow[] = [
  { id: "cf1", name: "Price Inquiry Bot", description: "Handles price questions automatically", isActive: true, triggerKeywords: ["price","rate","kitna","cost","qeemat"], nodes: [{ id: "n1", type: "trigger", label: "Price Keyword", position: { x: 0, y: 0 }, keywords: ["price","rate"] }, { id: "n2", type: "button_menu", label: "Product Menu", content: "Aap kaunse product ki price janana chahte hain?", buttons: [{ id: "b1", label: "ChatGPT Plus" }, { id: "b2", label: "Netflix" }, { id: "b3", label: "Canva Pro" }], position: { x: 200, y: 0 } }], totalSessions: 456, totalCompleted: 312, createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "cf2", name: "Order Flow Bot", description: "Guides customers through ordering process", isActive: true, triggerKeywords: ["order","buy","khareedna"], nodes: [], totalSessions: 234, totalCompleted: 198, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
];

const NODE_COLORS: Record<string, string> = { trigger: "bg-yellow-100 border-yellow-400 text-yellow-800", message: "bg-blue-100 border-blue-400 text-blue-800", button_menu: "bg-purple-100 border-purple-400 text-purple-800", condition: "bg-orange-100 border-orange-400 text-orange-800", action: "bg-green-100 border-green-400 text-green-800", end: "bg-gray-100 border-gray-400 text-gray-700" };

export default function ChatbotBuilderPage() {
  const [tab, setTab] = useState<Tab>("flows");
  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow>(MOCK_FLOWS[0]);
  const [newFlow, setNewFlow] = useState({ name: "", description: "", triggerKeywords: "" });
  const [testMsg, setTestMsg] = useState("");
  const [testResult, setTestResult] = useState<{ triggered: boolean; flowName: string; firstResponse: string } | null>(null);
  const qc = useQueryClient();

  const { data: flows = MOCK_FLOWS } = useQuery({ queryKey: ["chatbot-flows"], queryFn: async () => { const { getChatbotFlows } = await import("@/lib/chatbot-builder.functions"); return getChatbotFlows(); }, placeholderData: MOCK_FLOWS, staleTime: 60_000 });

  const toggleMut = useMutation({ mutationFn: async ({ flowId, isActive }: { flowId: string; isActive: boolean }) => { const { toggleFlow } = await import("@/lib/chatbot-builder.functions"); return toggleFlow({ data: { flowId, isActive } }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-flows"] }) });
  const saveMut = useMutation({ mutationFn: async () => { const { saveChatbotFlow } = await import("@/lib/chatbot-builder.functions"); return saveChatbotFlow({ data: { name: newFlow.name, description: newFlow.description, triggerKeywords: newFlow.triggerKeywords.split(",").map(k => k.trim()) } }); }, onSuccess: () => { setTab("flows"); setNewFlow({ name: "", description: "", triggerKeywords: "" }); } });
  const testMut = useMutation({ mutationFn: async () => { const { testFlow } = await import("@/lib/chatbot-builder.functions"); return testFlow({ data: { flowId: selectedFlow.id, testMessage: testMsg } }); }, onSuccess: (r) => setTestResult(r as { triggered: boolean; flowName: string; firstResponse: string }) });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> Chatbot Builder</h1><p className="text-muted-foreground text-sm">Visual keyword-triggered WhatsApp bots — no code needed</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Bot</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{flows.length}</div><div className="text-xs text-muted-foreground">Total Bots</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{flows.filter(f => f.isActive).length}</div><div className="text-xs text-green-600">Active</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{flows.reduce((s, f) => s + f.totalSessions, 0)}</div><div className="text-xs text-muted-foreground">Total Sessions</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{Math.round(flows.reduce((s, f) => s + f.totalCompleted, 0) / Math.max(1, flows.reduce((s, f) => s + f.totalSessions, 0)) * 100)}%</div><div className="text-xs text-muted-foreground">Completion Rate</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["flows","create","test"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Create Bot" : t === "test" ? "Test Bot" : "My Bots"}</button>)}
      </div>

      {tab === "flows" && (
        <div className="space-y-3">
          {(flows as typeof MOCK_FLOWS).map(flow => (
            <div key={flow.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{flow.name}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${flow.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{flow.isActive ? "Active" : "Paused"}</span></div>
                  <div className="text-sm text-muted-foreground mb-2">{flow.description}</div>
                  <div className="flex gap-1 flex-wrap">{flow.triggerKeywords.map(k => <span key={k} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">{k}</span>)}</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right text-xs text-muted-foreground"><div>{flow.totalSessions} sessions</div><div>{flow.totalCompleted} completed</div></div>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedFlow(flow); setTab("test"); }} className="p-1.5 border rounded hover:bg-accent text-xs"><TestTube className="h-3.5 w-3.5" /></button>
                    <button onClick={() => toggleMut.mutate({ flowId: flow.id, isActive: !flow.isActive })} className={`p-1.5 border rounded text-xs ${flow.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}>{flow.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto py-1">
                {flow.nodes.map((node, ni) => <div key={node.id} className={`flex items-center gap-1 shrink-0`}><div className={`px-2 py-1 rounded border text-xs font-medium ${NODE_COLORS[node.type] ?? "bg-gray-100"}`}><div className="text-xs opacity-60 capitalize">{node.type}</div><div>{node.label}</div></div>{ni < flow.nodes.length - 1 && <span className="text-muted-foreground">→</span>}</div>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Create New Chatbot Flow</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Bot Name</label><input value={newFlow.name} onChange={e => setNewFlow(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Price Inquiry Bot" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Description</label><input value={newFlow.description} onChange={e => setNewFlow(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Trigger Keywords (comma separated)</label><input value={newFlow.triggerKeywords} onChange={e => setNewFlow(p => ({ ...p, triggerKeywords: e.target.value }))} placeholder="price, rate, kitna, cost" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">Visual node editor coming soon. Bot will use keyword matching with your configured message templates.</div>
            <button onClick={() => saveMut.mutate()} disabled={!newFlow.name || !newFlow.triggerKeywords || saveMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saveMut.isPending ? "Creating…" : "Create Chatbot"}</button>
          </div>
        </div>
      )}

      {tab === "test" && (
        <div className="max-w-md space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" /><h3 className="font-semibold">Test: {selectedFlow.name}</h3></div>
            <select value={selectedFlow.id} onChange={e => setSelectedFlow((flows as typeof MOCK_FLOWS).find(f => f.id === e.target.value) ?? MOCK_FLOWS[0])} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
              {(flows as typeof MOCK_FLOWS).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div><label className="text-xs text-muted-foreground block mb-1">Simulate customer message:</label><input value={testMsg} onChange={e => setTestMsg(e.target.value)} placeholder="e.g., price kitna hai ChatGPT ka?" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <button onClick={() => testMut.mutate()} disabled={!testMsg || testMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{testMut.isPending ? "Testing…" : "Simulate"}</button>
          </div>
          {testResult && (
            <div className="bg-[#ECE5DD] p-4 rounded-xl space-y-2">
              <div className={`text-xs font-medium ${testResult.triggered ? "text-green-700" : "text-orange-700"}`}>{testResult.triggered ? `✓ Triggered: ${testResult.flowName}` : "No flow matched — fallback message sent"}</div>
              <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs text-sm whitespace-pre-line shadow-sm">{testResult.firstResponse}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
