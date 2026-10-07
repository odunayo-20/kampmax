"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { freshId } from "@/services/freelancer-onboarding";
import type { FreelancerCertification, FreelancerOnboardingDraft } from "@/types/freelancer";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

export function StepCertifications({ draft, onUpdate }: Props) {
  const items = draft?.certifications ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const add = () => {
    const id = freshId();
    const newItem: FreelancerCertification = { id, name: "", issuingOrganization: "", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "" };
    onUpdate({ certifications: [...items, newItem] });
    setExpandedId(id);
  };

  const update = (id: string, patch: Partial<FreelancerCertification>) => {
    onUpdate({ certifications: items.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };

  const remove = (id: string) => {
    onUpdate({ certifications: items.filter((c) => c.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Certifications</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Certifications that strengthen your profile (optional).
        </p>
      </div>

      {items.map((cert) => (
        <div key={cert.id} className="border border-neutral-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)} className="text-left flex-1">
              <p className="text-sm font-medium text-kampmax-text">{cert.name || "Untitled certification"}</p>
              <p className="text-xs text-kampmax-text-secondary">
                {cert.issuingOrganization || ""}{cert.issueDate ? ` · ${cert.issueDate}` : ""}
              </p>
            </button>
            <button type="button" onClick={() => remove(cert.id)} className="p-1 text-neutral-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {expandedId === cert.id && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Certification Name</label>
                <Input value={cert.name} onChange={(e) => update(cert.id, { name: e.target.value })} placeholder="e.g., AWS Solutions Architect" />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Issuing Organization</label>
                <Input value={cert.issuingOrganization} onChange={(e) => update(cert.id, { issuingOrganization: e.target.value })} placeholder="e.g., Amazon Web Services" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Issue Date</label>
                  <Input type="month" value={cert.issueDate} onChange={(e) => update(cert.id, { issueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Expiration Date</label>
                  <Input type="month" value={cert.expirationDate ?? ""} onChange={(e) => update(cert.id, { expirationDate: e.target.value || undefined })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Credential URL</label>
                <Input value={cert.credentialUrl ?? ""} onChange={(e) => update(cert.id, { credentialUrl: e.target.value || undefined })} placeholder="https://..." />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Certification
      </Button>
    </div>
  );
}
