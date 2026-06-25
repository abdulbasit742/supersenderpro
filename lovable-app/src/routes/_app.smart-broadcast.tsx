import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Skeleton } from "@/components/ui-kit";
import {
  Send, Users, Sparkles, RefreshCw, CalendarClock,
  MessageSquare, CheckCircle2, ChevronRight, Zap,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AudienceSegment, SegmentFilter, AudiencePreview } from "@/lib/smart-broadcast.functions";

export const Route = createFileRoute("/_app/smart-broadcast")({
  component: SmartBroadcastPage,
});

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SEGMENTS: AudienceSegment[] = [
  { id: "chatgpt_buyers",  name: "ChatGPT Buyers",       description: "ChatGPT Plus ya Team khareeda",      filter: { productCategory: "ai" },     estimatedCount: 87 },
  { id: "inactive_30",     name: "Inactive 30 Days",      description: "30 din se koi order nahi",          filter: { inactiveDays: 30 },            estimatedCount: 43 },
  { id: "vip",             name: "VIP Customers",         description: "5 ya zyada orders",                 filter: { minOrders: 5 },                estimatedCount: 19 },
  { id: "new_customers",   name: "New Customers",         description: "Sirf pehla order",                  filter: { maxOrders: 1 },                estimatedCount: 34 },
  { id: "big_spenders",    name: "Big Spenders",          description: "PKR 20,000+ total spend",           filter: { minSpend: 20000 },             estimatedCount: 12 },
  { id: "expiring_week",   name: "Expiring This Week",    description: "Subscription 7 din mein expire",   filter: { expiringDays: 7 },             estimatedCount: 11 },
];

const TONE_OPTIONS = [
  { id: "friendly",     label: "Friendly",      emoji: "😊" },
  { id: "urgent",       label: "Urgent",        emoji: "⚡" },
  { id: "promotional",  label: "Promotional",   emoji: "🎉" },
];

const TOKENS = ["{{name}}", "{{product}}", "{{price}}", "{{days}}", "{{discount}}"];

type Step = 1 | 2 | 3;

// ─── Main page ────────────────────────────────────────────────────────────────

function SmartBroadcastPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedSegment, setSelectedSegment] = useState<AudienceSegment | null>(null);
  const [customFilter, setCustomFilter] = useState<SegmentFilter>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"friendly" | "urgent" | "promotional">("friendly");
  const [via, setVia] = useState<"whatsapp" | "wa_channel">("whatsapp");
  const [scheduleAt, setScheduleAt] = useState("");

  return (
    <>
      <PageHeader
        title="Smart Broadcast"
        subtitle="Segmented audience — sahi customer ko sahi message, sahi waqt pe."
      />

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (s < step || (s === 2 && selectedSegment) || s === 1) setStep(s); }}
              className={cn(
                "h-7 w-7 rounded-full text-sm font-bold transition-colors grid place-items-center",
                step === s ? "bg-primary text-primary-foreground" :
                step > s  ? "bg-success text-success-foreground" :
                "bg-secondary text-muted-foreground"
              )}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </button>
            <span className={cn("text-sm", step === s ? "font-medium" : "text-muted-foreground")}>
              {s === 1 ? "Audience" : s === 2 ? "Message" : "Review & Send"}
            </span>
            {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <StepAudience
          segments={MOCK_SEGMENTS}
          selected={selectedSegment}
          onSelect={setSelectedSegment}
          customFilter={customFilter}
          onCustomFilter={setCustomFilter}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepMessage
          segment={selectedSegment}
          message={message}
          onMessage={setMessage}
          tone={tone}
          onTone={setTone}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepReview
          segment={selectedSegment}
          message={message}
          via={via}
          onVia={setVia}
          scheduleAt={scheduleAt}
          onScheduleAt={setScheduleAt}
          onBack={() => setStep(2)}
          onDone={() => { setStep(1); setSelectedSegment(null); setMessage(""); }}
        />
      )}
    </>
  );
}

// ─── Step 1: Audience ─────────────────────────────────────────────────────────

interface StepAudienceProps {
  segments: AudienceSegment[];
  selected: AudienceSegment | null;
  onSelect: (s: AudienceSegment) => void;
  customFilter: SegmentFilter;
  onCustomFilter: (f: SegmentFilter) => void;
  onNext: () => void;
}

function StepAudience({ segments, selected, onSelect, customFilter, onCustomFilter, onNext }: StepAudienceProps) {
  const fnPreview = useServerFn(
    // dynamic import so tree-shaking works
    (() => {
      let fn: ReturnType<typeof useServerFn> | null = null;
      return () => {
        if (!fn) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          fn = useServerFn(require("@/lib/smart-broadcast.functions").buildAudiencePreview);
        }
        return fn;
      };
    })()
  );

  const { data: preview, isLoading: previewLoading } = useQuery<AudiencePreview>({
    queryKey: ["audience-preview", selected?.id ?? "custom", customFilter],
    queryFn: async () => {
      if (!selected && Object.keys(customFilter).length === 0) return { count: 0, sampleNames: [] };
      try {
        const { buildAudiencePreview } = await import("@/lib/smart-broadcast.functions");
        return await useServerFn(buildAudiencePreview)({ data: selected?.filter ?? customFilter }) as AudiencePreview;
      } catch {
        return { count: selected?.estimatedCount ?? 0, sampleNames: ["Ali Hassan", "Sara Ahmed", "Bilal Raza"] };
      }
    },
    enabled: !!selected,
    staleTime: 30_000,
  });

  void fnPreview;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {segments.map((seg) => (
          <button
            key={seg.id}
            onClick={() => onSelect(seg)}
            className={cn(
              "text-left p-4 rounded-xl border transition-colors",
              selected?.id === seg.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-sm">{seg.name}</div>
              <Badge variant="muted">{seg.estimatedCount}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{seg.description}</div>
          </button>
        ))}
      </div>

      {/* Custom filter */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-warning" />
          <h2 className="font-semibold text-sm">Custom Filter</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Inactive days (min)</label>
            <input
              type="number"
              value={customFilter.inactiveDays ?? ""}
              onChange={(e) => onCustomFilter({ ...customFilter, inactiveDays: e.target.value ? +e.target.value : undefined })}
              placeholder="e.g. 30"
              className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Product category</label>
            <select
              value={customFilter.productCategory ?? ""}
              onChange={(e) => onCustomFilter({ ...customFilter, productCategory: e.target.value || undefined })}
              className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
            >
              <option value="">Any</option>
              <option value="ai">AI Tools</option>
              <option value="lap">Laptops</option>
              <option value="acc">Accessories</option>
              <option value="dry">Dry Fruits</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min orders</label>
            <input
              type="number"
              value={customFilter.minOrders ?? ""}
              onChange={(e) => onCustomFilter({ ...customFilter, minOrders: e.target.value ? +e.target.value : undefined })}
              placeholder="e.g. 3"
              className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min spend (PKR)</label>
            <input
              type="number"
              value={customFilter.minSpend ?? ""}
              onChange={(e) => onCustomFilter({ ...customFilter, minSpend: e.target.value ? +e.target.value : undefined })}
              placeholder="e.g. 5000"
              className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-sm mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Preview */}
      {selected && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              {previewLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>
                  <div className="font-semibold">
                    {preview?.count ?? selected.estimatedCount} customers selected
                  </div>
                  {(preview?.sampleNames ?? []).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      e.g. {(preview?.sampleNames ?? []).join(", ")}…
                    </div>
                  )}
                </>
              )}
            </div>
            <Btn variant="primary" onClick={onNext} disabled={!selected}>
              Next: Message <ChevronRight className="h-4 w-4" />
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Step 2: Message ──────────────────────────────────────────────────────────

interface StepMessageProps {
  segment: AudienceSegment | null;
  message: string;
  onMessage: (m: string) => void;
  tone: "friendly" | "urgent" | "promotional";
  onTone: (t: "friendly" | "urgent" | "promotional") => void;
  onBack: () => void;
  onNext: () => void;
}

function StepMessage({ segment, message, onMessage, tone, onTone, onBack, onNext }: StepMessageProps) {
  const [generating, setGenerating] = useState(false);

  async function generateAI() {
    setGenerating(true);
    try {
      const { generateBroadcastMessage } = await import("@/lib/smart-broadcast.functions");
      const fn = useServerFn(generateBroadcastMessage);
      const result = await fn({ data: { segment: segment?.name ?? "customers", tone } }) as { message: string };
      onMessage(result.message);
      toast.success("AI message generated");
    } catch {
      onMessage(`Salam {{name}}! 👋\n\n${segment?.name ?? "Customers"} ke liye special offer hai aaj. Jaldi reply karein!\n\nMore info ke liye message karein.`);
      toast.info("AI offline — sample message loaded");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Message Composer</h2>
            <div className="flex gap-1">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTone(t.id as typeof tone)}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                    tone === t.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"
                  )}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {TOKENS.map((tok) => (
              <code
                key={tok}
                className="text-xs bg-secondary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary"
                onClick={() => onMessage(message + tok)}
              >
                {tok}
              </code>
            ))}
          </div>

          <textarea
            rows={8}
            value={message}
            onChange={(e) => onMessage(e.target.value)}
            placeholder="Message likhein ya AI se generate karein…"
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm resize-none"
          />

          <div className="flex gap-2 mt-3">
            <Btn variant="outline" onClick={generateAI} disabled={generating}>
              {generating
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> Generate with AI</>}
            </Btn>
          </div>
        </Card>

        <div className="flex gap-2">
          <Btn variant="outline" onClick={onBack}>Back</Btn>
          <Btn variant="primary" onClick={onNext} disabled={!message.trim()}>
            Next: Review <ChevronRight className="h-4 w-4" />
          </Btn>
        </div>
      </div>

      {/* Preview */}
      <Card>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Preview
        </h2>
        <div className="bg-[#ECE5DD] rounded-xl p-3 min-h-32">
          <div className="bg-white rounded-xl rounded-tl-none p-3 text-sm max-w-[85%] shadow-sm whitespace-pre-wrap">
            {message
              ? message
                  .replace(/{{name}}/g, "Ali Hassan")
                  .replace(/{{product}}/g, "ChatGPT Plus")
                  .replace(/{{price}}/g, "1,500")
                  .replace(/{{days}}/g, "3")
                  .replace(/{{discount}}/g, "10%")
              : <span className="text-muted-foreground italic">Message preview yahaan aayega…</span>}
          </div>
          <div className="text-[10px] text-right text-muted-foreground mt-1">12:34 PM ✓✓</div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>Audience</span><span className="font-medium">{segment?.estimatedCount ?? 0} recipients</span></div>
          <div className="flex justify-between"><span>Characters</span><span className="font-medium">{message.length}</span></div>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 3: Review & Send ────────────────────────────────────────────────────

interface StepReviewProps {
  segment: AudienceSegment | null;
  message: string;
  via: "whatsapp" | "wa_channel";
  onVia: (v: "whatsapp" | "wa_channel") => void;
  scheduleAt: string;
  onScheduleAt: (s: string) => void;
  onBack: () => void;
  onDone: () => void;
}

function StepReview({ segment, message, via, onVia, scheduleAt, onScheduleAt, onBack, onDone }: StepReviewProps) {
  const qc = useQueryClient();

  const sendMut = useMutation({
    mutationFn: async () => {
      const { sendSmartBroadcast } = await import("@/lib/smart-broadcast.functions");
      const fn = useServerFn(sendSmartBroadcast);
      return fn({
        data: {
          segmentId: segment?.id ?? "custom",
          filter: segment?.filter ?? {},
          message,
          scheduleAt: scheduleAt || undefined,
          via,
        },
      });
    },
    onSuccess: () => {
      toast.success(scheduleAt ? "Broadcast scheduled!" : "Broadcast started!");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      onDone();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  const rateLimit = via === "whatsapp" ? 8 : 30;
  const duration = Math.ceil((segment?.estimatedCount ?? 0) / rateLimit);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <h2 className="font-semibold mb-4">Broadcast Summary</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <dt className="text-muted-foreground">Segment</dt>
            <dd className="font-medium">{segment?.name ?? "Custom"}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <dt className="text-muted-foreground">Recipients</dt>
            <dd className="font-bold text-primary">{segment?.estimatedCount ?? 0}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <dt className="text-muted-foreground">Rate limit</dt>
            <dd><Badge variant="warning">{rateLimit}/min</Badge></dd>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <dt className="text-muted-foreground">Est. duration</dt>
            <dd>{duration} min</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Send via</label>
            <div className="flex gap-2">
              {(["whatsapp", "wa_channel"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onVia(v)}
                  className={cn(
                    "flex-1 h-9 rounded-md text-sm font-medium border transition-colors",
                    via === v ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent"
                  )}
                >
                  {v === "whatsapp" ? "WhatsApp DM" : "WA Channel"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Schedule (optional — blank = send now)
            </label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => onScheduleAt(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Message Preview</h2>
        <div className="bg-[#ECE5DD] rounded-xl p-3 mb-4">
          <div className="bg-white rounded-xl rounded-tl-none p-3 text-sm max-w-[85%] shadow-sm whitespace-pre-wrap">
            {message
              .replace(/{{name}}/g, "Ali Hassan")
              .replace(/{{product}}/g, "ChatGPT Plus")
              .replace(/{{price}}/g, "1,500")
              .replace(/{{days}}/g, "3")
              .replace(/{{discount}}/g, "10%")}
          </div>
          <div className="text-[10px] text-right text-muted-foreground mt-1">
            {scheduleAt ? new Date(scheduleAt).toLocaleString("en-PK") : "Sending now"}
          </div>
        </div>

        <div className="flex gap-2">
          <Btn variant="outline" onClick={onBack}>Back</Btn>
          <Btn
            variant="primary"
            className="flex-1"
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending}
          >
            {sendMut.isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
              : scheduleAt
                ? <><CalendarClock className="h-4 w-4" /> Schedule Broadcast</>
                : <><Send className="h-4 w-4" /> Send Now</>}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
