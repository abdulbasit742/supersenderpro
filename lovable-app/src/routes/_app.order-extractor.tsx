import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Scan, Wand2, Check, X, Package, Phone, DollarSign, User, Clock } from "lucide-react";
import type { ExtractedOrder } from "@/lib/order-extractor.functions";

export const Route = createFileRoute("/_app/order-extractor")({
  component: OrderExtractorPage,
});

const SAMPLE_MESSAGES = [
  "bhai mujhe 2 chatgpt chahiye 03001234567 pe easypaisa se 3000 rs mein",
  "Ahmed: 1 Claude Pro lena hai, JazzCash 1800, 03211122334",
  "Assalam, mera naam Sara hai. Mujhe LinkedIn Premium 1 month chahiye. Number: 03331122334. Bank transfer se pay karunga PKR 2500",
  "Bhai 3 SSD 256GB chahiye, 4500 total, Cash on delivery, Lahore address: 15 Gulberg",
];

export default function OrderExtractorPage() {
  const [message, setMessage] = useState("");
  const [extracted, setExtracted] = useState<ExtractedOrder | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const extractMut = useMutation({
    mutationFn: async (msg: string) => {
      const { extractOrderFromMessage } = await import("@/lib/order-extractor.functions");
      return extractOrderFromMessage({ data: { message: msg } });
    },
    onSuccess: (data) => { setExtracted(data); setConfirmed(false); },
  });

  const confirmMut = useMutation({
    mutationFn: async (ext: ExtractedOrder) => {
      const { confirmExtractedOrder } = await import("@/lib/order-extractor.functions");
      return confirmExtractedOrder({ data: { extracted: ext } });
    },
    onSuccess: () => setConfirmed(true),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["extractor-logs"],
    queryFn: async () => { const { getExtractorLogs } = await import("@/lib/order-extractor.functions"); return getExtractorLogs(); },
    placeholderData: [
      { id: "1", tool: "ChatGPT Plus", sell_price: 1500, status: "pending", created_at: new Date().toISOString(), notes: "Ahmed, JazzCash" },
      { id: "2", tool: "Claude Pro", sell_price: 1800, status: "confirmed", created_at: new Date(Date.now() - 86400000).toISOString(), notes: "Sara, EasyPaisa" },
    ],
    staleTime: 30_000,
  });

  const confidenceColor = (c: number) => c >= 80 ? "text-green-600" : c >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scan className="h-6 w-6 text-primary" /> AI Order Extractor</h1>
        <p className="text-muted-foreground text-sm">Paste any WhatsApp message → AI extracts order details → One-click confirm</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Paste Message</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Paste a WhatsApp message here…&#10;&#10;E.g: bhai mujhe 2 chatgpt chahiye 03001234567 pe easypaisa se 3000 rs mein"
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => extractMut.mutate(message)}
                disabled={!message.trim() || extractMut.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                {extractMut.isPending ? "Extracting…" : "Extract with AI"}
              </button>
              <button onClick={() => { setMessage(""); setExtracted(null); setConfirmed(false); }} className="px-3 py-2 border rounded-lg text-sm hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Sample messages */}
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Try a sample:</h3>
            {SAMPLE_MESSAGES.map((s, i) => (
              <button key={i} onClick={() => setMessage(s)} className="block w-full text-left text-xs bg-muted hover:bg-muted/70 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground truncate transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Extracted Result */}
        <div>
          {!extracted && !extractMut.isPending && (
            <div className="h-full bg-card border rounded-xl flex items-center justify-center text-muted-foreground">
              <div className="text-center"><Scan className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Extracted order will appear here</p></div>
            </div>
          )}
          {extractMut.isPending && (
            <div className="h-full bg-card border rounded-xl flex items-center justify-center">
              <div className="text-center animate-pulse"><Wand2 className="h-12 w-12 mx-auto mb-3 text-primary" /><p className="text-sm font-medium">AI is reading the message…</p></div>
            </div>
          )}
          {extracted && !confirmed && (
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Extracted Order</h3>
                <span className={`text-sm font-bold ${confidenceColor(extracted.confidence)}`}>{extracted.confidence}% confident</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: User, label: "Customer", value: extracted.customerName, key: "customerName" as const },
                  { icon: Phone, label: "WhatsApp", value: extracted.whatsapp, key: "whatsapp" as const },
                  { icon: Package, label: "Product", value: extracted.product, key: "product" as const },
                  { icon: DollarSign, label: "Price (PKR)", value: extracted.price?.toString(), key: "price" as const },
                ].map(({ icon: Icon, label, value, key }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <input
                        defaultValue={value ?? ""}
                        onChange={(e) => setExtracted((p) => p ? { ...p, [key]: e.target.value } : p)}
                        className="text-sm font-medium bg-transparent border-0 border-b border-dashed w-full focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Payment Method</div>
                    <div className="text-sm font-medium capitalize">{extracted.paymentMethod ?? "—"}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setExtracted(null)} className="flex-1 px-3 py-2 border rounded-lg text-sm hover:bg-accent flex items-center justify-center gap-2"><X className="h-4 w-4" /> Reject</button>
                <button onClick={() => confirmMut.mutate(extracted)} disabled={confirmMut.isPending} className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Check className="h-4 w-4" /> {confirmMut.isPending ? "Creating…" : "Confirm & Create Order"}</button>
              </div>
            </div>
          )}
          {confirmed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto"><Check className="h-8 w-8" /></div>
              <h3 className="font-bold text-green-800">Order Created!</h3>
              <p className="text-sm text-green-700">Customer registered and order saved. You can view it in Orders.</p>
              <button onClick={() => { setExtracted(null); setMessage(""); setConfirmed(false); }} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">Extract Another</button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-sm">Recently Extracted Orders</span></div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>{["Product","Price","Status","Notes","Date"].map((h) => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(logs as Array<{ id: string; tool: string; sell_price: number; status: string; created_at: string; notes?: string }>).map((log) => (
              <tr key={log.id} className="border-b hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{log.tool}</td>
                <td className="px-4 py-3 font-mono">PKR {Number(log.sell_price).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${log.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{log.status}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{log.notes ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(log.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
