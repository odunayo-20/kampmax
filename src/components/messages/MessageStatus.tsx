import { Check } from "lucide-react";

/**
 * Tick under the sender's own messages. A message the server returned is sent. The server does not say who has read
 * a message in the list, so nothing here claims "read": that would be a guess.
 */
export function MessageStatus({ isMine }: { isMine: boolean }) {
  if (!isMine) return null;
  return <Check className="h-3 w-3 text-current opacity-50" aria-label="Sent" aria-hidden={false} />;
}
