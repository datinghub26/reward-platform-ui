import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

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

const CONFIG_KEY = "navbar_buttons";
const FALLBACK_FILE = "navbar-buttons.json";

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
  const data = getLocalFallbackConfig<{ buttons: NavbarButton[] }>(FALLBACK_FILE, { buttons: [] });
  if (Array.isArray(data.buttons)) {
    return data.buttons.sort((a, b) => a.order - b.order);
  }
  return [];
}

export async function getNavbarButtonsAsync(): Promise<NavbarButton[]> {
  const fallback = getNavbarButtons();
  const data = await getSystemConfig<{ buttons: NavbarButton[] }>(CONFIG_KEY, FALLBACK_FILE, { buttons: fallback });
  if (Array.isArray(data.buttons)) {
    return data.buttons.sort((a, b) => a.order - b.order);
  }
  return [];
}

export async function getActiveNavbarButtonsAsync(): Promise<NavbarButton[]> {
  const all = await getNavbarButtonsAsync();
  return all.filter((b) => b.active);
}

export function getActiveNavbarButtons(): NavbarButton[] {
  return getNavbarButtons().filter((b) => b.active);
}

export async function saveNavbarButtonAsync(button: NavbarButton): Promise<boolean> {
  try {
    const buttons = await getNavbarButtonsAsync();
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

    const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { buttons });
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error saving navbar button:", err);
    return false;
  }
}

export function saveNavbarButton(button: NavbarButton): boolean {
  saveNavbarButtonAsync(button).catch((e) => console.error("Async saveNavbarButton error:", e));
  return true;
}

export async function deleteNavbarButtonAsync(id: string): Promise<boolean> {
  try {
    const buttons = await getNavbarButtonsAsync();
    const filtered = buttons.filter((b) => b.id !== id);
    if (filtered.length !== buttons.length) {
      const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { buttons: filtered });
      triggerRevalidation();
      return ok;
    }
    return true;
  } catch (err) {
    console.error("Error deleting navbar button:", err);
    return false;
  }
}

export function deleteNavbarButton(id: string): boolean {
  deleteNavbarButtonAsync(id).catch((e) => console.error("Async deleteNavbarButton error:", e));
  return true;
}

export async function toggleNavbarButtonAsync(id: string, activeState?: boolean): Promise<boolean> {
  try {
    const buttons = await getNavbarButtonsAsync();
    const item = buttons.find((b) => b.id === id);
    if (item) {
      item.active = activeState !== undefined ? activeState : !item.active;
      const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { buttons });
      triggerRevalidation();
      return ok;
    }
    return false;
  } catch (err) {
    console.error("Error toggling navbar button:", err);
    return false;
  }
}

export function toggleNavbarButton(id: string, activeState?: boolean): boolean {
  toggleNavbarButtonAsync(id, activeState).catch((e) => console.error("Async toggleNavbarButton error:", e));
  return true;
}
