import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { KAMPMAX_ROLE_PATHS } from "@/components/layout/footer/role-paths";

/** Minimal public footer for the service marketplace pages. */
export function ServiceMarketplaceFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-10">
      <div className="max-w-[1280px] mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <Logo size="sm" href="/home" />
        </div>
        <p className="text-xs text-neutral-500 text-center">
          Find trusted services from verified providers around campus.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/services"
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Browse services
          </Link>
          <Link
            href="/support"
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Support
          </Link>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-4 pb-5">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-kampmax-border pt-4">
          <span className="text-xs font-semibold text-kampmax-navy mr-1">
            Join Kampmax:
          </span>
          {(["customer", "vendor", "freelancer", "service_provider", "employer"] as const).map(
            (id, index) => {
              const path = KAMPMAX_ROLE_PATHS[id];
              return (
                <span key={id} className="inline-flex items-center">
                  {index > 0 && (
                    <span className="text-kampmax-text-muted px-1.5" aria-hidden>
                      ·
                    </span>
                  )}
                  <Link
                    href={path.guestHref}
                    className="text-xs text-kampmax-text-secondary hover:text-kampmax-blue transition-colors"
                  >
                    {path.title}
                  </Link>
                </span>
              );
            }
          )}
        </div>
      </div>
    </footer>
  );
}