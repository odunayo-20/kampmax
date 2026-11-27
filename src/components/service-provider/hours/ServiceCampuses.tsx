"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Select } from "@/components/ui";
import { useCampusOptions } from "@/hooks/use-campus-options";
import { cn } from "@/lib/utils";
import { updateSpProfileLive, type SpBookingSettings } from "@/services/service-provider-dashboard";
import { describeHoursError, MAX_EXTRA_CAMPUSES } from "@/lib/provider-hours";
import { SETTINGS_KEY } from "./BookingRules";

/** The campuses this provider serves: customers on them can find the provider. Saved with the button. */
export function ServiceCampuses({ initial }: { initial: SpBookingSettings }) {
  const queryClient = useQueryClient();
  const { campuses, isLoading } = useCampusOptions();
  const [primary, setPrimary] = useState(initial.primaryCampusId);
  const [extra, setExtra] = useState<string[]>(initial.additionalCampusIds);

  const save = useMutation({
    mutationFn: async () => {
      const res = await updateSpProfileLive({ primaryCampusId: primary || null, additionalCampusIds: extra });
      if (!res.ok) throw Object.assign(new Error(res.error), { status: res.status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  function toggle(id: string) {
    setExtra((list) => (list.includes(id) ? list.filter((c) => c !== id) : list.length < MAX_EXTRA_CAMPUSES ? [...list, id] : list));
  }

  return (
    <section aria-labelledby="campuses-title" className="space-y-4 rounded-xl border border-kampmax-border bg-white p-6">
      <div>
        <h2 id="campuses-title" className="text-lg font-bold text-kampmax-text">
          Campuses you serve
        </h2>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">Customers on these campuses can find you.</p>
      </div>

      <label className="block max-w-sm text-sm font-medium text-kampmax-text">
        Main campus
        <Select
          value={primary}
          onChange={(e) => {
            setPrimary(e.target.value);
            setExtra((list) => list.filter((c) => c !== e.target.value));
          }}
          placeholder={isLoading && campuses.length === 0 ? "Loading campuses…" : undefined}
        >
          <option value="">None</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.abbreviation || c.name}
            </option>
          ))}
        </Select>
      </label>

      {campuses.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-kampmax-text">Other campuses you also serve</p>
          <div className="flex flex-wrap gap-2">
            {campuses
              .filter((c) => c.id !== primary)
              .map((c) => {
                const on = extra.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      on
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-kampmax-border bg-white text-kampmax-text-secondary hover:border-primary-300"
                    )}
                  >
                    {c.abbreviation || c.name}
                  </button>
                );
              })}
          </div>
          {extra.length >= MAX_EXTRA_CAMPUSES && (
            <p className="mt-2 text-xs text-kampmax-text-muted">You can serve up to {MAX_EXTRA_CAMPUSES} other campuses.</p>
          )}
        </div>
      )}

      {save.isError && (
        <p role="alert" className="text-sm text-error-600">
          {describeHoursError((save.error as Error).message, (save.error as { status?: number }).status)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-sm text-success-700">
          Saved.
        </p>
      )}
      <div className="flex justify-end border-t border-kampmax-border pt-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
