import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { customers } from "@/lib/mock";
import { MessageCircle, Ban, User } from "lucide-react";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers CRM" subtitle="Leads, VIP tiers aur message history." actions={<Btn variant="primary">+ Add Customer</Btn>} />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Name","WhatsApp","Tags","Orders","Spent","VIP","Last Message","Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} variant="muted">{t}</Badge>)}</div></td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3">PKR {c.totalSpent.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={c.vip === "Platinum" ? "success" : c.vip === "Gold" ? "warning" : "muted"}>{c.vip}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{c.lastMessage}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Btn variant="ghost"><MessageCircle className="h-3.5 w-3.5" /></Btn>
                      <Btn variant="ghost"><User className="h-3.5 w-3.5" /></Btn>
                      <Btn variant="ghost"><Ban className="h-3.5 w-3.5" /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
