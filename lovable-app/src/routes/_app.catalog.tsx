import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { Upload, Store, Globe, ShoppingBag, Package, Pencil, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-hook";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { EcommerceAccount } from "@/lib/types";

export const Route = createFileRoute("/_app/catalog")({
  component: CatalogPage,
});

interface Product { id: string; name: string; price: number; stock: number; tags: string[]; desc: string; }

const sections = [
  { id: "ai",    label: "AI Tools",     emoji: "🤖" },
  { id: "lap",   label: "Laptops",      emoji: "💻" },
  { id: "acc",   label: "Accessories",  emoji: "🔌" },
  { id: "dry",   label: "Dry Fruits",   emoji: "🥜" },
  { id: "shirt", label: "Shirts",       emoji: "👕" },
  { id: "pizza", label: "Pizza",        emoji: "🍕" },
];

const sampleProducts: Record<string, Product[]> = {
  ai: [
    { id: "ai-1", name: "ChatGPT Plus 1M", price: 1500, stock: 99, tags: ["ai","gpt"], desc: "1-month ChatGPT Plus access. Shared account." },
    { id: "ai-2", name: "Claude Pro",      price: 1700, stock: 50, tags: ["ai","claude"], desc: "Claude Pro subscription. Premium AI assistant." },
  ],
  lap: [
    { id: "lap-1", name: "Dell Latitude 7490", price: 78000, stock: 3, tags: ["i7","16gb"], desc: "Refurbished business laptop, i7-8650U, 16GB RAM, 512GB SSD." },
    { id: "lap-2", name: "HP EliteBook 840",   price: 72000, stock: 5, tags: ["i5","8gb"],  desc: "14\" business laptop, i5-8350U, 8GB RAM, 256GB SSD." },
  ],
  acc: [
    { id: "acc-1", name: "SSD 512GB NVMe",    price: 9500, stock: 22, tags: ["ssd"],   desc: "M.2 NVMe Gen3 x4 internal SSD." },
    { id: "acc-2", name: "RAM 8GB DDR4",       price: 4500, stock: 14, tags: ["ram"],   desc: "8GB DDR4 3200MHz SO-DIMM laptop RAM." },
    { id: "acc-3", name: "Hard Disk 1TB",      price: 6500, stock: 9,  tags: ["hdd"],   desc: "2.5\" SATA 1TB 5400RPM internal HDD." },
    { id: "acc-4", name: "Wireless Keyboard",  price: 3200, stock: 12, tags: ["kb"],    desc: "Bluetooth + 2.4GHz wireless mechanical feel keyboard." },
    { id: "acc-5", name: "Wireless Mouse",     price: 1500, stock: 18, tags: ["mouse"], desc: "Ergonomic wireless mouse, 1600 DPI." },
  ],
  dry: [
    { id: "dry-1", name: "Almonds 1kg",  price: 2800, stock: 30, tags: ["almond"],  desc: "Premium California almonds, vacuum packed." },
    { id: "dry-2", name: "Cashew 500g",  price: 2200, stock: 18, tags: ["cashew"],  desc: "Whole cashew nuts, W320 grade." },
  ],
  shirt: [
    { id: "shirt-1", name: "Casual Shirt M", price: 2400, stock: 25, tags: ["shirt","M"], desc: "Cotton casual shirt, medium size, multiple colors." },
  ],
  pizza: [
    { id: "pizza-1", name: "Fajita Large", price: 1899, stock: 999, tags: ["pizza"], desc: "Large fajita pizza with spicy chicken and veggies." },
  ],
};

function CatalogPage() {
  const { user } = useAuth();
  const [active, setActive] = useState("ai");
  const [showPublish, setShowPublish] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: ecomAccounts = [] } = useQuery<EcommerceAccount[]>({
    queryKey: ["ecommerce-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("ecommerce_accounts").select("*").eq("user_id", user.id).eq("is_active", true);
      return (data ?? []) as EcommerceAccount[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const items = sampleProducts[active] ?? [];
  const selectedInCategory = selectedIds.filter((id) => items.some((p) => p.id === id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() {
    const ids = items.map((p) => p.id);
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  }

  const publishTargets = showPublish === "bulk"
    ? items.filter((p) => selectedIds.includes(p.id))
    : [sampleProducts[active].find((p) => p.id === showPublish)!].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Product Catalog"
        subtitle="AI tools, laptops, accessories aur food categories. Products ko marketplaces pe publish karein."
        actions={<Btn variant="primary">+ Add Product</Btn>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "h-9 px-3 rounded-md text-sm border border-border flex items-center gap-2",
              active === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-accent"
            )}
          >
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={selectAll} className="h-9 px-3 rounded-md text-sm border border-border bg-secondary hover:bg-accent inline-flex items-center gap-2">
          {selectedInCategory.length === items.length && items.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {selectedInCategory.length === items.length && items.length > 0 ? "Deselect All" : "Select All"}
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex-1" />
          <button onClick={() => setShowPublish("bulk")} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2"><Store className="h-3.5 w-3.5" /> Publish Selected</button>
          <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-md bg-secondary text-sm font-medium">Clear</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="flex flex-col relative">
            <button
              onClick={() => toggleSelect(p.id)}
              className={cn(
                "absolute top-3 left-3 h-6 w-6 rounded border grid place-items-center z-10 transition-colors",
                selectedIds.includes(p.id) ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border hover:border-primary"
              )}
            >
              {selectedIds.includes(p.id) && <CheckSquare className="h-3.5 w-3.5" />}
            </button>
            <div className="h-28 rounded-lg bg-muted grid place-items-center mb-3 text-3xl">📦</div>
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{p.name}</div>
              <button onClick={() => setShowEdit(p)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
            </div>
            <div className="text-sm text-muted-foreground">PKR {p.price.toLocaleString()}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.tags.map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
              <Badge variant={p.stock < 5 ? "destructive" : p.stock < 20 ? "warning" : "success"}>Stock: {p.stock}</Badge>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Btn variant="outline" className="text-xs"><Upload className="h-3.5 w-3.5" /> Image</Btn>
              <Btn variant="primary" className="text-xs" onClick={() => setShowPublish(p.id)}><Store className="h-3.5 w-3.5" /> Publish</Btn>
            </div>
          </Card>
        ))}
        <Card className="border-dashed border-2 border-border flex items-center justify-center text-muted-foreground text-sm">
          + Add Product to {sections.find((s) => s.id === active)?.label}
        </Card>
      </div>

      {showPublish && (
        <PublishModal
          products={publishTargets}
          accounts={ecomAccounts}
          onClose={() => setShowPublish(null)}
        />
      )}

      {showEdit && (
        <EditModal product={showEdit} onClose={() => setShowEdit(null)} />
      )}
    </>
  );
}

function PublishModal({ products, accounts, onClose }: { products: Product[]; accounts: EcommerceAccount[]; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const platforms = [
    { id: "daraz",   label: "Daraz",   icon: ShoppingBag },
    { id: "etsy",    label: "Etsy",    icon: Store },
    { id: "amazon",  label: "Amazon",  icon: Globe },
    { id: "shopify", label: "Shopify", icon: Package },
  ];

  const connectedIds = new Set(accounts.map((a) => a.platform));

  async function publish() {
    if (selected.length === 0) { toast.error("Ek platform select karein"); return; }
    setBusy(true);
    try {
      const rows = products.flatMap((product) =>
        selected.map((platform) => ({ user_id: user!.id, product_id: product.id, platform, status: "draft" }))
      );
      const { error } = await supabase.from("marketplace_listings").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} draft listings created! /marketplaces pe jaa ke sync karein.`);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">Publish {products.length} Product{products.length > 1 ? "s" : ""}</h2>
        <p className="text-xs text-muted-foreground mb-4">{products.map((p) => p.name).join(", ")}</p>

        <div className="space-y-2 mb-4">
          {platforms.map((p) => {
            const isConnected = connectedIds.has(p.id);
            const Icon = p.icon;
            const isSelected = selected.includes(p.id);
            return (
              <button
                key={p.id}
                disabled={!isConnected}
                onClick={() => setSelected((prev) => isSelected ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                  !isConnected && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{isConnected ? "Connected" : "Not connected — Connections page pe setup karein"}</div>
                </div>
                {isSelected && <span className="text-primary text-xs font-medium">Selected</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-md bg-secondary text-sm font-medium">Cancel</button>
          <button onClick={publish} disabled={busy || selected.length === 0} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">
            {busy ? "Creating…" : `Create ${products.length * selected.length} Drafts`}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [desc, setDesc] = useState(product.desc || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    toast.success("Product updated (demo)");
    setBusy(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">Edit Product</h2>
        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Price (PKR)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stock</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-md bg-secondary text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
