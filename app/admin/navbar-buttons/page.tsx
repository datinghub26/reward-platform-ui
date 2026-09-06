import React from "react";
import { getNavbarButtonsAsync } from "@/lib/navbar-buttons";
import NavbarButtonsManager from "./NavbarButtonsManager";

export const dynamic = "force-dynamic";

export default async function AdminNavbarButtonsPage() {
  const buttons = await getNavbarButtonsAsync();

  return <NavbarButtonsManager initialButtons={buttons} />;
}
