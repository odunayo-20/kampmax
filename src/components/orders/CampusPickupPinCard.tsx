"use client";

import { useState } from "react";
import { QrCode, Copy, Check, ShieldCheck, X, Info } from "lucide-react";
import { Order } from "@/types";

interface CampusPickupPinCardProps {
  order: Order;
}

export function CampusPickupPinCard({ order }: CampusPickupPinCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Generate a 4-digit PIN based on order ID if not explicitly present
  const pinCode =
    order.id.replace(/[^0-9]/g, "").slice(-4) ||
    String(Math.abs(order.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 9000 + 1000);

  function handleCopy() {
    navigator.clipboard.writeText(pinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
        <div>
          <span className="text-[11px] text-primary-200 font-medium">Your 4-Digit Pickup PIN</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-3xl font-extrabold tracking-wider text-white">
              {pinCode}
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
        </div>

        <button
          onClick={() => setQrOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary-900 hover:bg-primary-50 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <QrCode className="w-4 h-4 text-primary-700" /> Show Pickup QR Code
        </button>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-primary-200/90 leading-tight">
        <Info className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
        <span>
          Share this PIN or QR code with the vendor/runner <strong>only when you physically receive your item</strong> to release payment.
        </span>
      </div>

      {/* QR Code Modal */}
      {qrOpen && (
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
              className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">Campus Pickup QR Code</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Order #{order.id}</p>
            </div>

            {/* Simulated QR Code SVG */}
            <div className="p-4 bg-white rounded-xl border-2 border-dashed border-neutral-300 inline-block mx-auto shadow-inner">
              <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100">
                {/* Simulated QR Pattern */}
                <rect width="100" height="100" fill="white" />
                <rect x="10" y="10" width="25" height="25" fill="#1e1b4b" />
                <rect x="15" y="15" width="15" height="15" fill="white" />
                <rect x="18" y="18" width="9" height="9" fill="#1e1b4b" />

                <rect x="65" y="10" width="25" height="25" fill="#1e1b4b" />
                <rect x="70" y="15" width="15" height="15" fill="white" />
                <rect x="73" y="18" width="9" height="9" fill="#1e1b4b" />

                <rect x="10" y="65" width="25" height="25" fill="#1e1b4b" />
                <rect x="15" y="70" width="15" height="15" fill="white" />
                <rect x="18" y="73" width="9" height="9" fill="#1e1b4b" />

                {/* Random Data Elements */}
                <rect x="40" y="10" width="10" height="10" fill="#1e1b4b" />
                <rect x="50" y="20" width="10" height="10" fill="#1e1b4b" />
                <rect x="40" y="40" width="20" height="20" fill="#1e1b4b" />
                <rect x="65" y="45" width="15" height="15" fill="#1e1b4b" />
                <rect x="45" y="65" width="10" height="25" fill="#1e1b4b" />
                <rect x="65" y="65" width="25" height="10" fill="#1e1b4b" />
                <rect x="75" y="80" width="15" height="10" fill="#1e1b4b" />
              </svg>
            </div>

            <div>
              <p className="font-mono text-2xl font-extrabold text-primary-900 tracking-widest">
                {pinCode}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Present to vendor or runner at pickup point
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
