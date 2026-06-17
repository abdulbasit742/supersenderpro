import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section } from "@/components/ui-kit";
import { RefreshCcw, ShieldCheck, RotateCw, Activity, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { api, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/whatsapp")({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const h = await api.getHealth();
    setHealth(h);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const connected = health?.status === "ok" || health?.status === "connected";

  return (
    <>
      <PageHeader
        title="WhatsApp"
        subtitle="Session, QR aur recovery controls."
        actions={
          <>
            <Btn onClick={refresh}><RefreshCcw className="h-4 w-4" /> Refresh QR</Btn>
            <Btn onClick={() => toast.message("Soft recover queued")}><ShieldCheck className="h-4 w-4" /> Soft Recover</Btn>
            <Btn variant="destructive" onClick={() => toast.warning("Fresh reset will logout the session")}><RotateCw className="h-4 w-4" /> Fresh Reset</Btn>
            <Btn variant="primary" onClick={() => toast.success("Automation status refreshed")}><Activity className="h-4 w-4" /> Automation Status</Btn>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="Connection Status">
          <div className="space-y-3 text-sm">
            <Row k="Status" v={
              loading ? <Badge variant="muted">Checking…</Badge> :
              connected ? <Badge variant="success">Connected</Badge> :
              <Badge variant="destructive">Disconnected</Badge>
            } />
            <Row k="Engine" v={health?.engine ?? "baileys"} />
            <Row k="Proxy" v={health?.proxy ?? "direct"} />
            <Row k="Last Error" v={<span className="text-warning">{health?.lastError ?? "—"}</span>} />
            <Row k="Endpoint" v={<code className="text-xs">{API_BASE_URL}/api/health</code>} />
          </div>
        </Section>

        <Section title="QR Code" actions={<Btn onClick={refresh}><RefreshCcw className="h-4 w-4" /></Btn>}>
          <div className="aspect-square rounded-lg border border-border bg-muted grid place-items-center overflow-hidden">
            <div className="text-center px-4">
              <QrCode className="h-16 w-16 text-primary mx-auto mb-3" />
              <div className="text-sm text-muted-foreground mb-3">
                {connected ? "Already connected" : "Scan QR from /wa-qr"}
              </div>
              <a
                href={`${API_BASE_URL}/wa-qr`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                Open QR Panel
              </a>
            </div>
          </div>
        </Section>

        <Section title="Quick Diagnostics">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between p-2 rounded bg-muted">
              <span>Backend reachable</span>
              <Badge variant={health ? "success" : "warning"}>{health ? "Yes" : "Demo"}</Badge>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-muted">
              <span>Bot worker</span><Badge variant="success">Running</Badge>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-muted">
              <span>Inbound queue</span><Badge variant="info">12 pending</Badge>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-muted">
              <span>Outbound rate</span><Badge variant="muted">8 msg / min</Badge>
            </li>
          </ul>
        </Section>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
