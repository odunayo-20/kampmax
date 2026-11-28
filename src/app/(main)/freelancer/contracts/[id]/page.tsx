"use client";

import { use } from "react";
import { ContractPage } from "@/components/contracts/ContractPage";

/** One contract, the freelancer's side. */
export default function FreelancerContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ContractPage id={id} party="freelancer" />;
}
