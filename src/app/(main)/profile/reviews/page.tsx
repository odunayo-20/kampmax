"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Pencil,
  Trash2,
  MessageSquare,
  Loader2,
  Store,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { StarRating } from "@/components/reviews/StarRating";
import { formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface CustomerReviewItem {
  id: string;
  type: "product" | "vendor" | "service";
  title: string;
  targetName: string;
  rating: number;
  comment: string;
  createdAt: string;
  vendorReply?: string;
  vendorReplyDate?: string;
}

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<CustomerReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      setIsLoading(true);
      const { data } = await apiClient.get<any>("/reviews/me");
      if (data) {
        const rawItems = Array.isArray(data) ? data : data.items || [];
        const mapped: CustomerReviewItem[] = rawItems.map((r: any) => ({
          id: r.id,
          type: (r.targetType?.toLowerCase() as any) || "product",
          title: r.title || r.targetName || "Review",
          targetName: r.targetName || r.vendorName || "Kampmax Merchant",
          rating: r.rating || 5,
          comment: r.comment || r.content || "",
          createdAt: r.createdAt || new Date().toISOString(),
          vendorReply: r.vendorReply || r.replyText,
          vendorReplyDate: r.vendorReplyDate || r.replyDate,
        }));
        setReviews(mapped);
      }
      setIsLoading(false);
    }

    loadReviews();
  }, []);

  const handleStartEdit = (item: CustomerReviewItem) => {
    setEditingId(item.id);
    setEditRating(item.rating);
    setEditComment(item.comment);
  };

  const handleSaveEdit = async (id: string) => {
    setIsSaving(true);
    const { error } = await apiClient.patch(`/reviews/${id}`, {
      rating: editRating,
      comment: editComment,
    });
    if (!error) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, rating: editRating, comment: editComment } : r))
      );
      setEditingId(null);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await apiClient.delete(`/reviews/${id}`);
    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Profile", href: "/profile" },
    { label: "My Reviews" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">My Reviews & Ratings</h1>
            <p className="text-xs text-kampmax-text-secondary">
              Manage your feedback submitted for vendors, products, and service providers.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-kampmax-border p-6 space-y-2">
            <Loader2 className="w-8 h-8 text-kampmax-blue animate-spin mx-auto" />
            <p className="text-xs text-kampmax-text-secondary">Loading your reviews from backend...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-kampmax-border p-6 space-y-3">
            <MessageSquare className="w-10 h-10 text-kampmax-text-secondary/40 mx-auto" />
            <h3 className="text-sm font-bold text-kampmax-text">No Reviews Yet</h3>
            <p className="text-xs text-kampmax-text-secondary max-w-xs mx-auto">
              Once you complete orders or service bookings, your reviews will appear here.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center px-4 py-2 bg-kampmax-navy text-white text-xs font-semibold rounded-xl"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-kampmax-border p-4 space-y-3 transition-shadow hover:shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-kampmax-text">{item.title}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.type === "product"
                            ? "bg-blue-100 text-blue-800"
                            : item.type === "service"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-kampmax-text-secondary mt-0.5">
                      Target: <span className="font-semibold text-kampmax-text">{item.targetName}</span> • Posted {formatDate(new Date(item.createdAt))}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-kampmax-muted text-kampmax-text-secondary transition-colors"
                      title="Edit Review"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                      title="Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === item.id ? (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditRating(star)}
                          className="p-0.5"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= editRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="w-full p-2.5 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3 py-1.5 bg-kampmax-navy text-white text-xs font-semibold rounded-lg"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-kampmax-border text-xs font-semibold rounded-lg hover:bg-kampmax-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <StarRating rating={item.rating} size="sm" />
                    <p className="text-xs text-kampmax-text leading-relaxed">{item.comment}</p>

                    {item.vendorReply && (
                      <div className="p-3 rounded-xl bg-kampmax-muted/60 border border-kampmax-border space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-kampmax-navy">
                          <Store className="w-3.5 h-3.5" />
                          <span>Response from {item.targetName}</span>
                        </div>
                        <p className="text-[11px] text-kampmax-text-secondary italic">
                          &quot;{item.vendorReply}&quot;
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
