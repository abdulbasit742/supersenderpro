import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Send, Download, Eye, Plus, Trash2, Save } from "lucide-react";
import type { Invoice, InvoiceConfig, InvoiceItem } from "@/lib/invoice.functions";

export const Route = createFileRoute("/_app/invoice")({
  component: InvoicePage,
});

type Tab = "list" | "create" | "settings";

const MOCK_INVOICES: Invoice[] = [
  { id: "i1", invoiceNo: "INV-20260615-0001", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", items: [{ id: "it1", description: "ChatGPT Plus 1 Month", quantity: 1, unitPrice: 4200, total: 4200 }], subtotal: 4200, tax: 0, discount: 0, total: 4200, status: "sent", issuedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "i2", invoiceNo: "INV-20260614-0002", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", items: [{ id: "it2", description: "Claude Pro 1 Month", quantity: 1, unitPrice: 3500, total: 3500 }, { id: "it3", description: "Midjourney Basic", quantity: 1, unitPrice: 2800, total: 2800 }], subtotal: 6300, tax: 0, discount: 300, total: 6000, status: "paid", issuedAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "i3", invoiceNo: "INV-20260613-0003", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", items: [{ id: "it4", description: "LinkedIn Premium 3 Months", quantity: 1, unitPrice: 7500, total: 7500 }], subtotal: 7500, tax: 0, discount: 0, total: 7500, status: "draft", issuedAt: new Date().toISOString() },
];

const MOCK_CONFIG: InvoiceConfig = { businessName: "SuperSender Pro", businessAddress: "Lahore, Pakistan", businessPhone: "03001234567", logoUrl: "", taxRate: 0, currency: "PKR", footerNote: "Thank you for your business! Payment due within 24 hours.", termsText: "Prices are final. No refund after activation." };

const STATUS_COLORS = { draft: "bg-gray-100 text-gray-600", sent: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function InvoicePage() {
  const [tab, setTab] = useState<Tab>("list");
  const [config, setConfig] = useState<InvoiceConfig>(MOCK_CONFIG);
  const [form, setForm] = useState({ customerName: "", whatsapp: "", discount: 0 });
  const [items, setItems] = useState<InvoiceItem[]>([{ id: `it_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: invoices = MOCK_INVOICES } = useQuery({
    queryKey: ["invoices"], queryFn: async () => { const { getInvoices } = await import("@/lib/invoice.functions"); return getInvoices(); }, placeholderData: MOCK_INVOICES, staleTime: 60_000,
  });
  const { data: savedConfig = MOCK_CONFIG } = useQuery({
    queryKey: ["invoice-config"], queryFn: async () => { const { getInvoiceConfig } = await import("@/lib/invoice.functions"); return getInvoiceConfig(); }, placeholderData: MOCK_CONFIG, staleTime: 300_000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { createInvoice } = await import("@/lib/invoice.functions");
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      return createInvoice({ data: { customerName: form.customerName, whatsapp: form.whatsapp, items, subtotal, tax: 0, discount: form.discount, total: subtotal - form.discount } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setTab("list"); setItems([{ id: `it_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]); setForm({ customerName: "", whatsapp: "", discount: 0 }); },
  });

  const sendMut = useMutation({
    mutationFn: async (id: string) => { const { sendInvoiceViaWhatsApp } = await import("@/lib/invoice.functions"); return sendInvoiceViaWhatsApp({ data: { invoiceId: id } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveInvoiceConfig } = await import("@/lib/invoice.functions"); return saveInvoiceConfig({ data: config as unknown as Record<string, unknown> }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice-config"] }),
  });

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      if (field === "quantity" || field === "unitPrice") updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - form.discount;

  const previewInvoice = invoices.find(i => i.id === previewId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Invoice Generator</h1>
          <p className="text-muted-foreground text-sm">Create and send professional PDF invoices via WhatsApp</p>
        </div>
        <button onClick={() => setTab("create")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> New Invoice</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Invoices", value: invoices.length, color: "text-primary" },
          { label: "Paid", value: invoices.filter(i => i.status === "paid").length, color: "text-green-600" },
          { label: "Sent (Unpaid)", value: invoices.filter(i => i.status === "sent").length, color: "text-blue-600" },
          { label: "Drafts", value: invoices.filter(i => i.status === "draft").length, color: "text-gray-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${color}`}>{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(["list","create","settings"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "list" ? "All Invoices" : t === "create" ? "Create Invoice" : "Business Settings"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-3">
          {previewInvoice && (
            <div className="bg-card border-2 border-primary rounded-xl p-6 max-w-2xl">
              <div className="flex items-start justify-between mb-4">
                <div><h2 className="text-xl font-bold">{savedConfig.businessName}</h2><p className="text-sm text-muted-foreground">{savedConfig.businessAddress}</p></div>
                <div className="text-right"><p className="font-bold text-lg">{previewInvoice.invoiceNo}</p><p className="text-sm text-muted-foreground">{new Date(previewInvoice.issuedAt).toLocaleDateString()}</p></div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 mb-4"><p className="text-sm font-medium">{previewInvoice.customerName}</p><p className="text-xs text-muted-foreground">{previewInvoice.whatsapp}</p></div>
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b"><th className="text-left py-2">Item</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Price</th><th className="text-right py-2">Total</th></tr></thead>
                <tbody>{previewInvoice.items.map(it => <tr key={it.id} className="border-b"><td className="py-2">{it.description}</td><td className="py-2 text-right">{it.quantity}</td><td className="py-2 text-right">PKR {it.unitPrice.toLocaleString()}</td><td className="py-2 text-right font-medium">PKR {it.total.toLocaleString()}</td></tr>)}</tbody>
              </table>
              <div className="flex justify-end gap-4 text-sm">
                {previewInvoice.discount > 0 && <div className="text-right"><div className="text-muted-foreground">Subtotal: PKR {previewInvoice.subtotal.toLocaleString()}</div><div className="text-green-600">Discount: -PKR {previewInvoice.discount.toLocaleString()}</div></div>}
                <div className="text-lg font-bold">Total: PKR {previewInvoice.total.toLocaleString()}</div>
              </div>
              {savedConfig.footerNote && <p className="text-xs text-muted-foreground mt-4 border-t pt-3">{savedConfig.footerNote}</p>}
              <button onClick={() => setPreviewId(null)} className="mt-3 px-3 py-1.5 border rounded text-xs hover:bg-accent">Close Preview</button>
            </div>
          )}
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr>{["Invoice #","Customer","Items","Total","Status","Date","Actions"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-3"><div className="font-medium">{inv.customerName}</div><div className="text-xs text-muted-foreground">{inv.whatsapp}</div></td>
                    <td className="px-4 py-3 text-center">{inv.items.length}</td>
                    <td className="px-4 py-3 font-bold">PKR {inv.total.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setPreviewId(previewId === inv.id ? null : inv.id)} title="Preview" className="p-1.5 hover:bg-accent rounded"><Eye className="h-3.5 w-3.5" /></button>
                      {inv.status === "draft" && <button onClick={() => sendMut.mutate(inv.id)} disabled={sendMut.isPending} title="Send via WhatsApp" className="p-1.5 hover:bg-accent rounded text-[#25D366]"><Send className="h-3.5 w-3.5" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "create" && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Customer Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Ahmed Khan" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">WhatsApp</label><input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="03XXXXXXXXX" className="w-full px-3 py-2 border rounded-lg text-sm bg-background font-mono" /></div>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Line Items</h3><button onClick={() => setItems(p => [...p, { id: `it_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }])} className="flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Plus className="h-3 w-3" /> Add Item</button></div>
            {items.map(it => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6"><input value={it.description} onChange={e => updateItem(it.id, "description", e.target.value)} placeholder="Product/Service" className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
                <div className="col-span-2"><input type="number" value={it.quantity} onChange={e => updateItem(it.id, "quantity", Number(e.target.value))} min={1} className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
                <div className="col-span-2"><input type="number" value={it.unitPrice} onChange={e => updateItem(it.id, "unitPrice", Number(e.target.value))} placeholder="Price" className="w-full px-2 py-1.5 border rounded text-sm bg-background" /></div>
                <div className="col-span-1 py-1.5 text-sm font-medium text-right">{it.total.toLocaleString()}</div>
                <div className="col-span-1 flex justify-end"><button onClick={() => setItems(p => p.filter(i => i.id !== it.id))} disabled={items.length === 1} className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Discount:</span>
              <input type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))} className="w-24 px-2 py-1 border rounded text-sm bg-background" />
              <span className="ml-auto font-bold">Total: PKR {total.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => createMut.mutate()} disabled={!form.customerName || items.every(i => !i.description) || createMut.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><FileText className="h-4 w-4" />{createMut.isPending ? "Creating…" : "Create Invoice"}</button>
          </div>
          {createMut.isSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Invoice created! Go to list to send via WhatsApp.</div>}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Business Info</h3>
            {[["Business Name","businessName"],["Business Address","businessAddress"],["Business Phone","businessPhone"],["Footer Note","footerNote"],["Terms & Conditions","termsText"]].map(([label, key]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label>
                {key === "footerNote" || key === "termsText" ? <textarea value={(config as Record<string, string>)[key] ?? ""} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /> : <input value={(config as Record<string, string>)[key] ?? ""} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" />}
              </div>
            ))}
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveConfigMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
