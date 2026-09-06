import React from "react";
import CashoutMethodsManager from "./CashoutMethodsManager";
import { getCashoutMethodsAsync } from "@/lib/cashouts";

export const dynamic = "force-dynamic";

export default async function AdminCashoutsPage() {
  const initialMethods = await getCashoutMethodsAsync();
  return <CashoutMethodsManager initialMethods={initialMethods} />;
}
