"use client";

import { useState } from "react";
import { X, CheckCircle, Star, ShieldCheck } from "lucide-react";
import { Order } from "@/types";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";

interface ConfirmEscrowReleaseModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onConfirmRelease: (rating: number) => void;
}

export function ConfirmEscrowReleaseModal({
  order,
  isOpen,
  onClose,
  onConfirmRelease,
}: ConfirmEscrowReleaseModalProps) {
  const [rating, setRating] = useState(5);
  const [confirmed, setConfirmed] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);

  if (!isOpen) return null;

  function handleConfirm() {
    if (!confirmed) return;
    setReleasing(true);
    setTimeout(() => {
      onConfirmRelease(rating);
      setReleasing(false);
      setReleased(true);
    }, 600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-neutral-900">Confirm Receipt & Release Funds</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {released ? (
          /* Released Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Escrow Funds Released!</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Thank you for confirming receipt of Order <strong className="text-neutral-900">#{order.id}</strong>. <strong className="text-emerald-700">{formatNaira(order.total)}</strong> has been credited to the seller.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Confirmation Form */
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Order Summary
              </span>
              <p className="font-bold text-neutral-900 text-sm">Order #{order.id}</p>
              <p className="text-neutral-600">
                Total Amount: <strong className="text-neutral-900">{formatNaira(order.total)}</strong>
              </p>
            </div>

            {/* Seller Rating */}
            <div className="text-center py-1">
              <span className="font-bold text-neutral-800 block mb-1.5">Rate Your Experience</span>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border border-neutral-200 bg-neutral-50">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-neutral-700 leading-tight">
                I confirm that I have received and inspected my ordered items and authorize Kampmax to release escrow payment to the seller.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50"
              >
                Not Yet
              </button>
              <Button
                onClick={handleConfirm}
                disabled={!confirmed || releasing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
              >
                {releasing ? "Releasing Escrow..." : "Confirm & Release Funds"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
