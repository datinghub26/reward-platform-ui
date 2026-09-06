import React from "react";
import CashoutMethodsManager from "./CashoutMethodsManager";
import { getCashoutMethods } from "@/lib/cashouts";

export const dynamic = "force-dynamic";

export default async function AdminCashoutsPage() {
  const initialMethods = getCashoutMethods();
  return <CashoutMethodsManager initialMethods={initialMethods} />;
}
