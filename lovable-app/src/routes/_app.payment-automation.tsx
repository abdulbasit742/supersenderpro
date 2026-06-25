import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Send, Check, Camera, Clock, DollarSign, Link2, Save, RefreshCw } from "lucide-react";
import type { PaymentConfig, PaymentStats } from "@/lib/payment-automation.functions";

export const Route = createFileRoute("/_app/payment-automation")({
  component: PaymentAutomationPage,
});

type Tab = "send" | "links" | "verify" | "settings";

const MOCK_STATS: PaymentStats = { totalPending: 8, totalCollectedToday: 18500, totalCollectedMonth: 245000, avgCollectionTimeHours: 2.4, pendingAmount: 12400 };
const MOCK_CONFIG: PaymentConfig = { jazzcashNumber: "03001234567", easypaisa: "03111234567", bankAccount: "PK36MEZN0001460108978701", bankName: "Meezan Bank", accountTitle: "SuperSender Pro", autoVerify: false, expireAfterHours: 24, reminderAfterHours: 4, confirmationMessage: "✅ Payment received! PKR {{amount}} confirmed. Your order is now active. Thank you! 🎉" };

const MOCK_LINKS = [
  { id: "l1", orderId: "o1", customerName: "Ahmed Khan", whatsapp: "03001234567", amount: 1500, method: "jazzcash", status: "pending", sentAt: new Date(Date.now() - 3600000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() },
  { id: "l2", orderId: "o2", customerName: "Sara Ali", whatsapp: "03111234567", amount: 1800, method: "easypaisa", status: "paid", sentAt: new Date(Date.now() - 7200000).toISOString(), expiresAt: new Date(Date.now() + 82800000).toISOString() },
  { id: "l3", orderId: "o3", customerName: "Bilal Raza", whatsapp: "03211234567", amount: 2500, method: "bank", status: "expired", sentAt: new Date(Date.now() - 172800000).toISOString(), expiresAt: new Date(Date.now() - 86400000).toISOString() },
];

const METHOD_LABELS = { jazzcash: "JazzCash", easypaisa: "EasyPaisa", bank: "Bank Transfer", cash: "Cash" };
const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700", expired: "bg-gray-100 text-gray-500", failed: "bg-red-100 text-red-700" };

function timeAgo(iso: string) {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function PaymentAutomationPage() {
  const [tab, setTab] = useState<Tab>("send");
  const [sendForm, setSendForm] = useState({ whatsapp: "", amount: "", method: "jazzcash" as keyof typeof METHOD_LABELS, orderId: "" });
  const [config, setConfig] = useState<PaymentConfig>(MOCK_CONFIG);
  const [screenshotB64, setScreenshotB64] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; confidence: number; reason: string } | null>(null);
  const qc = useQueryClient();

  const { data: stats = MOCK_STATS } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: async () => { const { getPaymentStats } = await import("@/lib/payment-automation.functions"); return getPaymentStats(); },
    placeholderData: MOCK_STATS, staleTime: 30_000,
  });

  const { data: links = MOCK_LINKS } = useQuery({
    queryKey: ["payment-links"],
    queryFn: async () => { const { getPaymentLinks } = await import("@/lib/payment-automation.functions"); return getPaymentLinks(); },
    placeholderData: MOCK_LINKS, staleTime: 30_000,
  });

  const { data: savedConfig = MOCK_CONFIG } = useQuery({
    queryKey: ["payment-config"],
    queryFn: async () => { const { getPaymentConfig } = await import("@/lib/payment-automation.functions"); return getPaymentConfig(); },
    placeholderData: MOCK_CONFIG, staleTime: 300_000,
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      const { sendPaymentRequest, getPaymentConfig } = await import("@/lib/payment-automation.functions");
      const cfg = await getPaymentConfig();
      const accountNumber = sendForm.method === "jazzcash" ? (cfg.jazzcashNumber ?? "") : sendForm.method === "easypaisa" ? (cfg.easypaisa ?? "") : (cfg.bankAccount ?? "");
      const link = `https://wa.me/send?pay=${sendForm.amount}`;
      return sendPaymentRequest({ data: { whatsapp: sendForm.whatsapp, amount: Number(sendForm.amount), method: sendForm.method, link, accountNumber } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-links"] }); setSendForm({ whatsapp: "", amount: "", method: "jazzcash", orderId: "" }); },
  });

  const verifyMut = useMutation({
    mutationFn: async () => {
      const { verifyScreenshot } = await import("@/lib/payment-automation.functions");
      return verifyScreenshot({ data: { screenshotBase64: screenshotB64, expectedAmount: 1500, paymentLinkId: "demo" } });
    },
    onSuccess: (data) => setVerifyResult(data),
  });

  const saveConfigMut = useMutation({
    mutationFn: async () => {
      const { savePaymentConfig } = await import("@/lib/payment-automation.functions");
      return savePaymentConfig({ data: config as unknown as Record<string, unknown> });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-config"] }),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const result = reader.result as string; setScreenshotB64(result.split(",")[1] ?? ""); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Payment Collection Automation</h1>
        <p className="text-muted-foreground text-sm">Auto payment links, screenshot OCR verification, instant order confirmation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: stats.totalPending, color: "bg-yellow-100 text-yellow-700" },
          { label: "Pending Amount", value: `PKR ${(stats.pendingAmount / 1000).toFixed(1)}K`, color: "bg-orange-100 text-orange-700" },
          { label: "Collected Today", value: `PKR ${(stats.totalCollectedToday / 1000).toFixed(1)}K`, color: "bg-green-100 text-green-700" },
          { label: "This Month", value: `PKR ${(stats.totalCollectedMonth / 1000).toFixed(0)}K`, color: "bg-blue-100 text-blue-700" },
          { label: "Avg Collection", value: `${stats.avgCollectionTimeHours}h`, color: "bg-purple-100 text-purple-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-xl p-3 text-center`}><div className="text-xl font-bold">{value}</div><div className="text-xs font-medium">{label}</div></div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(["send","links","verify","settings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "send" ? "Send Request" : t === "links" ? "Payment Links" : t === "verify" ? "Verify Screenshot" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "send" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Send Payment Request</h3>
            <div><label className="text-xs text-muted-foreground block mb-1">Customer WhatsApp</label><input value={sendForm.whatsapp} onChange={(e) => setSendForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (PKR)</label><input type="number" value={sendForm.amount} onChange={(e) => setSendForm(p => ({ ...p, amount: e.target.value }))} placeholder="1500" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(["jazzcash","easypaisa","bank","cash"] as const).map((m) => (
                  <button key={m} onClick={() => setSendForm(p => ({ ...p, method: m }))} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${sendForm.method === m ? "bg-primary text-primary-foreground border-primary" : "border hover:bg-accent"}`}>{METHOD_LABELS[m]}</button>
                ))}
              </div>
            </div>
            {sendForm.method !== "cash" && (
              <div className="bg-muted rounded-lg p-3 text-xs">
                <span className="text-muted-foreground">Account: </span>
                <span className="font-mono font-medium">{sendForm.method === "jazzcash" ? savedConfig.jazzcashNumber : sendForm.method === "easypaisa" ? savedConfig.easypaisa : savedConfig.bankAccount}</span>
              </div>
            )}
            <button onClick={() => sendMut.mutate()} disabled={!sendForm.whatsapp || !sendForm.amount || sendMut.isPending} className="w-full px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />{sendMut.isPending ? "Sending…" : "Send Payment Request on WhatsApp"}
            </button>
            {sendMut.isSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><Check className="h-4 w-4" /> Payment request sent!</div>}
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Payment Links</span>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["payment-links"] })} className="p-1 hover:bg-accent rounded"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr>{["Customer","Amount","Method","Status","Sent","Action"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(links as typeof MOCK_LINKS).map(l => (
                <tr key={l.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3"><div className="font-medium">{l.customerName}</div><div className="text-xs text-muted-foreground">{l.whatsapp}</div></td>
                  <td className="px-4 py-3 font-mono font-bold">PKR {l.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{METHOD_LABELS[l.method as keyof typeof METHOD_LABELS]}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status as keyof typeof STATUS_COLORS]}`}>{l.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(l.sentAt)}</td>
                  <td className="px-4 py-3">
                    {l.status === "pending" && <button className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">Confirm</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "verify" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> AI Screenshot Verifier</h3>
            <p className="text-sm text-muted-foreground">Upload a payment screenshot — AI will verify if it's genuine and extract the amount.</p>
            <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50" onClick={() => document.getElementById("screenshot-upload")?.click()}>
              {screenshotB64 ? <div className="text-green-600 font-medium">✅ Screenshot loaded — click Verify</div> : <div className="text-muted-foreground"><Camera className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Click to upload payment screenshot</p><p className="text-xs">JazzCash / EasyPaisa / Bank</p></div>}
              <input id="screenshot-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            <button onClick={() => verifyMut.mutate()} disabled={!screenshotB64 || verifyMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{verifyMut.isPending ? "AI Verifying…" : "Verify with AI"}</button>
            {verifyResult && (
              <div className={`rounded-xl p-4 ${verifyResult.verified ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className={`text-lg font-bold mb-1 ${verifyResult.verified ? "text-green-700" : "text-red-700"}`}>{verifyResult.verified ? "✅ Payment Verified!" : "❌ Verification Failed"}</div>
                <div className="text-sm font-medium mb-1">Confidence: {verifyResult.confidence}%</div>
                <div className="text-sm text-muted-foreground">{verifyResult.reason}</div>
                {verifyResult.verified && <button className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">Confirm Order</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Payment Accounts</h3>
            {[["JazzCash Number","jazzcashNumber"],["EasyPaisa Number","easypaisa"],["Bank Account (IBAN)","bankAccount"],["Bank Name","bankName"],["Account Title","accountTitle"]].map(([label, key]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={(config as Record<string, string>)[key] ?? ""} onChange={(e) => setConfig(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Automation</h3>
            <div className="flex items-center gap-3"><input type="number" value={config.expireAfterHours} onChange={(e) => setConfig(p => ({ ...p, expireAfterHours: Number(e.target.value) }))} className="w-20 px-2 py-1.5 border rounded text-sm bg-background" /><span className="text-sm">hours until link expires</span></div>
            <div className="flex items-center gap-3"><input type="number" value={config.reminderAfterHours} onChange={(e) => setConfig(p => ({ ...p, reminderAfterHours: Number(e.target.value) }))} className="w-20 px-2 py-1.5 border rounded text-sm bg-background" /><span className="text-sm">hours before reminder</span></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Confirmation Message (use {`{{amount}}`})</label><textarea value={config.confirmationMessage} onChange={(e) => setConfig(p => ({ ...p, confirmationMessage: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveConfigMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
