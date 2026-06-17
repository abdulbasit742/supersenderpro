import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Textarea, Select, Input } from "@/components/ui-kit";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_app/smart-broadcast")({
  component: SmartBroadcastPage,
});

function SmartBroadcastPage() {
  return (
    <>
      <PageHeader title="Smart Broadcast" subtitle="Audience segmentation + AI personalization." />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Compose</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground">Audience</label>
              <Select>
                <option>VIP customers</option>
                <option>ChatGPT buyers</option>
                <option>Inactive 30d</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Send via</label>
              <Select>
                <option>WhatsApp</option>
                <option>WA Channel</option>
              </Select>
            </div>
          </div>
          <Textarea rows={6} defaultValue={"Salam {{name}}, naya ChatGPT bundle PKR {{price}} pe available hai. Order ke liye reply karein."} />
          <div className="mt-3 flex gap-2">
            <Btn>Save Draft</Btn>
            <Btn variant="primary"><Send className="h-4 w-4" /> Schedule</Btn>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">Estimate</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Recipients</span><span className="font-medium">312</span></li>
            <li className="flex justify-between"><span>Rate limit</span><Badge variant="warning">8/min</Badge></li>
            <li className="flex justify-between"><span>Duration</span><span>~40 min</span></li>
          </ul>
        </Card>
      </div>
    </>
  );
}
