import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Cake, Send, Save, Check, Gift } from "lucide-react";
import type { BirthdayRecord, BirthdayConfig } from "@/lib/birthday-campaign.functions";

export const Route = createFileRoute("/_app/birthday-campaign")({
  component: BirthdayCampaignPage,
});

const today = new Date();
function nextBDays(m: number, d: number) { const n = new Date(today.getFullYear(), m-1, d); if (n<today) n.setFullYear(today.getFullYear()+1); return Math.ceil((n.getTime()-today.getTime())/86400000); }

const MOCK_BIRTHDAYS: BirthdayRecord[] = [
  { id: "b1", customerId: "c1", customerName: "Ahmed Khan", whatsapp: "03001234567", birthdate: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`, nextBirthday: today.toISOString(), daysUntil: 0, status: "today" },
  { id: "b2", customerId: "c2", customerName: "Sara Ali", whatsapp: "03111234567", birthdate: "1998-07-15", nextBirthday: new Date(today.getFullYear(), 6, 15).toISOString(), daysUntil: nextBDays(7,15), status: "upcoming" },
  { id: "b3", customerId: "c3", customerName: "Bilal Raza", whatsapp: "03211234567", birthdate: "1992-08-03", nextBirthday: new Date(today.getFullYear(), 7, 3).toISOString(), daysUntil: nextBDays(8,3), status: "upcoming" },
  { id: "b4", customerId: "c4", customerName: "Fatima Noor", whatsapp: "03321234567", birthdate: "2000-06-10", nextBirthday: new Date(today.getFullYear()+1, 5, 10).toISOString(), daysUntil: nextBDays(6,10), lastWishedYear: today.getFullYear(), status: "sent" },
];

const MOCK_CONFIG: BirthdayConfig = {
  isActive: true, sendAtHour: 9,
  message: "🎂 Assalam Alaikum {{name}}!\n\nSuperSender Pro ki taraf se aapko *birthday mubarak ho!* 🎉🎊\n\nAaj ke din aapke liye ek special gift hai:\n\n{{offer}}\n\nYe offer sirf aaj valid hai — reply karo YES to claim! 😊\n\n_SuperSender Pro Team_",
  includeOffer: true, offerText: "🎁 Birthday Special: 15% discount on your next renewal!", discountPercent: 15, offerValidDays: 1,
};

const STATUS_STYLES = { today: "bg-pink-100 text-pink-700 border-pink-300", upcoming: "bg-blue-50 text-blue-700", sent: "bg-green-50 text-green-600", missed: "bg-gray-50 text-gray-500" };

export default function BirthdayCampaignPage() {
  const [tab, setTab] = useState<"birthdays"|"settings">("birthdays");
  const [config, setConfig] = useState<BirthdayConfig>(MOCK_CONFIG);
  const [wished, setWished] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: birthdays = MOCK_BIRTHDAYS } = useQuery({ queryKey: ["birthdays"], queryFn: async () => { const { getBirthdays } = await import("@/lib/birthday-campaign.functions"); return getBirthdays(); }, placeholderData: MOCK_BIRTHDAYS, staleTime: 300_000 });
  const { data: savedConfig = MOCK_CONFIG } = useQuery({ queryKey: ["birthday-config"], queryFn: async () => { const { getBirthdayConfig } = await import("@/lib/birthday-campaign.functions"); return getBirthdayConfig(); }, placeholderData: MOCK_CONFIG, staleTime: 300_000 });

  const wishMut = useMutation({
    mutationFn: async (b: BirthdayRecord) => { const { sendBirthdayWish } = await import("@/lib/birthday-campaign.functions"); return sendBirthdayWish({ data: { customerId: b.customerId, whatsapp: b.whatsapp, customerName: b.customerName } }); },
    onSuccess: (_, b) => setWished(p => new Set([...p, b.customerId])),
  });
  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveBirthdayConfig } = await import("@/lib/birthday-campaign.functions"); return saveBirthdayConfig({ data: config as unknown as Record<string, unknown> }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["birthday-config"] }),
  });

  const todayBirthdays = birthdays.filter(b => b.status === "today");
  const upcoming = birthdays.filter(b => b.status === "upcoming");
  const sent = birthdays.filter(b => b.status === "sent");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Cake className="h-6 w-6 text-pink-500" /> Birthday Campaign</h1>
        <p className="text-muted-foreground text-sm">Auto-send birthday wishes + exclusive offers via WhatsApp</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-pink-700">{todayBirthdays.length}</div><div className="text-sm text-pink-600">Today's Birthdays</div></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-700">{upcoming.length}</div><div className="text-sm text-blue-600">Upcoming (30 days)</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-700">{sent.length}</div><div className="text-sm text-green-600">Wished This Year</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["birthdays","settings"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "birthdays" ? "Customer Birthdays" : "Settings"}</button>)}
      </div>

      {tab === "birthdays" && (
        <div className="space-y-3">
          {todayBirthdays.length > 0 && (
            <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-4">
              <h3 className="font-semibold text-pink-800 mb-2 flex items-center gap-2"><Cake className="h-4 w-4" />🎉 Today's Birthdays!</h3>
              {todayBirthdays.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-pink-200">
                  <div><div className="font-medium">{b.customerName}</div><div className="text-xs text-muted-foreground">{b.whatsapp} · {b.birthdate}</div></div>
                  {wished.has(b.customerId) ? <span className="flex items-center gap-1 text-green-600 text-sm"><Check className="h-4 w-4" />Wished!</span> : <button onClick={() => wishMut.mutate(b)} disabled={wishMut.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-sm font-medium"><Send className="h-3.5 w-3.5" />Wish Now</button>}
                </div>
              ))}
            </div>
          )}
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30"><tr>{["Customer","WhatsApp","Birthdate","Days Until","Status","Action"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {birthdays.map(b => (
                  <tr key={b.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{b.customerName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.whatsapp}</td>
                    <td className="px-4 py-3">{b.birthdate}</td>
                    <td className="px-4 py-3">{b.daysUntil === 0 ? <span className="text-pink-600 font-bold">TODAY! 🎂</span> : `${b.daysUntil} days`}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.status]}`}>{b.status}</span></td>
                    <td className="px-4 py-3">
                      {(b.status === "today" || b.status === "upcoming") && !wished.has(b.customerId) && <button onClick={() => wishMut.mutate(b)} disabled={wishMut.isPending} className="flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white rounded text-xs"><Send className="h-3 w-3" />Wish</button>}
                      {wished.has(b.customerId) && <span className="text-green-600 text-xs flex items-center gap-1"><Check className="h-3.5 w-3.5" />Sent</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Auto Birthday Wishes</h3><button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.isActive ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Send at hour (24h)</label><input type="number" min={0} max={23} value={config.sendAtHour} onChange={e => setConfig(p => ({ ...p, sendAtHour: Number(e.target.value) }))} className="w-24 px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Birthday Message (use {`{{name}}`}, {`{{offer}}`})</label><textarea value={config.message} onChange={e => setConfig(p => ({ ...p, message: e.target.value }))} rows={5} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Include special offer</span><button onClick={() => setConfig(p => ({ ...p, includeOffer: !p.includeOffer }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.includeOffer ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.includeOffer ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            {config.includeOffer && <>
              <div><label className="text-xs text-muted-foreground block mb-1">Offer Text</label><input value={config.offerText} onChange={e => setConfig(p => ({ ...p, offerText: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-background" /></div>
              <div className="flex items-center gap-3"><input type="number" value={config.discountPercent} onChange={e => setConfig(p => ({ ...p, discountPercent: Number(e.target.value) }))} className="w-20 px-2 py-1.5 border rounded text-sm bg-background" /><span className="text-sm">% discount for birthday</span></div>
            </>}
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveConfigMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
