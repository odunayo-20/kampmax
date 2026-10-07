"use client";

import { useCallback, useState } from "react";
import { uploadProviderImage } from "@/services/service-provider-media";
import type { ProviderImageKind, UploadedProviderImage } from "@/services/service-provider-media";

/** Uploads a picture for a provider's profile and reports progress and failure for the UI. */
export function useProviderImageUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, kind: ProviderImageKind): Promise<UploadedProviderImage | null> => {
    setBusy(true);
    setError(null);
    try {
      return await uploadProviderImage(file, kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload didn't go through. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { upload, busy, error, clearError: () => setError(null) };
}
