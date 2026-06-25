import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Phone, Check, X, Upload, Download, AlertCircle } from "lucide-react";
import type { ValidatedNumber, ValidationBatch } from "@/lib/wa-validator.functions";

export const Route = createFileRoute("/_app/wa-validator")({
  component: WAValidatorPage,
});

const STATUS_COLORS = { valid_wa: "bg-green-100 text-green-700", valid_no_wa: "bg-yellow-100 text-yellow-700", invalid: "bg-red-100 text-red-700", error: "bg-gray-100 text-gray-500" };
const STATUS_LABELS = { valid_wa: "✅ WhatsApp", valid_no_wa: "⚠️ No WhatsApp", invalid: "❌ Invalid", error: "⚠️ Error" };

export default function WAValidatorPage() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ValidationBatch | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const parseMut = useMutation({
    mutationFn: async () => {
      const { parseNumberList } = await import("@/lib/wa-validator.functions");
      return parseNumberList({ data: { text: inputText } });
    },
  });

  const validateMut = useMutation({
    mutationFn: async (numbers: string[]) => {
      const { validateNumbers } = await import("@/lib/wa-validator.functions");
      return validateNumbers({ data: { numbers } });
    },
    onSuccess: (data) => setResult(data),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInputText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    const parsed = await parseMut.mutateAsync();
    validateMut.mutate(parsed.numbers);
  };

  const filteredResults = result ? (filterStatus === "all" ? result.results : result.results.filter(r => r.status === filterStatus)) : [];

  const downloadFiltered = (status: string) => {
    if (!result) return;
    const numbers = result.results.filter(r => status === "all" || r.status === status).map(r => r.normalized);
    const csv = "number\n" + numbers.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${status}-numbers.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = parseMut.isPending || validateMut.isPending;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Phone className="h-6 w-6 text-primary" /> WhatsApp Number Validator</h1>
        <p className="text-muted-foreground text-sm">Validate up to 1,000 numbers and filter who's actually on WhatsApp</p>
      </div>

      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Enter Numbers</h3>
                <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs hover:bg-accent"><Upload className="h-3.5 w-3.5" />Upload file<input type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} /></label>
              </div>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={14} placeholder={`Paste phone numbers — one per line, or comma/semicolon-separated.\n\nExamples:\n03001234567\n+923001234567\n923001234567, 03111234567\n\nUp to 1,000 numbers supported.`} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none font-mono" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{inputText.split(/[\n,;|\t]+/).filter(l => l.trim().length > 5).length} numbers detected</span>
                <button onClick={handleValidate} disabled={!inputText.trim() || isLoading} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                  <Phone className="h-4 w-4" />{isLoading ? (parseMut.isPending ? "Parsing…" : "Validating…") : "Validate Numbers"}
                </button>
              </div>
              {isLoading && <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-2 bg-primary rounded-full animate-pulse w-1/2" /></div>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">How it works</h3>
              <div className="space-y-3 text-sm">
                {[["1. Paste or upload", "Phone numbers in any format"],["2. Auto-normalize", "Converts to international format"],["3. Validate via Meta API", "Checks WhatsApp registration"],["4. Download filtered list", "Valid WA numbers ready to use"]].map(([step, desc]) => (
                  <div key={step} className="flex items-start gap-2"><div className="text-primary font-bold shrink-0">{step.split(".")[0]}.</div><div><div className="font-medium text-xs">{step.slice(3)}</div><div className="text-xs text-muted-foreground">{desc}</div></div></div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <div className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />Demo Mode</div>
              <p className="text-xs">Without Meta API credentials, validation uses random mock results. Add META_WHATSAPP_TOKEN to get real results.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total", value: result.total, color: "bg-card border" },
              { label: "On WhatsApp", value: result.withWhatsApp, color: "bg-green-50 border border-green-200" },
              { label: "Valid (no WA)", value: result.valid - result.withWhatsApp, color: "bg-yellow-50 border border-yellow-200" },
              { label: "Invalid", value: result.invalid, color: "bg-red-50 border border-red-200" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl p-4 text-center`}><div className="text-2xl font-bold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {["all","valid_wa","valid_no_wa","invalid"].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                {f === "all" ? `All (${result.total})` : STATUS_LABELS[f as keyof typeof STATUS_LABELS]}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={() => downloadFiltered("valid_wa")} className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />WA numbers</button>
              <button onClick={() => downloadFiltered("all")} className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />All</button>
              <button onClick={() => { setResult(null); setInputText(""); }} className="px-3 py-1.5 border rounded text-xs hover:bg-accent">New Batch</button>
            </div>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr>{["#","Original","Normalized","Status"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {filteredResults.map((r, i) => (
                  <tr key={r.number + i} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.number}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.normalized}</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
