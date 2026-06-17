import { useState } from "react";
import { Sparkles, X, Send, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string };

const PRESETS = [
  "Draft a WhatsApp reply for a price objection",
  "Write Instagram caption for new AI tool launch",
  "Summarize today's orders",
  "Generate a follow-up message for cold leads",
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Salam! Main aapka AI assistant hoon. Kuch bhi puchein — replies, captions, summaries." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMsgs((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      setMsgs((m) => [...m, {
        role: "ai",
        text: `Here's a draft for: "${msg}"\n\n— Friendly opener\n— Value proposition\n— Clear CTA with link\n\n(Demo mode — connect Lovable Cloud or your backend for real AI.)`,
      }]);
      setBusy(false);
    }, 700);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition grid place-items-center"
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:w-[420px] h-full bg-card border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">AI Assistant</div>
                  <div className="text-[11px] text-muted-foreground">Drafts, captions & summaries</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && <div className="text-xs text-muted-foreground">AI is typing…</div>}
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-accent text-foreground/80">
                  {p}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything…"
                className="flex-1 h-10 px-3 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => send()}
                className="h-10 w-10 grid place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
