import React from "react";
import PendingOffersManager from "./PendingOffersManager";
import { getPendingRules } from "@/lib/pending-rules";

export const dynamic = "force-dynamic";

export default async function AdminPendingOffersPage() {
  const initialRules = getPendingRules();
  return <PendingOffersManager initialRules={initialRules} />;
}
