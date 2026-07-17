interface CacheEntry {
  include: number;
  exclude: number;
  value: unknown;
}

export class QueryCache {
  private cache = new Map<number | string, CacheEntry>();
  private readonly maxCacheSize: number;

  constructor(maxCacheSize: number) {
    if (maxCacheSize < 0) {
      throw new Error("queryCacheSize must be non-negative");
    }
    this.maxCacheSize = maxCacheSize;
  }

  get isEnabled(): boolean {
    return this.maxCacheSize > 0;
  }

  get size(): number {
    return this.cache.size;
  }

  private makeKey(include: number, exclude: number): number | string {
    return exclude === 0 ? include : `${include}:${exclude}`;
  }

  get(include: number, exclude: number): unknown {
    if (!this.isEnabled) return undefined;
    const key = this.makeKey(include, exclude);
    const entry = this.cache.get(key);
    if (entry !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }
    return undefined;
  }

  set(include: number, exclude: number, value: unknown): void {
    if (!this.isEnabled) {
      return;
    }
    const key = this.makeKey(include, exclude);
    // Only evict when inserting a genuinely new key; updating an existing key
    // does not grow the map, so it must not trigger an eviction.
    if (!this.cache.has(key) && this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    this.cache.set(key, { include, exclude, value });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateMatchingQueries(componentBits: number): void {
    if (!this.isEnabled || this.cache.size === 0 || componentBits === 0) {
      return;
    }

    for (const [key, entry] of this.cache) {
      if (
        (entry.include & componentBits) !== 0 ||
        (entry.exclude & componentBits) !== 0
      ) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldestEntry(): void {
    const iterator = this.cache.keys().next();
    if (!iterator.done) {
      this.cache.delete(iterator.value);
    }
  }
}
