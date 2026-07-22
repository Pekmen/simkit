import { QueryCache } from "../QueryCache";
import type { EntityId } from "../types";

const id = (n: number): EntityId => n as EntityId;
const ids = (...ns: number[]): EntityId[] => ns.map(id);

// Direct unit tests for the LRU query cache. The include/exclude masks are just
// numbers here; the cache does not care what they mean, only how they key
// entries and update their entity lists on membership changes.
describe("QueryCache", () => {
  const MAX_ENTITIES = 16;

  describe("constructor / isEnabled", () => {
    test("throws for negative size", () => {
      expect(() => new QueryCache(-1, MAX_ENTITIES)).toThrow(
        "queryCacheSize must be non-negative",
      );
    });

    test("size 0 is a disabled cache", () => {
      const cache = new QueryCache(0, MAX_ENTITIES);
      expect(cache.isEnabled).toBe(false);
    });

    test("positive size is enabled", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      expect(cache.isEnabled).toBe(true);
    });
  });

  describe("disabled cache (size 0)", () => {
    test("createEntry returns undefined and getEntry always misses", () => {
      const cache = new QueryCache(0, MAX_ENTITIES);
      expect(cache.createEntry(0b1, 0, ids(1))).toBeUndefined();
      expect(cache.getEntry(0b1, 0)).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    test("onMembershipChanged is a no-op", () => {
      const cache = new QueryCache(0, MAX_ENTITIES);
      expect(() => {
        cache.onMembershipChanged(id(1), 0, 0b1);
      }).not.toThrow();
      expect(cache.size).toBe(0);
    });
  });

  describe("createEntry / getEntry", () => {
    test("stores and retrieves the same entry", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      const entry = cache.createEntry(0b1, 0, ids(1, 2, 3));
      expect(cache.getEntry(0b1, 0)).toBe(entry);
      expect(entry?.list).toEqual(ids(1, 2, 3));
    });

    test("a new entry starts dirty with no snapshot", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      const entry = cache.createEntry(0b1, 0, ids(1));
      expect(entry?.dirty).toBe(true);
      expect(entry?.result).toBeUndefined();
    });

    test("miss returns undefined", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      expect(cache.getEntry(0b10, 0)).toBeUndefined();
    });
  });

  describe("key scheme (include vs include:exclude)", () => {
    test("same include with and without an exclude are distinct entries", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      const includeOnly = cache.createEntry(0b101, 0, ids(1)); // numeric key
      const withExclude = cache.createEntry(0b101, 0b10, ids(2)); // "5:2" string key

      expect(cache.getEntry(0b101, 0)).toBe(includeOnly);
      expect(cache.getEntry(0b101, 0b10)).toBe(withExclude);
      expect(cache.size).toBe(2);
    });

    test("two different excludes on the same include do not collide", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      const excludeTwo = cache.createEntry(0b1, 0b10, ids(1));
      const excludeFour = cache.createEntry(0b1, 0b100, ids(2));

      expect(cache.getEntry(0b1, 0b10)).toBe(excludeTwo);
      expect(cache.getEntry(0b1, 0b100)).toBe(excludeFour);
    });
  });

  describe("LRU behavior", () => {
    test("getEntry refreshes recency so the touched entry survives eviction", () => {
      const cache = new QueryCache(2, MAX_ENTITIES);
      const entryA = cache.createEntry(0b1, 0, ids(1));
      cache.createEntry(0b10, 0, ids(2));

      // Touch A -> A becomes most-recently-used.
      expect(cache.getEntry(0b1, 0)).toBe(entryA);

      // Inserting C evicts the LRU entry, which is now B (not A).
      const entryC = cache.createEntry(0b100, 0, ids(3));

      expect(cache.getEntry(0b1, 0)).toBe(entryA);
      expect(cache.getEntry(0b100, 0)).toBe(entryC);
      expect(cache.getEntry(0b10, 0)).toBeUndefined();
      expect(cache.size).toBe(2);
    });

    test("eviction victim is the oldest insertion when nothing was touched", () => {
      const cache = new QueryCache(2, MAX_ENTITIES);
      cache.createEntry(0b1, 0, ids(1));
      cache.createEntry(0b10, 0, ids(2));
      cache.createEntry(0b100, 0, ids(3)); // evicts the 0b1 entry (oldest)

      expect(cache.getEntry(0b1, 0)).toBeUndefined();
      expect(cache.getEntry(0b10, 0)).toBeDefined();
      expect(cache.getEntry(0b100, 0)).toBeDefined();
    });

    test("re-creating an existing key replaces it without evicting", () => {
      const cache = new QueryCache(2, MAX_ENTITIES);
      cache.createEntry(0b1, 0, ids(1));
      const entryB = cache.createEntry(0b10, 0, ids(2));

      // Re-creating the 0b1 key is an update, not a new key -> no eviction.
      const replacement = cache.createEntry(0b1, 0, ids(9));

      expect(cache.size).toBe(2);
      expect(cache.getEntry(0b1, 0)).toBe(replacement);
      expect(cache.getEntry(0b10, 0)).toBe(entryB);
    });
  });

  describe("onMembershipChanged", () => {
    test("adds the entity to entries it now matches and marks them dirty", () => {
      const cache = new QueryCache(8, MAX_ENTITIES);
      const entry = cache.createEntry(0b1, 0, ids(1));
      if (!entry) throw new Error("cache unexpectedly disabled");
      entry.dirty = false; // simulate a taken snapshot

      cache.onMembershipChanged(id(5), 0, 0b1);

      expect(entry.list).toEqual(ids(1, 5));
      expect(entry.dirty).toBe(true);
    });

    test("removes the entity from entries it no longer matches (swap-remove)", () => {
      const cache = new QueryCache(8, MAX_ENTITIES);
      const entry = cache.createEntry(0b1, 0, ids(1, 2, 3));
      if (!entry) throw new Error("cache unexpectedly disabled");
      entry.dirty = false;

      // Entity 1 loses bit 0 -> removed from the middle; 3 is swapped into its slot.
      cache.onMembershipChanged(id(1), 0b1, 0);

      expect(entry.list).toEqual(ids(3, 2));
      expect(entry.dirty).toBe(true);

      // The swapped entity's slot bookkeeping must stay consistent: removing it
      // next must not corrupt the list.
      cache.onMembershipChanged(id(3), 0b1, 0);
      expect(entry.list).toEqual(ids(2));
    });

    test("gaining an excluded bit removes the entity", () => {
      const cache = new QueryCache(8, MAX_ENTITIES);
      // include bit 2, exclude bit 0
      const entry = cache.createEntry(0b100, 0b1, ids(1));
      if (!entry) throw new Error("cache unexpectedly disabled");
      entry.dirty = false;

      cache.onMembershipChanged(id(1), 0b100, 0b101);

      expect(entry.list).toEqual([]);
      expect(entry.dirty).toBe(true);
    });

    test("entries whose match status did not flip stay clean", () => {
      const cache = new QueryCache(8, MAX_ENTITIES);
      const matching = cache.createEntry(0b1, 0, ids(1));
      const unrelated = cache.createEntry(0b10, 0, ids(2));
      if (!matching || !unrelated)
        throw new Error("cache unexpectedly disabled");
      matching.dirty = false;
      unrelated.dirty = false;

      // Entity 1 gains bit 2: it still matches 0b1 and still misses 0b10.
      cache.onMembershipChanged(id(1), 0b1, 0b101);

      expect(matching.list).toEqual(ids(1));
      expect(matching.dirty).toBe(false);
      expect(unrelated.list).toEqual(ids(2));
      expect(unrelated.dirty).toBe(false);
    });

    test("disjoint entry's list/slot/dirty are left completely untouched by an unrelated membership change", () => {
      const cache = new QueryCache(8, MAX_ENTITIES);
      const matching = cache.createEntry(0b1, 0, ids(1));
      const disjoint = cache.createEntry(0b10, 0, ids(2, 3));
      if (!matching || !disjoint)
        throw new Error("cache unexpectedly disabled");
      matching.dirty = false;
      disjoint.dirty = false;
      const listRef = disjoint.list;
      const slotSnapshot = Array.from(disjoint.slot);

      // Entity 1 gains bit 0b100, which neither entry's include/exclude mask
      // has any bits in common with -> disjoint's fast-reject skip must leave
      // it byte-for-byte identical, not just "still logically correct".
      cache.onMembershipChanged(id(1), 0b1, 0b101);

      expect(disjoint.list).toBe(listRef);
      expect(Array.from(disjoint.slot)).toEqual(slotSnapshot);
      expect(disjoint.dirty).toBe(false);
    });

    test("oldBits === newBits is a no-op", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      const entry = cache.createEntry(0b1, 0, ids(1));
      if (!entry) throw new Error("cache unexpectedly disabled");
      entry.dirty = false;

      cache.onMembershipChanged(id(1), 0b1, 0b1);

      expect(entry.dirty).toBe(false);
    });

    test("empty cache is a safe no-op", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      expect(() => {
        cache.onMembershipChanged(id(1), 0, 0b1);
      }).not.toThrow();
    });
  });

  describe("clear", () => {
    test("empties the cache", () => {
      const cache = new QueryCache(4, MAX_ENTITIES);
      cache.createEntry(0b1, 0, ids(1));
      cache.createEntry(0b10, 0, ids(2));
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.getEntry(0b1, 0)).toBeUndefined();
    });
  });
});
