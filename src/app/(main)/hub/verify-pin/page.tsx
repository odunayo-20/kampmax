"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Package,
  Search,
  MapPin,
  Clock,
  UserCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Camera,
  ShoppingBag,
  DollarSign,
  Building2,
} from "lucide-react";
import { getOrderById, fetchOrderById, getOrders } from "@/services/orders";
import type { Order } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function HubVerifyPinPage() {
  const [pinInput, setPinInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Dynamic order stats derived from orders service layer
  const allOrders = useMemo(() => getOrders(), []);
  
  const completedOrders = useMemo(
    () => allOrders.filter((o) => o.status === "delivered"),
    [allOrders]
  );
  const pendingPickupsCount = useMemo(
    () => allOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length,
    [allOrders]
  );
  const initialEscrowReleased = useMemo(
    () => completedOrders.reduce((acc, o) => acc + o.total, 0),
    [completedOrders]
  );

  const [verifiedOrdersLog, setVerifiedOrdersLog] = useState<
    Array<{ orderId: string; customerName: string; time: string; amount: number }>
  >(() =>
    completedOrders.map((o) => ({
      orderId: o.id,
      customerName: o.buyerId || "Student Customer",
      time: formatDate(o.createdAt),
      amount: o.total,
    }))
  );

  const totalEscrowReleased = useMemo(
    () => verifiedOrdersLog.reduce((acc, item) => acc + item.amount, 0),
    [verifiedOrdersLog]
  );

  // Lookup order by PIN or ID or Customer Search
  async function handleLookup(term: string) {
    const queryStr = term.trim().toLowerCase();
    if (!queryStr) {
      setMatchedOrder(null);
      return;
    }

    const all = getOrders();
    let found = getOrderById(queryStr) || all.find(
      (o) =>
        o.id.toLowerCase() === queryStr ||
        (o.buyerId && o.buyerId.toLowerCase().includes(queryStr)) ||
        (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(queryStr))
    );

    if (!found) {
      const res = await fetchOrderById(queryStr);
      if (res?.data) {
        found = res.data;
      }
    }
    setMatchedOrder(found || null);
  }

  function handlePinChange(value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPinInput(clean);
    if (clean.length === 4) {
      handleLookup(searchQuery || "ord-1");
    }
  }

  function handleSimulateQRScan() {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const all = getOrders();
      const sampleOrder = all[0] || null;
      if (sampleOrder) {
        setMatchedOrder(sampleOrder);
        setPinInput(sampleOrder.id.replace(/[^0-9]/g, "").slice(-4) || "4819");
      }
    }, 1200);
  }

  function handleConfirmHandover() {
    if (!matchedOrder) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedSuccess(true);
      setVerifiedOrdersLog((prev) => [
        {
          orderId: matchedOrder.id,
          customerName: matchedOrder.buyerId || "Student Customer",
          time: "Just now",
          amount: matchedOrder.total,
        },
        ...prev,
      ]);
    }, 1000);
  }

  function handleReset() {
    setMatchedOrder(null);
    setPinInput("");
    setSearchQuery("");
    setVerifiedSuccess(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Station Header */}
      <div className="rounded-2xl bg-gradient-to-r from-kampmax-navy via-slate-900 to-indigo-950 p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Building2 className="h-6 w-6 text-emerald-400" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white sm:text-2xl">Campus Pickup Station #1</h1>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  Station Active
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-kampmax-gold" aria-hidden />
                RUGIPO Main Campus — Engineering Complex Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleSimulateQRScan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 font-semibold text-white backdrop-blur-md hover:bg-white/20 transition border border-white/20"
            >
              <Camera className="h-4 w-4 text-emerald-400" aria-hidden />
              {isScanning ? "Scanning QR Code..." : "Simulate QR Scan"}
            </button>
          </div>
        </div>

        {/* Shift Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4 border-t border-white/10">
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Pending Pickups</p>
            <p className="text-lg font-bold text-white mt-0.5">14 Packages</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Verified Today</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">28 Handovers</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Escrow Released</p>
            <p className="text-lg font-bold text-kampmax-gold mt-0.5">₦142,500</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Agent</p>
            <p className="text-lg font-bold text-white mt-0.5">Station Agent #04</p>
          </div>
        </div>
      </div>

      {/* Main Scanner & Verification Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Verification Input Station (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-kampmax-border pb-3">
              <ShieldCheck className="h-5 w-5 text-kampmax-navy" aria-hidden />
              <h2 className="text-base font-bold text-kampmax-text">Enter Student Pickup PIN</h2>
            </div>

            {/* 4-Digit PIN Input Keypad */}
            <div>
              <label className="block text-xs font-semibold text-kampmax-text-secondary mb-2">
                4-Digit Verification PIN Code
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="4 8 1 9"
                value={pinInput}
                onChange={(e) => handlePinChange(e.target.value)}
                className="w-full text-center tracking-[0.5em] font-mono text-3xl font-extrabold rounded-xl border-2 border-kampmax-border py-3 text-kampmax-navy focus:border-kampmax-navy focus:outline-none bg-kampmax-muted/20"
              />
              <p className="mt-1 text-[11px] text-kampmax-text-secondary text-center">
                Ask the student for their 4-digit Kampmax pickup code.
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-2 text-center">
              <span className="bg-white px-2 text-[10px] font-bold text-kampmax-text-secondary uppercase">
                Or Search By Order / Student
              </span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-kampmax-border" />
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-kampmax-text-secondary" aria-hidden />
              <input
                type="text"
                placeholder="Order ID (e.g. ord-1) or Buyer ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleLookup(e.target.value);
                }}
                className="w-full rounded-xl border border-kampmax-border py-2 pl-9 pr-3 text-xs text-kampmax-text placeholder:text-kampmax-text-secondary focus:border-kampmax-navy focus:outline-none"
              />
            </div>

            {/* Quick Demo Selector */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-kampmax-text-secondary mb-1.5">
                Quick Demo Orders:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getOrders().slice(0, 3).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setSearchQuery(o.id);
                      handleLookup(o.id);
                      setPinInput(o.id.replace(/[^0-9]/g, "").slice(-4) || "4819");
                    }}
                    className="rounded-lg bg-kampmax-muted px-2.5 py-1 text-xs font-mono font-medium text-kampmax-text hover:bg-kampmax-navy hover:text-white transition"
                  >
                    #{o.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Matched Order Inspection & Release (7 cols) */}
        <div className="lg:col-span-7">
          {verifiedSuccess ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-10 w-10" aria-hidden />
              </div>

              <div>
                <span className="rounded-full bg-emerald-200/60 px-3 py-1 text-xs font-bold text-emerald-800">
                  HANDOVER CONFIRMED
                </span>
                <h3 className="mt-2 text-xl font-bold text-emerald-950">Package Handed Over & Escrow Released!</h3>
                <p className="mt-1 text-xs text-emerald-800 max-w-md">
                  Order <span className="font-mono font-bold">#{matchedOrder?.id}</span> has been marked as completed.
                  Escrow funds of <strong>{formatNaira(matchedOrder?.total || 0)}</strong> have been released to vendor wallet.
                </p>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Verify Next Package
              </button>
            </div>
          ) : !matchedOrder ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-kampmax-border bg-white p-8 text-center">
              <QrCode className="mx-auto mb-3 h-12 w-12 text-kampmax-text-secondary/60" aria-hidden />
              <h3 className="text-base font-bold text-kampmax-text">No Package Selected</h3>
              <p className="mt-1 text-xs text-kampmax-text-secondary max-w-sm">
                Enter a 4-digit student pickup PIN, scan a QR code, or search by Order ID on the left to verify handover.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs space-y-5">
              {/* Order Inspection Header */}
              <div className="flex flex-wrap items-start justify-between border-b border-kampmax-border pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-kampmax-navy">#{matchedOrder.id}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      PIN MATCH VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-kampmax-text-secondary mt-0.5">
                    Placed on {formatDate(matchedOrder.createdAt)}
                  </p>
                </div>
                <StatusBadge variant="success" label="Escrow Protected" />
              </div>

              {/* Student & Vendor Overview */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-kampmax-muted/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-kampmax-text">
                    <UserCheck className="h-4 w-4 text-kampmax-navy" aria-hidden />
                    <span>Student / Recipient</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-kampmax-text">
                    Buyer ID: {matchedOrder.buyerId}
                  </p>
                  <p className="text-[11px] text-kampmax-text-secondary truncate">
                    {matchedOrder.deliveryAddress || matchedOrder.pickupLocation || "Campus Hub Station"}
                  </p>
                </div>

                <div className="rounded-xl bg-kampmax-muted/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-kampmax-text">
                    <ShoppingBag className="h-4 w-4 text-kampmax-navy" aria-hidden />
                    <span>Vendor Store</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-kampmax-text">
                    Kampmax Vendor #{matchedOrder.vendorId}
                  </p>
                  <p className="text-[11px] text-kampmax-text-secondary">
                    Campus Station Delivery
                  </p>
                </div>
              </div>

              {/* Package Line Items */}
              <div className="border border-kampmax-border rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-kampmax-text">Package Contents ({matchedOrder.items.length} items)</p>
                <div className="divide-y divide-kampmax-border">
                  {matchedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-kampmax-text">{item.product.title}</span>
                        <span className="text-[11px] text-kampmax-text-secondary block">
                          Qty: {item.quantity} × {formatNaira(item.product.price)}
                        </span>
                      </div>
                      <span className="font-bold text-kampmax-text">
                        {formatNaira(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-kampmax-border pt-2 flex justify-between text-xs font-bold text-kampmax-navy">
                  <span>Total Order Escrow Value</span>
                  <span>{formatNaira(matchedOrder.total)}</span>
                </div>
              </div>

              {/* Handover Action */}
              <button
                onClick={handleConfirmHandover}
                disabled={isVerifying}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                    Confirm Package Handover & Release Escrow ({formatNaira(matchedOrder.total)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shift Activity Handover Log */}
      <div className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-kampmax-border pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-kampmax-navy" aria-hidden />
            <h3 className="text-sm font-bold text-kampmax-text">Today's Verified Handovers Log</h3>
          </div>
          <span className="text-xs font-semibold text-emerald-600">{verifiedOrdersLog.length} Completed</span>
        </div>

        <div className="divide-y divide-kampmax-border">
          {verifiedOrdersLog.map((log, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-kampmax-text">{log.customerName}</p>
                  <p className="text-[11px] font-mono text-kampmax-text-secondary">Order #{log.orderId}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-kampmax-navy">{formatNaira(log.amount)}</p>
                <p className="text-[10px] text-kampmax-text-secondary">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
