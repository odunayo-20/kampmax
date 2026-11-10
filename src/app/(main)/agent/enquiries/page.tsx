"use client";

import { MessageSquareText } from "lucide-react";
import { AccommodationEnquiries } from "@/components/accommodation/AccommodationEnquiries";

export default function AgentEnquiriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-6 w-6 text-kampmax-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Student Inquiries & Leads
          </h1>
        </div>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Respond to student inquiries, answer questions, and schedule on-campus property inspections.
        </p>
      </div>

      <section>
        <AccommodationEnquiries role="AGENT" />
      </section>
    </div>
  );
}

