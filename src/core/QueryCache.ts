import type { EntityId } from "./types";

export interface CacheEntry {
  readonly include: number;
  readonly exclude: number;
  /** Live, incrementally maintained list of matching entities. */
  readonly list: EntityId[];
  /** entityId -> index into `list`; -1 when absent. Enables O(1) swap-remove. */
  readonly slot: Int32Array;
  /** True when `list` changed since `result` was last snapshotted. */
  dirty: boolean;
  /** Frozen QueryResult snapshot; typed by ComponentManager at the call site. */
  result: unknown;
}

// LRU cache of query results, keyed by (includeMask, excludeMask). Instead of
// discarding entries when component membership changes, each entry's entity
// list is updated in place via onMembershipChanged, so a changed query costs
// O(matches) to re-snapshot rather than a full O(activeEntities) rescan.
export class QueryCache {
  private cache = new Map<number | string, CacheEntry>();
  private readonly maxCacheSize: number;
  private readonly maxEntities: number;

  constructor(maxCacheSize: number, maxEntities: number) {
    if (maxCacheSize < 0) {
      throw new Error("queryCacheSize must be non-negative");
    }
    this.maxCacheSize = maxCacheSize;
    this.maxEntities = maxEntities;
  }

  get isEnabled(): boolean {
    return this.maxCacheSize > 0;
  }

  get size(): number {
    return this.cache.size;
  }

  // Most queries have no exclude mask; keying those by the include number alone
  // avoids building a string on the hot path. The pair cannot be packed into a
  // single number (2 x 32 bits exceeds Number's 53-bit integer range), hence
  // the string fallback for the exclude case.
  private makeKey(include: number, exclude: number): number | string {
    return exclude === 0 ? include : `${include}:${exclude}`;
  }

  // Returns the entry (refreshing its LRU recency) or undefined on miss.
  getEntry(include: number, exclude: number): CacheEntry | undefined {
    if (!this.isEnabled) return undefined;
    const key = this.makeKey(include, exclude);
    const entry = this.cache.get(key);
    if (entry !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }

  // Registers a new entry seeded with `list` (ownership transfers to the
  // cache). Returns undefined when the cache is disabled.
  createEntry(
    include: number,
    exclude: number,
    list: EntityId[],
  ): CacheEntry | undefined {
    if (!this.isEnabled) return undefined;
    const key = this.makeKey(include, exclude);
    // Only evict when inserting a genuinely new key; updating an existing key
    // does not grow the map, so it must not trigger an eviction.
    if (!this.cache.has(key) && this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    const slot = new Int32Array(this.maxEntities).fill(-1);
    for (let i = 0; i < list.length; i++) {
      slot[list[i]] = i;
    }
    const entry: CacheEntry = {
      include,
      exclude,
      list,
      slot,
      dirty: true,
      result: undefined,
    };
    this.cache.set(key, entry);
    return entry;
  }

  // Called after an entity's component mask changes. Adds/removes the entity
  // in every cached list whose match status flipped and marks those entries
  // dirty so their next fetch re-snapshots.
  onMembershipChanged(
    entityId: EntityId,
    oldBits: number,
    newBits: number,
  ): void {
    if (!this.isEnabled || this.cache.size === 0 || oldBits === newBits) {
      return;
    }

    for (const entry of this.cache.values()) {
      const { include, exclude } = entry;
      const matchedOld =
        (oldBits & include) === include && (oldBits & exclude) === 0;
      const matchedNew =
        (newBits & include) === include && (newBits & exclude) === 0;
      if (matchedOld === matchedNew) continue;

      if (matchedNew) {
        entry.slot[entityId] = entry.list.length;
        entry.list.push(entityId);
      } else {
        const index = entry.slot[entityId];
        const last = entry.list[entry.list.length - 1];
        entry.list[index] = last;
        entry.slot[last] = index;
        entry.list.pop();
        entry.slot[entityId] = -1;
      }
      entry.dirty = true;
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldestEntry(): void {
    const iterator = this.cache.keys().next();
    if (!iterator.done) {
      this.cache.delete(iterator.value);
    }
  }
}
