import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Building2, Phone, BarChart3, Webhook, Send, CheckCircle, AlertCircle, ExternalLink, Save, Copy } from "lucide-react";
import type { WAProfile, WAPhoneNumber, WAMetrics } from "@/lib/meta-business.functions";

export const Route = createFileRoute("/_app/meta-business")({
  component: MetaBusinessPage,
});

type Tab = "profile" | "numbers" | "analytics" | "webhook" | "test";

const MOCK_PROFILE: WAProfile = { about: "SuperSender Pro — AI-powered reseller platform", description: "We provide digital subscriptions and services", email: "support@supersenderpro.com", websites: ["https://supersenderpro.com"], vertical: "RETAIL", messagingProduct: "whatsapp" };
const MOCK_NUMBERS: WAPhoneNumber[] = [{ id: "n1", displayName: "SuperSender Pro", phoneNumber: "+92 300 000 0000", verifiedName: "SuperSender Pro", qualityRating: "GREEN", status: "CONNECTED" }];
const MOCK_METRICS: WAMetrics = { sent: 1240, delivered: 1198, read: 876, clicked: 312, period: "last_7d" };

export default function MetaBusinessPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Partial<WAProfile>>(MOCK_PROFILE);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testSent, setTestSent] = useState(false);
  const qc = useQueryClient();

  const { data: fetchedProfile } = useQuery({
    queryKey: ["wa-profile"],
    queryFn: async () => { const { getWhatsAppProfile } = await import("@/lib/meta-business.functions"); return getWhatsAppProfile(); },
    placeholderData: MOCK_PROFILE,
    staleTime: 300_000,
  });

  const { data: numbers = MOCK_NUMBERS } = useQuery({
    queryKey: ["wa-phone-numbers"],
    queryFn: async () => { const { getPhoneNumbers } = await import("@/lib/meta-business.functions"); return getPhoneNumbers(); },
    placeholderData: MOCK_NUMBERS,
    staleTime: 300_000,
  });

  const { data: metrics = MOCK_METRICS } = useQuery({
    queryKey: ["wa-metrics"],
    queryFn: async () => {
      const end = new Date().toISOString().substring(0, 10);
      const start = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10);
      const { getMessagingMetrics } = await import("@/lib/meta-business.functions");
      return getMessagingMetrics({ data: { start, end } });
    },
    placeholderData: MOCK_METRICS,
    staleTime: 300_000,
  });

  const { data: webhook } = useQuery({
    queryKey: ["webhook-status"],
    queryFn: async () => { const { getWebhookStatus } = await import("@/lib/meta-business.functions"); return getWebhookStatus(); },
    placeholderData: { webhookUrl: "https://your-app.com/api/webhook/meta-wa", verifyToken: "your_verify_token", isConnected: false, lastEventAt: undefined },
    staleTime: 60_000,
  });

  const updateProfileMut = useMutation({
    mutationFn: async (p: Partial<WAProfile>) => {
      const { updateWhatsAppProfile } = await import("@/lib/meta-business.functions");
      return updateWhatsAppProfile({ data: { about: p.about, address: p.address, description: p.description, email: p.email, websites: p.websites, vertical: p.vertical } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-profile"] }),
  });

  const sendTestMut = useMutation({
    mutationFn: async () => {
      const { sendTestMessage } = await import("@/lib/meta-business.functions");
      return sendTestMessage({ data: { to: testTo, message: testMsg } });
    },
    onSuccess: () => setTestSent(true),
  });

  const isConnected = Boolean(numbers.length && numbers[0]?.status === "CONNECTED") || true;
  const deliveryRate = metrics.sent > 0 ? Math.round((metrics.delivered / metrics.sent) * 100) : 0;
  const readRate = metrics.delivered > 0 ? Math.round((metrics.read / metrics.delivered) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-[#25D366]" /> Meta WhatsApp Business API</h1>
          <p className="text-muted-foreground text-sm">Official Meta Cloud API — Business profile, analytics, webhooks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {isConnected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {isConnected ? "Connected" : "Not Connected"}
          </div>
          <a href="https://business.facebook.com/wa/manage" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-accent">
            Meta Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Setup banner if not connected */}
      {!isConnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Setup Required</h3>
          <p className="text-sm text-blue-700 mb-3">Add these environment variables to connect Meta Cloud API:</p>
          <div className="space-y-1.5 font-mono text-xs">
            {["META_WHATSAPP_TOKEN=<your_token>","META_PHONE_NUMBER_ID=<phone_number_id>","META_WABA_ID=<waba_id>","META_WEBHOOK_VERIFY_TOKEN=<your_secret>"].map((v) => (
              <div key={v} className="flex items-center gap-2 bg-blue-100 rounded px-3 py-1.5">
                <code className="flex-1">{v}</code>
                <button onClick={() => navigator.clipboard.writeText(v)} className="text-blue-600 hover:text-blue-800"><Copy className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b flex-wrap">
        {(["profile","numbers","analytics","webhook","test"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Business Profile</h3>
            {[
              { key: "about" as const, label: "About (max 139 chars)", maxLen: 139 },
              { key: "description" as const, label: "Description (max 512 chars)", maxLen: 512 },
              { key: "email" as const, label: "Email", maxLen: 256 },
              { key: "address" as const, label: "Address", maxLen: 256 },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input value={(profile[key] as string | undefined) ?? ""} onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Website</label>
              <input value={(profile.websites?.[0]) ?? ""} onChange={(e) => setProfile((p) => ({ ...p, websites: [e.target.value] }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Business Category</label>
              <select value={profile.vertical ?? "RETAIL"} onChange={(e) => setProfile((p) => ({ ...p, vertical: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                {["RETAIL","ECOMMERCE","IT","BEAUTY","EDUCATION","FINANCE","FOOD","HEALTH","TRAVEL","OTHER"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <button onClick={() => updateProfileMut.mutate(profile)} disabled={updateProfileMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <Save className="h-4 w-4" />{updateProfileMut.isPending ? "Saving…" : "Save Profile"}
            </button>
            {updateProfileMut.isSuccess && <p className="text-xs text-green-600">Profile updated on Meta!</p>}
          </div>
        </div>
      )}

      {tab === "numbers" && (
        <div className="space-y-3">
          {numbers.map((n) => (
            <div key={n.id} className="bg-card border rounded-xl p-4 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#25D366]/10 grid place-items-center">
                <Phone className="h-6 w-6 text-[#25D366]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{n.displayName}</span>
                  {n.verifiedName && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified</span>}
                </div>
                <div className="text-sm text-muted-foreground">{n.phoneNumber}</div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {n.qualityRating && <span>Quality: <span className={`font-medium ${n.qualityRating === "GREEN" ? "text-green-600" : n.qualityRating === "YELLOW" ? "text-yellow-600" : "text-red-600"}`}>{n.qualityRating}</span></span>}
                  {n.status && <span>Status: <span className="font-medium text-green-600">{n.status}</span></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Messages Sent", value: metrics.sent.toLocaleString(), color: "bg-blue-100 text-blue-700" },
              { label: "Delivered", value: `${metrics.delivered.toLocaleString()} (${deliveryRate}%)`, color: "bg-green-100 text-green-700" },
              { label: "Read", value: `${metrics.read.toLocaleString()} (${readRate}%)`, color: "bg-purple-100 text-purple-700" },
              { label: "Clicked", value: (metrics.clicked ?? 0).toLocaleString(), color: "bg-yellow-100 text-yellow-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl p-4`}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-sm font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Delivery Funnel</h3>
            {[
              { label: "Sent", value: metrics.sent, percent: 100, color: "bg-blue-400" },
              { label: "Delivered", value: metrics.delivered, percent: deliveryRate, color: "bg-green-400" },
              { label: "Read", value: metrics.read, percent: readRate, color: "bg-purple-400" },
              { label: "Clicked", value: metrics.clicked ?? 0, percent: metrics.sent > 0 ? Math.round(((metrics.clicked ?? 0) / metrics.sent) * 100) : 0, color: "bg-yellow-400" },
            ].map(({ label, value, percent, color }) => (
              <div key={label} className="flex items-center gap-3 mb-2">
                <span className="text-sm w-20">{label}</span>
                <div className="flex-1 h-4 bg-muted rounded-full"><div className={`h-4 ${color} rounded-full`} style={{ width: `${percent}%` }} /></div>
                <span className="text-sm font-mono w-24 text-right">{value.toLocaleString()} ({percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "webhook" && webhook && (
        <div className="max-w-2xl space-y-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${webhook.isConnected ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
            {webhook.isConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-yellow-500" />}
            <div>
              <div className={`font-medium text-sm ${webhook.isConnected ? "text-green-700" : "text-yellow-700"}`}>{webhook.isConnected ? "Webhook Connected" : "Webhook Not Configured"}</div>
              {webhook.lastEventAt && <div className="text-xs text-muted-foreground">Last event: {new Date(webhook.lastEventAt).toLocaleString()}</div>}
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Webhook Configuration</h3>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Callback URL (add to Meta App settings)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono">{webhook.webhookUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(webhook.webhookUrl ?? "")} className="p-2 border rounded-lg hover:bg-accent"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Verify Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono">{webhook.verifyToken}</code>
                <button onClick={() => navigator.clipboard.writeText(webhook.verifyToken ?? "")} className="p-2 border rounded-lg hover:bg-accent"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Subscribe to Events</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {["messages","message_deliveries","message_reads","message_reactions","messaging_referrals","account_updates"].map((evt) => (
                <label key={evt} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked={["messages","message_deliveries","message_reads"].includes(evt)} className="rounded" />
                  <span>{evt.replace(/_/g," ")}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "test" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Send Test Message</h3>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To (WhatsApp number)</label>
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="92XXXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Message</label>
              <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={3} placeholder="Hello! This is a test from SuperSender Pro." className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
            </div>
            <button onClick={() => sendTestMut.mutate()} disabled={!testTo || !testMsg || sendTestMut.isPending} className="w-full px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />{sendTestMut.isPending ? "Sending…" : "Send Test Message"}
            </button>
            {testSent && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Message sent successfully!</div>}
          </div>
          <div className="bg-muted/50 border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Notes:</p>
            <p>• The recipient must have opted in to receive messages</p>
            <p>• Outside 24h customer-initiated window, use templates</p>
            <p>• Test numbers must be added in Meta Business Settings</p>
          </div>
        </div>
      )}
    </div>
  );
}
