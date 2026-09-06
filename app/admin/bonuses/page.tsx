import React from "react";
import { getPromoCodesAsync } from "@/lib/bonuses";
import BonusesManager from "./BonusesManager";

export const dynamic = "force-dynamic";

export default async function AdminBonusesPage() {
  const codes = await getPromoCodesAsync();
  return <BonusesManager initialCodes={codes} />;
}
