"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Navigation,
  Phone,
  Clock,
  Star,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { nearbyPlaces } from "@/data/nearby";
import { cn } from "@/lib/utils";

type NearbyFilter = "all" | "food" | "stores" | "services" | "events";

const FILTERS: { id: NearbyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "stores", label: "Stores" },
  { id: "services", label: "Services" },
  { id: "events", label: "Events" },
];

export default function NearbyPage() {
  const [selectedFilter, setSelectedFilter] = useState<NearbyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePlaceId, setActivePlaceId] = useState<string>("nb-1");
  const [activeDirections, setActiveDirections] = useState<string | null>(null);

  const filteredPlaces = nearbyPlaces.filter((p) => {
    const matchesCat = selectedFilter === "all" || p.category === selectedFilter;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activePlace = nearbyPlaces.find((p) => p.id === activePlaceId) || nearbyPlaces[0];

  return (
    <PageContainer className="space-y-4 pb-14">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Nearby</h1>
            <p className="text-xs text-neutral-500">
              Discover nearby vendors, services, places and events on the map
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nearby..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 shadow-xs"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                selectedFilter === f.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Campus Map Container matching Screen 9 */}
      <div className="relative w-full h-[220px] sm:h-[280px] rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100">
        {/* Stylized Campus Map SVG grid */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#F3F4F6" />
          <rect width="100%" height="100%" fill="url(#campus-grid)" />

          {/* Campus Roads & Paths */}
          <path d="M 0 100 Q 150 140 400 90 T 800 120" stroke="#D1D5DB" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M 220 0 Q 230 150 210 300" stroke="#D1D5DB" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M 450 40 L 470 280" stroke="#E5E7EB" strokeWidth="10" fill="none" />

          {/* Campus Greenery parks */}
          <circle cx="120" cy="180" r="45" fill="#D1FAE5" opacity="0.6" />
          <circle cx="340" cy="60" r="35" fill="#D1FAE5" opacity="0.6" />
          <circle cx="480" cy="210" r="50" fill="#D1FAE5" opacity="0.5" />
        </svg>

        {/* Pin markers */}
        {nearbyPlaces.map((place) => {
          const isSelected = activePlaceId === place.id;
          const pinColor =
            place.category === "food"
              ? "bg-amber-500"
              : place.category === "stores"
              ? "bg-blue-600"
              : place.category === "services"
              ? "bg-purple-600"
              : "bg-rose-600";

          return (
            <button
              key={place.id}
              onClick={() => setActivePlaceId(place.id)}
              style={{ left: `${place.coordinates.x}%`, top: `${place.coordinates.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none transition-transform duration-200 hover:scale-125 z-20"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white transition-all",
                    pinColor,
                    isSelected ? "ring-4 ring-primary-400 scale-110" : ""
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                {isSelected && (
                  <span className="mt-1 px-2 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-bold whitespace-nowrap shadow-md">
                    {place.name}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Current user location beacon */}
        <div
          style={{ left: "45%", top: "45%" }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
        >
          <div className="relative">
            <div className="w-4 h-4 rounded-full bg-primary-600 border-2 border-white shadow-md" />
            <div className="absolute -inset-2 rounded-full bg-primary-400/30 animate-ping" />
          </div>
        </div>

        {/* Map overlay controls */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
          <button
            onClick={() => setActivePlaceId("nb-1")}
            className="p-2 rounded-xl bg-white shadow-md text-neutral-700 hover:bg-neutral-50 border border-neutral-200"
            title="Recenter Map"
          >
            <Compass className="h-4 w-4 text-primary-600" />
          </button>
        </div>
      </div>

      {/* Place listings below map (matching Screen 9) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900">Nearby Spots & Places</h3>

        {filteredPlaces.map((place) => {
          const isSelected = activePlaceId === place.id;
          return (
            <div
              key={place.id}
              onClick={() => setActivePlaceId(place.id)}
              className={cn(
                "flex items-center justify-between p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs gap-3",
                isSelected
                  ? "border-primary-500 ring-1 ring-primary-500 bg-primary-50/20"
                  : "border-neutral-200/90 hover:border-neutral-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-neutral-900 line-clamp-1">{place.name}</h4>
                  <p className="text-xs text-neutral-500 capitalize">
                    {place.category === "food" ? "Food & Beverages" : place.category === "stores" ? "Fashion & Accessories" : "Electronics & Tech"}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{place.rating}</span>
                    </span>
                    <span>•</span>
                    <span className="text-neutral-400">{place.distance}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDirections(place.name);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-primary-600 text-primary-600 hover:bg-primary-50 active:scale-95 text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <Navigation className="h-3 w-3" />
                <span>Directions</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Directions Modal */}
      {activeDirections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 text-primary-600">
              <Navigation className="h-5 w-5" />
              <h3 className="text-base font-bold text-neutral-900">Campus Route</h3>
            </div>
            <p className="text-xs text-neutral-600">
              Navigating to <strong>{activeDirections}</strong> from your current campus location.
            </p>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1 text-xs">
              <p className="font-semibold text-neutral-800">1. Head North from Student Quad (120m)</p>
              <p className="font-semibold text-neutral-800">2. Turn right by Faculty of Engineering</p>
              <p className="font-semibold text-neutral-800">3. Destination is on your left</p>
            </div>
            <button
              onClick={() => setActiveDirections(null)}
              className="w-full h-10 rounded-xl bg-primary-600 text-white text-xs font-bold"
            >
              Close Navigation
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
