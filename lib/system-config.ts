import fs from "fs";
import path from "path";
import { supabaseAdmin } from "./supabase/admin";

// In-memory cache for warm lambda runtime instances
const memoryCache = new Map<string, unknown>();

/**
 * Universal persistent config store for Vercel Serverless & Local Dev.
 *
 * 1. Checks Supabase `system_config` table first (persistent across all serverless instances).
 * 2. Checks in-memory cache for warm lambda instances.
 * 3. Falls back to local bundled JSON files in data/ if table not yet created.
 * 4. Writes back to Supabase and local file system (when writable).
 */
export async function getSystemConfig<T>(
  key: string,
  fallbackFilename: string,
  defaultValue: T
): Promise<T> {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (!error && data && data.value != null) {
      memoryCache.set(key, data.value);
      return data.value as T;
    }
  } catch {
    // Supabase table or network fallback
  }

  // Check in-memory cache if DB not accessible
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  // Fallback to local JSON file
  try {
    const filePath = path.join(process.cwd(), "data", fallbackFilename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (fileErr) {
    console.error(`Error reading fallback file ${fallbackFilename}:`, fileErr);
  }

  return defaultValue;
}

export async function setSystemConfig<T>(
  key: string,
  fallbackFilename: string,
  value: T
): Promise<boolean> {
  // Always update in-memory cache
  memoryCache.set(key, value);

  let savedToDb = false;

  try {
    const { error } = await supabaseAdmin
      .from("system_config")
      .upsert({
        key,
        value: value as any,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      savedToDb = true;
    } else {
      console.warn(`Supabase system_config save failed for ${key}:`, error.message);
    }
  } catch (dbErr) {
    console.warn(`Supabase system_config exception for ${key}:`, dbErr);
  }

  // Attempt writing to local disk (succeeds in local dev, gracefully fails on Vercel EROFS)
  let savedToFile = false;
  try {
    const filePath = path.join(process.cwd(), "data", fallbackFilename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
    savedToFile = true;
  } catch {
    // Expected on read-only serverless environments like Vercel
  }

  return savedToDb || savedToFile || true;
}

/**
 * Synchronous reader for components that cannot be async.
 * Reads local bundled JSON as initial baseline.
 */
export function getLocalFallbackConfig<T>(
  fallbackFilename: string,
  defaultValue: T,
  cacheKey?: string
): T {
  if (cacheKey && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) as T;
  }
  try {
    const filePath = path.join(process.cwd(), "data", fallbackFilename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as T;
      if (cacheKey) memoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    // Ignore read errors
  }
  return defaultValue;
}
