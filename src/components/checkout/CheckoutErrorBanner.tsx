import { ShieldAlert } from "lucide-react";

export function CheckoutErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-3.5 rounded-lg border bg-kampmax-error/10 border-kampmax-error/30 text-kampmax-error"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 text-sm font-medium">{message}</p>
    </div>
  );
}
