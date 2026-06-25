import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Section } from "@/components/ui-kit";
import { UserPlus, Shield, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTeamMembers, updateTeamRole, removeTeamMember } from "@/lib/team.functions";
import type { TeamMember } from "@/lib/types";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

const roleColor: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "muted"> = {
  admin: "destructive",
  user: "info",
};

function TeamPage() {
  const qc = useQueryClient();
  const fnList   = useServerFn(listTeamMembers);
  const fnUpdate = useServerFn(updateTeamRole);
  const fnRemove = useServerFn(removeTeamMember);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: () => fnList() as Promise<TeamMember[]>,
    staleTime: 60_000,
  });

  async function changeRole(userId: string, role: string) {
    try {
      await fnUpdate({ data: { userId, role: role as "admin" | "user" } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(userId: string) {
    if (!confirm("Remove this member's role?")) return;
    try {
      await fnRemove({ data: { userId } });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Team & Roles"
        subtitle="Manage admins aur users."
        actions={
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["team-members"] })}
            className="h-9 px-3 rounded-md bg-secondary text-sm hover:bg-accent"
          >
            Refresh
          </button>
        }
      />
      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="Invite member">
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              New users ko sign up karne dein. Yahan unki roles manage karein.
            </p>
            <Btn variant="primary" onClick={() => toast.info("Users sign up via /auth and appear here automatically.")}>
              <UserPlus className="h-4 w-4" /> How to add
            </Btn>
          </div>
        </Section>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Members ({isLoading ? "…" : members.length})</h2>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b border-border">
                  <tr><th className="py-2">Name</th><th>Role</th><th>Joined</th><th></th></tr>
                </thead>
                <tbody>
                  {members.map((m: TeamMember) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold uppercase">
                          {(m.name ?? "U").slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-medium">{m.name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground">{m.id.slice(0, 8)}…</div>
                        </div>
                      </td>
                      <td><Badge variant={roleColor[m.role] ?? "default"}>{m.role}</Badge></td>
                      <td className="text-muted-foreground text-xs">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={m.role}
                            onChange={(e) => changeRole(m.id, e.target.value)}
                            className="h-7 px-2 rounded-md bg-secondary border border-border text-xs"
                          >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                          <button onClick={() => remove(m.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-destructive/15 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">Koi team member nahi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
