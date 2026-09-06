import React from "react";
import { getStreaksConfig } from "@/lib/streaks";
import StreaksManager from "./StreaksManager";

export const dynamic = "force-dynamic";

export default async function AdminStreaksPage() {
  const config = getStreaksConfig();
  return <StreaksManager initialConfig={config} />;
}
