"use client";

import { useState, useMemo } from "react";
import {
  Home,
  Building2,
  MapPin,
  Search,
  Check,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  getHallsForCampus,
  ResidenceHall,
} from "@/data/residence-halls";

interface ResidenceHallSelectorProps {
  campusId?: string | null;
  campusName?: string;
  value: string;
  onChange: (value: string, isCustom?: boolean) => void;
  error?: string;
  className?: string;
}

export function ResidenceHallSelector({
  campusId,
  campusName = "Campus",
  value,
  onChange,
  error,
  className,
}: ResidenceHallSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "on_campus" | "off_campus">("all");
  const [customText, setCustomText] = useState("");
  const [isEnteringCustom, setIsEnteringCustom] = useState(false);

  const availableHalls = useMemo(() => {
    return getHallsForCampus(campusId);
  }, [campusId]);

  const selectedHallObj = useMemo(() => {
    if (!value) return null;
    return availableHalls.find(
      (h) => h.name.toLowerCase() === value.toLowerCase() || h.id === value
    );
  }, [value, availableHalls]);

  const isCustomResidence = Boolean(value && !selectedHallObj);

  const filteredHalls = useMemo(() => {
    return availableHalls.filter((hall) => {
      const matchesSearch =
        hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hall.description &&
          hall.description.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (filterTab === "all") return true;
      return hall.type === filterTab;
    });
  }, [availableHalls, searchQuery, filterTab]);

  function handleSelect(hall: ResidenceHall) {
    onChange(hall.name, false);
    setIsEnteringCustom(false);
    setModalOpen(false);
  }

  function handleApplyCustom() {
    if (customText.trim()) {
      onChange(customText.trim(), true);
      setModalOpen(false);
    }
  }

  function handleClear() {
    onChange("", false);
    setIsEnteringCustom(false);
    setCustomText("");
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-kampmax-text flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-kampmax-blue" />
          Hall of Residence / Delivery Hub
          <span className="text-xs font-normal text-kampmax-text-secondary">
            (Optional)
          </span>
        </label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-kampmax-text-secondary hover:text-kampmax-error transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!campusId ? (
        <div className="p-3 rounded-lg border border-dashed border-kampmax-border bg-neutral-50 text-xs text-kampmax-text-secondary flex items-center gap-2">
          <Info className="h-4 w-4 text-neutral-400 shrink-0" />
          <span>Select your campus first to view your school&apos;s halls and residence zones.</span>
        </div>
      ) : !value ? (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setIsEnteringCustom(false);
            setModalOpen(true);
          }}
          className={cn(
            "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all",
            "bg-white border-kampmax-border hover:border-kampmax-blue/50 text-kampmax-text-secondary hover:text-kampmax-text group",
            error && "border-kampmax-error ring-1 ring-kampmax-error"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-neutral-100 group-hover:bg-kampmax-blue/10 text-neutral-500 group-hover:text-kampmax-blue flex items-center justify-center transition-colors">
              <Home className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm truncate">
              Select hostel, hall, or off-campus area...
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-neutral-400 group-hover:text-kampmax-blue transition-colors shrink-0" />
        </button>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg border border-kampmax-blue/30 bg-kampmax-blue/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-kampmax-blue/10 text-kampmax-blue flex items-center justify-center shrink-0">
              {selectedHallObj?.type === "on_campus" ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-kampmax-text truncate">
                  {value}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-kampmax-blue/20 text-kampmax-blue shrink-0">
                  {isCustomResidence
                    ? "Custom Lodge"
                    : selectedHallObj?.type === "on_campus"
                    ? "On-Campus Hall"
                    : "Off-Campus Area"}
                </span>
              </div>
              <p className="text-xs text-kampmax-text-secondary truncate mt-0.5">
                {selectedHallObj?.description || "Fast local deliveries and campus pickup spot"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-semibold text-kampmax-blue hover:text-kampmax-blue-dark ml-3 shrink-0"
          >
            Change
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-kampmax-error">{error}</p>
      )}

      <p className="text-[11px] text-kampmax-text-secondary leading-tight">
        Used to recommend nearby pickup points, fellow coursemates, and student hostel deliveries.
      </p>

      {/* Modal Dialog */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="residence-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-kampmax-border bg-neutral-50/60">
              <div>
                <h3
                  id="residence-modal-title"
                  className="text-base font-bold text-kampmax-text flex items-center gap-1.5"
                >
                  <Building2 className="h-4 w-4 text-kampmax-blue" />
                  Select Hall or Student Hub
                </h3>
                <p className="text-xs text-kampmax-text-secondary mt-0.5">
                  Available locations at {campusName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-200/70 flex items-center justify-center text-neutral-500 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-kampmax-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search hall name (e.g. Moremi, Jaja, Akoka)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-100 rounded-lg border-none focus:ring-2 focus:ring-kampmax-blue/30 focus:bg-white transition-all outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={cn(
                    "flex-1 text-xs py-1 rounded-md font-medium transition-all",
                    filterTab === "all"
                      ? "bg-white text-kampmax-blue shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  All ({availableHalls.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("on_campus")}
                  className={cn(
                    "flex-1 text-xs py-1 rounded-md font-medium transition-all",
                    filterTab === "on_campus"
                      ? "bg-white text-kampmax-blue shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  On-Campus Halls
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("off_campus")}
                  className={cn(
                    "flex-1 text-xs py-1 rounded-md font-medium transition-all",
                    filterTab === "off_campus"
                      ? "bg-white text-kampmax-blue shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  Off-Campus
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
              {filteredHalls.length > 0 ? (
                filteredHalls.map((hall) => {
                  const isSelected = value.toLowerCase() === hall.name.toLowerCase();
                  return (
                    <button
                      key={hall.id}
                      type="button"
                      onClick={() => handleSelect(hall)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-kampmax-blue bg-kampmax-blue/10 text-kampmax-blue font-medium"
                          : "border-neutral-200/80 bg-white hover:border-kampmax-blue/40 text-kampmax-text"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-kampmax-blue text-white"
                              : "bg-neutral-100 text-neutral-600"
                          )}
                        >
                          {hall.type === "on_campus" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">
                              {hall.name}
                            </span>
                            {hall.popular && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-normal shrink-0">
                                Popular
                              </span>
                            )}
                          </div>
                          {hall.description && (
                            <p className="text-xs text-kampmax-text-secondary truncate mt-0.5">
                              {hall.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-kampmax-blue text-white flex items-center justify-center shrink-0 ml-2">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 px-4">
                  <p className="text-xs text-kampmax-text-secondary">
                    No halls found matching &ldquo;{searchQuery}&rdquo;.
                  </p>
                </div>
              )}

              {/* Custom Lodge Option */}
              <div className="pt-2 border-t border-dashed border-kampmax-border mt-2">
                {!isEnteringCustom ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEnteringCustom(true);
                      setCustomText(isCustomResidence ? value : searchQuery);
                    }}
                    className="w-full py-2.5 px-3 rounded-lg border border-dashed border-kampmax-border hover:border-kampmax-blue/50 text-xs font-medium text-kampmax-blue flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Can&apos;t find yours? Type a custom hostel or street
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-neutral-50 border border-kampmax-border space-y-2">
                    <label className="text-xs font-semibold text-kampmax-text">
                      Enter your hostel, lodge, or street:
                    </label>
                    <Input
                      placeholder="e.g. Silver Crest Villa, South Gate"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEnteringCustom(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!customText.trim()}
                        onClick={handleApplyCustom}
                      >
                        Save Location
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-kampmax-border bg-neutral-50/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                You can change this anytime in profile settings
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
