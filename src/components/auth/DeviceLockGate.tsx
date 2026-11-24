"use client";

import { Fingerprint } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";
import { lockNow, prove, shouldRelock, turnOff, unlockNow, useDeviceLock } from "@/lib/device-lock";

/** Covers the app until the person proves it is them, when they have turned the device lock on. */
export function DeviceLockGate() {
  const { status, logout } = useAuth();
  const { enabled, locked } = useDeviceLock();
  const asking = useRef(false);
  const leftAt = useRef<number | null>(null);

  const active = enabled && status === "authenticated";
  const showing = active && locked;

  // A signed-out browser keeps no lock, the same as the mobile app.
  useEffect(() => {
    if (status === "unauthenticated") turnOff();
  }, [status]);

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    const ok = await prove();
    asking.current = false;
    if (ok) unlockNow();
  }, []);

  // Lock again after the page has been out of sight for a while.
  useEffect(() => {
    if (!active) return;
    const onChange = () => {
      if (document.visibilityState === "hidden") leftAt.current = Date.now();
      else {
        if (shouldRelock(leftAt.current, Date.now())) lockNow();
        leftAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [active]);

  // Ask straight away whenever the lock appears.
  useEffect(() => {
    if (showing) void unlock();
  }, [showing, unlock]);

  if (!showing) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Kampmax is locked" className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
      <Logo />
      <h2 className="mt-2 text-xl font-extrabold text-kampmax-text">Kampmax is locked</h2>
      <p className="text-sm text-kampmax-text-secondary">Use this device&apos;s fingerprint, face or screen lock to continue.</p>
      <button onClick={() => void unlock()} className="mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-kampmax-blue px-7 text-sm font-bold text-white hover:opacity-90">
        <Fingerprint className="h-5 w-5" />
        Unlock
      </button>
      <button
        onClick={() => {
          turnOff();
          void logout();
        }}
        className="text-sm font-semibold text-kampmax-blue"
      >
        Log out instead
      </button>
    </div>
  );
}
