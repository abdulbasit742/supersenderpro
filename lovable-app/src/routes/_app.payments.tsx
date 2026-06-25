import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, LoadingTable, EmptyState, Skeleton } from "@/components/ui-kit";
import { CheckCircle2, Trash2, CreditCard, Clock, DollarSign } from "lucide-react";
import { usePaymentList, useApprovePayment, useDeletePayment } from "@/lib/hooks";
import { toast } from "sonner";
import type { Payment } from "@/lib/types";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
});

const METHODS = [
  { name: "JazzCash",    account: "0312-1234567",        title: "M. Ali",          enabled: true  },
  { name: "EasyPaisa",   account: "0345-7654321",        title: "M. Ali",          enabled: true  },
  { name: "Meezan Bank", account: "PK00 0000 0000 0000", title: "SuperSender Pro", enabled: false },
];

const HEADERS = ["Customer", "Amount", "Method", "Status", "Date", "Actions"];

function PaymentsPage() {
  const { data: payments = [], isLoading, refetch, isRefetching } = usePaymentList();
  const approvePayment = useApprovePayment();
  const deletePayment  = useDeletePayment();

  const stats = {
    pending:  payments.filter((p: Payment) => p.status === "pending").length,
    approved: payments.filter((p: Payment) => p.status === "approved").length,
    total:    payments.reduce((s: number, p: Payment) => s + Number(p.amount || 0), 0),
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Receiving accounts, verifications aur transactions."
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent disabled:opacity-50">
              {isRefetching ? "Refreshing…" : "Refresh"}
            </button>
            <Btn variant="primary">+ Add Method</Btn>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-16" /></Card>
          ))
        ) : (
          <>
            <Card>
              <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Pending</span></div>
              <div className="text-2xl font-semibold text-warning">{stats.pending}</div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Approved</span></div>
              <div className="text-2xl font-semibold text-success">{stats.approved}</div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Received</span></div>
              <div className="text-2xl font-semibold">Rs {stats.total.toLocaleString()}</div>
            </Card>
          </>
        )}
      </div>

      {/* ── Receiving accounts ── */}
      <h2 className="font-semibold mb-3">Receiving Accounts</h2>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {METHODS.map((m) => (
          <Card key={m.name}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> {m.name}
              </div>
              <Badge variant={m.enabled ? "success" : "muted"}>{m.enabled ? "Active" : "Off"}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">Title: {m.title}</div>
            <div className="font-mono text-sm mt-1 bg-muted rounded-md px-2 py-1.5">{m.account}</div>
            <div className="mt-3 flex gap-2">
              <Btn variant="outline" className="flex-1">Edit</Btn>
              <Btn className="flex-1" onClick={() => { navigator.clipboard.writeText(m.account); toast.success("Copied!"); }}>Copy</Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Transactions table ── */}
      <h2 className="font-semibold mb-3">Transactions</h2>
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingTable headers={HEADERS} rows={5} />
        ) : payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No transactions yet" description="Payments will appear here once customers send screenshots." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>{HEADERS.map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.customerName ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">Rs {Number(p.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="info">{p.method}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {p.status === "pending" && (
                          <Btn variant="primary" onClick={() => approvePayment.mutate(p.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Btn>
                        )}
                        <Btn variant="ghost" onClick={() => deletePayment.mutate(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
