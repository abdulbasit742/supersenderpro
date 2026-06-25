import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, Check, AlertCircle, Download, Table2 } from "lucide-react";
import type { BulkImportOrder } from "@/lib/product-ai.functions";

export const Route = createFileRoute("/_app/bulk-orders")({
  component: BulkOrdersPage,
});

const SAMPLE_CSV = `customer_name,whatsapp,product,plan,quantity,price,payment_method,notes
Ahmed Khan,03001234567,ChatGPT Plus,1 Month,1,4200,jazzcash,Fresh account needed
Sara Ali,03111234567,Claude Pro,1 Month,1,3500,easypaisa,
Bilal Raza,03211234567,LinkedIn Premium,3 Months,1,7500,bank,Corporate account
Fatima Noor,03321234567,Midjourney Basic,1 Month,2,5600,jazzcash,2 accounts for team`;

export default function BulkOrdersPage() {
  const [csvText, setCsvText] = useState("");
  const [parsedOrders, setParsedOrders] = useState<BulkImportOrder[] | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);

  const parseMut = useMutation({
    mutationFn: async () => {
      const { parseBulkOrderCSV } = await import("@/lib/product-ai.functions");
      return parseBulkOrderCSV({ data: { csvText } });
    },
    onSuccess: (data) => setParsedOrders(data),
  });

  const confirmMut = useMutation({
    mutationFn: async () => {
      const { confirmBulkOrders } = await import("@/lib/product-ai.functions");
      const valid = (parsedOrders ?? []).filter(o => o.valid);
      return confirmBulkOrders({ data: { orders: valid as unknown as Record<string, unknown>[] } });
    },
    onSuccess: (data) => { setImportResult(data); setParsedOrders(null); setCsvText(""); },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const validCount = (parsedOrders ?? []).filter(o => o.valid).length;
  const invalidCount = (parsedOrders ?? []).filter(o => !o.valid).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Table2 className="h-6 w-6 text-primary" /> Bulk Order Importer</h1>
        <p className="text-muted-foreground text-sm">Import hundreds of orders at once via CSV — perfect for Ramadan/Eid rushes</p>
      </div>

      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <div><div className="font-semibold text-green-800">Import Complete!</div><div className="text-sm text-green-700">{importResult.created} orders created{importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}.</div></div>
          <button onClick={() => setImportResult(null)} className="ml-auto px-3 py-1 border border-green-300 rounded text-xs text-green-700 hover:bg-green-100">Import More</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Upload or Paste CSV</h3>
              <div className="flex gap-2">
                <button onClick={() => { setCsvText(SAMPLE_CSV); setParsedOrders(null); }} className="px-2.5 py-1.5 border rounded text-xs hover:bg-accent">Load Sample</button>
                <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Upload className="h-3.5 w-3.5" />Upload CSV<input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} /></label>
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="orders-template.csv" className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />Template</a>
              </div>
            </div>
            <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setParsedOrders(null); }} rows={10} placeholder={`Paste CSV here or click "Load Sample" to see the format…\n\nExpected columns: customer_name, whatsapp, product, plan, quantity, price, payment_method, notes`} className="w-full px-3 py-2 border rounded-lg text-xs bg-background resize-none font-mono" />
            <button onClick={() => parseMut.mutate()} disabled={!csvText.trim() || parseMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"><Table2 className="h-4 w-4" />{parseMut.isPending ? "Parsing…" : "Parse & Preview"}</button>
          </div>

          {parsedOrders !== null && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{parsedOrders.length} rows parsed</span>
                  {validCount > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{validCount} valid</span>}
                  {invalidCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{invalidCount} invalid</span>}
                </div>
                <button onClick={() => confirmMut.mutate()} disabled={validCount === 0 || confirmMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="h-4 w-4" />{confirmMut.isPending ? "Importing…" : `Import ${validCount} Orders`}</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/30"><tr>{["#","Customer","WhatsApp","Product","Plan","Qty","Price","Method","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                  <tbody>
                    {parsedOrders.map((o, i) => (
                      <tr key={i} className={`border-b ${!o.valid ? "bg-red-50" : "hover:bg-muted/20"}`}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{o.customerName ?? <span className="text-red-500 italic">missing</span>}</td>
                        <td className="px-3 py-2 font-mono">{o.whatsapp ?? "—"}</td>
                        <td className="px-3 py-2">{o.product ?? <span className="text-red-500 italic">missing</span>}</td>
                        <td className="px-3 py-2">{o.plan ?? "—"}</td>
                        <td className="px-3 py-2">{o.quantity ?? 1}</td>
                        <td className="px-3 py-2">{o.price ? `PKR ${o.price.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2">{o.paymentMethod ?? "—"}</td>
                        <td className="px-3 py-2">
                          {o.valid ? <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" />OK</span> : <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3 w-3" />{o.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">CSV Format Guide</h3>
            <div className="space-y-2 text-sm">
              {[["customer_name","Ahmed Khan (required*)"],["whatsapp","03001234567"],["product","ChatGPT Plus (required*)"],["plan","1 Month"],["quantity","1"],["price","4200"],["payment_method","jazzcash / easypaisa / bank"],["notes","Any extra info"]].map(([col, ex]) => (
                <div key={col} className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-semibold text-primary">{col}</span>
                  <span className="text-xs text-muted-foreground">{ex}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">* at least one required field per row must exist.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">Tips</p>
            <ul className="text-xs space-y-1 text-blue-700 list-disc list-inside">
              <li>Export from your spreadsheet as CSV</li>
              <li>Column names are flexible (name/customer/customer_name all work)</li>
              <li>Rows with errors are highlighted in red and skipped</li>
              <li>Up to 500 orders per import</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
