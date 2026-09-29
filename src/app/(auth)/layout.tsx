import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="mb-6">
          <Logo size="lg" href="/home" />
        </div>
        <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm">{children}</div>
      </div>
      <div className="px-6 pb-6 text-center">
        <p className="text-xs text-kampmax-text-secondary">
          Kampmax — Campus Marketplace, Services & Freelancing
        </p>
      </div>
    </div>
  );
}
