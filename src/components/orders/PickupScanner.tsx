"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CheckCircle,
  Keyboard,
  Loader2,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  completePickupApi,
  lookupPickupApi,
  type PickupPreview,
  type PickupScanInput,
} from "@/services/orders";
import { formatNaira } from "@/lib/utils";

type Mode = "scan" | "pin";
type Step = "input" | "preview" | "done";

/** Minimum gap between attempts so a wobbling camera can't hammer the API. */
const RESCAN_COOLDOWN_MS = 2000;

export function PickupScanner() {
  const [mode, setMode] = useState<Mode>("scan");
  const [step, setStep] = useState<Step>("input");
  const [preview, setPreview] = useState<PickupPreview | null>(null);
  const [pending, setPending] = useState<PickupScanInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [pin, setPin] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lockRef = useRef(false);

  const lookup = useCallback(async (input: PickupScanInput) => {
    lockRef.current = true;
    setBusy(true);
    setError(null);
    const { data, error: apiError } = await lookupPickupApi(input);
    setBusy(false);
    if (!data) {
      setError(apiError?.message || "Couldn't verify that code.");
      window.setTimeout(() => {
        lockRef.current = false;
      }, RESCAN_COOLDOWN_MS);
      return;
    }
    setPreview(data);
    setPending(input);
    setStep("preview");
  }, []);

  // Keep the latest lookup reachable from the long-lived camera loop.
  const lookupRef = useRef(lookup);
  useEffect(() => {
    lookupRef.current = lookup;
  }, [lookup]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Camera runs only while waiting for a scan.
  useEffect(() => {
    if (mode !== "scan" || step !== "input") return;
    let cancelled = false;
    lockRef.current = false;
    setCameraError(null);

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't use the camera here. Use the PIN tab instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraOn(true);

        const tick = () => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (
            canvas &&
            video.readyState === video.HAVE_ENOUGH_DATA &&
            video.videoWidth > 0 &&
            !lockRef.current
          ) {
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.floor(video.videoWidth * scale);
            canvas.height = Math.floor(video.videoHeight * scale);
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(frame.data, frame.width, frame.height, {
                inversionAttempts: "dontInvert",
              });
              if (result?.data) void lookupRef.current({ code: result.data });
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        setCameraError(
          denied
            ? "Camera permission was blocked. Allow it in your browser, or use the PIN tab."
            : "Couldn't start the camera. Use the PIN tab instead."
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, step, stopCamera]);

  function reset() {
    setStep("input");
    setPreview(null);
    setPending(null);
    setError(null);
    setOrderNumber("");
    setPin("");
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const { data, error: apiError } = await completePickupApi(pending);
    setBusy(false);
    if (!data) {
      setError(apiError?.message || "Couldn't complete the handover.");
      return;
    }
    setPreview(data);
    setStep("done");
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    void lookup({ orderNumber: orderNumber.trim(), pin });
  }

  const pinReady = orderNumber.trim().length >= 6 && /^\d{6}$/.test(pin);

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      {step === "input" && (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-kampmax-muted p-1">
            {(
              [
                { id: "scan", label: "Scan QR", icon: Camera },
                { id: "pin", label: "Enter PIN", icon: Keyboard },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === id
                    ? "bg-white text-kampmax-navy shadow-sm"
                    : "text-kampmax-text-secondary"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {mode === "scan" ? (
            <div className="space-y-3">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {cameraOn && (
                  <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/80">
                    <ScanLine className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/70" />
                  </div>
                )}
                {!cameraOn && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…
                  </div>
                )}
              </div>
              {cameraError ? (
                <p role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-xs text-error-700">
                  {cameraError}
                </p>
              ) : (
                <p className="text-center text-xs text-kampmax-text-secondary">
                  Point the camera at the customer&apos;s pickup QR code.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submitPin} className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
              <label className="block text-xs font-semibold text-kampmax-text">
                Order number
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="ORD-20260926-8VFAG"
                  autoCapitalize="characters"
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 font-mono text-sm outline-none focus:border-kampmax-blue"
                />
              </label>
              <label className="block text-xs font-semibold text-kampmax-text">
                6-digit PIN
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="••••••"
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 font-mono text-lg tracking-[0.4em] outline-none focus:border-kampmax-blue"
                />
              </label>
              <button
                type="submit"
                disabled={!pinReady || busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-kampmax-navy py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-xs text-error-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4 rounded-2xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-bold">Code verified</span>
          </div>

          <div>
            <p className="font-mono text-base font-bold text-kampmax-text">#{preview.orderNumber}</p>
            <p className="text-xs text-kampmax-text-secondary">
              Customer <strong className="text-kampmax-text">{preview.customerName}</strong> · {preview.vendorName}
            </p>
          </div>

          <ul className="divide-y divide-kampmax-border rounded-xl border border-kampmax-border">
            {preview.items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span className="text-kampmax-text">
                  {item.name}
                  {item.variation && (
                    <span className="block text-xs text-kampmax-text-secondary">{item.variation}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-kampmax-text">×{item.quantity}</span>
              </li>
            ))}
          </ul>

          <p className="text-right text-sm text-kampmax-text-secondary">
            Total <strong className="text-kampmax-text">{formatNaira(preview.total)}</strong>
          </p>

          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Only confirm after you have handed over every item. Confirming marks the order delivered and pays the vendor.
          </p>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-xs text-error-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="flex-1 rounded-xl border border-kampmax-border py-2.5 text-sm font-semibold text-kampmax-text hover:bg-kampmax-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Confirm handover
            </button>
          </div>
        </div>
      )}

      {step === "done" && preview && (
        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Handover complete</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Order <strong>#{preview.orderNumber}</strong> is marked delivered and the vendor has been paid.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl bg-kampmax-navy py-2.5 text-sm font-bold text-white"
          >
            Scan next order
          </button>
        </div>
      )}
    </div>
  );
}
