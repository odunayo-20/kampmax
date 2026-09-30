"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Ticket,
  QrCode,
  ShieldCheck,
  CreditCard,
  Sparkles,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getEventById, events } from "@/data/events";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const event = getEventById(id) || events[0];

  const defaultTiers = event.ticketTiers || [
    { id: "tier-reg", name: "Regular", price: event.ticketPrice || 2000 },
    { id: "tier-vip", name: "VIP", price: 5000 },
    { id: "tier-grp", name: "Group (5+)", price: 8000 },
  ];

  const [selectedTierId, setSelectedTierId] = useState<string>(defaultTiers[0].id);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [ticketCode, setTicketCode] = useState<string>("");

  const selectedTier = defaultTiers.find((t) => t.id === selectedTierId) || defaultTiers[0];
  const totalPrice = selectedTier.price * ticketQuantity;

  const handleBookTicket = () => {
    const generatedCode = `KMP-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketCode(generatedCode);
    setBookingSuccess(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Top Banner Hero Image */}
      <div className="relative w-full h-[260px] sm:h-[320px] bg-neutral-900">
        <img
          src={
            event.imageUrl ||
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80"
          }
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating Top Navigation */}
        <div className="absolute top-4 left-4 right-4 max-w-4xl mx-auto flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: event.title, url: window.location.href });
              }
            }}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Share event"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <PageContainer className="relative -mt-6 z-10 space-y-5">
        {/* Title Card */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-sm space-y-3">
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            {event.title}
          </h1>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(event.tags || ["Music", "Food", "Networking", "Fun"]).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-neutral-100 space-y-2 text-xs sm:text-sm text-neutral-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-semibold text-neutral-900">
                {event.timeDisplay || "Sat, 27 Sep 2025 • 4:00 PM – 11:00 PM"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
              <span>
                {event.location} • <strong className="text-neutral-900">{event.distance || "1.2 km"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-400 shrink-0" />
              <span>
                {event.attendees.length} campus students attending
              </span>
            </div>
          </div>
        </div>

        {/* About this event */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-sm space-y-2">
          <h2 className="text-base font-bold text-neutral-900">About this event</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Ticket Prices Tier Selector */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">Ticket Prices</h2>
            <span className="text-xs text-neutral-500">Select pass tier</span>
          </div>

          <div className="space-y-2.5">
            {defaultTiers.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary-600 bg-primary-50/50 shadow-xs ring-1 ring-primary-600"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900">{tier.name}</span>
                      {tier.badge && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950">
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-neutral-500">{tier.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-neutral-900">
                      {tier.price > 0 ? `₦${tier.price.toLocaleString()}` : "Free"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageContainer>

      {/* Fixed Bottom Action CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 z-40 shadow-lg safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">Total Price</p>
            <p className="text-lg font-black text-neutral-900">
              {totalPrice > 0 ? `₦${totalPrice.toLocaleString()}` : "Free"}
            </p>
          </div>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="flex-1 max-w-xs h-12 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Ticket className="h-4 w-4" />
            <span>Get Ticket</span>
          </button>
        </div>
      </div>

      {/* Booking Modal Dialog */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-neutral-200 space-y-4">
            <button
              onClick={() => {
                setIsBookingModalOpen(false);
                setBookingSuccess(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            {!bookingSuccess ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900">Confirm Ticket Order</h3>
                  <p className="text-xs text-neutral-500">{event.title}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tier:</span>
                    <span className="font-bold text-neutral-900">{selectedTier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Venue:</span>
                    <span className="font-medium text-neutral-900">{event.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                        className="w-6 h-6 rounded bg-neutral-200 font-bold flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm">{ticketQuantity}</span>
                      <button
                        onClick={() => setTicketQuantity(ticketQuantity + 1)}
                        className="w-6 h-6 rounded bg-neutral-200 font-bold flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm">
                    <span className="font-bold text-neutral-900">Total Payable:</span>
                    <span className="font-extrabold text-primary-600">
                      {totalPrice > 0 ? `₦${totalPrice.toLocaleString()}` : "Free"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-700">Payment Option:</p>
                  <div className="p-3 rounded-xl border border-primary-500 bg-primary-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary-600" />
                      <div>
                        <p className="text-xs font-bold text-neutral-900">Kampmax Pay Wallet</p>
                        <p className="text-[10px] text-neutral-500">Instant 1-Click QR Admission</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">Active</span>
                  </div>
                </div>

                <button
                  onClick={handleBookTicket}
                  className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Pay & Get Ticket
                </button>
              </>
            ) : (
              /* Success / QR Ticket Card */
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Ticket Confirmed!</h3>
                  <p className="text-xs text-neutral-500">
                    Your digital entry pass is active. Present this at the venue gate.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-800 text-white space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-neutral-700 pb-2">
                    <span className="text-xs font-bold text-amber-400">{event.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary-600 text-white font-bold">
                      {selectedTier.name}
                    </span>
                  </div>

                  {/* QR Mock code */}
                  <div className="w-32 h-32 bg-white rounded-xl mx-auto p-2 flex items-center justify-center text-neutral-900">
                    <QrCode className="w-full h-full" />
                  </div>

                  <div>
                    <p className="text-xs font-mono font-bold tracking-wider text-amber-300">
                      {ticketCode}
                    </p>
                    <p className="text-[10px] text-neutral-400">Holder: {user?.name || "Daniel"}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="w-full h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
