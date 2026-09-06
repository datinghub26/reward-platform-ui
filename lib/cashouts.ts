import { CashoutMethod, DEFAULT_METHODS } from "./cashout-types";
import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export * from "./cashout-types";

const CONFIG_KEY = "cashout_methods";
const FALLBACK_FILE = "cashout-methods.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/cashouts");
    revalidatePath("/withdraw");
  } catch {
    // No-op outside Next.js runtime
  }
}

export function getCashoutMethods(): CashoutMethod[] {
  const methods = getLocalFallbackConfig<CashoutMethod[]>(FALLBACK_FILE, DEFAULT_METHODS, CONFIG_KEY);
  return Array.isArray(methods) && methods.length > 0 ? methods : DEFAULT_METHODS;
}

export async function getCashoutMethodsAsync(): Promise<CashoutMethod[]> {
  const fallback = getCashoutMethods();
  const methods = await getSystemConfig<CashoutMethod[]>(CONFIG_KEY, FALLBACK_FILE, fallback);
  return Array.isArray(methods) && methods.length > 0 ? methods : DEFAULT_METHODS;
}

export function getActiveCashoutMethods(): CashoutMethod[] {
  return getCashoutMethods().filter((m) => m.status === true);
}

export async function getActiveCashoutMethodsAsync(): Promise<CashoutMethod[]> {
  const all = await getCashoutMethodsAsync();
  return all.filter((m) => m.status === true);
}

export async function saveCashoutMethodsAsync(methods: CashoutMethod[]): Promise<boolean> {
  const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, methods);
  triggerRevalidation();
  return ok;
}

export function saveCashoutMethods(methods: CashoutMethod[]): boolean {
  saveCashoutMethodsAsync(methods).catch((e) => console.error("Async saveCashoutMethods error:", e));
  return true;
}

export async function updateCashoutMethodAsync(
  id: string,
  partial: Partial<CashoutMethod>
): Promise<CashoutMethod | null> {
  const methods = await getCashoutMethodsAsync();
  const index = methods.findIndex((m) => m.id === id);
  if (index === -1) return null;

  methods[index] = {
    ...methods[index],
    ...partial,
  };
  await saveCashoutMethodsAsync(methods);
  return methods[index];
}

export function updateCashoutMethod(
  id: string,
  partial: Partial<CashoutMethod>
): CashoutMethod | null {
  const methods = getCashoutMethods();
  const index = methods.findIndex((m) => m.id === id);
  if (index === -1) return null;

  methods[index] = {
    ...methods[index],
    ...partial,
  };
  saveCashoutMethods(methods);
  return methods[index];
}

export async function toggleCashoutMethodAsync(id: string): Promise<CashoutMethod | null> {
  const methods = await getCashoutMethodsAsync();
  const method = methods.find((m) => m.id === id);
  if (!method) return null;
  method.status = !method.status;
  await saveCashoutMethodsAsync(methods);
  return method;
}

export function toggleCashoutMethod(id: string): CashoutMethod | null {
  const methods = getCashoutMethods();
  const method = methods.find((m) => m.id === id);
  if (!method) return null;
  method.status = !method.status;
  saveCashoutMethods(methods);
  return method;
}

export async function createCashoutMethodAsync(
  input: Omit<CashoutMethod, "id">
): Promise<CashoutMethod> {
  const methods = await getCashoutMethodsAsync();
  const newMethod: CashoutMethod = {
    id: `cashout-${Date.now()}`,
    ...input,
  };
  methods.push(newMethod);
  await saveCashoutMethodsAsync(methods);
  return newMethod;
}

export function createCashoutMethod(
  input: Omit<CashoutMethod, "id">
): CashoutMethod {
  const methods = getCashoutMethods();
  const newMethod: CashoutMethod = {
    id: `cashout-${Date.now()}`,
    ...input,
  };
  methods.push(newMethod);
  saveCashoutMethods(methods);
  return newMethod;
}

export async function deleteCashoutMethodAsync(id: string): Promise<boolean> {
  const methods = await getCashoutMethodsAsync();
  const filtered = methods.filter((m) => m.id !== id);
  if (filtered.length === methods.length) return false;
  return saveCashoutMethodsAsync(filtered);
}

export function deleteCashoutMethod(id: string): boolean {
  const methods = getCashoutMethods();
  const filtered = methods.filter((m) => m.id !== id);
  if (filtered.length === methods.length) return false;
  saveCashoutMethods(filtered);
  return true;
}