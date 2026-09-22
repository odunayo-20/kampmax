"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  ShieldCheck,
  FileText,
  DollarSign,
  Package,
} from "lucide-react";
import { supportService } from "@/services/support";
import type {
  SupportTicket,
  SupportTicketDetail,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/types/admin";
import { StatusBadge, BadgeVariant } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/utils";

const VENDOR_USER_ID = "v1";

const CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
  payments: { label: "Payout & Financials", icon: DollarSign },
  marketplace: { label: "Order Dispute", icon: Package },
  verification: { label: "Listing / Store Verification", icon: ShieldCheck },
  account: { label: "Account & Security", icon: AlertCircle },
  technical: { label: "Technical Support", icon: LifeBuoy },
  other: { label: "General Support", icon: LifeBuoy },
};

export default function VendorSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Ticket Form State
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>("payments");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRelatedKind, setNewRelatedKind] = useState<"order" | "transaction" | "">("");
  const [newRelatedId, setNewRelatedId] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Reply State
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      let userTickets = await supportService.listMine(VENDOR_USER_ID);
      if (!userTickets || userTickets.length === 0) {
        const res = await supportService.list();
        userTickets = res.items || [];
      }
      setTickets(userTickets);
      if (userTickets.length > 0 && !selectedTicketId) {
        selectTicket(userTickets[0].id);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function selectTicket(id: string) {
    setSelectedTicketId(id);
    setLoadingDetail(true);
    try {
      let detail = await supportService.getMine(VENDOR_USER_ID, id);
      if (!detail) {
        detail = await supportService.getById(id);
      }
      setSelectedTicketDetail(detail);
    } catch (err) {
      console.error("Failed to load ticket detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    setSubmittingTicket(true);
    try {
      const created = await supportService.createForCustomer(VENDOR_USER_ID, {
        category: newCategory,
        subject: newSubject.trim(),
        description: newDescription.trim(),
        related: newRelatedKind && newRelatedId.trim() ? { kind: newRelatedKind, id: newRelatedId.trim() } : null,
      });

      setCreateSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setCreateSuccess(false);
        setNewSubject("");
        setNewDescription("");
        setNewRelatedId("");
        setNewRelatedKind("");
        loadTickets();
        if (created?.ticket?.id) {
          selectTicket(created.ticket.id);
        }
      }, 1200);
    } catch (err) {
      console.error("Failed to create ticket:", err);
    } finally {
      setSubmittingTicket(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicketId || !replyBody.trim()) return;

    setSendingReply(true);
    try {
      await supportService.replyForCustomer(VENDOR_USER_ID, selectedTicketId, {
        body: replyBody.trim(),
      });
      setReplyBody("");
      await selectTicket(selectedTicketId);
      await loadTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setSendingReply(false);
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchQuery]);

  function getStatusVariant(status: SupportTicketStatus): BadgeVariant {
    switch (status) {
      case "open":
        return "info";
      case "in_progress":
        return "warning";
      case "waiting_on_customer":
        return "neutral";
      case "resolved":
        return "success";
      case "closed":
        return "neutral";
      default:
        return "neutral";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-kampmax-navy" aria-hidden />
            <h1 className="text-xl font-bold text-kampmax-text sm:text-2xl">Vendor Support</h1>
          </div>
          <p className="mt-1 text-xs text-kampmax-text-secondary sm:text-sm">
            Contact Kampmax support, track tickets, and resolve store or payout issues.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-kampmax-navy px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-kampmax-navy/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New Ticket
        </button>
      </div>

      {/* Main Grid: Ticket List + Selected Detail */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: List & Filters (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Search and Tabs */}
          <div className="rounded-xl border border-kampmax-border bg-white p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-kampmax-text-secondary" aria-hidden />
              <input
                type="text"
                placeholder="Search tickets by subject or #ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-kampmax-border bg-kampmax-muted/30 py-2 pl-9 pr-3 text-xs text-kampmax-text placeholder:text-kampmax-text-secondary focus:border-kampmax-navy focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1 border-b border-kampmax-border pb-2 text-xs">
              {["all", "open", "in_progress", "resolved"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                    statusFilter === st
                      ? "bg-kampmax-navy text-white"
                      : "text-kampmax-text-secondary hover:bg-kampmax-muted/60 hover:text-kampmax-text"
                  }`}
                >
                  {st === "all" ? "All" : st.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket List Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="rounded-xl border border-kampmax-border bg-white p-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-kampmax-text-secondary" aria-hidden />
              <p className="text-sm font-semibold text-kampmax-text">No tickets found</p>
              <p className="text-xs text-kampmax-text-secondary">
                {searchQuery ? "Try a different search query." : "You have no active support tickets."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const catMeta = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.other;
                const IconComponent = catMeta.icon;

                return (
                  <button
                    key={t.id}
                    onClick={() => selectTicket(t.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition ${
                      isSelected
                        ? "border-kampmax-navy bg-kampmax-navy/5 shadow-sm"
                        : "border-kampmax-border bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
                        <IconComponent className="h-3.5 w-3.5 text-kampmax-navy" aria-hidden />
                        <span className="font-mono text-[11px] font-semibold">{t.id}</span>
                      </div>
                      <StatusBadge variant={getStatusVariant(t.status)} label={t.status.replace("_", " ")} />
                    </div>

                    <h3 className="mt-1.5 truncate text-xs font-bold text-kampmax-text">{t.subject}</h3>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-kampmax-text-secondary">
                      <span className="truncate">{catMeta.label}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        {formatDate(t.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Ticket Conversation & Detail (7 cols) */}
        <div className="lg:col-span-7">
          {loadingDetail ? (
            <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
          ) : !selectedTicketDetail ? (
            <div className="flex h-full min-h-[350px] items-center justify-center rounded-xl border border-kampmax-border bg-white p-8 text-center">
              <div>
                <LifeBuoy className="mx-auto mb-2 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
                <p className="text-sm font-medium text-kampmax-text">Select a ticket to view conversation</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-xl border border-kampmax-border bg-white">
              {/* Detail Header */}
              <div className="border-b border-kampmax-border p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-kampmax-navy">
                        #{selectedTicketDetail.ticket.id}
                      </span>
                      <StatusBadge
                        variant={getStatusVariant(selectedTicketDetail.ticket.status)}
                        label={selectedTicketDetail.ticket.status.replace("_", " ")}
                      />
                    </div>
                    <h2 className="mt-1 text-base font-bold text-kampmax-text sm:text-lg">
                      {selectedTicketDetail.ticket.subject}
                    </h2>
                  </div>
                  <span className="text-xs text-kampmax-text-secondary">
                    Opened {formatDate(selectedTicketDetail.ticket.createdAt)}
                  </span>
                </div>

                {selectedTicketDetail.ticket.relatedResource && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-kampmax-muted/50 px-2.5 py-1 text-xs text-kampmax-text">
                    <FileText className="h-3.5 w-3.5 text-kampmax-navy" aria-hidden />
                    <span>
                      Related {selectedTicketDetail.ticket.relatedResource.type}:{" "}
                      <strong>{selectedTicketDetail.ticket.relatedResource.id}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Message Thread Container */}
              <div className="max-h-[420px] flex-1 overflow-y-auto p-4 space-y-4 bg-kampmax-muted/10">
                {selectedTicketDetail.messages.map((msg) => {
                  const isStaff = msg.postedBy === "support";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-kampmax-text-secondary">
                        <span className="font-semibold text-kampmax-text">
                          {isStaff ? "Kampmax Support Team" : "You (Vendor)"}
                        </span>
                        <span>·</span>
                        <span>{formatDate(msg.at)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-xl p-3.5 text-xs shadow-xs ${
                          isStaff
                            ? "bg-white text-kampmax-text border border-kampmax-border"
                            : "bg-kampmax-navy text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/20">
                            <p className="text-[10px] opacity-80">Attachments:</p>
                            {msg.attachments.map((att, idx) => (
                              <span key={idx} className="text-[11px] block font-mono">
                                {att.name} ({Math.round(att.sizeBytes / 1024)} KB)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              {selectedTicketDetail.ticket.status !== "closed" && (
                <form onSubmit={handleSendReply} className="border-t border-kampmax-border p-3 sm:p-4 bg-white">
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      placeholder="Write a reply to Kampmax support..."
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="flex-1 rounded-lg border border-kampmax-border p-2.5 text-xs text-kampmax-text placeholder:text-kampmax-text-secondary focus:border-kampmax-navy focus:outline-none resize-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyBody.trim()}
                      className="inline-flex items-center justify-center rounded-lg bg-kampmax-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-kampmax-navy/90 disabled:opacity-50"
                    >
                      {sendingReply ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-kampmax-border pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-kampmax-navy" aria-hidden />
                <h2 className="text-base font-bold text-kampmax-text">Submit Support Ticket</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {createSuccess ? (
              <div className="my-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-emerald-500" aria-hidden />
                <h3 className="text-base font-bold text-kampmax-text">Ticket Submitted!</h3>
                <p className="mt-1 text-xs text-kampmax-text-secondary">
                  Our support team will review your case shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-kampmax-text mb-1">Issue Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                    className="w-full rounded-lg border border-kampmax-border bg-white p-2.5 text-xs text-kampmax-text focus:border-kampmax-navy focus:outline-none"
                  >
                    <option value="payments">Payout & Financial Issue</option>
                    <option value="marketplace">Order Dispute / Problem</option>
                    <option value="verification">Store / Listing Verification</option>
                    <option value="account">Account & Security</option>
                    <option value="technical">Technical Operations</option>
                    <option value="other">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kampmax-text mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-lg border border-kampmax-border p-2.5 text-xs text-kampmax-text focus:border-kampmax-navy focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-kampmax-text mb-1">Related Type (Optional)</label>
                    <select
                      value={newRelatedKind}
                      onChange={(e) => setNewRelatedKind(e.target.value as any)}
                      className="w-full rounded-lg border border-kampmax-border bg-white p-2.5 text-xs text-kampmax-text focus:border-kampmax-navy focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="order">Order ID</option>
                      <option value="transaction">Transaction Reference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-kampmax-text mb-1">Reference ID</label>
                    <input
                      type="text"
                      disabled={!newRelatedKind}
                      placeholder={newRelatedKind ? "e.g. ord-1" : "Select type first"}
                      value={newRelatedId}
                      onChange={(e) => setNewRelatedId(e.target.value)}
                      className="w-full rounded-lg border border-kampmax-border p-2.5 text-xs text-kampmax-text focus:border-kampmax-navy focus:outline-none disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kampmax-text mb-1">Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details about the issue so support can assist you faster..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-lg border border-kampmax-border p-2.5 text-xs text-kampmax-text focus:border-kampmax-navy focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-kampmax-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-kampmax-border px-4 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTicket || !newSubject.trim() || !newDescription.trim()}
                    className="rounded-lg bg-kampmax-navy px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-kampmax-navy/90 disabled:opacity-50"
                  >
                    {submittingTicket ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
