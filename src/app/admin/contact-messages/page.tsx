"use client";

import { useEffect, useState } from "react";
import { Inbox, MailWarning } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ContactMessageDialog } from "@/components/admin/contact/ContactMessageDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminContactMessages } from "@/hooks/admin/use-admin-contact-messages";
import { useDebounce } from "@/hooks/use-debounce";
import type { ContactStatusFilter } from "@/services/admin/contact-messages.service";
import type { AdminContactMessage, ContactInquiryType } from "@/types/contact-messages";

const PAGE_SIZE = 15;

const STATUS_TABS: { value: Exclude<ContactStatusFilter, "all">; label: string }[] = [
  { value: "new", label: "Waiting" },
  { value: "handled", label: "Handled" },
];

const TYPE_OPTIONS: { value: ContactInquiryType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "general", label: "General inquiry" },
  { value: "business", label: "Business inquiry" },
  { value: "vendor", label: "Vendor inquiry" },
  { value: "service-provider", label: "Service provider inquiry" },
  { value: "partnership", label: "Partnership & campus groups" },
  { value: "support", label: "Platform support" },
];

export default function AdminContactMessagesPage() {
  const [status, setStatus] = useState<"new" | "handled">("new");
  const [type, setType] = useState<ContactInquiryType | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isPending, isError, refetch } = useAdminContactMessages({
    status,
    inquiryType: type === "all" ? undefined : type,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Looked up by id, so the dialog always shows the freshest copy of the row.
  const open: AdminContactMessage | null = data?.items.find((m) => m.id === openId) ?? null;
  const filtered = type !== "all" || debouncedSearch.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Contact messages"
        description="What visitors sent through the contact form on the website. Each one is also emailed to the team inbox, with the sender as reply-to."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Message status" className="flex gap-1 border-b border-kampmax-border">
          {STATUS_TABS.map((t) => {
            const active = status === t.value;
            const count = data?.counts[t.value];
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-kampmax-blue text-kampmax-blue"
                    : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {t.label}
                {count !== undefined && (
                  <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="contact-search">
            Search messages
          </label>
          <input
            id="contact-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or text…"
            className="h-9 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text sm:w-56"
          />
          <label className="sr-only" htmlFor="contact-type">
            Filter by type
          </label>
          <select
            id="contact-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as ContactInquiryType | "all");
              setPage(1);
            }}
            className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section aria-label="Messages" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filtered ? "No matching messages" : status === "new" ? "Nothing waiting" : "No handled messages"}
            message={
              filtered
                ? "Try a different search or type."
                : status === "new"
                  ? "No unanswered messages. New ones from the contact form show up here."
                  : "Messages you mark handled are kept here until they are deleted automatically."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">From</th>
                    <th scope="col" className="px-4 py-2 font-medium">Type</th>
                    <th scope="col" className="px-4 py-2 font-medium">Message</th>
                    <th scope="col" className="px-4 py-2 font-medium">{status === "new" ? "Received" : "Handled"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-kampmax-text">{m.name}</span>
                        <span className="block text-[11px] text-kampmax-text-secondary">
                          {m.organization ? `${m.organization} · ` : ""}
                          {m.email}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">{m.inquiryLabel}</td>
                      <td className="max-w-xs px-4 py-2.5">
                        <span className="line-clamp-2 break-words text-kampmax-text">{m.message}</span>
                        {!m.emailed && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <MailWarning className="h-3 w-3" aria-hidden />
                            Team inbox not emailed
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {m.status === "NEW" ? timeAgo(m.createdAt) : m.handledAt ? timeAgo(m.handledAt) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenId(m.id)}
                          aria-label={`Open the message from ${m.name}`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                        >
                          {m.status === "NEW" ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              unitLabel="messages"
            />
          </>
        )}
      </section>

      <p className="mt-3 text-[11px] text-kampmax-text-secondary">
        Handled messages are deleted automatically after a set time (90 days by default), and messages nobody handled
        after a year, so strangers&apos; details aren&apos;t kept longer than needed.
      </p>

      <ContactMessageDialog message={open} onClose={() => setOpenId(null)} />
    </>
  );
}
