import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Input, Select, Section } from "@/components/ui-kit";
import { API_BASE_URL } from "@/lib/api";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUserSettings, saveUserSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const defaults: Record<string, string> = {
  jazzcash: "",
  easypaisa: "",
  iban: "",
  adminWa: "",
  ownerWa: "",
  supportWa: "",
  apiBase: API_BASE_URL,
  waProxy: "direct",
  groupIds: "",
  channelIds: "",
  groqKey: "",
  metaAppId: "",
  metaAppSecret: "",
  metaToken: "",
  fbAppId: "",
  igBizId: "",
  liClientId: "",
  ttClientKey: "",
  lowStock: "5",
  brandingFooter: "— SuperSender Pro",
  language: "Urdu + English (mixed)",
};

function SettingsPage() {
  const [s, setS] = useState<Record<string, string>>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const fnGet = useServerFn(getUserSettings);
  const fnSave = useServerFn(saveUserSettings);

  useEffect(() => {
    fnGet()
      .then((data) => {
        setS((prev) => ({ ...prev, ...data }));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setS((p) => ({ ...p, [k]: e.target.value }));

  const save = async (section: string) => {
    setBusy(true);
    try {
      await fnSave({ data: s });
      toast.success(`${section} saved`, { description: "Stored in your account." });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Numbers, API keys, payment details aur branding. Sab kuch account mein save hota hai."
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Payment Details">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">JazzCash number</label>
            <Input placeholder="03XX-XXXXXXX" value={s.jazzcash} onChange={set("jazzcash")} />
            <label className="text-xs text-muted-foreground">EasyPaisa number</label>
            <Input placeholder="03XX-XXXXXXX" value={s.easypaisa} onChange={set("easypaisa")} />
            <label className="text-xs text-muted-foreground">Bank IBAN</label>
            <Input placeholder="PK00 0000 0000 0000 0000 0000" value={s.iban} onChange={set("iban")} />
            <Btn variant="primary" onClick={() => save("Payment details")} disabled={busy}>Save</Btn>
          </div>
        </Section>

        <Section title="WhatsApp Numbers & API">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Admin WhatsApp (+92...)</label>
            <Input placeholder="+923001234567" value={s.adminWa} onChange={set("adminWa")} />
            <label className="text-xs text-muted-foreground">Owner WhatsApp</label>
            <Input placeholder="+923001234567" value={s.ownerWa} onChange={set("ownerWa")} />
            <label className="text-xs text-muted-foreground">Support WhatsApp</label>
            <Input placeholder="+923001234567" value={s.supportWa} onChange={set("supportWa")} />
            <label className="text-xs text-muted-foreground">Backend API base URL</label>
            <Input placeholder="https://app.example.com" value={s.apiBase} onChange={set("apiBase")} />
            <label className="text-xs text-muted-foreground">WA proxy</label>
            <Input placeholder="direct" value={s.waProxy} onChange={set("waProxy")} />
            <label className="text-xs text-muted-foreground">Group IDs (comma-separated)</label>
            <Input value={s.groupIds} onChange={set("groupIds")} />
            <label className="text-xs text-muted-foreground">Channel IDs (comma-separated)</label>
            <Input value={s.channelIds} onChange={set("channelIds")} />
            <Btn variant="primary" onClick={() => save("WhatsApp & API")} disabled={busy}>Save</Btn>
          </div>
        </Section>

        <Section title="API Keys (stored in account)">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Groq API key</label>
            <Input type="password" placeholder="gsk_..." value={s.groqKey} onChange={set("groqKey")} />
            <label className="text-xs text-muted-foreground">Meta App ID</label>
            <Input value={s.metaAppId} onChange={set("metaAppId")} />
            <label className="text-xs text-muted-foreground">Meta App Secret</label>
            <Input type="password" value={s.metaAppSecret} onChange={set("metaAppSecret")} />
            <label className="text-xs text-muted-foreground">Meta Access Token</label>
            <Input type="password" value={s.metaToken} onChange={set("metaToken")} />
            <p className="text-[11px] text-muted-foreground">
              Note: ye keys aapke account mein secure store hoti hain.
            </p>
            <Btn variant="primary" onClick={() => save("API keys")} disabled={busy}>Save</Btn>
          </div>
        </Section>

        <Section title="Social OAuth">
          <div className="grid gap-2">
            <Input placeholder="Facebook App ID" value={s.fbAppId} onChange={set("fbAppId")} />
            <Input placeholder="Instagram Business ID" value={s.igBizId} onChange={set("igBizId")} />
            <Input placeholder="LinkedIn Client ID" value={s.liClientId} onChange={set("liClientId")} />
            <Input placeholder="TikTok Client Key" value={s.ttClientKey} onChange={set("ttClientKey")} />
            <Btn variant="primary" onClick={() => save("Social OAuth")} disabled={busy}>Save</Btn>
          </div>
        </Section>

        <Section title="Operations">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Low stock threshold</label>
            <Input type="number" value={s.lowStock} onChange={set("lowStock")} />
            <label className="text-xs text-muted-foreground">Branding footer</label>
            <Input value={s.brandingFooter} onChange={set("brandingFooter")} />
            <label className="text-xs text-muted-foreground">Language</label>
            <Select value={s.language} onChange={set("language")}>
              <option>Urdu + English (mixed)</option>
              <option>English</option>
              <option>Urdu</option>
            </Select>
            <Btn variant="primary" onClick={() => save("Operations")} disabled={busy}>Save</Btn>
          </div>
        </Section>

        <Card className="lg:col-span-2 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="font-semibold">Backup & Export</div>
            <div className="text-xs text-muted-foreground">Current settings JSON export.</div>
          </div>
          <div className="flex gap-2">
            <Btn
              onClick={() => {
                const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "supersender-settings.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" /> Export Settings
            </Btn>
            <Btn variant="primary" onClick={() => save("All settings")} disabled={busy}>Save All</Btn>
          </div>
        </Card>
      </div>
    </>
  );
}
