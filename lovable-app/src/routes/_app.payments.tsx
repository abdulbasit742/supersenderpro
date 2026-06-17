import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
});

const methods = [
  { name: "JazzCash", account: "0312-1234567", title: "M. Ali", enabled: true },
  { name: "EasyPaisa", account: "0345-7654321", title: "M. Ali", enabled: true },
  { name: "Bank — Meezan", account: "PK00 0000 0000 0000", title: "SuperSender Pro", enabled: false },
];

function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" subtitle="Receiving accounts, verifications aur transactions." actions={<Btn variant="primary">+ Add Method</Btn>} />
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {methods.map((m) => (
          <Card key={m.name}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{m.name}</div>
              <Badge variant={m.enabled ? "success" : "muted"}>{m.enabled ? "Active" : "Off"}</Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">Title: {m.title}</div>
            <div className="font-mono text-sm mt-1">{m.account}</div>
            <div className="mt-3 flex gap-2">
              <Btn variant="outline">Edit</Btn>
              <Btn>Copy</Btn>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold mb-3">Verify Screenshot</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <Input placeholder="Order ID" />
          <Input placeholder="Amount PKR" />
          <Btn variant="primary">Verify</Btn>
        </div>
      </Card>
    </>
  );
}
