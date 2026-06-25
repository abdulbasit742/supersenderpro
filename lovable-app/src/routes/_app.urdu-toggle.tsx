import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Languages, Check, Globe } from "lucide-react";

export const Route = createFileRoute("/_app/urdu-toggle")({
  component: UrduTogglePage,
});

interface TranslationEntry {
  key: string;
  english: string;
  urdu: string;
  category: string;
}

const TRANSLATIONS: TranslationEntry[] = [
  { key: "dashboard", english: "Dashboard", urdu: "ڈیش بورڈ", category: "Navigation" },
  { key: "broadcast", english: "Broadcast", urdu: "براڈکاسٹ", category: "Navigation" },
  { key: "contacts", english: "Contacts", urdu: "رابطے", category: "Navigation" },
  { key: "orders", english: "Orders", urdu: "آرڈرز", category: "Navigation" },
  { key: "settings", english: "Settings", urdu: "ترتیبات", category: "Navigation" },
  { key: "send_message", english: "Send Message", urdu: "پیغام بھیجیں", category: "Actions" },
  { key: "save", english: "Save", urdu: "محفوظ کریں", category: "Actions" },
  { key: "delete", english: "Delete", urdu: "حذف کریں", category: "Actions" },
  { key: "cancel", english: "Cancel", urdu: "منسوخ کریں", category: "Actions" },
  { key: "search", english: "Search", urdu: "تلاش کریں", category: "Actions" },
  { key: "total_sales", english: "Total Sales", urdu: "کل فروخت", category: "Dashboard" },
  { key: "new_customers", english: "New Customers", urdu: "نئے گاہک", category: "Dashboard" },
  { key: "messages_sent", english: "Messages Sent", urdu: "بھیجے گئے پیغامات", category: "Dashboard" },
  { key: "revenue_today", english: "Revenue Today", urdu: "آج کی آمدنی", category: "Dashboard" },
  { key: "customer_name", english: "Customer Name", urdu: "گاہک کا نام", category: "Forms" },
  { key: "phone_number", english: "Phone Number", urdu: "فون نمبر", category: "Forms" },
  { key: "order_total", english: "Order Total", urdu: "آرڈر کا کل", category: "Forms" },
  { key: "payment_status", english: "Payment Status", urdu: "ادائیگی کی حالت", category: "Forms" },
];

const CATEGORIES = ["All", ...Array.from(new Set(TRANSLATIONS.map(t => t.category)))];

const SAMPLE_WA_EN = `Hello {{name}}! 👋\n\nYour order #{{order}} has been confirmed!\n\nOrder Total: PKR {{amount}}\nExpected Delivery: {{date}}\n\nThank you for shopping with us! 🛍️`;
const SAMPLE_WA_UR = `السلام علیکم {{name}}! 👋\n\nآپ کا آرڈر #{{order}} کنفرم ہو گیا ہے!\n\nآرڈر کا کل: PKR {{amount}}\nمتوقع ڈیلیوری: {{date}}\n\nہمارے ساتھ خریداری کرنے کا شکریہ! 🛍️`;

export default function UrduTogglePage() {
  const [isUrdu, setIsUrdu] = useState(false);
  const [category, setCategory] = useState("All");
  const [saved, setSaved] = useState(false);

  const filtered = TRANSLATIONS.filter(t => category === "All" || t.category === category);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Languages className="h-6 w-6 text-primary" /> Urdu UI Toggle</h1>
        <p className="text-muted-foreground text-sm">Switch the interface language between English and Urdu (اردو)</p>
      </div>

      <div className="bg-card border-2 border-primary/20 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Interface Language</h3>
            <p className="text-sm text-muted-foreground">Switch between English and Urdu for the entire dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${!isUrdu ? "text-primary" : "text-muted-foreground"}`}>English</span>
            <button onClick={() => setIsUrdu(!isUrdu)} className={`relative h-7 w-14 rounded-full transition-colors ${isUrdu ? "bg-primary" : "bg-gray-300"}`}><div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${isUrdu ? "translate-x-8" : "translate-x-1"}`} /></button>
            <span className={`text-sm font-medium ${isUrdu ? "text-primary" : "text-muted-foreground"}`}>اردو</span>
          </div>
        </div>

        {isUrdu && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
            <Globe className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Urdu mode enabled — text will display right-to-left (RTL) and UI labels will appear in Urdu. Restart the app to apply changes globally.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Sample WhatsApp Message — English</h3>
          <div className="bg-[#ECE5DD] p-3 rounded-xl">
            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs text-sm whitespace-pre-line shadow-sm">{SAMPLE_WA_EN}</div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Sample WhatsApp Message — اردو</h3>
          <div className="bg-[#ECE5DD] p-3 rounded-xl">
            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs text-sm whitespace-pre-line shadow-sm text-right" dir="rtl">{SAMPLE_WA_UR}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Translation Reference</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          {CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{c}</button>)}
        </div>
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Category</th><th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">English</th><th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">اردو</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.key} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.category}</td>
                  <td className="px-4 py-2.5 font-medium">{t.english}</td>
                  <td className="px-4 py-2.5 text-right font-medium" dir="rtl">{t.urdu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2">{saved ? <><Check className="h-4 w-4" />Saved!</> : "Save Language Preference"}</button>
    </div>
  );
}
