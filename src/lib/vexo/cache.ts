const cache = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_TTL = parseInt(process.env.VEXO_CACHE_TTL_SECONDS || "3600", 10) * 1000;

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs?: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + (ttlMs || DEFAULT_TTL),
  });
}

export function buildCacheKey(prefix: string, params: Record<string, string | undefined>): string {
  const parts = [prefix];
  for (const [k, v] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b))) {
    if (v) parts.push(`${k}=${v}`);
  }
  return parts.join("|");
}

export function clearCache(prefix?: string): number {
  if (!prefix) {
    const size = cache.size;
    cache.clear();
    return size;
  }
  let cleared = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      cleared++;
    }
  }
  return cleared;
}
