import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, KpiCard, Input, Textarea, Select, Toggle } from "@/components/ui-kit";
import {
  Crown, DollarSign, MousePointer, Workflow, Megaphone, Plus, Trash2,
  Sparkles, Send, Play, RefreshCw, Smartphone, Layers, CheckCircle2, MessageSquare
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/wati")({
  component: WatiSuitePage,
});

interface CostAnalytics {
  totalSpent: number;
  currency: string;
  markupSavings: number;
  breakdown: {
    marketing: number;
    utility: number;
    authentication: number;
    service: number;
  };
}

interface InteractiveTemplate {
  id: string;
  name: string;
  type: "buttons" | "list";
  bodyText: string;
  options: any[];
  createdAt?: string;
}

interface AdLead {
  id: string;
  adId: string;
  sourcePlatform: string;
  referralData: any;
  timestamp: string;
}

interface ChatbotNode {
  id: string;
  type: "trigger" | "reply" | "tag" | "action";
  label: string;
  value: string;
  nextId?: string;
}

interface ChatbotFlow {
  id: string;
  name: string;
  active: boolean;
  nodes: ChatbotNode[];
  createdAt?: string;
  updatedAt?: string;
}

function WatiSuitePage() {
  const [activeTab, setActiveTab] = useState<"billing" | "templates" | "chatbot" | "leads">("billing");
  
  // Cost States
  const [costStats, setCostStats] = useState<CostAnalytics>({
    totalSpent: 42.85,
    currency: "USD",
    markupSavings: 8.57,
    breakdown: { marketing: 22.05, utility: 10.40, authentication: 4.40, service: 6.00 }
  });
  
  // Template States
  const [templates, setTemplates] = useState<InteractiveTemplate[]>([
    {
      id: "INT-1",
      name: "welcome_buttons",
      type: "buttons",
      bodyText: "SuperSender Pro main aapka khushamdeed! Niche diye gaye buttons se ek option select karein:",
      options: [
        { id: "opt-1", title: "Rate Sweep Info" },
        { id: "opt-2", title: "AI Store Agent" },
        { id: "opt-3", title: "Talk to Human" }
      ]
    },
    {
      id: "INT-2",
      name: "support_options_list",
      type: "list",
      bodyText: "Aap kis cheez ke baare main information chahte hain?",
      options: [
        {
          title: "AI Tools Deals",
          rows: [
            { id: "row-1", title: "Canva Premium", description: "Standard rates and availability" },
            { id: "row-2", title: "ChatGPT Plus", description: "Shared and private packages" }
          ]
        },
        {
          title: "Account Support",
          rows: [
            { id: "row-3", title: "Payment Issue", description: "Verify transactions" },
            { id: "row-4", title: "Warranty Claim", description: "Ask for replacement" }
          ]
        }
      ]
    }
  ]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<"buttons" | "list">("buttons");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateOptions, setNewTemplateOptions] = useState<string>("Rate Sweep Info, AI Store Agent, Talk to Human");

  // Chatbot Flow States
  const [flows, setFlows] = useState<ChatbotFlow[]>([
    {
      id: "FLOW-1",
      name: "AI Welcome & Greeting",
      active: true,
      nodes: [
        { id: "node-1", type: "trigger", label: "Trigger Word", value: "hello, hi, assalam" },
        { id: "node-2", type: "reply", label: "Send Reply", value: "Assalamu Alaikum! SuperSender Bot main aapka khushamdeed. Main aapki kya madad kar sakta hoon?" },
        { id: "node-3", type: "tag", label: "Tag Contact", value: "New Lead" }
      ]
    },
    {
      id: "FLOW-2",
      name: "Canva Pro Purchase Flow",
      active: false,
      nodes: [
        { id: "node-1", type: "trigger", label: "Trigger Word", value: "canva, buy canva" },
        { id: "node-2", type: "reply", label: "Send Reply", value: "Canva Premium price is PKR 450/month. Please pay via EasyPaisa and send the screenshot." },
        { id: "node-3", type: "tag", label: "Tag Contact", value: "Interested Canva" }
      ]
    }
  ]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>("FLOW-1");
  const [editingFlowName, setEditingFlowName] = useState("");
  const [editingFlowNodes, setEditingFlowNodes] = useState<ChatbotNode[]>([]);
  
  // Interactive Chatbot Simulator States
  const [simMessages, setSimMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Simulated chat window. flow check karne ke liye koi trigger word message karein (e.g. 'hello' ya 'canva')." }
  ]);
  const [simInput, setSimInput] = useState("");

  // Ad Lead States
  const [adLeads, setAdLeads] = useState<AdLead[]>([
    { id: "LEAD-1", adId: "ad_fb_120409", sourcePlatform: "facebook", referralData: { adName: "Eid Promo Video", campaign: "Conversations PK" }, timestamp: new Date().toISOString() },
    { id: "LEAD-2", adId: "ad_ig_593849", sourcePlatform: "instagram", referralData: { adName: "AI Tool Deal Carousel", campaign: "Lead Generation" }, timestamp: new Date().toISOString() }
  ]);
  const [simAdId, setSimAdId] = useState("ad_fb_993041");
  const [simPlatform, setSimPlatform] = useState("facebook");

  // Load Data from Backend APIs
  async function loadData() {
    try {
      const costs = await api.getWatiCosts();
      if (costs && costs.success) {
        setCostStats(costs);
      }
      const tps = await api.getWatiTemplates();
      if (tps && tps.success && tps.templates.length > 0) {
        setTemplates(tps.templates);
      }
      const lds = await api.getWatiAdLeads();
      if (lds && lds.success && lds.leads.length > 0) {
        setAdLeads(lds.leads);
      }
      const fls = await api.getWatiFlows();
      if (fls && fls.success && fls.flows.length > 0) {
        setFlows(fls.flows);
      }
    } catch (e: any) {
      console.warn("Wati APIs failed or in demo mode. Falling back to demo data.", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Update Editing Flow State
  useEffect(() => {
    if (selectedFlowId) {
      const flow = flows.find(f => f.id === selectedFlowId);
      if (flow) {
        setEditingFlowName(flow.name);
        setEditingFlowNodes(flow.nodes);
      }
    }
  }, [selectedFlowId, flows]);

  // Wati Cost Logging simulation
  async function handleLogSimulatedCost(category: string) {
    try {
      const res = await api.logWatiCost({ category, tenantId: "default-tenant", currency: "USD", country: "PK" });
      if (res && res.success) {
        toast.success(`Log successful! Injected 1 simulated ${category} conversation cost.`);
        loadData();
      } else {
        // Fallback local logging
        const rates: Record<string, number> = { marketing: 0.0147, utility: 0.008, authentication: 0.004, service: 0.005 };
        const cost = rates[category] || 0.005;
        setCostStats(prev => {
          const updatedBreakdown = { ...prev.breakdown, [category]: prev.breakdown[category as keyof typeof prev.breakdown] + cost };
          const updatedSpent = prev.totalSpent + cost;
          return {
            ...prev,
            totalSpent: parseFloat(updatedSpent.toFixed(4)),
            markupSavings: parseFloat((updatedSpent * 0.20).toFixed(4)),
            breakdown: updatedBreakdown
          };
        });
        toast.success(`Logged simulated ${category} cost local fallback.`);
      }
    } catch {
      toast.error("Cost logging failed.");
    }
  }

  // Wati Template Builder Action
  async function handleCreateTemplate() {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      toast.error("Template Name and Body Text are required.");
      return;
    }

    let parsedOptions: any[] = [];
    if (newTemplateType === "buttons") {
      parsedOptions = newTemplateOptions.split(",").map((o, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        title: o.trim()
      })).slice(0, 3);
    } else {
      parsedOptions = [
        {
          title: "Options List",
          rows: newTemplateOptions.split(",").map((o, idx) => ({
            id: `row-${Date.now()}-${idx}`,
            title: o.trim().slice(0, 24),
            description: "Category description details"
          })).slice(0, 10)
        }
      ];
    }

    const payload = {
      tenantId: "default-tenant",
      name: newTemplateName.trim().replace(/\s+/g, "_").toLowerCase(),
      type: newTemplateType,
      bodyText: newTemplateBody.trim(),
      options: parsedOptions
    };

    try {
      const res = await api.createWatiTemplate(payload);
      if (res && res.success) {
        toast.success("Interactive template created on backend!");
        setNewTemplateName("");
        setNewTemplateBody("");
        loadData();
      } else {
        // Fallback local
        const newTmp: InteractiveTemplate = {
          id: `INT-${Date.now()}`,
          name: payload.name,
          type: payload.type,
          bodyText: payload.bodyText,
          options: payload.options
        };
        setTemplates(prev => [...prev, newTmp]);
        setNewTemplateName("");
        setNewTemplateBody("");
        toast.success("Interactive template created successfully (Local).");
      }
    } catch {
      toast.error("Failed to create template.");
    }
  }

  // Wati Click-to-WhatsApp Simulation
  async function handleSimulateAdClick() {
    const payload = {
      tenantId: "default-tenant",
      adId: simAdId,
      sourcePlatform: simPlatform,
      referralData: {
        adName: "Simulated Campaign Video Ad",
        campaign: "Wati Suite Promo PK"
      }
    };
    try {
      const res = await api.trackWatiAdLead(payload);
      if (res && res.success) {
        toast.success("Ad Lead successfully logged to database!");
        loadData();
      } else {
        // Fallback local
        const newLd: AdLead = {
          id: `LEAD-${Date.now()}`,
          adId: payload.adId,
          sourcePlatform: payload.sourcePlatform,
          referralData: payload.referralData,
          timestamp: new Date().toISOString()
        };
        setAdLeads(prev => [newLd, ...prev]);
        toast.success("Simulated Ad Lead captured (Local).");
      }
    } catch {
      toast.error("Failed to simulate ad lead.");
    }
  }

  // Wati Flow Builder Actions
  function handleAddNode() {
    const newNode: ChatbotNode = {
      id: `node-${Date.now()}`,
      type: "reply",
      label: "Send Reply",
      value: "Enter message details..."
    };
    setEditingFlowNodes(prev => [...prev, newNode]);
  }

  function handleRemoveNode(id: string) {
    setEditingFlowNodes(prev => prev.filter(n => n.id !== id));
  }

  function handleNodeChange(id: string, field: "value" | "type", val: string) {
    setEditingFlowNodes(prev => prev.map(n => {
      if (n.id === id) {
        let label = n.label;
        if (field === "type") {
          label = val === "trigger" ? "Trigger Word" : val === "reply" ? "Send Reply" : val === "tag" ? "Tag Contact" : "System Action";
        }
        return { ...n, [field]: val, label };
      }
      return n;
    }));
  }

  async function handleSaveFlow() {
    if (!selectedFlowId) return;
    const updatedFlow: ChatbotFlow = {
      id: selectedFlowId,
      name: editingFlowName,
      active: flows.find(f => f.id === selectedFlowId)?.active ?? false,
      nodes: editingFlowNodes
    };

    try {
      const res = await api.saveWatiFlow(updatedFlow);
      if (res && res.success) {
        toast.success("Flow saved successfully to server.");
        loadData();
      } else {
        setFlows(prev => prev.map(f => f.id === selectedFlowId ? updatedFlow : f));
        toast.success("Flow saved locally.");
      }
    } catch {
      toast.error("Failed to save flow.");
    }
  }

  function handleToggleFlowActive(id: string) {
    const target = flows.find(f => f.id === id);
    if (!target) return;
    const updated = { ...target, active: !target.active };

    api.saveWatiFlow(updated).then((res) => {
      if (res && res.success) {
        toast.success(`Flow ${updated.active ? "activated" : "deactivated"}`);
        loadData();
      } else {
        setFlows(prev => prev.map(f => f.id === id ? updated : f));
        toast.success(`Flow ${updated.active ? "activated" : "deactivated"} (Local)`);
      }
    });
  }

  async function handleCreateNewFlow() {
    const newId = `FLOW-${Date.now()}`;
    const newFl: ChatbotFlow = {
      id: newId,
      name: "New Conversational Flow",
      active: false,
      nodes: [
        { id: "node-1", type: "trigger", label: "Trigger Word", value: "hello" },
        { id: "node-2", type: "reply", label: "Send Reply", value: "Welcome to our store!" }
      ]
    };
    try {
      const res = await api.saveWatiFlow(newFl);
      if (res && res.success) {
        toast.success("New flow created!");
        loadData();
        setSelectedFlowId(newId);
      } else {
        setFlows(prev => [...prev, newFl]);
        setSelectedFlowId(newId);
        toast.success("New flow initialized locally.");
      }
    } catch {
      toast.error("Failed to create new flow.");
    }
  }

  async function handleDeleteFlow(id: string) {
    if (!confirm("Are you sure you want to delete this flow?")) return;
    try {
      const res = await api.deleteWatiFlow(id);
      if (res && res.success) {
        toast.success("Flow deleted.");
        setSelectedFlowId(flows.find(f => f.id !== id)?.id || null);
        loadData();
      } else {
        setFlows(prev => prev.filter(f => f.id !== id));
        setSelectedFlowId(flows.find(f => f.id !== id)?.id || null);
        toast.success("Flow deleted (Local).");
      }
    } catch {
      toast.error("Failed to delete flow.");
    }
  }

  // Simulated Chat Interface Logic
  function handleSendSimMessage() {
    if (!simInput.trim()) return;
    const txt = simInput.trim();
    setSimMessages(prev => [...prev, { sender: "user", text: txt }]);
    setSimInput("");

    // Look for matches across active flows
    setTimeout(() => {
      let matched = false;
      for (const flow of flows) {
        if (!flow.active) continue;
        const triggerNode = flow.nodes.find(n => n.type === "trigger");
        if (triggerNode) {
          const triggers = triggerNode.value.split(",").map(t => t.trim().toLowerCase());
          if (triggers.some(t => txt.toLowerCase().includes(t))) {
            const replyNode = flow.nodes.find(n => n.type === "reply");
            const tagNode = flow.nodes.find(n => n.type === "tag");
            if (replyNode) {
              setSimMessages(prev => [
                ...prev,
                { sender: "bot", text: replyNode.value }
              ]);
              matched = true;
            }
            if (tagNode) {
              toast.info(`Contact tagged as: [${tagNode.value}]`);
            }
            break;
          }
        }
      }

      if (!matched) {
        setSimMessages(prev => [
          ...prev,
          { sender: "bot", text: "Sorry, direct triggers match nahi hue. Type 'hello' or 'canva' to see flow matches." }
        ]);
      }
    }, 600);
  }

  return (
    <>
      <PageHeader
        title="Wati Business Suite"
        subtitle="Manage WhatsApp marketing campaigns, 0% Markup conversation bills, visual flows, and ad attribution."
        actions={
          <div className="flex gap-2">
            <Btn variant="outline" onClick={loadData}><RefreshCw className="h-4 w-4" /> Sync Data</Btn>
            <Btn variant="primary"><Crown className="h-4 w-4 text-warning" /> Wati Enterprise Mode</Btn>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 gap-2 overflow-x-auto">
        {[
          { id: "billing", label: "Billing & 0% Markup", icon: DollarSign },
          { id: "templates", label: "Interactive Templates", icon: Smartphone },
          { id: "chatbot", label: "Chatbot Flow Builder", icon: Workflow },
          { id: "leads", label: "Click-to-WhatsApp Leads", icon: Megaphone }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard label="Exact Meta API Cost" value={`$${costStats.totalSpent.toFixed(2)}`} hint="0% markup cost model" icon={DollarSign} accent="success" />
            <KpiCard label="Markup Savings" value={`$${costStats.markupSavings.toFixed(2)}`} hint="Savings vs 20% competitor markup" icon={Crown} accent="primary" />
            <KpiCard label="Total Cost Saved (Overall)" value="PKR ~24,500" hint="No extra subscription fees" icon={Sparkles} accent="info" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="font-semibold mb-3">Cost Breakdown by Category</h2>
              <div className="space-y-3">
                {[
                  { key: "marketing", label: "Marketing", price: 0.0147, desc: "Personalized template broadcasts & promo notifications" },
                  { key: "utility", label: "Utility", price: 0.0080, desc: "Order confirmation, payment receipts, & transaction alerts" },
                  { key: "authentication", label: "Authentication", price: 0.0040, desc: "Secure OTPs and user login verification codes" },
                  { key: "service", label: "Service / Support", price: 0.0050, desc: "Customer-initiated inquiries and live agent chat sessions" }
                ].map(item => {
                  const spent = costStats.breakdown[item.key as keyof typeof costStats.breakdown] || 0;
                  const pct = Math.min(100, Math.max(5, (spent / (costStats.totalSpent || 1)) * 100));
                  return (
                    <div key={item.key} className="p-3 rounded-lg bg-secondary/40 border border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm">{item.label}</span>
                        <div className="text-sm font-semibold">${spent.toFixed(4)} <span className="text-xs text-muted-foreground">({item.price}/msg)</span></div>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-1">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <h2 className="font-semibold mb-2">Simulate Live WhatsApp Activity</h2>
                <p className="text-sm text-muted-foreground mb-4">Meta APIs charging live simulation tools. Niche conversation triggers log direct API bills. Click to simulate incoming traffic charges:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="outline" className="flex items-center gap-1 text-xs" onClick={() => handleLogSimulatedCost("marketing")}>
                    <Send className="h-3 w-3" /> Log Marketing Cost
                  </Btn>
                  <Btn variant="outline" className="flex items-center gap-1 text-xs" onClick={() => handleLogSimulatedCost("utility")}>
                    <CheckCircle2 className="h-3 w-3" /> Log Utility Cost
                  </Btn>
                  <Btn variant="outline" className="flex items-center gap-1 text-xs" onClick={() => handleLogSimulatedCost("authentication")}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Log Auth OTP Cost
                  </Btn>
                  <Btn variant="outline" className="flex items-center gap-1 text-xs" onClick={() => handleLogSimulatedCost("service")}>
                    <MessageSquare className="h-3 w-3" /> Log Support Cost
                  </Btn>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mt-4">
                <h3 className="font-semibold text-primary text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> 0% Markup Savings Advantage
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Competitors like Wati.io and Charles charge up to a 20% markup on top of Meta's standard conversational fees, in addition to fixed subscriptions. With SuperSender Pro's Direct API Adapter, you bypass intermediate markups completely, paying only the exact raw Meta fees directly from your payment method.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <Card className="space-y-4">
            <h2 className="font-semibold">Interactive Template Creator</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Template Name (Unique identifier)</label>
                <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="e.g. promo_deals_button" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Interactive Type</label>
                  <Select value={newTemplateType} onChange={(e) => setNewTemplateType(e.target.value as any)}>
                    <option value="buttons">Interactive Reply Buttons (Max 3)</option>
                    <option value="list">Interactive Select List Menu (Max 10)</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Options List (comma-separated)</label>
                  <Input value={newTemplateOptions} onChange={(e) => setNewTemplateOptions(e.target.value)} placeholder="e.g. Yes, No, Ask details" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Body Text Content</label>
                <Textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} rows={3} placeholder="WhatsApp message details..." />
              </div>
              <Btn variant="primary" className="w-full flex items-center gap-1.5" onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4" /> Save Interactive Template
              </Btn>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-3">Saved Interactive Templates</h3>
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {t.name}
                        <Badge variant="info">{t.type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-lg mt-1">{t.bodyText}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.type === "buttons" ? `${t.options.length} buttons` : "list menu"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Smartphone Mockup */}
          <div className="flex justify-center">
            <div className="w-[360px] h-[640px] rounded-[36px] border-[10px] border-slate-800 bg-[#0b141a] overflow-hidden flex flex-col shadow-2xl relative">
              <div className="bg-[#075e54] text-white px-4 py-5 flex items-center gap-3 pt-7">
                <Smartphone className="h-5 w-5" />
                <div>
                  <div className="text-sm font-semibold">SuperSender Pro Bot</div>
                  <div className="text-[10px] opacity-80">Online</div>
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                <div className="bg-[#dcf8c6] text-slate-800 p-2.5 rounded-lg text-xs max-w-[85%] ml-auto shadow rounded-tr-none">
                  {newTemplateBody || "Type body text in the form to see preview..."}
                  
                  {/* Interactive Button Preview */}
                  {newTemplateType === "buttons" && (
                    <div className="mt-2 border-t border-slate-200/50 pt-2 space-y-1.5">
                      {newTemplateOptions.split(",").filter(Boolean).map((o, idx) => (
                        <div key={idx} className="bg-white text-[#00a884] py-1.5 rounded text-center font-medium shadow-sm hover:bg-slate-50 cursor-pointer">
                          {o.trim()}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive List Preview */}
                  {newTemplateType === "list" && (
                    <div className="mt-2 border-t border-slate-200/50 pt-2">
                      <div className="bg-white text-[#00a884] py-2 rounded text-center font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                        <Layers className="h-3 w-3" /> Select Options List
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-900/40 p-2 border-t border-border flex items-center">
                <div className="bg-slate-850 h-8 rounded-full flex-1 px-3 text-xs text-muted-foreground flex items-center">Type a message...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "chatbot" && (
        <div className="grid lg:grid-cols-[280px_1fr_340px] gap-6">
          {/* Flows Sidebar */}
          <Card className="p-0 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Bot Flows</span>
              <Btn variant="ghost" className="h-7 w-7 p-0" onClick={handleCreateNewFlow}><Plus className="h-4 w-4" /></Btn>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {flows.map(f => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFlowId(f.id)}
                  className={`p-3 cursor-pointer hover:bg-accent/40 text-left w-full transition-colors flex items-center justify-between ${selectedFlowId === f.id ? "bg-accent/60" : ""}`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-medium text-sm truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.nodes.length} Actions</div>
                  </div>
                  <Toggle checked={f.active} onChange={() => handleToggleFlowActive(f.id)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Canvas Work Area */}
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <Input value={editingFlowName} onChange={(e) => setEditingFlowName(e.target.value)} className="font-semibold text-base border-transparent bg-transparent p-0 max-w-sm h-7 focus:ring-0 focus:border-transparent" />
                <div className="flex gap-2">
                  <Btn variant="destructive" className="h-8 px-2" onClick={() => selectedFlowId && handleDeleteFlow(selectedFlowId)}><Trash2 className="h-4 w-4" /></Btn>
                  <Btn variant="outline" className="h-8 text-xs" onClick={handleAddNode}><Plus className="h-3.5 w-3.5" /> Add Node</Btn>
                  <Btn variant="primary" className="h-8 text-xs" onClick={handleSaveFlow}><CheckCircle2 className="h-3.5 w-3.5" /> Save Flow</Btn>
                </div>
              </div>

              {/* Canvas Preview Nodes */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {editingFlowNodes.map((n, idx) => (
                  <div key={n.id} className="relative flex flex-col p-4 rounded-xl bg-secondary/40 border border-border">
                    {idx < editingFlowNodes.length - 1 && (
                      <div className="absolute left-[24px] bottom-[-24px] h-[24px] w-[2px] bg-border border-dashed" />
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-primary/20 text-primary rounded-full grid place-items-center text-xs font-bold">{idx + 1}</span>
                        <Select value={n.type} onChange={(e) => handleNodeChange(n.id, "type", e.target.value)} className="h-7 py-0 text-xs w-32 bg-secondary border-border">
                          <option value="trigger">Trigger Word</option>
                          <option value="reply">Bot Reply</option>
                          <option value="tag">Add Tag</option>
                        </Select>
                      </div>
                      <button onClick={() => handleRemoveNode(n.id)} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div>
                      <Input value={n.value} onChange={(e) => handleNodeChange(n.id, "value", e.target.value)} placeholder={n.type === "trigger" ? "e.g. buy, price, info" : n.type === "tag" ? "e.g. Interested" : "Enter message..."} className="text-xs" />
                    </div>
                  </div>
                ))}
                {editingFlowNodes.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-16">No nodes in this flow. Add a Node to start!</div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground pt-4 border-t border-border">
              * Active toggling registers conversation triggers to evaluate incoming customer text.
            </div>
          </Card>

          {/* Interactive Chat Simulator */}
          <Card className="p-0 overflow-hidden flex flex-col h-[500px]">
            <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-1.5"><Play className="h-4 w-4 text-success" /> Live Simulator</span>
              <Btn variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => setSimMessages([{ sender: "bot", text: "Chat history cleared." }])}>Clear</Btn>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {simMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl ${m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary border border-border rounded-bl-none"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border flex gap-2">
              <Input value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="Type triggers (e.g. hi)..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && handleSendSimMessage()} />
              <Btn variant="primary" className="h-8 w-8 p-0" onClick={handleSendSimMessage}><Send className="h-3.5 w-3.5" /></Btn>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "leads" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Attributed Lead Influx</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {["Ad ID", "Platform", "Campaign Name", "Timestamp"].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {adLeads.map(l => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{l.adId}</td>
                      <td className="px-4 py-3">
                        <Badge variant={l.sourcePlatform === "facebook" ? "info" : "warning"}>{l.sourcePlatform}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{l.referralData?.adName || "Direct click"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {adLeads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">No leads captured. Click simulator below to generate mock incoming leads.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold flex items-center gap-1.5"><Megaphone className="h-4 w-4" /> Click-to-WhatsApp Ads</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When a user clicks your Facebook or Instagram ad that redirects to WhatsApp, Meta passes the unique Ad ID and attribution payload into the message metadata. SuperSender Pro automatically extracts this metadata and logs the lead inside the CRM.
            </p>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Simulate Ad Attribution Lead</h3>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ad Target ID</label>
                <Input value={simAdId} onChange={(e) => setSimAdId(e.target.value)} placeholder="e.g. ad_fb_110948" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Referral Platform</label>
                <Select value={simPlatform} onChange={(e) => setSimPlatform(e.target.value)}>
                  <option value="facebook">Facebook Ads</option>
                  <option value="instagram">Instagram Ads</option>
                </Select>
              </div>
              <Btn variant="primary" className="w-full flex items-center justify-center gap-1.5" onClick={handleSimulateAdClick}>
                <MousePointer className="h-4 w-4" /> Simulate Ad Redirect
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
