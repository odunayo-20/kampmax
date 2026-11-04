"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useCreateOffer } from "@/hooks/use-offers";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { MilestonePlanEditor } from "@/components/freelancer/proposals/MilestonePlanEditor";
import { ServiceFeeNote } from "@/components/freelancer/ServiceFeeNote";
import { toProposalMilestones, validatePlan, type MilestoneRow, type PlanErrors } from "@/lib/milestone-plan";
import { validateHourlyTerms, weeklyCap } from "@/lib/hourly";
import { cn, formatNaira } from "@/lib/utils";

interface SendOfferModalProps {
  conversationId: string;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-500";

/**
 * The freelancer's offer form. On success the backend posts the offer into the
 * chat, so the modal just closes and the thread shows the new card.
 */
export function SendOfferModal({ conversationId, onClose }: SendOfferModalProps) {
  const createOffer = useCreateOffer();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<"FIXED" | "HOURLY">("FIXED");
  const [rate, setRate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [plan, setPlan] = useState<MilestoneRow[]>([]);
  const [planErrors, setPlanErrors] = useState<PlanErrors | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const price = Number(amount);
  // The delivery estimate is optional, but a whole number of days from 1 to 365 when given.
  const days = Number(deliveryDays);
  const daysValid = !deliveryDays || (Number.isInteger(days) && days >= 1 && days <= 365);
  const hourly = payment === "HOURLY";
  // An hourly offer is priced by a rate and a weekly limit instead of a price.
  const termsErrors = hourly ? validateHourlyTerms(rate, weeklyHours) : null;
  const termsValid = hourly ? termsErrors === null : price >= 1;
  const valid = title.trim().length >= 3 && description.trim().length >= 10 && termsValid && daysValid;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || createOffer.isPending) return;
    setError(null);
    // A payment plan has to add up to the price; say what is wrong before sending.
    // (An hourly offer is paid by the week and has no milestones.)
    const problems = hourly ? null : validatePlan(plan, price);
    setPlanErrors(problems);
    if (problems) return;
    createOffer.mutate(
      {
        conversationId,
        title: title.trim(),
        description: description.trim(),
        ...(hourly
          ? { paymentType: "HOURLY" as const, hourlyRate: Number(rate), weeklyHourLimit: Number(weeklyHours) }
          : { amount: price, milestones: toProposalMilestones(plan) }),
        deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
        expiresInDays: Number(expiresInDays),
      },
      {
        onSuccess: onClose,
        onError: (err) =>
          setError(
            (err as { status?: number })?.status === 409
              ? "You already have an open offer in this chat. Withdraw it first to send a new one."
              : getFriendlyErrorMessage(err)
          ),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-offer-title"
    >
      {/* noValidate: the browser's own checks would block the submit before our clearer messages (e.g. on a past due date) show. */}
      <form onSubmit={handleSubmit} noValidate className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2 id="send-offer-title" className="text-sm font-bold text-neutral-900">
            Send an offer
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-xs text-neutral-500">
            Agree the price and scope here. When they accept, a contract is created and they fund it before you start.
          </p>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div>
            <label htmlFor="offer-title" className="mb-1.5 block text-xs font-medium text-neutral-600">
              What will you deliver?
            </label>
            <input
              id="offer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Landing page design"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="offer-description" className="mb-1.5 block text-xs font-medium text-neutral-600">
              Scope and terms
            </label>
            <textarea
              id="offer-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="What's included, revisions, anything you need from them."
              className={`${inputClass} resize-none`}
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-neutral-600">How do you want to be paid?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["FIXED", "HOURLY"] as const).map((kind) => (
                <label
                  key={kind}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    payment === kind ? "border-primary-500 bg-primary-50 font-semibold text-neutral-900" : "border-neutral-200 text-neutral-700"
                  )}
                >
                  <input
                    type="radio"
                    name="offer-payment"
                    checked={payment === kind}
                    onChange={() => setPayment(kind)}
                    className="h-4 w-4"
                  />
                  {kind === "FIXED" ? "Fixed price" : "By the hour"}
                </label>
              ))}
            </div>
          </fieldset>

          {hourly && (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="offer-rate" className="mb-1.5 block text-xs font-medium text-neutral-600">
                    Rate (₦ per hour)
                  </label>
                  <input
                    id="offer-rate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    aria-invalid={rate !== "" && !!termsErrors?.rate}
                    className={inputClass}
                  />
                  {rate !== "" && termsErrors?.rate && <p className="mt-1 text-[11px] text-error-600">{termsErrors.rate}</p>}
                </div>
                <div>
                  <label htmlFor="offer-hours" className="mb-1.5 block text-xs font-medium text-neutral-600">
                    Most hours per week
                  </label>
                  <input
                    id="offer-hours"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    aria-invalid={weeklyHours !== "" && !!termsErrors?.hours}
                    className={inputClass}
                  />
                  {weeklyHours !== "" && termsErrors?.hours && (
                    <p className="mt-1 text-[11px] text-error-600">{termsErrors.hours}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                {termsErrors === null
                  ? `A week can cost up to ${formatNaira(weeklyCap(Number(rate), Number(weeklyHours)))}. `
                  : ""}
                The client funds each week before you start it. You log your hours, and are paid for the hours they
                approve; whatever is not used goes back to them.
              </p>
              <ServiceFeeNote
                className="mt-1"
                per="a full week"
                amount={termsErrors === null ? weeklyCap(Number(rate), Number(weeklyHours)) : undefined}
              />
            </div>
          )}

          <div className={cn("grid grid-cols-1 gap-3", hourly ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            {!hourly && (
              <div>
                <label htmlFor="offer-amount" className="mb-1.5 block text-xs font-medium text-neutral-600">
                  Price (₦)
                </label>
                <input
                  id="offer-amount"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label htmlFor="offer-days" className="mb-1.5 block text-xs font-medium text-neutral-600">
                Delivery (days)
              </label>
              <input
                id="offer-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                aria-invalid={!daysValid}
                className={inputClass}
              />
              {!daysValid && <p className="mt-1 text-[11px] text-error-600">Use a whole number from 1 to 365.</p>}
            </div>
            <div>
              <label htmlFor="offer-expiry" className="mb-1.5 block text-xs font-medium text-neutral-600">
                Offer valid for
              </label>
              <select
                id="offer-expiry"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
              </select>
            </div>
          </div>

          {!hourly && <ServiceFeeNote amount={Number(amount) > 0 ? Number(amount) : undefined} />}

          {!hourly && (
            <MilestonePlanEditor
              rows={plan}
              total={price >= 1 ? price : undefined}
              onChange={setPlan}
              errors={planErrors}
              disabled={createOffer.isPending}
            />
          )}

          <button
            type="submit"
            disabled={!valid || createOffer.isPending}
            className="w-full rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {createOffer.isPending ? "Sending…" : "Send offer"}
          </button>
        </div>
      </form>
    </div>
  );
}
