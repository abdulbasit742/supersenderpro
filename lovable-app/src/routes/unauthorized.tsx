import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/unauthorized")({
  component: Unauthorized,
  head: () => ({
    meta: [
      { title: "Access denied — SuperSender" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Unauthorized() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center shadow-lg">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 text-destructive grid place-items-center mb-3 text-xl font-bold">!</div>
        <h1 className="text-xl font-bold mb-1">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-5">
          You are signed in, but this dashboard is restricted to admins. Ask an
          administrator to grant you the <span className="font-semibold">admin</span> role.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/auth" className="h-9 px-4 inline-flex items-center rounded-md bg-secondary hover:bg-accent text-sm">
            Switch account
          </a>
        </div>
      </div>
    </div>
  );
}
