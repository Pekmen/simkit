export class QueryCache {
  private cache = new Map<number, unknown>();
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

  get(mask: number): unknown {
    const cached = this.cache.get(mask);
    if (cached !== undefined) {
      this.cache.delete(mask);
      this.cache.set(mask, cached);
    }
    return cached;
  }

  set(mask: number, value: unknown): void {
    if (!this.isEnabled) {
      return;
    }
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    this.cache.set(mask, value);
  }

  invalidateMatchingQueries(componentBits: number): void {
    if (!this.isEnabled || this.cache.size === 0 || componentBits === 0) {
      return;
    }

    for (const mask of this.cache.keys()) {
      if ((mask & componentBits) === mask) {
        this.cache.delete(mask);
      }
    }
  }

  invalidateEmptyQuery(): void {
    this.cache.delete(0);
  }

  private evictOldestEntry(): void {
    const iterator = this.cache.keys().next();
    if (!iterator.done) {
      this.cache.delete(iterator.value);
    }
  }
}
