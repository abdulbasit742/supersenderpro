import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Send, CheckCircle, Plus, Copy } from "lucide-react";
import type { PaymentGatewayConfig, PaymentLink, GatewayProvider } from "@/lib/payment-gateway.functions";

export const Route = createFileRoute("/_app/payment-gateway")({
  component: PaymentGatewayPage,
});

type Tab = "links" | "create" | "settings";

const MOCK_CONFIG: PaymentGatewayConfig = { provider: "jazzcash", isActive: true, merchantId: "MC12345", apiKey: "ak_live_****", accountNumber: "03001234567", accountTitle: "SuperSender Pro", autoConfirm: false, sendReceiptOnSuccess: true, receiptMessage: "✅ Payment received! PKR {{amount}} confirmed. Shukriya {{name}}!" };
function makeLink(i: number): PaymentLink {
  const names = ["Ahmed Khan","Sara Ali","Bilal Raza","Fatima Noor","Hassan Malik"];
  const amounts = [3500,2500,1800,4200,5500];
  const statuses: PaymentLink["status"][] = ["pending","paid","pending","paid","expired"];
  const d = new Date(); d.setDate(d.getDate() - i);
  const exp = new Date(d); exp.setDate(exp.getDate() + 3);
  return { id: `pl${i+1}`, customerId: `c${i+1}`, customerName: names[i], whatsapp: `030${i}1234567`, amount: amounts[i], description: `Order #ORD-${4500-i}`, provider: "jazzcash", status: statuses[i], link: `https://pay.jazzcash.com.pk/${Math.random().toString(36).slice(2,8)}`, createdAt: d.toISOString(), paidAt: statuses[i]==="paid"?new Date(d.getTime()+3600000).toISOString():undefined, expiresAt: exp.toISOString() };
}
const MOCK_LINKS: PaymentLink[] = Array.from({ length: 5 }, (_, i) => makeLink(i));

const STATUS_COLORS: Record<PaymentLink["status"], string> = { pending: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700", expired: "bg-gray-100 text-gray-600", cancelled: "bg-red-100 text-red-700" };
const PROVIDERS: GatewayProvider[] = ["jazzcash","easypaisa","stripe","payfast","manual"];

export default function PaymentGatewayPage() {
  const [tab, setTab] = useState<Tab>("links");
  const [config, setConfig] = useState(MOCK_CONFIG);
  const [newLink, setNewLink] = useState({ customerName: "", whatsapp: "", amount: "", description: "", provider: "jazzcash" as GatewayProvider });
  const [copied, setCopied] = useState<string | null>(null);
  const [markedPaid, setMarkedPaid] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: links = MOCK_LINKS } = useQuery({ queryKey: ["payment-links"], queryFn: async () => { const { getPaymentLinks } = await import("@/lib/payment-gateway.functions"); return getPaymentLinks(); }, placeholderData: MOCK_LINKS, staleTime: 30_000 });

  const createMut = useMutation({ mutationFn: async () => { const { createPaymentLink } = await import("@/lib/payment-gateway.functions"); return createPaymentLink({ data: { ...newLink, amount: +newLink.amount, customerId: `c_${Date.now()}` } }); }, onSuccess: () => { setTab("links"); setNewLink({ customerName: "", whatsapp: "", amount: "", description: "", provider: "jazzcash" }); } });
  const sendMut = useMutation({ mutationFn: async (linkId: string) => { const { sendPaymentLink } = await import("@/lib/payment-gateway.functions"); return sendPaymentLink({ data: { linkId } }); } });
  const markPaidMut = useMutation({ mutationFn: async (linkId: string) => { const { markPaid } = await import("@/lib/payment-gateway.functions"); return markPaid({ data: { linkId } }); }, onSuccess: (_, id) => setMarkedPaid(p => new Set([...p, id])) });
  const configMut = useMutation({ mutationFn: async () => { const { savePaymentGatewayConfig } = await import("@/lib/payment-gateway.functions"); return savePaymentGatewayConfig({ data: config as unknown as Record<string, unknown> }); } });

  const copy = (text: string, id: string) => { void navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Payment Gateway</h1><p className="text-muted-foreground text-sm">Generate & send payment links via WhatsApp — JazzCash, EasyPaisa, Stripe</p></div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />New Link</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-700">{(links as typeof MOCK_LINKS).filter(l => l.status === "pending").length}</div><div className="text-xs text-yellow-600">Pending</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-xl font-bold text-green-700">PKR {(links as typeof MOCK_LINKS).filter(l => l.status === "paid" || markedPaid.has(l.id)).reduce((s,l) => s+l.amount, 0).toLocaleString()}</div><div className="text-xs text-green-600">Collected</div></div>
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{links.length}</div><div className="text-xs text-muted-foreground">Total Links</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["links","create","settings"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "create" ? "Create Link" : t === "settings" ? "Gateway Settings" : "Payment Links"}</button>)}
      </div>

      {tab === "links" && (
        <div className="space-y-2">
          {(links as typeof MOCK_LINKS).map(link => {
            const isPaid = link.status === "paid" || markedPaid.has(link.id);
            return (
              <div key={link.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{link.customerName}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[isPaid ? "paid" : link.status]}`}>{isPaid ? "paid" : link.status}</span></div>
                    <div className="text-xs text-muted-foreground">{link.whatsapp} · {link.description} · {new Date(link.createdAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1 mt-1"><span className="text-xs font-mono text-muted-foreground truncate max-w-xs">{link.link}</span><button onClick={() => copy(link.link, link.id)} className="p-0.5 hover:bg-accent rounded"><Copy className="h-3 w-3" /></button>{copied === link.id && <span className="text-xs text-green-600">Copied!</span>}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-lg">PKR {link.amount.toLocaleString()}</div>
                    {!isPaid && link.status !== "expired" && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => sendMut.mutate(link.id)} disabled={sendMut.isPending} className="flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white rounded text-xs"><Send className="h-3 w-3" />WA</button>
                        <button onClick={() => markPaidMut.mutate(link.id)} disabled={markPaidMut.isPending} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs"><CheckCircle className="h-3 w-3" />Paid</button>
                      </div>
                    )}
                    {isPaid && <div className="text-xs text-green-600 mt-1">✓ Confirmed</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-lg bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Create Payment Link</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input value={newLink.customerName} onChange={e => setNewLink(p => ({ ...p, customerName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={newLink.whatsapp} onChange={e => setNewLink(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (PKR)</label><input type="number" value={newLink.amount} onChange={e => setNewLink(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Gateway</label><select value={newLink.provider} onChange={e => setNewLink(p => ({ ...p, provider: e.target.value as GatewayProvider }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background capitalize">{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Description</label><input value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))} placeholder="e.g., Payment for ChatGPT Plus renewal" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <button onClick={() => createMut.mutate()} disabled={!newLink.customerName || !newLink.amount || createMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{createMut.isPending ? "Creating…" : "Generate & Send Link"}</button>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Gateway Settings</h3>
          <div><label className="text-xs text-muted-foreground block mb-1">Provider</label><select value={config.provider} onChange={e => setConfig(p => ({ ...p, provider: e.target.value as GatewayProvider }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background">{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Merchant ID / Account Number</label><input value={config.merchantId ?? ""} onChange={e => setConfig(p => ({ ...p, merchantId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Account Title</label><input value={config.accountTitle ?? ""} onChange={e => setConfig(p => ({ ...p, accountTitle: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={config.sendReceiptOnSuccess} onChange={e => setConfig(p => ({ ...p, sendReceiptOnSuccess: e.target.checked }))} /><label className="text-sm">Send WA receipt on successful payment</label></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Receipt Message (use {`{{name}}, {{amount}}`})</label><textarea value={config.receiptMessage} onChange={e => setConfig(p => ({ ...p, receiptMessage: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
          <button onClick={() => configMut.mutate()} disabled={configMut.isPending} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{configMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
