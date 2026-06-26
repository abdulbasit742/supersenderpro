import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StickyNote, Plus, Trash2, Lock, Globe } from "lucide-react";
import type { CustomerWithNotes, CustomerTag } from "@/lib/customer-notes.functions";

export const Route = createFileRoute("/_app/customer-notes")({
  component: CustomerNotesPage,
});

const MOCK_CUSTOMERS: CustomerWithNotes[] = [
  { id: "c1", name: "Ahmed Khan", whatsapp: "03001234567", tags: ["VIP","Bulk Buyer","Loyal"], notes: [{ id: "n1", customerId: "c1", agentName: "Imran", note: "Prefers JazzCash. Always orders bulk for resale. Keep discount at 10%.", isPrivate: false, createdAt: new Date(Date.now() - 86400000).toISOString() }, { id: "n2", customerId: "c1", agentName: "Ayesha", note: "Called 3x about Netflix issue — resolved. Gave free month as compensation.", isPrivate: true, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }], totalOrders: 42, totalRevenue: 159600, lastOrderAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "c2", name: "Sara Ali", whatsapp: "03111234567", tags: ["Loyal","Champion"], notes: [{ id: "n3", customerId: "c2", agentName: "Imran", note: "Refers friends. Gave 5% referral code. Track manually.", isPrivate: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }], totalOrders: 38, totalRevenue: 110200, lastOrderAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "c3", name: "Bilal Raza", whatsapp: "03211234567", tags: ["COD Only","Risky"], notes: [{ id: "n4", customerId: "c3", agentName: "Usman", note: "Twice refused delivery. Require advance payment for orders > 2000.", isPrivate: true, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() }], totalOrders: 12, totalRevenue: 38400, lastOrderAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "c4", name: "Fatima Noor", whatsapp: "03321234567", tags: ["New","Discount Seeker"], notes: [], totalOrders: 3, totalRevenue: 9000, lastOrderAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "c5", name: "Hassan Malik", whatsapp: "03421234567", tags: ["Inactive"], notes: [{ id: "n5", customerId: "c5", agentName: "Ayesha", note: "Last seen 3 months ago. 2 win-back msgs sent, no reply. Try voice.", isPrivate: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() }], totalOrders: 8, totalRevenue: 24000, lastOrderAt: new Date(Date.now() - 90 * 86400000).toISOString() },
];

const ALL_TAGS: CustomerTag[] = ["VIP","Bulk Buyer","Risky","Inactive","New","Champion","Referring","Discount Seeker","COD Only","Loyal"];
const TAG_COLORS: Record<string, string> = { VIP: "bg-yellow-100 text-yellow-800", "Bulk Buyer": "bg-blue-100 text-blue-700", Risky: "bg-red-100 text-red-700", Inactive: "bg-gray-100 text-gray-600", New: "bg-green-100 text-green-700", Champion: "bg-purple-100 text-purple-700", Referring: "bg-teal-100 text-teal-700", "Discount Seeker": "bg-orange-100 text-orange-700", "COD Only": "bg-pink-100 text-pink-700", Loyal: "bg-indigo-100 text-indigo-700" };

export default function CustomerNotesPage() {
  const [selected, setSelected] = useState<CustomerWithNotes>(MOCK_CUSTOMERS[0]);
  const [newNote, setNewNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<CustomerTag[]>(selected.tags);
  const [localNotes, setLocalNotes] = useState(selected.notes);
  const qc = useQueryClient();

  const { data: customers = MOCK_CUSTOMERS } = useQuery({ queryKey: ["customer-notes"], queryFn: async () => { const { getCustomersWithNotes } = await import("@/lib/customer-notes.functions"); return getCustomersWithNotes(); }, placeholderData: MOCK_CUSTOMERS, staleTime: 60_000 });

  const addNoteMut = useMutation({ mutationFn: async () => { const { addNote } = await import("@/lib/customer-notes.functions"); return addNote({ data: { customerId: selected.id, note: newNote, isPrivate } }); }, onSuccess: (r) => { const note = r as CustomerWithNotes["notes"][0]; setLocalNotes(p => [note, ...p]); setNewNote(""); } });
  const deleteNoteMut = useMutation({ mutationFn: async (noteId: string) => { const { deleteNote } = await import("@/lib/customer-notes.functions"); return deleteNote({ data: { noteId } }); }, onSuccess: (_, noteId) => setLocalNotes(p => p.filter(n => n.id !== noteId)) });
  const tagsMut = useMutation({ mutationFn: async () => { const { updateCustomerTags } = await import("@/lib/customer-notes.functions"); return updateCustomerTags({ data: { customerId: selected.id, tags: localTags } }); }, onSuccess: () => setEditingTags(false) });

  const selectCustomer = (c: CustomerWithNotes) => { setSelected(c); setLocalTags(c.tags); setLocalNotes(c.notes); setEditingTags(false); setNewNote(""); };

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><StickyNote className="h-6 w-6 text-primary" /> Customer Notes & Tags</h1><p className="text-muted-foreground text-sm">Internal CRM notes and custom tags — visible only to your team</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        <div className="space-y-2 overflow-y-auto pr-1">
          {(customers as typeof MOCK_CUSTOMERS).map(c => (
            <button key={c.id} onClick={() => selectCustomer(c)} className={`w-full text-left bg-card border rounded-xl p-3 transition-colors ${selected.id === c.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
              <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{c.name}</span><span className="text-xs text-muted-foreground">{c.notes.length} notes</span></div>
              <div className="text-xs text-muted-foreground mb-1">{c.whatsapp} · {c.totalOrders} orders</div>
              <div className="flex gap-1 flex-wrap">{c.tags.slice(0, 2).map(t => <span key={t} className={`px-1.5 py-0.5 rounded text-xs font-medium ${TAG_COLORS[t] ?? "bg-gray-100 text-gray-600"}`}>{t}</span>)}{c.tags.length > 2 && <span className="text-xs text-muted-foreground">+{c.tags.length - 2}</span>}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4 overflow-y-auto">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div><div className="font-bold text-lg">{selected.name}</div><div className="text-sm text-muted-foreground">{selected.whatsapp} · {selected.totalOrders} orders · PKR {(selected.totalRevenue/1000).toFixed(0)}K revenue</div></div>
              <button onClick={() => setEditingTags(!editingTags)} className="text-xs text-primary hover:underline">Edit Tags</button>
            </div>
            {editingTags ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">{ALL_TAGS.map(t => <button key={t} onClick={() => setLocalTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])} className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${localTags.includes(t) ? TAG_COLORS[t] + " border-current" : "hover:bg-accent"}`}>{t}</button>)}</div>
                <div className="flex gap-2"><button onClick={() => tagsMut.mutate()} disabled={tagsMut.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Save Tags</button><button onClick={() => setEditingTags(false)} className="px-3 py-1.5 border rounded text-sm">Cancel</button></div>
              </div>
            ) : <div className="flex flex-wrap gap-1">{localTags.map(t => <span key={t} className={`px-2 py-0.5 rounded text-xs font-medium ${TAG_COLORS[t] ?? "bg-gray-100 text-gray-600"}`}>{t}</span>)}</div>}
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Add Note</h3>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Write an internal note about this customer…" className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded" /><Lock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Private (only you)</span></label><button onClick={() => addNoteMut.mutate()} disabled={!newNote.trim() || addNoteMut.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm"><Plus className="h-3.5 w-3.5" />{addNoteMut.isPending ? "Adding…" : "Add Note"}</button></div>
          </div>

          <div className="space-y-2">
            {localNotes.length === 0 ? <div className="text-center text-muted-foreground text-sm py-6">No notes yet — add the first one!</div> :
            localNotes.map(note => (
              <div key={note.id} className={`bg-card border rounded-xl p-3 ${note.isPrivate ? "border-orange-200 bg-orange-50/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-primary">{note.agentName}</span>{note.isPrivate ? <span className="flex items-center gap-0.5 text-xs text-orange-600"><Lock className="h-3 w-3" />Private</span> : <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Globe className="h-3 w-3" />Team</span>}<span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span></div>
                    <div className="text-sm">{note.note}</div>
                  </div>
                  <button onClick={() => deleteNoteMut.mutate(note.id)} className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
