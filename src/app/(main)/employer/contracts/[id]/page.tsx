"use client";

import { use } from "react";
import { ContractPage } from "@/components/contracts/ContractPage";

/** One contract, the employer's side. */
export default function EmployerContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ContractPage id={id} party="employer" />;
}
