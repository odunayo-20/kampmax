/**
 * Optional device lock, the web twin of the mobile app's fingerprint lock. It asks this device to prove it is
 * the person (Windows Hello, Touch ID, the phone's screen lock) each time Kampmax opens. Like the mobile lock it
 * is a check on the device only: nothing is sent to the server, and it keeps out someone who picks up an
 * unlocked computer, not someone who controls the browser.
 *
 * `enabled` and the passkey's id are remembered in this browser; `locked` is not, so every fresh load starts
 * locked while the lock is on.
 */

import { useSyncExternalStore } from "react";

const KEY = "kampmax_app_lock";
/** Long enough that a file picker or a switch of tabs does not lock the app, short enough to matter. */
export const RELOCK_AFTER_MS = 30_000;

/** True once the page has been out of sight for longer than the grace period. */
export const shouldRelock = (leftAt: number | null, now: number): boolean => leftAt !== null && now - leftAt > RELOCK_AFTER_MS;

interface LockState {
  enabled: boolean;
  /** The passkey made on this device when the lock was turned on. */
  credentialId: string | null;
  locked: boolean;
}

const SERVER: LockState = { enabled: false, credentialId: null, locked: false };
let state: LockState | null = null;
const listeners = new Set<() => void>();

function read(): LockState {
  if (state) return state;
  let saved: Partial<LockState> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    // A damaged value just means the lock is off.
  }
  const enabled = !!saved.enabled && !!saved.credentialId;
  state = { enabled, credentialId: enabled ? (saved.credentialId ?? null) : null, locked: enabled };
  return state;
}

function write(next: Partial<LockState>) {
  state = { ...read(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: state.enabled, credentialId: state.credentialId }));
  } catch {
    // Private browsing may refuse; the lock still works until the page closes.
  }
  listeners.forEach((l) => l());
}

export function useDeviceLock(): LockState {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    read,
    () => SERVER,
  );
}

export const lockNow = () => read().enabled && write({ locked: true });
export const unlockNow = () => write({ locked: false });
export const turnOff = () => write({ enabled: false, credentialId: null, locked: false });

const toBase64Url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** Whether this browser can check the person with the device's own screen lock, and if not, why. */
export async function checkDeviceLock(): Promise<{ available: boolean; reason: string | null }> {
  const ok = typeof window !== "undefined" && !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
  return ok ? { available: true, reason: null } : { available: false, reason: "This device has no screen lock this browser can use. Set up Windows Hello, Touch ID or a screen lock first." };
}

/** Makes the passkey and turns the lock on. Proving it works first means nobody locks themselves out. Returns false if cancelled. */
export async function turnOn(): Promise<boolean> {
  try {
    const made = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "Kampmax" },
        user: { id: random(16), name: "kampmax-device-lock", displayName: "Kampmax" },
        challenge: random(32),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!made) return false;
    write({ enabled: true, credentialId: toBase64Url(made.rawId), locked: false });
    return true;
  } catch {
    return false;
  }
}

/** Shows the device's prompt. */
export async function prove(): Promise<boolean> {
  const id = read().credentialId;
  if (!id) return false;
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: "public-key", id: fromBase64Url(id), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!got;
  } catch {
    return false;
  }
}
