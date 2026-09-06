import fs from "fs";
import path from "path";
import { CashoutMethod, DEFAULT_METHODS } from "./cashout-types";

export * from "./cashout-types";

const CASHOUTS_FILE = path.join(process.cwd(), "data", "cashout-methods.json");

export function getCashoutMethods(): CashoutMethod[] {
  try {
    if (fs.existsSync(CASHOUTS_FILE)) {
      const raw = fs.readFileSync(CASHOUTS_FILE, "utf-8").replace(/^\uFEFF/, "");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read cashout methods:", err);
  }
  return DEFAULT_METHODS;
}

export function getActiveCashoutMethods(): CashoutMethod[] {
  return getCashoutMethods().filter((m) => m.status === true);
}

export function saveCashoutMethods(methods: CashoutMethod[]) {
  try {
    const dir = path.dirname(CASHOUTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CASHOUTS_FILE, JSON.stringify(methods, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist cashout methods:", err);
    throw new Error("Failed to persist cashout methods");
  }
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

export function toggleCashoutMethod(id: string): CashoutMethod | null {
  const methods = getCashoutMethods();
  const method = methods.find((m) => m.id === id);
  if (!method) return null;
  method.status = !method.status;
  saveCashoutMethods(methods);
  return method;
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

export function deleteCashoutMethod(id: string): boolean {
  const methods = getCashoutMethods();
  const filtered = methods.filter((m) => m.id !== id);
  if (filtered.length === methods.length) return false;
  saveCashoutMethods(filtered);
  return true;
}