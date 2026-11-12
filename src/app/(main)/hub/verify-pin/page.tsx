import { redirect } from "next/navigation";

/**
 * This used to be a mock handover screen: "Simulate QR scan" picked the first
 * cached order and "Confirm handover" only changed local state, so an agent could
 * believe a pickup was completed while the customer's order stayed open. The real
 * pickup flow (QR or PIN, checked by the server) is the scanner at /scan.
 */
export default function VerifyPinRedirect() {
  redirect("/scan");
}
