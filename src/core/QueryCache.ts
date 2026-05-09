export class QueryCache {
  private cache = new Map<number | string, unknown>();
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
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, cached);
    }
    return cached;
  }

  set(include: number, exclude: number, value: unknown): void {
    if (!this.isEnabled) {
      return;
    }
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    this.cache.set(this.makeKey(include, exclude), value);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateMatchingQueries(componentBits: number): void {
    if (!this.isEnabled || this.cache.size === 0 || componentBits === 0) {
      return;
    }

    for (const key of this.cache.keys()) {
      let include: number;
      let exclude: number;
      if (typeof key === "number") {
        include = key;
        exclude = 0;
      } else {
        const colon = key.indexOf(":");
        include = parseInt(key.slice(0, colon), 10);
        exclude = parseInt(key.slice(colon + 1), 10);
      }
      if ((include & componentBits) !== 0 || (exclude & componentBits) !== 0) {
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
