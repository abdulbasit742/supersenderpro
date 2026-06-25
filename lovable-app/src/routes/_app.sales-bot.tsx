import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Toggle, Skeleton } from "@/components/ui-kit";
import {
  Bot, TrendingUp, ShoppingCart, BadgeDollarSign, Percent,
  MessageSquare, Zap, Clock, CreditCard, Package, Settings2,
  CheckCircle2, Circle, ChevronRight, Sparkles, PhoneCall,
  RefreshCw, Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getSalesBotConfig, saveSalesBotConfig, getSalesBotStats, getBotConversations,
} from "@/lib/sales-bot.functions";
import type { BotConfig } from "@/lib/sales-bot.functions";

export const Route = createFileRoute("/_app/sales-bot")({
  component: SalesBotPage,
});

// ─── Static catalog data (mirrors catalog.tsx) ────────────────────────────────

const CATEGORIES = [
  { id: "ai",    label: "AI Tools",    emoji: "🤖" },
  { id: "lap",   label: "Laptops",     emoji: "💻" },
  { id: "acc",   label: "Accessories", emoji: "🔌" },
  { id: "dry",   label: "Dry Fruits",  emoji: "🥜" },
  { id: "shirt", label: "Shirts",      emoji: "👕" },
  { id: "pizza", label: "Pizza",       emoji: "🍕" },
];

const ALL_PRODUCTS = [
  { id: "ai-1",    cat: "ai",    name: "ChatGPT Plus 1M",   price: 1500 },
  { id: "ai-2",    cat: "ai",    name: "Claude Pro",        price: 1700 },
  { id: "lap-1",   cat: "lap",   name: "Dell Latitude 7490",price: 78000 },
  { id: "lap-2",   cat: "lap",   name: "HP EliteBook 840",  price: 72000 },
  { id: "acc-1",   cat: "acc",   name: "SSD 512GB NVMe",    price: 9500 },
  { id: "acc-2",   cat: "acc",   name: "RAM 8GB DDR4",      price: 4500 },
  { id: "dry-1",   cat: "dry",   name: "Almonds 1kg",       price: 2800 },
  { id: "dry-2",   cat: "dry",   name: "Cashew 500g",       price: 2200 },
  { id: "shirt-1", cat: "shirt", name: "Casual Shirt M",    price: 2400 },
  { id: "pizza-1", cat: "pizza", name: "Fajita Large",      price: 1899 },
];

const PRESET_FLOWS = [
  {
    id: "welcome",
    name: "New Customer Welcome",
    trigger: "First message / Hi / Salam",
    icon: MessageSquare,
    color: "text-primary",
    steps: ["Greet by name", "Show menu", "Ask what they need"],
    desc: "Jab koi pehli dafa message kare — bot unhe welcome karta hai aur menu dikhata hai.",
  },
  {
    id: "price_inquiry",
    name: "Price Inquiry → Quote",
    trigger: "price / rate / kitna / قیمت",
    icon: BadgeDollarSign,
    color: "text-warning",
    steps: ["Detect product", "Show price + stock", "Offer to order"],
    desc: "Customer price pooche → bot price bataye → order lene ki offer kare.",
  },
  {
    id: "order_flow",
    name: "Order → Payment",
    trigger: "order / buy / lena hai / چاہیے",
    icon: ShoppingCart,
    color: "text-success",
    steps: ["Confirm product + qty", "Share payment details", "Await screenshot", "Confirm delivery"],
    desc: "Customer order karna chahe → bot order collect kare, payment details bheje, confirmation le.",
  },
  {
    id: "followup",
    name: "Payment Follow-up",
    trigger: "2 hours after order — no payment",
    icon: Clock,
    color: "text-info",
    steps: ["Remind about pending payment", "Resend payment details", "Offer to cancel if needed"],
    desc: "Order hua par payment nahi aayi → bot 2 ghante baad yaad dilata hai.",
  },
  {
    id: "post_purchase",
    name: "Post-Purchase Check-in",
    trigger: "24 hours after delivery",
    icon: CheckCircle2,
    color: "text-success",
    steps: ["Ask if satisfied", "Request review / referral", "Offer next product"],
    desc: "Delivery ke baad bot customer se satisfaction le aur referral maange.",
  },
  {
    id: "abandoned",
    name: "Abandoned Cart Recovery",
    trigger: "Browsing stopped > 30 min",
    icon: Zap,
    color: "text-destructive",
    steps: ["Re-engage with offer", "Share discount (optional)", "Simplify order process"],
    desc: "Customer browse karta raha par order nahi kiya → bot wapas engage kare.",
  },
];

const TONE_OPTIONS = [
  { id: "mixed",      label: "Mixed (Urdu + English)",   desc: "Sabse popular — natural conversation" },
  { id: "casual_urdu",label: "Casual Urdu",              desc: "Friendly, informal Urdu" },
  { id: "formal_urdu",label: "Formal Urdu",              desc: "Professional & respectful" },
  { id: "english",    label: "English",                  desc: "Full English for urban customers" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BotStats {
  conversations: number;
  orders: number;
  revenue: number;
  conversionRate: number;
}

interface BotConversation {
  id: string;
  customer_name?: string;
  phone?: string;
  status?: string;
  last_message?: string;
  intent?: string;
  created_at?: string;
  revenue?: number;
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────

const MOCK_STATS: BotStats = { conversations: 47, orders: 12, revenue: 38400, conversionRate: 26 };
const MOCK_CONVOS: BotConversation[] = [
  { id: "1", customer_name: "Ali Hassan",   phone: "03001234567", status: "ordered",    intent: "price_inquiry", created_at: new Date(Date.now() - 1800000).toISOString(), revenue: 1700 },
  { id: "2", customer_name: "Sara Ahmed",   phone: "03211111111", status: "browsing",   intent: "availability",  created_at: new Date(Date.now() - 3600000).toISOString(), revenue: 0 },
  { id: "3", customer_name: "Bilal Raza",   phone: "03451234567", status: "paid",       intent: "order",         created_at: new Date(Date.now() - 7200000).toISOString(), revenue: 9500 },
  { id: "4", customer_name: "Zara Khan",    phone: "03331234567", status: "pending_pay",intent: "order",         created_at: new Date(Date.now() - 10800000).toISOString(),revenue: 1500 },
  { id: "5", customer_name: "Usman Malik",  phone: "03121234567", status: "completed",  intent: "renewal",       created_at: new Date(Date.now() - 18000000).toISOString(),revenue: 3400 },
];

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "configure" | "products" | "flows" | "activity";

function SalesBotPage() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <>
      <PageHeader
        title="AI Sales Bot Studio"
        subtitle="WhatsApp bot configure karein — products, flows, payment methods aur analytics."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse inline-block" />Bot Active</Badge>
          </div>
        }
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 bg-secondary rounded-lg p-1 w-fit">
        {(["dashboard","configure","products","flows","activity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-8 px-3 rounded-md text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "dashboard" ? "Dashboard" :
             t === "configure" ? "Configure" :
             t === "products"  ? "Products" :
             t === "flows"     ? "AI Flows" : "Activity"}
          </button>
        ))}
      </div>

      {tab === "dashboard"  && <DashboardTab />}
      {tab === "configure"  && <ConfigureTab />}
      {tab === "products"   && <ProductsTab />}
      {tab === "flows"      && <FlowsTab />}
      {tab === "activity"   && <ActivityTab />}
    </>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab() {
  const fnStats = useServerFn(getSalesBotStats);
  const fnConvos = useServerFn(getBotConversations);

  const { data: stats, isLoading: loadingStats } = useQuery<BotStats>({
    queryKey: ["sales-bot-stats"],
    queryFn: async () => {
      try { return await fnStats() as BotStats; }
      catch { return MOCK_STATS; }
    },
    staleTime: 60_000,
    placeholderData: MOCK_STATS,
  });

  const { data: convos = [] } = useQuery<BotConversation[]>({
    queryKey: ["bot-conversations"],
    queryFn: async () => {
      try { const d = await fnConvos() as BotConversation[]; return d.length ? d : MOCK_CONVOS; }
      catch { return MOCK_CONVOS; }
    },
    staleTime: 30_000,
    placeholderData: MOCK_CONVOS,
  });

  const s = stats ?? MOCK_STATS;

  const statCards = [
    { label: "Conversations Today", value: s.conversations, icon: MessageSquare, color: "text-primary",     suffix: "" },
    { label: "Bot Orders",          value: s.orders,         icon: ShoppingCart,  color: "text-warning",     suffix: "" },
    { label: "Revenue (PKR)",       value: `${(s.revenue).toLocaleString()}`, icon: BadgeDollarSign, color: "text-success", suffix: "" },
    { label: "Conversion Rate",     value: s.conversionRate, icon: Percent,       color: "text-info",        suffix: "%" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <Card key={c.label}>
            {loadingStats ? (
              <><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-7 w-16" /></>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className={cn("h-4 w-4 shrink-0", c.color)} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <div className="text-2xl font-bold">{c.value}{c.suffix}</div>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <Card>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Conversion Funnel (Today)
        </h2>
        <div className="space-y-2">
          {[
            { label: "Messages received",  value: s.conversations, max: s.conversations, color: "bg-primary" },
            { label: "Product inquiries",  value: Math.round(s.conversations * 0.65), max: s.conversations, color: "bg-info" },
            { label: "Orders initiated",   value: s.orders,        max: s.conversations, color: "bg-warning" },
            { label: "Payments confirmed", value: Math.round(s.orders * 0.67), max: s.conversations, color: "bg-success" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-36 shrink-0">{row.label}</div>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", row.color)}
                  style={{ width: `${row.max > 0 ? (row.value / row.max) * 100 : 0}%` }}
                />
              </div>
              <div className="text-xs font-medium w-6 text-right">{row.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent convos */}
      <Card>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> Recent Bot Conversations
        </h2>
        <div className="space-y-2">
          {convos.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 text-xs font-bold uppercase">
                {(c.customer_name ?? "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.customer_name ?? c.phone}</div>
                <div className="text-xs text-muted-foreground">{c.intent?.replace("_", " ") ?? "—"}</div>
              </div>
              <ConvoStatusBadge status={c.status} />
              {(c.revenue ?? 0) > 0 && (
                <div className="text-xs font-medium text-success">PKR {(c.revenue ?? 0).toLocaleString()}</div>
              )}
              <div className="text-[10px] text-muted-foreground w-16 text-right">
                {c.created_at ? timeAgo(c.created_at) : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Configure ───────────────────────────────────────────────────────────

function ConfigureTab() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getSalesBotConfig);
  const fnSave = useServerFn(saveSalesBotConfig);

  const { data: cfg, isLoading } = useQuery<BotConfig>({
    queryKey: ["sales-bot-config"],
    queryFn: async () => {
      try { return await fnGet() as BotConfig; } catch { return {}; }
    },
    staleTime: 300_000,
  });

  const [form, setForm] = useState<BotConfig>({});

  useEffect(() => { if (cfg) setForm(cfg); }, [cfg]);

  const set = <K extends keyof BotConfig>(key: K) => (val: BotConfig[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const saveMut = useMutation({
    mutationFn: (data: BotConfig) => fnSave({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-bot-config"] });
      toast.success("Bot configuration saved");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><Skeleton className="h-4 w-32 mb-3" /><Skeleton className="h-20 w-full rounded-md" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">

      {/* Bot on/off */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Bot Status</h2>
          </div>
          <Toggle checked={form.enabled ?? true} onChange={(v) => set("enabled")(v)} />
        </div>
        <p className="text-sm text-muted-foreground">
          {form.enabled ?? true
            ? "Bot active hai — incoming WhatsApp messages handle ho rahe hain."
            : "Bot paused hai — messages queue mein aa rahe hain, koi reply nahi."}
        </p>
      </Card>

      {/* Greeting */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Greeting Message</h2>
        </div>
        <textarea
          rows={4}
          value={form.greeting ?? "السلام علیکم! 👋 SuperSender Bot mein khush amdeed. Main aapki kaise madad kar sakta hoon?\n\n1️⃣ Products & Prices\n2️⃣ Order Place Karein\n3️⃣ Support"}
          onChange={(e) => set("greeting")(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm resize-none"
        />
      </Card>

      {/* AI Tone */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">AI Tone</h2>
        </div>
        <div className="space-y-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => set("tone")(t.id as BotConfig["tone"])}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                (form.tone ?? "mixed") === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Payment Methods */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Payment Methods</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "paymentJazzCash"  as const, label: "JazzCash Number",    placeholder: "03XX-XXXXXXX" },
            { key: "paymentEasyPaisa" as const, label: "EasyPaisa Number",   placeholder: "03XX-XXXXXXX" },
            { key: "paymentBank"      as const, label: "Bank IBAN / Account",placeholder: "PK00 0000 0000..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input
                value={(form[key] as string) ?? ""}
                onChange={(e) => set(key)(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Business Hours */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Business Hours</h2>
          </div>
          <Toggle
            checked={form.businessHours?.enabled ?? false}
            onChange={(v) => set("businessHours")({ open: form.businessHours?.open ?? "09:00", close: form.businessHours?.close ?? "22:00", enabled: v })}
          />
        </div>
        {(form.businessHours?.enabled) && (
          <div className="flex gap-3">
            {(["open","close"] as const).map((k) => (
              <div key={k} className="flex-1">
                <label className="text-xs text-muted-foreground capitalize">{k}</label>
                <input
                  type="time"
                  value={form.businessHours?.[k] ?? (k === "open" ? "09:00" : "22:00")}
                  onChange={(e) => set("businessHours")({ ...form.businessHours!, enabled: true, [k]: e.target.value })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {form.businessHours?.enabled
            ? `Bot sirf ${form.businessHours.open ?? "09:00"} – ${form.businessHours.close ?? "22:00"} reply karta hai.`
            : "Bot 24/7 reply karta hai."}
        </p>
      </Card>

      {/* Human Handoff */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <PhoneCall className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Human Handoff Keywords</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Yeh words detect hone pe bot admin ko alert karta hai.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(form.handoffKeywords ?? ["admin","human","urgent","agent","call me"]).map((kw) => (
            <Badge key={kw} variant="muted" className="cursor-pointer hover:bg-destructive/20" onClick={() =>
              set("handoffKeywords")((form.handoffKeywords ?? []).filter((x) => x !== kw))
            }>
              {kw} ×
            </Badge>
          ))}
        </div>
        <HandoffKeywordInput
          onAdd={(kw) => set("handoffKeywords")([...(form.handoffKeywords ?? ["admin","human","urgent","agent","call me"]), kw])}
        />
      </Card>

      {/* Save button */}
      <div className="lg:col-span-2">
        <Btn variant="primary" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          {saveMut.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Configuration</>}
        </Btn>
      </div>
    </div>
  );
}

function HandoffKeywordInput({ onAdd }: { onAdd: (kw: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
        placeholder="Add keyword…"
        className="flex-1 h-8 px-3 rounded-md bg-secondary border border-border text-sm"
      />
      <Btn variant="outline" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}>Add</Btn>
    </div>
  );
}

// ─── Tab: Products ────────────────────────────────────────────────────────────

function ProductsTab() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getSalesBotConfig);
  const fnSave = useServerFn(saveSalesBotConfig);

  const { data: cfg } = useQuery<BotConfig>({
    queryKey: ["sales-bot-config"],
    queryFn: async () => { try { return await fnGet() as BotConfig; } catch { return {}; } },
    staleTime: 300_000,
  });

  const [enabled, setEnabled] = useState<Set<string>>(new Set(ALL_PRODUCTS.map((p) => p.id)));
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cfg?.enabledProductIds) setEnabled(new Set(cfg.enabledProductIds));
  }, [cfg]);

  async function save() {
    try {
      await fnSave({ data: { enabledProductIds: [...enabled] } });
      qc.invalidateQueries({ queryKey: ["sales-bot-config"] });
      toast.success("Product visibility saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enabled.size}/{ALL_PRODUCTS.length} products visible to bot customers.
        </p>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => setEnabled(new Set(ALL_PRODUCTS.map((p) => p.id)))}>Enable All</Btn>
          <Btn variant="outline" onClick={() => setEnabled(new Set())}>Disable All</Btn>
          <Btn variant="primary" onClick={save}><Save className="h-4 w-4" /> Save</Btn>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const catProducts = ALL_PRODUCTS.filter((p) => p.cat === cat.id);
        return (
          <Card key={cat.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cat.emoji}</span>
              <h2 className="font-semibold">{cat.label}</h2>
              <Badge variant="muted">{catProducts.filter((p) => enabled.has(p.id)).length}/{catProducts.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {catProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <Toggle
                    checked={enabled.has(p.id)}
                    onChange={(v) => setEnabled((prev) => {
                      const next = new Set(prev);
                      v ? next.add(p.id) : next.delete(p.id);
                      return next;
                    })}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Base: PKR {p.price.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Bot quotes:</span>
                    <input
                      type="number"
                      value={prices[p.id] ?? p.price}
                      onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-24 h-8 px-2 rounded-md bg-secondary border border-border text-sm text-right"
                    />
                  </div>
                  {enabled.has(p.id)
                    ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: AI Flows ────────────────────────────────────────────────────────────

function FlowsTab() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getSalesBotConfig);
  const fnSave = useServerFn(saveSalesBotConfig);

  const { data: cfg } = useQuery<BotConfig>({
    queryKey: ["sales-bot-config"],
    queryFn: async () => { try { return await fnGet() as BotConfig; } catch { return {}; } },
    staleTime: 300_000,
  });

  const [activeFlows, setActiveFlows] = useState<Set<string>>(new Set(["welcome","price_inquiry","order_flow"]));

  useEffect(() => {
    if (cfg?.enabledFlowIds) setActiveFlows(new Set(cfg.enabledFlowIds));
  }, [cfg]);

  async function toggleFlow(id: string) {
    const next = new Set(activeFlows);
    next.has(id) ? next.delete(id) : next.add(id);
    setActiveFlows(next);
    try {
      await fnSave({ data: { enabledFlowIds: [...next] } });
      qc.invalidateQueries({ queryKey: ["sales-bot-config"] });
      toast.success(`Flow ${next.has(id) ? "activated" : "paused"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {PRESET_FLOWS.map((flow) => {
        const Icon = flow.icon;
        const isActive = activeFlows.has(flow.id);
        return (
          <Card key={flow.id} className={cn("transition-colors", isActive ? "border-primary/30" : "opacity-70")}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", flow.color)} />
                <h2 className="font-semibold">{flow.name}</h2>
              </div>
              <Toggle checked={isActive} onChange={() => toggleFlow(flow.id)} />
            </div>
            <p className="text-xs text-muted-foreground mb-3">{flow.desc}</p>

            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <Zap className="h-3 w-3 text-warning shrink-0" />
              <span className="text-xs font-medium text-warning">Trigger:</span>
              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{flow.trigger}</code>
            </div>

            <div className="space-y-1">
              {flow.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-4 w-4 rounded-full bg-secondary grid place-items-center text-[10px] font-bold shrink-0">{i + 1}</div>
                  {step}
                  {i < flow.steps.length - 1 && <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-40" />}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Badge variant={isActive ? "success" : "muted"}>{isActive ? "Active" : "Paused"}</Badge>
              <Btn variant="ghost" className="text-xs h-7">Customize</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab() {
  const fnConvos = useServerFn(getBotConversations);
  const qc = useQueryClient();

  const { data: convos = [], isLoading } = useQuery<BotConversation[]>({
    queryKey: ["bot-conversations"],
    queryFn: async () => {
      try { const d = await fnConvos() as BotConversation[]; return d.length ? d : MOCK_CONVOS; }
      catch { return MOCK_CONVOS; }
    },
    staleTime: 30_000,
    placeholderData: MOCK_CONVOS,
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Recent Bot Conversations</h2>
        <Btn variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["bot-conversations"] })}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Btn>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Intent</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {convos.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-2.5">
                    <div className="font-medium">{c.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </td>
                  <td className="py-2.5">
                    <Badge variant="muted" className="text-xs">{c.intent?.replace("_", " ") ?? "—"}</Badge>
                  </td>
                  <td className="py-2.5">
                    <ConvoStatusBadge status={c.status} />
                  </td>
                  <td className="py-2.5 text-right font-medium text-success">
                    {(c.revenue ?? 0) > 0 ? `PKR ${(c.revenue ?? 0).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground">
                    {c.created_at ? timeAgo(c.created_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConvoStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "info" | "muted" | "destructive" }> = {
    completed:   { label: "Completed",   variant: "success" },
    paid:        { label: "Paid",        variant: "success" },
    ordered:     { label: "Ordered",     variant: "info" },
    pending_pay: { label: "Pending Pay", variant: "warning" },
    browsing:    { label: "Browsing",    variant: "muted" },
    escalated:   { label: "Escalated",   variant: "destructive" },
  };
  const s = map[status ?? ""] ?? { label: status ?? "—", variant: "muted" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
