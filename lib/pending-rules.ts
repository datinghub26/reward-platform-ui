import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface PendingOfferRule {
  id: string;
  offer_id: string;
  offer_title: string;
  hold_duration: string;
  active: boolean;
  notes: string;
  created_at: string;
}

const CONFIG_KEY = "pending_rules";
const FALLBACK_FILE = "pending-rules.json";

export function getPendingRules(): PendingOfferRule[] {
  return getLocalFallbackConfig<PendingOfferRule[]>(FALLBACK_FILE, []);
}

export async function getPendingRulesAsync(): Promise<PendingOfferRule[]> {
  const fallback = getPendingRules();
  return getSystemConfig<PendingOfferRule[]>(CONFIG_KEY, FALLBACK_FILE, fallback);
}

export async function savePendingRulesAsync(rules: PendingOfferRule[]): Promise<boolean> {
  return setSystemConfig(CONFIG_KEY, FALLBACK_FILE, rules);
}

export function savePendingRules(rules: PendingOfferRule[]) {
  savePendingRulesAsync(rules).catch((e) => console.error("Async savePendingRules error:", e));
}

export async function createPendingRuleAsync(
  input: Omit<PendingOfferRule, "id" | "created_at">
): Promise<PendingOfferRule> {
  const rules = await getPendingRulesAsync();
  const newRule: PendingOfferRule = {
    id: `rule-${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  rules.unshift(newRule);
  await savePendingRulesAsync(rules);
  return newRule;
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

export async function togglePendingRuleAsync(id: string): Promise<PendingOfferRule | null> {
  const rules = await getPendingRulesAsync();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  rule.active = !rule.active;
  await savePendingRulesAsync(rules);
  return rule;
}

export function togglePendingRule(id: string): PendingOfferRule | null {
  const rules = getPendingRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  rule.active = !rule.active;
  savePendingRules(rules);
  return rule;
}

export async function deletePendingRuleAsync(id: string): Promise<boolean> {
  const rules = await getPendingRulesAsync();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  return savePendingRulesAsync(filtered);
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