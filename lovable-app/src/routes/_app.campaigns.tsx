import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge } from "@/components/ui-kit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/campaigns")({
  component: CampaignsPage,
});

const campaigns = [
  { name: "Eid Bundle Promo", status: "running", sent: 1240, opened: "62%", revenue: "PKR 142k" },
  { name: "Black Friday AI Tools", status: "scheduled", sent: 0, opened: "—", revenue: "—" },
  { name: "Laptop Clearance", status: "completed", sent: 980, opened: "48%", revenue: "PKR 320k" },
];

function CampaignsPage() {
  return (
    <>
      <PageHeader title="Campaigns" subtitle="Multi-channel marketing runs." actions={<Btn variant="primary"><Plus className="h-4 w-4" /> New Campaign</Btn>} />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>{["Name","Status","Sent","Open Rate","Revenue","Actions"].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "running" ? "success" : c.status === "scheduled" ? "info" : "muted"}>{c.status}</Badge></td>
                  <td className="px-4 py-3">{c.sent}</td>
                  <td className="px-4 py-3">{c.opened}</td>
                  <td className="px-4 py-3">{c.revenue}</td>
                  <td className="px-4 py-3"><Btn variant="ghost">Open</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
