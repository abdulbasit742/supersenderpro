import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Input } from "@/components/ui-kit";
import { Sparkles, Send, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listConversations, getMessages, sendMessage, createConversation, deleteConversation,
} from "@/lib/inbox.functions";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIntent, setNewIntent] = useState("");

  const fnList = useServerFn(listConversations);
  const fnMsgs = useServerFn(getMessages);
  const fnSend = useServerFn(sendMessage);
  const fnCreate = useServerFn(createConversation);
  const fnDel = useServerFn(deleteConversation);

  async function refreshConversations() {
    try {
      const data = await fnList();
      setConversations(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id: string) {
    try {
      const data = await fnMsgs({ data: { conversationId: id } });
      setMessages(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  async function handleSend() {
    if (!draft.trim() || !activeId) return;
    try {
      await fnSend({ data: { conversationId: activeId, content: draft } });
      setDraft("");
      loadMessages(activeId);
      refreshConversations();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { toast.error("Name required"); return; }
    try {
      const conv = await fnCreate({ data: { contactName: newName, contactPhone: newPhone, intent: newIntent } });
      setShowAdd(false);
      setNewName(""); setNewPhone(""); setNewIntent("");
      refreshConversations();
      setActiveId(conv.id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete conversation?")) return;
    try {
      await fnDel({ data: { id } });
      if (activeId === id) setActiveId(null);
      refreshConversations();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  const suggestions = [
    "Assalamu alaikum, kaise madad kar sakta hoon?",
    "Price update bhejna hai?",
    "Order confirm kar lein?",
  ];

  return (
    <>
      <PageHeader
        title="AI Inbox Cockpit"
        subtitle="Customer conversations aur replies."
        actions={
          <Btn variant="primary" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Chat</Btn>
        }
      />
      <div className="grid lg:grid-cols-[280px_1fr_280px] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <Input placeholder="Search threads" />
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="animate-pulse space-y-2 p-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-muted" />)}
              </div>
            ) : (
              conversations.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-3 border-b border-border hover:bg-accent/40 ${activeId === t.id ? "bg-accent/60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.contact_name}</span>
                    {t.unread_count > 0 && <Badge variant="default">{t.unread_count}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.last_message || "(no messages)"}</div>
                  {t.intent && <Badge variant="muted">{t.intent}</Badge>}
                </button>
              ))
            )}
            {!loading && conversations.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Koi conversation nahi.<br />"New Chat" se shuru karein.</div>
            )}
          </div>
        </Card>

        <Card className="p-0 flex flex-col overflow-hidden">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="font-semibold">{active.contact_name}</div>
                <div className="flex items-center gap-2">
                  {active.intent && <Badge variant="info">{active.intent}</Badge>}
                  <button onClick={() => handleDelete(active.id)} className="p-1 rounded hover:bg-destructive/15 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-12">Pehla message bhejein.</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.sender === "me" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
                <Btn variant="primary" onClick={handleSend}><Send className="h-4 w-4" /></Btn>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Conversation select karein ya nayi banayein.
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Quick Replies</h2>
          </div>
          <div className="space-y-2 text-sm">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setDraft(s)} className="block w-full text-left p-2 rounded bg-muted hover:bg-accent">{s}</button>
            ))}
          </div>
        </Card>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-1">New Conversation</h2>
            <div className="space-y-3 mt-4">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contact name" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone / WhatsApp (optional)" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
              <input value={newIntent} onChange={(e) => setNewIntent(e.target.value)} placeholder="Intent tag (optional)" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-md bg-secondary text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
