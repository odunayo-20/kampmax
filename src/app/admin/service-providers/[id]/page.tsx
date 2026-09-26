"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  ProviderActionDialog,
  type ProviderActionTarget,
} from "@/components/admin/service-providers/ProviderActionDialog";
import {
  PROVIDER_STATUS_LABELS,
  providerActions,
  providerStatusVariant,
  type ProviderActionKind,
} from "@/components/admin/service-providers/provider-meta";
import { useAdminServiceProvider } from "@/hooks/admin/use-admin-service-providers";
import { cn, formatDate, formatDateTime, formatNaira } from "@/lib/utils";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

const ACTION_LABELS: Record<ProviderActionKind, string> = {
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  restore: "Restore",
};

export default function AdminServiceProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const query = useAdminServiceProvider(id);

  const [target, setTarget] = useState<ProviderActionTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const tid = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id: tid, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3800);
  }, []);

  const back = (
    <Link
      href="/admin/service-providers"
      className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All service providers
    </Link>
  );

  if (query.isPending) return <LoadingSkeleton variant="detail" rows={6} />;
  if (query.isError) {
    return (
      <>
        {back}
        <div className="rounded-lg border border-kampmax-border bg-white">
          <ErrorState
            title="Couldn't load this provider"
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        </div>
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        {back}
        <EmptyState
          title="Provider not found"
          message="This profile may have been removed or the link is incorrect."
        />
      </>
    );
  }

  const { provider, profile, services, bookings, availability, activity } = query.data;
  const actions = providerActions(provider.status);

  return (
    <>
      {back}
      <AdminPageHeader
        title={provider.displayName}
        description={`${provider.slug} · joined ${formatDate(provider.joinedAt)}`}
        actions={
          <>
            <StatusBadge
              variant={providerStatusVariant(provider.status)}
              label={PROVIDER_STATUS_LABELS[provider.status]}
            />
            {(Object.keys(actions) as ProviderActionKind[])
              .filter((k) => actions[k])
              .map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setTarget({ id: provider.id, name: provider.displayName, kind })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                    kind === "reject" || kind === "suspend"
                      ? "border-kampmax-error/30 bg-white text-kampmax-error hover:bg-kampmax-error/5"
                      : "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted/60"
                  )}
                >
                  {ACTION_LABELS[kind]}
                </button>
              ))}
          </>
        }
      />

      {profile.statusReason && (
        <div className="mb-4 rounded-md border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2 text-sm text-kampmax-text">
          {provider.status === "suspended" ? "Suspended: " : "Rejected: "}
          {profile.statusReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Profile">
            <div className="flex gap-3 px-4 py-4">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-kampmax-muted text-xs text-kampmax-text-secondary">
                  No photo
                </span>
              )}
              <p className="text-sm leading-relaxed text-kampmax-text-secondary">
                {profile.bio || "No bio written."}
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-kampmax-border px-4 py-4 sm:grid-cols-2">
              <Info label="Email" value={provider.email} />
              <Info label="Phone" value={provider.phone ?? "—"} />
              <Info label="Type" value={provider.providerType ?? "—"} />
              <Info label="Location" value={provider.location ?? "—"} />
              <Info
                label="Experience"
                value={profile.yearsOfExperience === null ? "—" : `${profile.yearsOfExperience} years`}
              />
              <Info label="Service radius" value={profile.serviceRadius ?? "—"} />
              <Info label="Categories" value={provider.categories.join(", ") || "—"} />
              <Info label="Accepting bookings" value={provider.isActive ? "Yes" : "No"} />
            </dl>
            <dl className="grid grid-cols-2 gap-3 border-t border-kampmax-border px-4 py-3 text-center sm:grid-cols-4">
              <Metric label="Services" value={`${provider.activeServices}/${provider.servicesCount}`} />
              <Metric label="Bookings" value={String(provider.bookingsTotal)} />
              <Metric label="Completed" value={String(provider.bookingsCompleted)} />
              <Metric label="Revenue" value={formatNaira(provider.revenue)} />
            </dl>
          </Card>

          <Card title={`Services (${services.length})`}>
            {services.length === 0 ? (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">No services listed.</p>
            ) : (
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                    <span className="truncate text-sm font-medium text-kampmax-text">{s.title}</span>
                    <span className="text-xs text-kampmax-text-secondary">
                      {s.category || "Uncategorised"} · {s.pricingModel.replace(/_/g, " ")} {formatNaira(s.price)}
                      {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                    </span>
                    <span className="ml-auto rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium capitalize text-kampmax-text-secondary">
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Recent bookings (${bookings.length})`}>
            {bookings.length === 0 ? (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">No bookings yet.</p>
            ) : (
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {bookings.map((b) => (
                  <li key={b.id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-kampmax-text">{b.serviceTitle || "Service"}</span>
                      <span className="text-xs text-kampmax-text-secondary">
                        {b.customerName} · {b.scheduledAt} · {formatNaira(b.price)}
                      </span>
                      <span className="ml-auto rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium capitalize text-kampmax-text-secondary">
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {b.cancellationReason && (
                      <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                        Reason: {b.cancellationReason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Weekly availability">
            {availability.length === 0 ? (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">No availability set.</p>
            ) : (
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {availability.map((a) => (
                  <li key={a.id} className="flex justify-between px-4 py-2 text-sm">
                    <span className="capitalize text-kampmax-text">{a.day}</span>
                    <span className="tabular-nums text-kampmax-text-secondary">
                      {a.start.slice(0, 5)} – {a.end.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Activity">
            <ul role="list" className="divide-y divide-kampmax-border/70">
              {activity.map((event) => (
                <li key={event.id} className="flex items-start gap-2 px-4 py-2.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-kampmax-text">{event.message}</p>
                    <p className="text-xs text-kampmax-text-secondary">
                      {formatDateTime(event.at)}
                      {event.meta ? ` · ${event.meta}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ProviderActionDialog target={target} onClose={() => setTarget(null)} onDone={pushToast} />

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <header className="border-b border-kampmax-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-kampmax-text">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-kampmax-text">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-kampmax-text">{value}</dd>
    </div>
  );
}
