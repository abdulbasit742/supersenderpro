import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Facebook, Instagram, Linkedin, Music2, MessageCircle, Send, Plug, Trash2,
  CheckCircle2, AlertCircle, Store, Globe, ShoppingBag, Package,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Skeleton } from "@/components/ui-kit";
import type { EcommerceAccount } from "@/lib/types";

export const Route = createFileRoute("/_app/connections")({
  component: ConnectionsPage,
  head: () => ({ meta: [{ title: "Connections — SuperSender" }, { name: "description", content: "Connect social channels and e-commerce marketplaces." }] }),
});

interface SocialAccount { id: string; platform: string; handle: string; is_active: boolean; }

const socialPlatforms = [
  { id: "telegram", label: "Telegram",  icon: Send,           status: "ready",   note: "Bot token + chat ID paste karein." },
  { id: "facebook", label: "Facebook",  icon: Facebook,       status: "pending", note: "Meta app credentials chahiyen (App Review)." },
  { id: "instagram",label: "Instagram", icon: Instagram,      status: "pending", note: "FB Business Page se link hoga." },
  { id: "linkedin", label: "LinkedIn",  icon: Linkedin,       status: "pending", note: "LinkedIn app credentials chahiyen." },
  { id: "tiktok",   label: "TikTok",    icon: Music2,         status: "pending", note: "TikTok Content Posting API approval chahiye." },
  { id: "whatsapp", label: "WhatsApp",  icon: MessageCircle,  status: "pending", note: "WhatsApp Cloud API (Meta business)." },
] as const;

const ecommercePlatforms = [
  { id: "daraz",   label: "Daraz",   icon: ShoppingBag, status: "ready", note: "Daraz Seller API key se connect karein." },
  { id: "etsy",    label: "Etsy",    icon: Store,       status: "ready", note: "Etsy API v3 app credentials chahiyen." },
  { id: "amazon",  label: "Amazon",  icon: Globe,       status: "ready", note: "SP-API credentials (Seller ID, MWS Auth Token)." },
  { id: "shopify", label: "Shopify", icon: Package,     status: "ready", note: "Store URL + Admin API access token." },
] as const;

function ConnectionsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showTg, setShowTg] = useState(false);
  const [showEco, setShowEco] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const { data: socialAccounts = [], isLoading: loadingSocial } = useQuery<SocialAccount[]>({
    queryKey: ["social-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("social_accounts").select("*").eq("user_id", user.id);
      return (data ?? []) as SocialAccount[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: ecomAccounts = [], isLoading: loadingEcom } = useQuery<EcommerceAccount[]>({
    queryKey: ["ecommerce-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("ecommerce_accounts").select("*").eq("user_id", user.id);
      return (data ?? []) as EcommerceAccount[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  async function disconnectSocial(id: string) {
    if (!confirm("Disconnect this account?")) return;
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["social-accounts"] }); }
  }

  async function disconnectEcommerce(id: string) {
    if (!confirm("Disconnect this marketplace account?")) return;
    const { error } = await supabase.from("ecommerce_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["ecommerce-accounts"] }); }
  }

  function onConnected() {
    qc.invalidateQueries({ queryKey: ["social-accounts"] });
    qc.invalidateQueries({ queryKey: ["ecommerce-accounts"] });
  }

  const isLoading = loadingSocial || loadingEcom;

  return (
    <>
      <PageHeader
        title="Connections"
        subtitle="Apne social channels aur e-commerce marketplaces yahan connect karein."
        actions={
          <button onClick={() => { qc.invalidateQueries({ queryKey: ["social-accounts"] }); qc.invalidateQueries({ queryKey: ["ecommerce-accounts"] }); }} className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent">
            Refresh
          </button>
        }
      />

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Social Channels</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {socialPlatforms.map((p) => {
          const Icon = p.icon;
          const connected = socialAccounts.filter((a) => a.platform === p.id);
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center"><Icon className="h-4 w-4" /></div>
                  <div className="font-semibold">{p.label}</div>
                </div>
                {p.status === "ready"
                  ? <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</span>
                  : <span className="text-[10px] bg-warning/15 text-warning px-2 py-0.5 rounded-full inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Setup needed</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{p.note}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-full rounded-md mb-3" />
              ) : connected.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {connected.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-secondary rounded-md px-2 py-1.5">
                      <span className="truncate">{a.handle}</span>
                      <button onClick={() => disconnectSocial(a.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {p.id === "telegram" ? (
                <button onClick={() => setShowTg(true)} className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90">
                  <Plug className="h-4 w-4" /> {connected.length > 0 ? "Add Bot" : "Connect"}
                </button>
              ) : (
                <button disabled className="w-full h-9 rounded-md bg-muted text-muted-foreground text-sm font-medium inline-flex items-center justify-center gap-2 cursor-not-allowed">
                  Coming soon
                </button>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">E-Commerce Marketplaces</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ecommercePlatforms.map((p) => {
          const Icon = p.icon;
          const connected = ecomAccounts.filter((a) => a.platform === p.id);
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-accent text-accent-foreground grid place-items-center"><Icon className="h-4 w-4" /></div>
                  <div className="font-semibold">{p.label}</div>
                </div>
                <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{p.note}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-full rounded-md mb-3" />
              ) : connected.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {connected.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-secondary rounded-md px-2 py-1.5">
                      <span className="truncate">{a.shop_name || a.shop_id || a.platform}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={a.is_active ? "text-success" : "text-muted-foreground"}>{a.is_active ? "Active" : "Paused"}</span>
                        <button onClick={() => disconnectEcommerce(a.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowEco(p.id)} className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90">
                <Plug className="h-4 w-4" /> {connected.length > 0 ? "Add Account" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      {showTg  && <TelegramModal   user={user} onClose={() => setShowTg(false)}   onDone={() => { setShowTg(false); onConnected(); }} />}
      {showEco && <EcommerceModal  platform={showEco} user={user} onClose={() => setShowEco(null)} onDone={() => { setShowEco(null); onConnected(); }} />}
    </>
  );
}

interface ModalUser { id: string; }

function TelegramModal({ user, onClose, onDone }: { user: ModalUser | null; onClose: () => void; onDone: () => void }) {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!token || !chatId) { toast.error("Bot token aur Chat ID dono chahiyen"); return; }
    setBusy(true);
    try {
      const test = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j = await test.json() as { ok: boolean; description?: string; result?: { username?: string } };
      if (!j.ok) throw new Error(j.description ?? "Invalid bot token");
      const botName = j.result?.username ?? "bot";
      const { error } = await supabase.from("social_accounts").insert({
        user_id: user!.id, platform: "telegram",
        handle: handle || `@${botName} → ${chatId}`,
        remote_id: chatId, access_token: token, is_active: true,
        meta: { bot_username: botName },
      });
      if (error) throw error;
      toast.success("Telegram connected!");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">Connect Telegram</h2>
        <p className="text-xs text-muted-foreground mb-4">
          1. @BotFather pe bot banayein → token milega<br />
          2. Apne channel/group mein bot ko admin banayein<br />
          3. Channel ID (e.g. @yourchannel) ya numeric chat ID paste karein
        </p>
        <div className="space-y-3">
          <input value={token}  onChange={(e) => setToken(e.target.value)}  placeholder="Bot Token (123456:ABC...)" type="password" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Chat ID or @channel"        className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Friendly name (optional)"  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-md bg-secondary text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">{busy ? "Saving…" : "Connect"}</button>
        </div>
      </div>
    </div>
  );
}

type EcoField = "shopId" | "shopName" | "apiKey" | "apiSecret" | "accessToken" | "refreshToken";
interface EcoCfg { title: string; fields: EcoField[]; placeholders: Partial<Record<EcoField, string>>; help: string; }

function EcommerceModal({ platform, user, onClose, onDone }: { platform: string; user: ModalUser | null; onClose: () => void; onDone: () => void }) {
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [busy, setBusy] = useState(false);

  const labels: Record<string, EcoCfg> = {
    daraz:   { title: "Connect Daraz",       fields: ["shopId","shopName","apiKey","apiSecret"], placeholders: { shopId: "Shop ID (e.g. 12345)", shopName: "Shop Name", apiKey: "API Key", apiSecret: "API Secret" }, help: "Daraz Seller Center → API Settings se API Key/Secret copy karein." },
    etsy:    { title: "Connect Etsy",        fields: ["shopId","shopName","accessToken","refreshToken"], placeholders: { shopId: "Shop ID (numeric)", shopName: "Shop Name", accessToken: "Access Token", refreshToken: "Refresh Token" }, help: "Etsy Developers → Your Apps → OAuth flow se tokens lein." },
    amazon:  { title: "Connect Amazon SP-API", fields: ["shopId","shopName","apiKey","apiSecret"], placeholders: { shopId: "Seller ID / Merchant ID", shopName: "Store Name", apiKey: "AWS Access Key ID", apiSecret: "AWS Secret Key + MWS Auth Token" }, help: "Amazon Seller Central → Developer Central se credentials lein." },
    shopify: { title: "Connect Shopify",     fields: ["shopId","shopName","accessToken"], placeholders: { shopId: "Store URL (e.g. mystore.myshopify.com)", shopName: "Store Name", accessToken: "Admin API Access Token" }, help: "Shopify Admin → Settings → Apps → Develop app → Admin API access token." },
  };

  const cfg = labels[platform];

  async function save() {
    if (!shopId) { toast.error("Shop ID chahiye"); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: user!.id, platform, shop_id: shopId, shop_name: shopName || shopId, is_active: true,
      };
      if (apiKey)       payload.api_key      = apiKey;
      if (apiSecret)    payload.api_secret   = apiSecret;
      if (accessToken)  payload.access_token = accessToken;
      if (refreshToken) payload.refresh_token = refreshToken;

      const { error } = await supabase.from("ecommerce_accounts").insert(payload);
      if (error) throw error;
      toast.success(`${cfg.title.replace("Connect ", "")} connected!`);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  const fieldState: Record<EcoField, { val: string; set: (v: string) => void }> = {
    shopId:       { val: shopId,       set: setShopId },
    shopName:     { val: shopName,     set: setShopName },
    apiKey:       { val: apiKey,       set: setApiKey },
    apiSecret:    { val: apiSecret,    set: setApiSecret },
    accessToken:  { val: accessToken,  set: setAccessToken },
    refreshToken: { val: refreshToken, set: setRefreshToken },
  };

  const sensitiveFields = new Set<EcoField>(["apiKey","apiSecret","accessToken","refreshToken"]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">{cfg.title}</h2>
        <p className="text-xs text-muted-foreground mb-4">{cfg.help}</p>
        <div className="space-y-3">
          {cfg.fields.map((f) => (
            <input
              key={f}
              value={fieldState[f].val}
              onChange={(e) => fieldState[f].set(e.target.value)}
              placeholder={cfg.placeholders[f] ?? f}
              type={sensitiveFields.has(f) ? "password" : "text"}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm"
            />
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-md bg-secondary text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">{busy ? "Saving…" : "Connect"}</button>
        </div>
      </div>
    </div>
  );
}
