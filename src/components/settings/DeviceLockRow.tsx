"use client";

import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { SettingsRow } from "@/components/profile/SettingsGroup";
import { Switch } from "@/components/ui/Switch";
import { checkDeviceLock, turnOff, turnOn, useDeviceLock } from "@/lib/device-lock";

/** The switch for asking for the device's fingerprint, face or screen lock each time Kampmax opens. */
export function DeviceLockRow() {
  const { enabled } = useDeviceLock();
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function toggle(on: boolean) {
    setProblem(null);
    if (!on) return turnOff();
    setChecking(true);
    const support = await checkDeviceLock();
    if (!support.available) setProblem(support.reason);
    else if (!(await turnOn())) setProblem("That did not work, so the lock stays off.");
    setChecking(false);
  }

  return (
    <>
      <SettingsRow
        icon={<Fingerprint className="h-5 w-5" />}
        label="Fingerprint, face or screen lock"
        description="Ask for it each time you open Kampmax"
        action={<Switch aria-label="Fingerprint, face or screen lock" checked={enabled} disabled={checking} onChange={(e) => void toggle(e.target.checked)} />}
      />
      {problem && (
        <p role="alert" className="px-4 pb-3 text-xs text-kampmax-error">
          {problem}
        </p>
      )}
    </>
  );
}
