import React from "react";
import { getPromoCodes } from "@/lib/bonuses";
import BonusesManager from "./BonusesManager";

export const dynamic = "force-dynamic";

export default async function AdminBonusesPage() {
  const codes = getPromoCodes();
  return <BonusesManager initialCodes={codes} />;
}
