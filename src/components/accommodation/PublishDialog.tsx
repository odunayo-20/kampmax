"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRenewAccommodationSubscription, useSubscribeAccommodationListing } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { AUTO_RENEW_TEXT, BILLING_TERMS, choosablePackages, durationText, packageLabel, PAYSTACK_NOTE, safeCheckoutUrl } from "@/lib/agent-billing";
import { formatNaira } from "@/lib/utils";
import type { AccommodationPackage } from "@/types/accommodation";

/**
 * Choosing a package and paying to publish a listing, or renewing one. The terms must be accepted first; Paystack
 * opens in this tab and sends the agent back to Billing, which asks the server whether the payment went through.
 * The same flow as the mobile app's PublishSheet.
 */
export function PublishDialog({
  open,
  onClose,
  onDone,
  listingId,
  packages,
  renew,
}: {
  open: boolean;
  onClose: () => void;
  /** Called when nothing was due, with what happens next. */
  onDone: (message: string) => void;
  listingId: string;
  packages: AccommodationPackage[];
  /** Set to renew a lapsed or ending subscription at the price it was sold at, instead of choosing a package. */
  renew?: { id: string; amount: number };
}) {
  const subscribe = useSubscribeAccommodationListing();
  const renewal = useRenewAccommodationSubscription();
  const options = choosablePackages(packages);
  const [chosen, setChosen] = useState("");
  const [terms, setTerms] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const sending = useRef(false);

  const pkg = options.find((p) => p.id === (chosen || options[0]?.id));
  const price = renew ? renew.amount : (pkg?.price ?? 0);
  const pending = subscribe.isPending || renewal.isPending;
  const label = price > 0 ? `Pay ${formatNaira(price)}` : renew ? "Renew for free" : "Send for review";

  async function pay() {
    setProblem(null);
    if (!renew && !pkg) return setProblem("Choose a package.");
    if (!terms) return setProblem("Accept the billing terms to continue.");
    // One checkout at a time: a second click while the first is starting would replace it.
    if (sending.current) return;
    sending.current = true;
    try {
      const start = renew ? await renewal.mutateAsync({ id: renew.id, autoRenew }) : await subscribe.mutateAsync({ id: listingId, packageId: pkg?.id, autoRenew });
      const url = start.authorizationUrl ? safeCheckoutUrl(start.authorizationUrl) : null;
      if (start.authorizationUrl && !url) return setProblem("The payment page address was not safe to open, so nothing was opened. Please try again or contact support.");
      if (url) return window.location.assign(url);
      if (start.payment.amount > 0) return setProblem("The payment page could not be started. You have not been charged. Please try again.");
      onClose();
      onDone(start.note ?? "Your listing has been sent for review. The Kampmax team will publish it once it is approved.");
    } catch (reason) {
      setProblem(describeHousingError(reason));
    } finally {
      sending.current = false;
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={renew ? "Renew listing" : "Publish this listing"}
      body={renew ? "Renew at the price this listing was sold at." : "Your listing is shown to students for the whole period, once the team approves it."}
      confirmLabel={label}
      pending={pending}
      confirmDisabled={!renew && options.length === 0}
      onConfirm={() => void pay()}
      onCancel={onClose}
    >
      <div className="mt-3 space-y-3 text-sm">
        {!renew &&
          (options.length === 0 ? (
            <p className="text-kampmax-text-secondary">No packages are available right now. Try again later.</p>
          ) : (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-kampmax-text-secondary">Choose a package</legend>
              {options.map((p) => (
                <label key={p.id} className="flex items-start gap-2">
                  <input type="radio" name="package" checked={p.id === pkg?.id} onChange={() => setChosen(p.id)} className="mt-1" />
                  <span>
                    {packageLabel(p, formatNaira)}
                    {p.description && <span className="block text-xs text-kampmax-text-secondary">{p.description}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        {(renew || pkg) && (
          <div className="flex items-center justify-between rounded-md bg-blue-50 p-3">
            <span className="text-kampmax-text-secondary">{renew ? "Renewal" : `${pkg?.name} · ${durationText(pkg?.durationDays ?? 0)}`}</span>
            <span className="font-bold text-kampmax-blue">{price > 0 ? formatNaira(price) : "Free"}</span>
          </div>
        )}
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); setProblem(null); }} className="mt-0.5" />
          <span>{BILLING_TERMS}</span>
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="mt-0.5" />
          <span>{AUTO_RENEW_TEXT}</span>
        </label>
        {price > 0 && <p className="text-xs text-kampmax-text-secondary">{PAYSTACK_NOTE}</p>}
        {problem && <p role="alert" className="text-xs text-red-700">{problem}</p>}
      </div>
    </ConfirmDialog>
  );
}
