import type { EntityId } from "./types";
import { matchesMask } from "./BitsetManager";

export interface CacheEntry {
  readonly include: number;
  readonly exclude: number;
  readonly list: EntityId[];
  readonly slot: Int32Array;
  dirty: boolean;
  result: unknown;
}

export class QueryCache {
  private cache = new Map<number | string, CacheEntry>();
  private readonly maxCacheSize: number;
  private readonly maxEntities: number;

  constructor(maxCacheSize: number, maxEntities: number) {
    if (!Number.isInteger(maxCacheSize) || maxCacheSize < 0) {
      throw new Error(
        `World: queryCacheSize must be a non-negative integer (${maxCacheSize})`,
      );
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

  private makeKey(include: number, exclude: number): number | string {
    return exclude === 0 ? include : `${include}:${exclude}`;
  }

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

  createEntry(
    include: number,
    exclude: number,
    list: EntityId[],
  ): CacheEntry | undefined {
    if (!this.isEnabled) return undefined;
    const key = this.makeKey(include, exclude);
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

  onMembershipChanged(
    entityId: EntityId,
    oldBits: number,
    newBits: number,
  ): void {
    if (!this.isEnabled || this.cache.size === 0 || oldBits === newBits) {
      return;
    }

    const changed = oldBits ^ newBits;

    for (const entry of this.cache.values()) {
      const { include, exclude } = entry;
      if ((changed & (include | exclude)) === 0) continue;

      const matchedOld = matchesMask(oldBits, include, exclude);
      const matchedNew = matchesMask(newBits, include, exclude);
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
