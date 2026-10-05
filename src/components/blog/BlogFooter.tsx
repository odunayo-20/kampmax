import Link from "next/link";

export function BlogFooter() {
  const link = "hover:text-kampmax-blue";
  return (
    <footer className="mt-16 border-t border-kampmax-border bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-kampmax-text-secondary">
          <span className="font-semibold text-kampmax-navy">Kampmax</span> — people, opportunities and possibilities, on campus and beyond.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-kampmax-text-secondary">
          <Link href="/marketplace" className={link}>Marketplace</Link>
          <Link href="/jobs" className={link}>Jobs</Link>
          <Link href="/services" className={link}>Services</Link>
          <Link href="/support" className={link}>Help &amp; Support</Link>
        </nav>
      </div>
    </footer>
  );
}
