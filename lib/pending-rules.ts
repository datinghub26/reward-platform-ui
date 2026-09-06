import fs from "fs";
import path from "path";

export interface PendingOfferRule {
  id: string;
  offer_id: string;
  offer_title: string;
  hold_duration: string;
  active: boolean;
  notes: string;
  created_at: string;
}

const RULES_FILE = path.join(process.cwd(), "data", "pending-rules.json");

export function getPendingRules(): PendingOfferRule[] {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const raw = fs.readFileSync(RULES_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read pending rules:", err);
  }
  return [];
}

export function savePendingRules(rules: PendingOfferRule[]) {
  try {
    const dir = path.dirname(RULES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist pending rules:", err);
    throw new Error("Failed to persist pending rules");
  }
}

export function createPendingRule(
  input: Omit<PendingOfferRule, "id" | "created_at">
): PendingOfferRule {
  const rules = getPendingRules();
  const newRule: PendingOfferRule = {
    id: `rule-${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  rules.unshift(newRule);
  savePendingRules(rules);
  return newRule;
}

export function togglePendingRule(id: string): PendingOfferRule | null {
  const rules = getPendingRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  rule.active = !rule.active;
  savePendingRules(rules);
  return rule;
}

export function deletePendingRule(id: string): boolean {
  const rules = getPendingRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  savePendingRules(filtered);
  return true;
}

export function isOfferHeldByRule(
  offerId: string
): { held: boolean; duration?: string; notes?: string } {
  if (!offerId) return { held: false };
  const rules = getPendingRules();
  const matched = rules.find(
    (r) =>
      r.active &&
      (r.offer_id === offerId ||
        r.offer_id.toLowerCase() === offerId.toLowerCase())
  );
  if (matched) {
    return {
      held: true,
      duration: matched.hold_duration,
      notes: matched.notes,
    };
  }
  return { held: false };
}