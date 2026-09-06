import fs from "fs";
import path from "path";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  category: "rewards" | "cashouts" | "offers" | "security" | "settings" | "system" | "users";
  details: string;
  adminEmail?: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_LOGS_FILE = path.join(process.cwd(), "data", "audit-logs.json");

export function getAuditLogs(): AuditLogEntry[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const raw = fs.readFileSync(AUDIT_LOGS_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data.logs)) {
        return data.logs.sort(
          (a: AuditLogEntry, b: AuditLogEntry) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
    }
  } catch (err) {
    console.error("Error reading audit-logs.json:", err);
  }
  return [];
}

export async function logAdminAudit(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<boolean> {
  try {
    const logs = getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    logs.unshift(newEntry);
    // Keep last 1000 logs
    const trimmed = logs.slice(0, 1000);

    const dir = path.dirname(AUDIT_LOGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify({ logs: trimmed }, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error logging admin audit:", err);
    return false;
  }
}
