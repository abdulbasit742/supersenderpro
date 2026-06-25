import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section, Skeleton } from "@/components/ui-kit";
import { RefreshCcw, ShieldCheck, RotateCw, Activity, QrCode, Wifi, WifiOff } from "lucide-react";
import { useHealth } from "@/lib/hooks";
import { api, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/whatsapp")({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const { data: health, isLoading } = useHealth();
  const qc = useQueryClient();

  const connected = health?.status === "ok" || health?.status === "connected";

  async function handleAction(label: string, fn: () => Promise<unknown>) {
    const t = toast.loading(`${label}…`);
    try {
      await fn();
      toast.success(`${label} done`, { id: t });
      qc.invalidateQueries({ queryKey: ["health"] });
    } catch {
      toast.error(`${label} failed`, { id: t });
    }
  }

  return (
    <>
      <PageHeader
        title="WhatsApp"
        subtitle="Session, QR aur recovery controls."
        actions={
          <Btn onClick={() => qc.invalidateQueries({ queryKey: ["health"] })}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Btn>
        }
      />

      {/* ── Status card ── */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            {isLoading ? (
              <Skeleton className="h-12 w-12 rounded-lg" />
            ) : connected ? (
              <div className="h-12 w-12 rounded-lg bg-success/15 grid place-items-center">
                <Wifi className="h-6 w-6 text-success" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-destructive/15 grid place-items-center">
                <WifiOff className="h-6 w-6 text-destructive" />
              </div>
            )}
            <div>
              {isLoading ? (
                <><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-20" /></>
              ) : (
                <>
                  <div className="font-semibold text-lg">
                    {connected ? "Connected" : "Disconnected"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {connected ? "Session is active" : "No active session"}
                  </div>
                </>
              )}
            </div>
          </div>

          {health && !isLoading && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
              {health.engine  && <div className="bg-muted rounded-md p-2"><div>Engine</div><div className="font-medium text-foreground">{health.engine}</div></div>}
              {health.proxy   && <div className="bg-muted rounded-md p-2"><div>Proxy</div><div className="font-medium text-foreground">{health.proxy}</div></div>}
              {health.uptime  && <div className="bg-muted rounded-md p-2"><div>Uptime</div><div className="font-medium text-foreground">{Math.floor(health.uptime / 60)}m</div></div>}
              {health.lastError && <div className="bg-muted rounded-md p-2 col-span-2"><div>Last Error</div><div className="font-medium text-destructive truncate">{health.lastError}</div></div>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Btn variant="primary"  onClick={() => handleAction("Connect",    () => api.waConnect())}><Activity  className="h-4 w-4" /> Connect</Btn>
            <Btn variant="outline"  onClick={() => handleAction("Disconnect", () => api.waDisconnect())}><WifiOff className="h-4 w-4" /> Disconnect</Btn>
            <Btn variant="ghost"    onClick={() => handleAction("Reset",      () => api.waReset())}><RotateCw className="h-4 w-4" /> Reset</Btn>
          </div>
        </Card>

        {/* ── QR code ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">QR Code</h2>
          </div>
          <div className="rounded-lg border-2 border-dashed border-border bg-muted grid place-items-center h-48 mb-4">
            {isLoading ? (
              <Skeleton className="h-32 w-32" />
            ) : connected ? (
              <div className="text-center">
                <ShieldCheck className="h-10 w-10 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Session active — no QR needed</p>
              </div>
            ) : (
              <div className="text-center">
                <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click Connect to generate QR</p>
              </div>
            )}
          </div>
          <a
            href={`${API_BASE_URL}/api/whatsapp/qr/customer-bot`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 h-9 rounded-md bg-secondary text-sm hover:bg-accent transition-colors w-full justify-center"
          >
            <QrCode className="h-4 w-4" /> Open QR Page
          </a>
        </Card>
      </div>

      {/* ── Sessions list placeholder ── */}
      <Section title="Active Sessions">
        <div className="space-y-2">
          {["customer-bot", "dealer-monitor", "admin-alerts"].map((name) => (
            <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm font-mono">{name}</span>
              </div>
              <Badge variant={connected ? "success" : "muted"}>{connected ? "connected" : "offline"}</Badge>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
