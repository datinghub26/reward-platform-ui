import React from "react";
import { getNavbarButtons } from "@/lib/navbar-buttons";
import NavbarButtonsManager from "./NavbarButtonsManager";

export const dynamic = "force-dynamic";

export default async function AdminNavbarButtonsPage() {
  const buttons = getNavbarButtons();

  return <NavbarButtonsManager initialButtons={buttons} />;
}
