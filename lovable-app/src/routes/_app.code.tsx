import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section } from "@/components/ui-kit";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/code")({
  component: CodePage,
});

const demoStatus = {
  lastScan: "2025-06-11 14:22",
  scanned: 412,
  matched: 38,
  suggestions: [
    { title: "Add Stripe webhook handler", confidence: 0.92 },
    { title: "Refactor bot router to plugin system", confidence: 0.81 },
    { title: "Cache plan availability for 60s", confidence: 0.74 },
  ],
  topFiles: [
    { path: "src/bot/router.ts", score: 0.93 },
    { path: "src/api/plans.ts", score: 0.88 },
    { path: "src/social/publisher.ts", score: 0.79 },
  ],
};

function CodePage() {
  const [status, setStatus] = useState<any>(demoStatus);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { api.getCodeIntelligenceStatus().then(s => s && setStatus(s)); }, []);

  const run = async () => {
    setScanning(true);
    const res = await api.runCodeScan();
    if (res) setStatus(res);
    setScanning(false);
    toast.success("Workspace scan complete");
  };

  return (
    <>
      <PageHeader
        title="Code Intelligence"
        subtitle="Workspace scans, suggestions aur implementation prompts."
        actions={<Btn variant="primary" onClick={run} disabled={scanning}><Play className="h-4 w-4" /> {scanning ? "Scanning…" : "Run Workspace Scan"}</Btn>}
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Card><div className="text-xs text-muted-foreground">Last scan</div><div className="font-semibold mt-1">{status.lastScan}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Scanned files</div><div className="font-semibold mt-1">{status.scanned}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Matched files</div><div className="font-semibold mt-1">{status.matched}</div></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Top Feature Suggestions">
          <ul className="space-y-2">
            {status.suggestions.map((s: any) => (
              <li key={s.title} className="p-3 rounded bg-muted flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">confidence: {(s.confidence * 100).toFixed(0)}%</div>
                </div>
                <Btn onClick={() => { navigator.clipboard?.writeText(`Implement: ${s.title}`); toast.success("Prompt copied"); }}>
                  <Copy className="h-3.5 w-3.5" /> Copy prompt
                </Btn>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Top Matched Files">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left py-2">File</th><th className="text-right py-2">Score</th></tr>
            </thead>
            <tbody>
              {status.topFiles.map((f: any) => (
                <tr key={f.path} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{f.path}</td>
                  <td className="py-2 text-right"><Badge variant="info">{f.score.toFixed(2)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </>
  );
}
