import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Btn, Badge, Input, Select, Textarea } from "@/components/ui-kit";
import { Facebook, Instagram, Linkedin, Music2, MessageCircle, Send, Eye, EyeOff, Save, Trash2, Plus, Loader2 } from "lucide-react";
import { useState, createElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SocialAccount {
  id: string;
  platform: string;
  handle: string;
  is_active: boolean;
  access_token?: string;
  remote_id?: string;
  refresh_token?: string;
  token_expires_at?: string;
}

interface PostTarget { id: string; platform: string; status: string; social_accounts?: { platform: string }; }

interface Post {
  id: string;
  content: string;
  status: string;
  scheduled_at?: string;
  media_urls?: string[];
  post_targets?: PostTarget[];
}
import { useServerFn } from "@tanstack/react-start";
import {
  listSocialAccounts,
  saveSocialAccount,
  deleteSocialAccount,
  listPosts,
  createPost,
  deletePost,
} from "@/lib/social.functions";
import { useAuth } from "@/lib/auth-hook";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/social")({
  component: SocialPage,
});

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Music2,
  whatsapp: MessageCircle,
  telegram: Send,
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

function SocialPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [postForm, setPostForm] = useState({
    content: "",
    mediaUrl: "",
    mediaType: "" as "image" | "video" | "",
    schedule: "",
    selectedAccounts: [] as string[],
  });

  const listAccFn = useServerFn(listSocialAccounts);
  const saveAccFn = useServerFn(saveSocialAccount);
  const delAccFn = useServerFn(deleteSocialAccount);
  const listPostsFn = useServerFn(listPosts);
  const createPostFn = useServerFn(createPost);
  const delPostFn = useServerFn(deletePost);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["socialAccounts"],
    queryFn: () => listAccFn() as Promise<SocialAccount[]>,
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => listPostsFn() as Promise<Post[]>,
    enabled: !!user,
    staleTime: 30_000,
  });

  const saveAccount = useMutation({
    mutationFn: (payload: Partial<SocialAccount> & { meta?: Record<string, unknown> }) => saveAccFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialAccounts"] });
      setEditingAccount(null);
      toast.success("Account saved");
    },
    onError: (e: Error) => toast.error(e?.message ?? "Failed to save account"),
  });

  const removeAccount = useMutation({
    mutationFn: (payload: { id: string }) => delAccFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialAccounts"] });
      toast.success("Account removed");
    },
    onError: (e: Error) => toast.error(e?.message ?? "Failed to remove account"),
  });

  interface CreatePostPayload {
    content: string; media_urls: string[]; media_type: string | null;
    scheduled_at: string | null; targets: { platform: string; social_account_id: string }[];
  }

  const createPostMut = useMutation({
    mutationFn: (payload: CreatePostPayload) => createPostFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      setPostForm({ content: "", mediaUrl: "", mediaType: "", schedule: "", selectedAccounts: [] });
      toast.success("Post created");
    },
    onError: (e: Error) => toast.error(e?.message ?? "Failed to create post"),
  });

  const removePost = useMutation({
    mutationFn: (payload: { id: string }) => delPostFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e?.message ?? "Failed to delete post"),
  });

  const connectedAccounts = accounts.filter((a) => a.is_active && a.access_token);

  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveAccount.mutate({
      id: editingAccount?.id || undefined,
      platform: fd.get("platform") as string,
      handle: String(fd.get("handle") || ""),
      access_token: String(fd.get("access_token") || "") || undefined,
      remote_id: String(fd.get("remote_id") || "") || undefined,
      refresh_token: String(fd.get("refresh_token") || "") || undefined,
      token_expires_at: String(fd.get("token_expires_at") || "") || undefined,
      is_active: true,
      meta: {},
    });
  };

  const handleCreatePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!postForm.content.trim()) {
      toast.error("Content required");
      return;
    }
    if (postForm.selectedAccounts.length === 0) {
      toast.error("Select at least one account");
      return;
    }
    const targets = postForm.selectedAccounts.map((id) => {
      const acc = accounts.find((a) => a.id === id)!;
      return { platform: acc.platform, social_account_id: acc.id };
    });
    createPostMut.mutate({
      content: postForm.content,
      media_urls: postForm.mediaUrl ? [postForm.mediaUrl] : [],
      media_type: postForm.mediaType || null,
      scheduled_at: postForm.schedule || null,
      targets,
    });
  };

  return (
    <>
      <PageHeader title="Social Hub" subtitle="Connected accounts aur cross-platform publishing." />

      {/* Accounts grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {accountsLoading ? (
          <Card className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="col-span-full text-center py-8 text-muted-foreground text-sm">
            No accounts connected yet. Add one below.
          </Card>
        ) : (
          accounts.map((a) => {
            const Icon = icons[a.platform] || Facebook;
            const connected = !!a.access_token && a.is_active;
            return (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{platformLabels[a.platform]}</span>
                  </div>
                  <Badge variant={connected ? "success" : "warning"}>
                    {connected ? "Connected" : "Token needed"}
                  </Badge>
                </div>
                <div className="text-sm mt-2">{a.handle}</div>
                <div className="text-xs text-muted-foreground">
                  {a.remote_id ? `ID: ${a.remote_id.slice(0, 20)}${a.remote_id.length > 20 ? "…" : ""}` : "No remote ID"}
                </div>
                <div className="mt-3 flex gap-2">
                  <Btn className="flex-1" variant="outline" onClick={() => setEditingAccount(a)}>
                    Manage
                  </Btn>
                  <Btn variant="ghost" className="px-2 text-destructive" onClick={() => removeAccount.mutate({ id: a.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Btn>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Connect account form */}
        <Card>
          <h2 className="font-semibold mb-3">{editingAccount ? "Edit account" : "Connect account"}</h2>
          <form onSubmit={handleSaveAccount} className="grid gap-3">
            <Select name="platform" defaultValue={editingAccount?.platform || "facebook"}>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="tiktok">TikTok</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </Select>
            <Input name="handle" placeholder="Account name / handle" defaultValue={editingAccount?.handle || ""} />
            <Input name="remote_id" placeholder="Page ID / User ID / Phone Number ID" defaultValue={editingAccount?.remote_id || ""} />
            <div className="relative">
              <Input
                name="access_token"
                placeholder="Access Token"
                type={showSecret ? "text" : "password"}
                defaultValue={editingAccount?.access_token || ""}
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input name="refresh_token" placeholder="Refresh Token (optional)" type="password" defaultValue={editingAccount?.refresh_token || ""} />
            <Input name="token_expires_at" placeholder="Token expires at (ISO, optional)" defaultValue={editingAccount?.token_expires_at || ""} />
            <div className="flex gap-2">
              <Btn variant="primary" type="submit" className="flex-1">
                <Save className="h-4 w-4" /> Save
              </Btn>
              {editingAccount && (
                <Btn variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancel
                </Btn>
              )}
            </div>
          </form>
        </Card>

        {/* Publish post form */}
        <Card>
          <h2 className="font-semibold mb-3">Publish post</h2>
          <form onSubmit={handleCreatePost} className="grid gap-3">
            <Textarea
              rows={4}
              placeholder="Write your post…"
              value={postForm.content}
              onChange={(e) => setPostForm((s) => ({ ...s, content: e.target.value }))}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                placeholder="Image / Video URL"
                value={postForm.mediaUrl}
                onChange={(e) => setPostForm((s) => ({ ...s, mediaUrl: e.target.value }))}
              />
              <Select
                value={postForm.mediaType}
                onChange={(e) => setPostForm((s) => ({ ...s, mediaType: e.target.value as "image" | "video" | "" }))}
              >
                <option value="">Media type</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </Select>
            </div>
            <Input
              placeholder="Schedule (YYYY-MM-DD HH:mm, optional)"
              value={postForm.schedule}
              onChange={(e) => setPostForm((s) => ({ ...s, schedule: e.target.value }))}
            />
            <div className="border border-border rounded-md p-2">
              <div className="text-xs text-muted-foreground mb-1">Select accounts</div>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts.length === 0 && (
                  <span className="text-xs text-muted-foreground">No connected accounts</span>
                )}
                {connectedAccounts.map((a) => {
                  const selected = postForm.selectedAccounts.includes(a.id);
                  const Icon = icons[a.platform] || Facebook;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setPostForm((s) => ({
                          ...s,
                          selectedAccounts: selected
                            ? s.selectedAccounts.filter((id) => id !== a.id)
                            : [...s.selectedAccounts, a.id],
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {a.handle}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" type="submit" className="flex-1" disabled={createPostMut.isPending}>
                {createPostMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {postForm.schedule ? "Schedule Post" : "Save Draft"}
              </Btn>
            </div>
          </form>
        </Card>
      </div>

      {/* Posts list */}
      <Card className="mt-4">
        <h2 className="font-semibold mb-3">Recent Posts</h2>
        {postsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No posts yet.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={p.status === "published" ? "success" : p.status === "failed" ? "destructive" : "muted"}>
                      {p.status}
                    </Badge>
                    {p.scheduled_at && <span>Scheduled: {new Date(p.scheduled_at).toLocaleString()}</span>}
                    {p.post_targets?.map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-1">
                        {t.social_accounts?.platform && (
                          <>
                            {createElement(icons[t.social_accounts.platform] || Facebook, { className: "h-3 w-3" })}
                            {platformLabels[t.social_accounts.platform]}
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <Btn variant="ghost" className="px-2 text-destructive shrink-0" onClick={() => removePost.mutate({ id: p.id })}>
                  <Trash2 className="h-4 w-4" />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
