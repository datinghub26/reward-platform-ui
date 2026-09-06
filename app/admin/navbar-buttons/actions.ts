"use server";

import {
  NavbarButton,
  saveNavbarButtonAsync,
  deleteNavbarButtonAsync,
  toggleNavbarButtonAsync,
} from "@/lib/navbar-buttons";
import { logAdminAudit } from "@/lib/audit-logger";

export async function saveNavbarButtonAction(button: NavbarButton) {
  try {
    if (!button.label?.trim()) {
      return { success: false, error: "Button label is required." };
    }
    if (!button.url?.trim()) {
      return { success: false, error: "Target URL/path is required." };
    }

    const isNew = !button.id;
    const cleanButton: NavbarButton = {
      id: button.id || `btn_${Date.now()}`,
      label: button.label.trim(),
      url: button.url.trim(),
      icon: button.icon?.trim() || "",
      badge: button.badge?.trim() || "",
      isExternal: Boolean(button.isExternal),
      order: Number(button.order) || 0,
      active: button.active !== undefined ? Boolean(button.active) : true,
    };

    const ok = await saveNavbarButtonAsync(cleanButton);
    if (!ok) {
      return { success: false, error: "Failed to save navbar button." };
    }

    await logAdminAudit({
      action: isNew ? "create_navbar_button" : "update_navbar_button",
      category: "settings",
      details: `${isNew ? "Created" : "Updated"} navbar button "${cleanButton.label}" (${cleanButton.url})`,
    });

    return { success: true, message: `Button "${cleanButton.label}" saved successfully.` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save navbar button.",
    };
  }
}

export async function deleteNavbarButtonAction(id: string, label?: string) {
  try {
    if (!id) {
      return { success: false, error: "Button ID is required." };
    }

    const ok = await deleteNavbarButtonAsync(id);
    if (!ok) {
      return { success: false, error: "Failed to delete navbar button." };
    }

    await logAdminAudit({
      action: "delete_navbar_button",
      category: "settings",
      details: `Deleted navbar button "${label || id}"`,
    });

    return { success: true, message: `Button removed successfully.` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete navbar button.",
    };
  }
}

export async function toggleNavbarButtonAction(id: string, active: boolean, label?: string) {
  try {
    if (!id) {
      return { success: false, error: "Button ID is required." };
    }

    const ok = await toggleNavbarButtonAsync(id, active);
    if (!ok) {
      return { success: false, error: "Failed to toggle navbar button state." };
    }

    await logAdminAudit({
      action: "toggle_navbar_button",
      category: "settings",
      details: `${active ? "Activated" : "Deactivated"} navbar button "${label || id}"`,
    });

    return { success: true, message: `Button state updated to ${active ? "active" : "inactive"}.` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle navbar button.",
    };
  }
}
