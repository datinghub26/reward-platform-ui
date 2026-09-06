import fs from "fs";
import path from "path";

export interface NavbarButton {
  id: string;
  label: string;
  url: string;
  icon?: string;
  badge?: string;
  isExternal?: boolean;
  order: number;
  active: boolean;
}

const NAVBAR_BUTTONS_FILE = path.join(process.cwd(), "data", "navbar-buttons.json");

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/navbar-buttons");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/earn");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getNavbarButtons(): NavbarButton[] {
  try {
    if (fs.existsSync(NAVBAR_BUTTONS_FILE)) {
      const raw = fs.readFileSync(NAVBAR_BUTTONS_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data.buttons)) {
        return data.buttons.sort((a: NavbarButton, b: NavbarButton) => a.order - b.order);
      }
    }
  } catch (err) {
    console.error("Error reading navbar-buttons.json:", err);
  }
  return [];
}

export function getActiveNavbarButtons(): NavbarButton[] {
  return getNavbarButtons().filter((b) => b.active);
}

export function saveNavbarButton(button: NavbarButton): boolean {
  try {
    const buttons = getNavbarButtons();
    const index = buttons.findIndex((b) => b.id === button.id);
    if (index >= 0) {
      buttons[index] = {
        ...button,
        order: Number(button.order) || buttons[index].order || 0,
        active: Boolean(button.active),
      };
    } else {
      buttons.push({
        ...button,
        id: button.id || `btn_${Date.now()}`,
        order: Number(button.order) || buttons.length + 1,
        active: button.active !== undefined ? Boolean(button.active) : true,
      });
    }
    buttons.sort((a, b) => a.order - b.order);

    const dir = path.dirname(NAVBAR_BUTTONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NAVBAR_BUTTONS_FILE, JSON.stringify({ buttons }, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving navbar button:", err);
    return false;
  }
}

export function deleteNavbarButton(id: string): boolean {
  try {
    const buttons = getNavbarButtons();
    const filtered = buttons.filter((b) => b.id !== id);
    if (filtered.length !== buttons.length) {
      fs.writeFileSync(NAVBAR_BUTTONS_FILE, JSON.stringify({ buttons: filtered }, null, 2), "utf8");
      triggerRevalidation();
      return true;
    }
  } catch (err) {
    console.error("Error deleting navbar button:", err);
  }
  return false;
}

export function toggleNavbarButton(id: string, activeState?: boolean): boolean {
  try {
    const buttons = getNavbarButtons();
    const item = buttons.find((b) => b.id === id);
    if (item) {
      item.active = activeState !== undefined ? activeState : !item.active;
      fs.writeFileSync(NAVBAR_BUTTONS_FILE, JSON.stringify({ buttons }, null, 2), "utf8");
      triggerRevalidation();
      return true;
    }
  } catch (err) {
    console.error("Error toggling navbar button:", err);
  }
  return false;
}
