"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  History,
  Loader2,
  Lock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ErrorState } from "@/components/admin/ErrorState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  SETTINGS_SECTIONS,
} from "@/components/admin/settings/settings-meta";
import {
  FinancialSectionForm,
  GeneralSectionForm,
  LoyaltySectionForm,
  MarketplaceSectionForm,
  NotificationsSectionForm,
  OrdersSectionForm,
  SecuritySectionForm,
} from "@/components/admin/settings/section-forms";
import {
  usePlatformSettings,
  useResetSettingsSection,
  useSaveSettingsSection,
} from "@/hooks/admin/use-admin-settings";
import {
  isHighRiskSettingsSection,
  sectionAccessFromServer,
} from "@/lib/admin/settings-permissions";
import { SettingsForbiddenError } from "@/services/admin/settings-config.service";
import { cn } from "@/lib/utils";
import type {
  PlatformSettingsConfig,
  SettingsSectionKey,
} from "@/types/admin";

export default function AdminSettingsPage() {
  return <SettingsConsole />;
}

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function formatSavedAt(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "just now";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SettingsConsole() {
  const configQuery = usePlatformSettings();
  const saveMutation = useSaveSettingsSection();
  const resetMutation = useResetSettingsSection();

  const [section, setSection] = useState<SettingsSectionKey>("general");
  const [dirty, setDirty] = useState(false);
  const [pendingSwitchTo, setPendingSwitchTo] =
    useState<SettingsSectionKey | null>(null);
  const [pendingSave, setPendingSave] = useState<{
    section: SettingsSectionKey;
    value: PlatformSettingsConfig[SettingsSectionKey];
  } | null>(null);
  const [pendingReset, setPendingReset] = useState<SettingsSectionKey | null>(
    null
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const settings = configQuery.data ?? null;

  /** Warn once when leaving the page with unsaved changes. */
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const runSave = useCallback(
    async <S extends SettingsSectionKey>(
      key: S,
      value: PlatformSettingsConfig[S]
    ): Promise<boolean> => {
      const label =
        SETTINGS_SECTIONS.find((s) => s.key === key)?.label ?? "Section";
      try {
        await saveMutation.mutateAsync({
          section: key,
          value,
          expectedVersion: settings?.meta[key]?.version,
        });
        pushToast("success", `${label} settings saved.`);
        setDirty(false);
        return true;
      } catch (err) {
        pushToast(
          "error",
          err instanceof Error && err.message
            ? err.message
            : "Couldn't save this section. Try again."
        );
        return false;
      }
    },
    [saveMutation, pushToast, settings]
  );

  /**
   * High-risk sections (financial / security) need explicit
   * confirmation before changes are staged; everything else saves
   * straight away. Returns false for staged saves so the form keeps
   * its draft and clears its spinner until the dialog resolves.
   */
  const saveSection = useCallback(
    async <S extends SettingsSectionKey>(
      key: S,
      value: PlatformSettingsConfig[S]
    ): Promise<boolean> => {
      if (isHighRiskSettingsSection(key)) {
        setPendingSave({ section: key, value });
        return false;
      }
      return runSave(key, value);
    },
    [runSave]
  );

  const runReset = useCallback(
    async (key: SettingsSectionKey) => {
      try {
        await resetMutation.mutateAsync({
          section: key,
          expectedVersion: settings?.meta[key]?.version,
        });
        pushToast("success", "Section reset to defaults.");
        setDirty(false);
      } catch (err) {
        pushToast(
          "error",
          err instanceof Error && err.message
            ? err.message
            : "Couldn't reset this section."
        );
      }
    },
    [resetMutation, pushToast, settings]
  );

  const resetSection = useCallback(
    (key: SettingsSectionKey) => {
      if (isHighRiskSettingsSection(key)) {
        setPendingReset(key);
        return;
      }
      void runReset(key);
    },
    [runReset]
  );

  const requestSwitch = useCallback(
    (next: SettingsSectionKey) => {
      if (dirty) {
        setPendingSwitchTo(next);
        return;
      }
      setSection(next);
    },
    [dirty]
  );

  const desc =
    "Platform configuration across identity, commerce, finance and security. Changes are saved to the platform, versioned and recorded in the audit trail.";

  if (configQuery.isLoading) return <LoadingSkeleton variant="detail" rows={8} />;

  if (configQuery.error instanceof SettingsForbiddenError) {
    return (
      <>
        <AdminPageHeader title="Settings" description={desc} />
        <div className="mt-4">
          <ErrorState
            title="Restricted area"
            message="Your role doesn't have permission to view platform settings. Contact a Super Admin if you believe this is wrong."
          />
        </div>
      </>
    );
  }

  if (configQuery.isError || !settings) {
    return (
      <>
        <AdminPageHeader
          title="Settings"
          description={desc}
          actions={
            <Link
              href="/admin/audit-logs"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
            >
              <History className="h-3.5 w-3.5" aria-hidden />
              Audit trail
            </Link>
          }
        />
        <div className="mt-4">
          <ErrorState
            message={configQuery.error?.message}
            onRetry={() => void configQuery.refetch()}
          />
        </div>
      </>
    );
  }

  const { config, meta, access } = settings;
  const activeDef = SETTINGS_SECTIONS.find((s) => s.key === section)!;
  const sectionAccess = sectionAccessFromServer(access, section);
  const readOnly = !sectionAccess.canEdit;
  const saving = saveMutation.isPending || resetMutation.isPending;
  const sectionMeta = meta[section];

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description={desc}
        actions={
          <Link
            href="/admin/audit-logs"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            Audit trail
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Section nav */}
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto rounded-lg border border-kampmax-border bg-white p-1 no-scrollbar lg:h-fit lg:flex-col lg:p-1.5"
        >
          {SETTINGS_SECTIONS.map((def) => {
            const Icon = def.icon;
            const active = section === def.key;
            const secAccess = sectionAccessFromServer(access, def.key);
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => requestSwitch(def.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-kampmax-navy text-white shadow-sm"
                    : "text-kampmax-text-secondary hover:bg-kampmax-muted/60 hover:text-kampmax-text"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {def.label}
                {!secAccess.canEdit && (
                  <Lock
                    className="ml-auto h-3 w-3 shrink-0 opacity-70"
                    aria-label="Read-only"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Active section form */}
        <section
          aria-label={`${activeDef.label} settings`}
          className="rounded-lg border border-kampmax-border bg-white p-5"
        >
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-kampmax-text-secondary">
              Settings
            </p>
            <h1 className="mt-0.5 flex items-center gap-2 text-base font-bold text-kampmax-text">
              {activeDef.label}
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-kampmax-border bg-kampmax-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Read-only
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">
              {activeDef.description}
            </p>
          </div>

          {saving && (
            <p className="mb-4 flex items-center gap-1.5 rounded-md bg-kampmax-muted/50 px-3 py-2 text-xs text-kampmax-text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </p>
          )}

          {section === "general" && (
            <GeneralSectionForm
              value={config.general}
              onSave={(v) => saveSection("general", v)}
              onReset={() => resetSection("general")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "marketplace" && (
            <MarketplaceSectionForm
              value={config.marketplace}
              onSave={(v) => saveSection("marketplace", v)}
              onReset={() => resetSection("marketplace")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "orders" && (
            <OrdersSectionForm
              value={config.orders}
              onSave={(v) => saveSection("orders", v)}
              onReset={() => resetSection("orders")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "financial" && (
            <FinancialSectionForm
              value={config.financial}
              onSave={(v) => saveSection("financial", v)}
              onReset={() => resetSection("financial")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "loyalty" && (
            <LoyaltySectionForm
              value={config.loyalty}
              onSave={(v) => saveSection("loyalty", v)}
              onReset={() => resetSection("loyalty")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "notifications" && (
            <NotificationsSectionForm
              value={config.notifications}
              onSave={(v) => saveSection("notifications", v)}
              onReset={() => resetSection("notifications")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}
          {section === "security" && (
            <SecuritySectionForm
              value={config.security}
              onSave={(v) => saveSection("security", v)}
              onReset={() => resetSection("security")}
              disabled={readOnly}
              onDirtyChange={setDirty}
            />
          )}

          <div className="mt-5 flex flex-col gap-2">
            <p className="text-[11px] leading-snug text-kampmax-text-secondary">
              {sectionMeta?.isDefault
                ? "Using the built-in defaults - nothing has been saved for this section yet."
                : `Last saved ${formatSavedAt(sectionMeta?.updatedAt)}${
                    sectionMeta?.updatedBy ? ` by ${sectionMeta.updatedBy}` : ""
                  } (version ${sectionMeta?.version}).`}
            </p>
            {sectionAccess.requiresManage && (
              <p className="flex items-start gap-2 rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2.5 text-[11px] leading-snug text-kampmax-error">
                <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                This section changes sensitive platform controls - every change
                is confirmed before it is applied.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* High-risk save confirmation */}
      <ConfirmDialog
        open={pendingSave !== null}
        tone="danger"
        title={
          pendingSave?.section === "security"
            ? "Change security settings?"
            : "Change financial settings?"
        }
        message="These settings affect sensitive platform controls. Applying them is recorded in the audit trail against your admin account."
        confirmLabel="Save changes"
        loading={saveMutation.isPending}
        onConfirm={() => {
          const staged = pendingSave;
          setPendingSave(null);
          if (staged) void runSave(staged.section, staged.value);
        }}
        onCancel={() => setPendingSave(null)}
      />

      {/* High-risk reset confirmation */}
      <ConfirmDialog
        open={pendingReset !== null}
        tone="warning"
        title={
          pendingReset === "security"
            ? "Reset security settings?"
            : "Reset financial settings?"
        }
        message="This restores the default values for this section. Any tuned values are lost and the section falls back to platform defaults."
        confirmLabel="Reset to defaults"
        loading={resetMutation.isPending}
        onConfirm={() => {
          const staged = pendingReset;
          setPendingReset(null);
          if (staged) void runReset(staged);
        }}
        onCancel={() => setPendingReset(null)}
      />

      {/* Unsaved-changes guard when switching sections */}
      <ConfirmDialog
        open={pendingSwitchTo !== null}
        tone="default"
        title="Discard unsaved changes?"
        message="This section has changes that haven't been saved - switching will lose them."
        confirmLabel="Discard changes"
        onConfirm={() => {
          const next = pendingSwitchTo;
          setPendingSwitchTo(null);
          if (next) {
            setDirty(false);
            setSection(next);
          }
        }}
        onCancel={() => setPendingSwitchTo(null)}
      />

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out]"
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