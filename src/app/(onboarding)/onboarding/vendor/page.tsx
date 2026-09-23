"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, ShieldCheck, PackageSearch, Wallet, ArrowRight } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { fetchCampuses } from "@/services/campus";
import { createVendorProfileApi } from "@/services/vendor-dashboard";
import type { Campus } from "@/types";

const features = [
  {
    icon: PackageSearch,
    title: "List products in minutes",
    description: "Open your store and start listing products for the Kampmax marketplace.",
  },
  {
    icon: Wallet,
    title: "Get paid to your wallet",
    description: "Sales settle to your Kampmax wallet — withdraw whenever you're ready.",
  },
  {
    icon: ShieldCheck,
    title: "Verify whenever you're ready",
    description:
      "Identity and business verification live on your vendor profile — you can start selling first and verify later.",
  },
];

/**
 * Vendor onboarding — the explicit activation step for the Vendor
 * capability (POST /vendors). Deliberately a single short form, not a
 * multi-step wizard: CreateVendorDto only requires storeName + campusId,
 * everything else is optional. NIN/BVN/CAC verification is NOT collected
 * here — that lives on the profile at /vendor/verification, decoupled from
 * store creation on the backend (see vendors-kyc module).
 */
export default function VendorOnboardingPage() {
  const router = useRouter();
  const { status } = useAuth();

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusesLoading, setCampusesLoading] = useState(true);

  const [storeName, setStoreName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCampuses({ limit: 100 }).then((result) => {
      if (!cancelled) {
        setCampuses(result.data);
        setCampusesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            <Store className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-kampmax-text mb-2">Sign in to become a Vendor</h1>
          <p className="text-sm text-kampmax-text-secondary mb-6">
            Create a Kampmax account or sign in first — your vendor store is added to the same
            account, no second signup needed.
          </p>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => router.push("/register?next=/onboarding/vendor")}>
              Create Account
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/login?next=/onboarding/vendor")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError("Store name is required.");
      return;
    }
    if (!campusId) {
      setError("Please select the campus where you'll operate.");
      return;
    }

    setSubmitting(true);
    const { error: apiError } = await createVendorProfileApi({
      storeName: storeName.trim(),
      campusId,
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
    });
    setSubmitting(false);

    if (apiError) {
      setError(apiError.message || "We couldn't create your vendor profile. Please try again.");
      return;
    }
    router.push("/vendor");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            <Store className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-kampmax-text mb-3">
            Open Your Store on Kampmax
          </h1>
          <p className="text-kampmax-text-secondary max-w-lg mx-auto">
            Set up your vendor store to start selling to the campus community. Your other Kampmax
            profiles stay exactly as they are.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-kampmax-border p-4">
              <f.icon className="h-5 w-5 text-primary-600 mb-2" aria-hidden />
              <h3 className="text-sm font-semibold text-kampmax-text">{f.title}</h3>
              <p className="mt-1 text-xs text-kampmax-text-secondary">{f.description}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-kampmax-border p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-kampmax-text">Store details</h2>

          <Input
            label="Store name"
            placeholder="e.g. Campus Gadgets Store"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            maxLength={255}
          />

          <Select
            label="Campus"
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            required
            disabled={campusesLoading}
          >
            <option value="">{campusesLoading ? "Loading campuses..." : "Select your campus"}</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Store description <span className="text-kampmax-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-kampmax-border px-3 py-2.5 text-sm text-kampmax-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              maxLength={2000}
              placeholder="What do you sell? Tell customers what to expect."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Input
            label="Phone (optional)"
            placeholder="+2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />

          <Input
            label="Business address (optional)"
            placeholder="e.g. 15 Akoka Road, Yaba, Lagos"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            maxLength={1000}
          />

          {error && (
            <p className="text-sm text-error-600" role="alert">{error}</p>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating your store..." : (
                <span className="inline-flex items-center gap-1.5">
                  Create My Store <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-kampmax-text-secondary">
              You can verify your identity and business anytime from your vendor profile — it's
              not required to get started.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
