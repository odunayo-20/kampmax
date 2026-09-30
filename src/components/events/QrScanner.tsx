"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Loader2, ScanLine } from "lucide-react";

/** Minimum gap between decoded codes so a wobbling camera can't hammer the API. */
const RESCAN_COOLDOWN_MS = 2500;

interface QrScannerProps {
  /** Called with each decoded code (rate limited). */
  onScan: (code: string) => void;
  /** Pauses scanning, e.g. while a result is on screen. */
  paused?: boolean;
  busy?: boolean;
}

/** Camera viewfinder that decodes QR codes with jsQR. */
export function QrScanner({ onScan, paused = false, busy = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't use the camera here. Enter the ticket number instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
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
            !pausedRef.current &&
            video.readyState === video.HAVE_ENOUGH_DATA &&
            video.videoWidth > 0
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
              const now = Date.now();
              if (
                result?.data &&
                !(
                  result.data === lastRef.current.code &&
                  now - lastRef.current.at < RESCAN_COOLDOWN_MS
                )
              ) {
                lastRef.current = { code: result.data, at: now };
                onScanRef.current(result.data);
              }
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
            ? "Camera permission was blocked. Allow it in your browser, or enter the ticket number."
            : "Couldn't start the camera. Enter the ticket number instead."
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {cameraOn && (
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-emerald-400/90">
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying&hellip;
          </div>
        )}
      </div>
      {cameraError && (
        <p role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-xs text-error-700">
          {cameraError}
        </p>
      )}
    </div>
  );
}
