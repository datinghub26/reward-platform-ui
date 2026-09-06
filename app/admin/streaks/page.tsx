import React from "react";
import { getStreaksConfigAsync } from "@/lib/streaks";
import StreaksManager from "./StreaksManager";

export const dynamic = "force-dynamic";

export default async function AdminStreaksPage() {
  const config = await getStreaksConfigAsync();
  return <StreaksManager initialConfig={config} />;
}
