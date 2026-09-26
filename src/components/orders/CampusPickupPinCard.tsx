"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, ShieldCheck, X, Info, Loader2 } from "lucide-react";
import { Order } from "@/types";
import { getPickupCodeApi, type PickupCode } from "@/services/orders";

interface CampusPickupPinCardProps {
  order: Order;
}

/** Statuses in which a paid order can be handed over. */
const HANDOVER_READY = ["confirmed", "preparing", "ready", "out_for_delivery"];

export function CampusPickupPinCard({ order }: CampusPickupPinCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [code, setCode] = useState<PickupCode | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = HANDOVER_READY.includes(order.status);

  // The code is issued by the backend (random, per order); it is only
  // available once the order is paid and before it has been handed over.
  useEffect(() => {
    if (!ready) {
      setCode(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPickupCodeApi(order.id).then(({ data, error: apiError }) => {
      if (cancelled) return;
      setLoading(false);
      if (data) setCode(data);
      else setError(apiError?.message || "Couldn't load your pickup code.");
    });
    return () => {
      cancelled = true;
    };
  }, [order.id, ready]);

  useEffect(() => {
    if (!code) {
      setQrImage(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(code.qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't draw your QR code.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const delivered = order.status === "delivered";

  return (
    <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white rounded-2xl p-5 shadow-lg border border-primary-700/50 relative overflow-hidden space-y-3">
      {/* Background Subtle Pattern */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/5 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-primary-100">
            Campus Pickup Verification
          </h3>
        </div>
        <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          Escrow Protected
        </span>
      </div>

      {delivered ? (
        <div className="bg-white/10 p-4 rounded-xl border border-white/10 text-sm text-primary-100">
          This order has been handed over. Thanks for shopping on Kampmax.
        </div>
      ) : !ready ? (
        <div className="bg-white/10 p-4 rounded-xl border border-white/10 text-sm text-primary-100">
          Your pickup QR code and PIN appear here once your payment is confirmed.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <div>
            <span className="text-[11px] text-primary-200 font-medium">Your 6-Digit Pickup PIN</span>
            {loading ? (
              <div className="flex items-center gap-2 mt-2 text-sm text-primary-100">
                <Loader2 className="w-4 h-4 animate-spin" /> Getting your code…
              </div>
            ) : code ? (
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-3xl font-extrabold tracking-wider text-white">
                  {code.pin}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-primary-100 flex items-center gap-1 text-xs font-semibold"
                  title="Copy PIN"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-red-200">{error ?? "Pickup code unavailable."}</p>
            )}
          </div>

          <button
            onClick={() => setQrOpen(true)}
            disabled={!code}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary-900 hover:bg-primary-50 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QrCode className="w-4 h-4 text-primary-700" /> Show Pickup QR Code
          </button>
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[11px] text-primary-200/90 leading-tight">
        <Info className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
        <span>
          Show this QR code or PIN to the vendor/runner <strong>only when you physically receive your item</strong> to release payment.
        </span>
      </div>

      {/* QR Code Modal */}
      {qrOpen && code && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative bg-white text-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">Campus Pickup QR Code</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Order #{code.orderNumber}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200 inline-block mx-auto shadow-inner">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImage}
                  alt={`Pickup QR code for order ${code.orderNumber}`}
                  className="w-56 h-56 mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div>
              <p className="font-mono text-2xl font-extrabold text-primary-900 tracking-widest">
                {code.pin}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Present to the vendor or runner at the pickup point. Don&apos;t share this with anyone else.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
