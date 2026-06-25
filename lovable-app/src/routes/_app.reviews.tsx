import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Send, MessageSquare, Save, TrendingUp } from "lucide-react";
import type { Review, ReviewStats, ReviewConfig } from "@/lib/reviews.functions";

export const Route = createFileRoute("/_app/reviews")({
  component: ReviewsPage,
});

type Tab = "reviews" | "stats" | "settings";

const MOCK_REVIEWS: Review[] = [
  { id: "r1", customerName: "Ahmed Khan", whatsapp: "03001234567", product: "ChatGPT Plus", rating: 5, comment: "Bhai bahut acha service hai, fast delivery!", status: "approved", receivedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "r2", customerName: "Sara Ali", whatsapp: "03111234567", product: "Claude Pro", rating: 4, comment: "Good but slightly expensive", status: "pending", receivedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "r3", customerName: "Bilal Raza", whatsapp: "03211234567", product: "LinkedIn Premium", rating: 2, comment: "Delivery slow tha", status: "flagged", receivedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "r4", customerName: "Fatima Noor", whatsapp: "03321234567", product: "Midjourney", rating: 5, comment: "Perfect! Shukriya bhai", status: "replied", reply: "Shukriya Fatima ji! 🙏 Always happy to help!", receivedAt: new Date(Date.now() - 172800000).toISOString() },
];

const MOCK_STATS: ReviewStats = { totalReviews: 4, avgRating: 4.0, fiveStar: 2, fourStar: 1, threeStar: 0, twoStar: 1, oneStar: 0, responseRate: 25, pendingReplies: 2 };

const MOCK_CONFIG: ReviewConfig = {
  autoRequestAfterDays: 3,
  requestMessage: "Hi {{name}}! 😊 Hope you're enjoying {{product}}. We'd love your feedback! Rate us (1-5 ⭐): Reply with your rating + any comment.",
  thankYouMessage: "Thank you for your {{rating}}⭐ review, {{name}}! We really appreciate it. 🙏",
  escalateOnStarLessThan: 3,
  isActive: true,
};

const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", replied: "bg-blue-100 text-blue-700", flagged: "bg-red-100 text-red-700" };

function StarRating({ rating }: { rating: number }) {
  return <span className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</span>;
}

function RatingBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-12 text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full"><div className={`h-2 ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
      <span className="text-xs w-8 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("reviews");
  const [filter, setFilter] = useState("all");
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<ReviewConfig>(MOCK_CONFIG);
  const qc = useQueryClient();

  const { data: reviews = MOCK_REVIEWS } = useQuery({
    queryKey: ["reviews", filter], queryFn: async () => { const { getReviews } = await import("@/lib/reviews.functions"); return getReviews({ data: { status: filter } }); }, placeholderData: MOCK_REVIEWS, staleTime: 30_000,
  });
  const { data: stats = MOCK_STATS } = useQuery({
    queryKey: ["review-stats"], queryFn: async () => { const { getReviewStats } = await import("@/lib/reviews.functions"); return getReviewStats(); }, placeholderData: MOCK_STATS, staleTime: 60_000,
  });
  const { data: savedConfig = MOCK_CONFIG } = useQuery({
    queryKey: ["review-config"], queryFn: async () => { const { getReviewConfig } = await import("@/lib/reviews.functions"); return getReviewConfig(); }, placeholderData: MOCK_CONFIG, staleTime: 300_000,
  });

  const replyMut = useMutation({
    mutationFn: async ({ id, whatsapp, reply }: { id: string; whatsapp: string; reply: string }) => { const { replyToReview } = await import("@/lib/reviews.functions"); return replyToReview({ data: { reviewId: id, whatsapp, reply } }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); qc.invalidateQueries({ queryKey: ["review-stats"] }); },
  });

  const saveConfigMut = useMutation({
    mutationFn: async () => { const { saveReviewConfig } = await import("@/lib/reviews.functions"); return saveReviewConfig({ data: config as unknown as Record<string, unknown> }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-config"] }),
  });

  const filteredReviews = filter === "all" ? reviews : reviews.filter(r => r.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-yellow-400 fill-yellow-400" /> Customer Reviews</h1>
        <p className="text-muted-foreground text-sm">Collect, manage, and reply to customer reviews via WhatsApp</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{stats.totalReviews}</div><div className="text-xs text-muted-foreground">Total Reviews</div></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-700 flex items-center justify-center gap-1"><Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />{stats.avgRating}</div><div className="text-xs text-yellow-600">Avg Rating</div></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-700">{stats.responseRate}%</div><div className="text-xs text-green-600">Response Rate</div></div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-700">{stats.pendingReplies}</div><div className="text-xs text-orange-600">Pending Replies</div></div>
      </div>

      <div className="flex gap-1 border-b">
        {(["reviews","stats","settings"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "reviews" ? "All Reviews" : t === "stats" ? "Analytics" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "reviews" && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {["all","pending","approved","replied","flagged"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          {filteredReviews.map(review => (
            <div key={review.id} className={`bg-card border rounded-xl p-4 ${review.status === "flagged" ? "border-red-200 bg-red-50/20" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{review.customerName ?? "Anonymous"}</span>
                    <StarRating rating={review.rating} />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[review.status]}`}>{review.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{review.product} · {review.whatsapp}</p>
                </div>
                <span className="text-xs text-muted-foreground">{review.receivedAt ? new Date(review.receivedAt).toLocaleDateString() : ""}</span>
              </div>
              {review.comment && <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm mb-2">"{review.comment}"</div>}
              {review.reply && <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800 mb-2"><span className="font-medium">Your reply:</span> {review.reply}</div>}
              {review.status !== "replied" && (
                <div className="space-y-2">
                  <textarea value={replyMap[review.id] ?? ""} onChange={e => setReplyMap(p => ({ ...p, [review.id]: e.target.value }))} placeholder="Type your reply…" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" />
                  <button onClick={() => replyMut.mutate({ id: review.id, whatsapp: review.whatsapp ?? "", reply: replyMap[review.id] ?? "" })} disabled={!replyMap[review.id]?.trim() || replyMut.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-medium disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" /> Send Reply via WhatsApp
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && (
        <div className="max-w-md space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Rating Breakdown</h3>
            <div className="space-y-2">
              <RatingBar label="5 stars" count={stats.fiveStar} total={stats.totalReviews} color="bg-green-500" />
              <RatingBar label="4 stars" count={stats.fourStar} total={stats.totalReviews} color="bg-lime-400" />
              <RatingBar label="3 stars" count={stats.threeStar} total={stats.totalReviews} color="bg-yellow-400" />
              <RatingBar label="2 stars" count={stats.twoStar} total={stats.totalReviews} color="bg-orange-400" />
              <RatingBar label="1 star" count={stats.oneStar} total={stats.totalReviews} color="bg-red-400" />
            </div>
            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <div className="text-center"><div className="text-3xl font-bold">{stats.avgRating}</div><div className="text-xs text-muted-foreground">Average</div></div>
              <div className="flex flex-col gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= Math.round(stats.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />).reverse()}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Auto Review Collection</h3>
              <button onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))} className={`relative h-6 w-11 rounded-full transition-colors ${config.isActive ? "bg-green-500" : "bg-gray-200"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></button>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Request after N days post-delivery</label><input type="number" value={config.autoRequestAfterDays} onChange={e => setConfig(p => ({ ...p, autoRequestAfterDays: Number(e.target.value) }))} className="w-24 px-3 py-2 border rounded-lg text-sm bg-background" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Request Message (use {`{{name}}`}, {`{{product}}`})</label><textarea value={config.requestMessage} onChange={e => setConfig(p => ({ ...p, requestMessage: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Thank You Message</label><textarea value={config.thankYouMessage} onChange={e => setConfig(p => ({ ...p, thankYouMessage: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Escalate when rating below</label>
              <select value={config.escalateOnStarLessThan} onChange={e => setConfig(p => ({ ...p, escalateOnStarLessThan: Number(e.target.value) }))} className="px-3 py-2 border rounded-lg text-sm bg-background">
                {[2,3,4].map(n => <option key={n} value={n}>{n} stars</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"><Save className="h-4 w-4" />{saveConfigMut.isPending ? "Saving…" : "Save Settings"}</button>
        </div>
      )}
    </div>
  );
}
