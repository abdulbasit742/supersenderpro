import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section, Skeleton } from "@/components/ui-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/code")({
  component: CodePage,
});

interface CodeSuggestion { title: string; confidence: number; }
interface CodeFile      { path: string; score: number; }
interface CodeStatus    { lastScan: string; scanned: number; matched: number; suggestions: CodeSuggestion[]; topFiles: CodeFile[]; }

const demoStatus: CodeStatus = {
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
  const qc = useQueryClient();

  const { data: status = demoStatus, isLoading } = useQuery<CodeStatus>({
    queryKey: ["code-intelligence"],
    queryFn: async () => {
      const s = await api.getCodeIntelligenceStatus();
      return (s as CodeStatus | null) ?? demoStatus;
    },
    staleTime: 300_000,
    placeholderData: demoStatus,
  });

  const [scanning, setScanning] = [false, () => {}]; // local UI state via useState would require importing it

  async function run() {
    const t = toast.loading("Scanning workspace…");
    try {
      const res = await api.runCodeScan();
      if (res) qc.setQueryData(["code-intelligence"], res);
      toast.success("Workspace scan complete", { id: t });
    } catch {
      toast.error("Scan failed — demo mode", { id: t });
    }
  }

  return (
    <>
      <PageHeader
        title="Code Intelligence"
        subtitle="Workspace scans, suggestions aur implementation prompts."
        actions={
          <Btn variant="primary" onClick={run}>
            <Play className="h-4 w-4" /> Run Workspace Scan
          </Btn>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-5 w-16" /></Card>
          ))
        ) : (
          <>
            <Card><div className="text-xs text-muted-foreground">Last scan</div><div className="font-semibold mt-1">{status.lastScan}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Scanned files</div><div className="font-semibold mt-1">{status.scanned}</div></Card>
            <Card><div className="text-xs text-muted-foreground">Matched files</div><div className="font-semibold mt-1">{status.matched}</div></Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Top Feature Suggestions">
          {isLoading ? (
            <ul className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="p-3 rounded bg-muted flex justify-between items-center">
                  <div><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-8 w-28 rounded-md" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {status.suggestions.map((s: CodeSuggestion) => (
                <li key={s.title} className="p-3 rounded bg-muted flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">confidence: {(s.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <Btn onClick={() => {
                    navigator.clipboard?.writeText(`Implement: ${s.title}`);
                    toast.success("Prompt copied");
                  }}>
                    <Copy className="h-3.5 w-3.5" /> Copy prompt
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Top Matched Files">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left py-2">File</th><th className="text-right py-2">Score</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2"><Skeleton className="h-3 w-40" /></td>
                    <td className="py-2 flex justify-end"><Skeleton className="h-5 w-12 rounded-full" /></td>
                  </tr>
                ))
              ) : (
                status.topFiles.map((f: CodeFile) => (
                  <tr key={f.path} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{f.path}</td>
                    <td className="py-2 text-right"><Badge variant="info">{f.score.toFixed(2)}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>
      </div>
    </>
  );
}
