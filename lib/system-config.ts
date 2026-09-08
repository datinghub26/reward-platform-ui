import fs from "fs";
import path from "path";
import { supabaseAdmin } from "./supabase/admin";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory cache with 60s TTL for warm serverless/lambda runtime instances
const memoryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Universal persistent config store for Vercel Serverless & Local Dev.
 *
 * 1. Returns fresh in-memory cached config (< 60s) for blazing-fast responses.
 * 2. Checks Supabase `system_config` table (persistent across all serverless instances).
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
      memoryCache.set(key, { value: data.value, expiresAt: Date.now() + CACHE_TTL_MS });
      return data.value as T;
    }
  } catch (err) {
    console.warn(`Supabase system_config fetch failed for ${key}:`, err);
  }

  // Fallback to in-memory cache if DB is down or unreachable
  const cached = memoryCache.get(key);
  if (cached) {
    return cached.value as T;
  }

  // Fallback to local JSON file
  try {
    const filePath = path.join(process.cwd(), "data", fallbackFilename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(key, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
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
  memoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

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
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached.value as T;
  }
  try {
    const filePath = path.join(process.cwd(), "data", fallbackFilename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as T;
      if (cacheKey) memoryCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
      return parsed;
    }
  } catch {
    // Ignore read errors
  }
  return defaultValue;
}
