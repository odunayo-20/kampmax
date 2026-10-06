"use client";

import { MapPin, Clock, CalendarDays, Tag, Zap } from "lucide-react";
import type { Storefront } from "@/types/storefront";

interface StoreAboutProps {
  store: Storefront;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-kampmax-blue">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
          {label}
        </p>
        <p className="text-sm font-medium text-kampmax-text">{value}</p>
      </div>
    </div>
  );
}

/** Public "About Store" section (only public info — no private details). */
export function StoreAbout({ store }: StoreAboutProps) {
  const a = store.about;
  const responseTime = a?.responseTime || store.responseTime;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-kampmax-border bg-white p-5 sm:p-7">
        <h2 id="about-heading" className="mb-3 text-xl font-bold tracking-tight text-kampmax-text">
          About {store.storeName}
        </h2>
        <p className="max-w-3xl text-[15px] leading-relaxed text-kampmax-text-secondary">
          {a?.description || store.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-kampmax-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            icon={<MapPin className="h-4 w-4" />}
            label="Campus"
            value={a?.campus || store.campusName}
          />
          {a?.businessCategory && (
            <InfoItem icon={<Tag className="h-4 w-4" />} label="Category" value={a.businessCategory} />
          )}
          {a?.operatingHours && (
            <InfoItem icon={<Clock className="h-4 w-4" />} label="Operating hours" value={a.operatingHours} />
          )}
          {a?.established && (
            <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Established" value={a.established} />
          )}
          {responseTime && (
            <InfoItem icon={<Zap className="h-4 w-4" />} label="Response time" value={responseTime} />
          )}
        </div>
      </div>

      {store.specialties.length > 0 && (
        <div className="rounded-2xl border border-kampmax-border bg-white p-5 sm:p-7">
          <h2 className="mb-3 text-base font-bold text-kampmax-text">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {store.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
