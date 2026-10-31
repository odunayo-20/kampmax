import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Images, PartyPopper, SearchX, Wrench } from "lucide-react";

export type ApplicationState = "pending" | "approved" | "missing";

const NEXT_STEPS = [
  { title: "We review your application", body: "Our team looks over every new provider." },
  { title: "You're notified", body: "When there's a decision, you'll hear from us." },
  { title: "Your services go live", body: "Once you're approved, customers can find and book you." },
];

const WHILE_YOU_WAIT = [
  { href: "/service-provider/portfolio", label: "Add photos of your work", icon: Images },
  { href: "/service-provider/services", label: "Polish your services and prices", icon: Wrench },
  { href: "/service-provider/availability", label: "Check your weekly availability", icon: CalendarDays },
];

const PRIMARY_LINK =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary-600 px-8 text-base font-semibold text-white transition-colors hover:bg-[#1258C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2";

/**
 * What a provider sees right after submitting. A new profile is created as pending
 * and stays hidden from customers until an admin approves it, so this says so —
 * rather than dropping them on a dashboard that looks as if they were already live.
 * It makes no promise about how long review takes.
 */
export function ApplicationReceived({
  state,
  name,
}: {
  state: ApplicationState;
  name?: string;
}) {
  if (state === "missing") {
    return (
      <Shell icon={<SearchX className="h-8 w-8" aria-hidden />} tone="neutral">
        <h1 className="text-2xl font-bold text-kampmax-text">We couldn&apos;t find your application</h1>
        <p className="mt-2 text-kampmax-text-secondary">
          It looks like you haven&apos;t submitted one yet. You can start, or pick up where you left
          off.
        </p>
        <div className="mt-8">
          <Link href="/onboarding/service-provider/1" className={PRIMARY_LINK}>
            Go to your application
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "approved") {
    return (
      <Shell icon={<PartyPopper className="h-8 w-8" aria-hidden />} tone="success">
        <h1 className="text-2xl font-bold text-kampmax-text">You&apos;re approved</h1>
        <p className="mt-2 text-kampmax-text-secondary">
          Your services are now visible to customers, and you can take bookings.
        </p>
        <div className="mt-8">
          <Link href="/service-provider" className={PRIMARY_LINK}>
            Go to your dashboard
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<CheckCircle2 className="h-8 w-8" aria-hidden />} tone="success">
      <h1 className="text-2xl font-bold text-kampmax-text">Application received</h1>
      <p className="mt-2 text-kampmax-text-secondary">
        {name ? `Thanks, ${name}. ` : "Thanks. "}
        Our team reviews new providers. Your services appear to customers once you&apos;re
        approved, and you&apos;ll be notified.
      </p>

      <section className="mt-8 text-left" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-sm font-bold uppercase tracking-wide text-kampmax-text-secondary">
          What happens next
        </h2>
        <ol className="mt-3 space-y-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-kampmax-text">{step.title}</p>
                <p className="text-sm text-kampmax-text-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 text-left" aria-labelledby="wait-heading">
        <h2 id="wait-heading" className="text-sm font-bold uppercase tracking-wide text-kampmax-text-secondary">
          While you wait
        </h2>
        <ul className="mt-3 space-y-2">
          {WHILE_YOU_WAIT.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-lg border border-kampmax-border bg-white px-4 py-3 text-sm font-medium text-kampmax-text transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <Icon className="h-5 w-5 text-primary-600" aria-hidden />
                <span className="flex-1">{label}</span>
                <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <Link href="/service-provider" className={PRIMARY_LINK}>
          Go to your dashboard
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </Shell>
  );
}

function Shell({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "success" | "neutral";
  children: React.ReactNode;
}) {
  const toneClass = tone === "success" ? "bg-success-50 text-success-600" : "bg-neutral-100 text-neutral-500";
  return (
    <div className="min-h-screen bg-kampmax-bg px-6 py-12 lg:py-20">
      <div className="mx-auto max-w-xl rounded-2xl border border-kampmax-border bg-white p-8 text-center">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}
