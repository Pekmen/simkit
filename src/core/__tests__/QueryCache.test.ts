import { QueryCache } from "../QueryCache";

// Direct unit tests for the LRU query cache. The include/exclude masks are just
// numbers here; the cache does not care what they mean, only how they key and
// invalidate entries.
describe("QueryCache", () => {
  describe("constructor / isEnabled", () => {
    test("throws for negative size", () => {
      expect(() => new QueryCache(-1)).toThrow(
        "queryCacheSize must be non-negative",
      );
    });

    test("size 0 is a disabled cache", () => {
      const cache = new QueryCache(0);
      expect(cache.isEnabled).toBe(false);
    });

    test("positive size is enabled", () => {
      const cache = new QueryCache(4);
      expect(cache.isEnabled).toBe(true);
    });
  });

  describe("disabled cache (size 0)", () => {
    test("get always returns undefined and set is a no-op", () => {
      const cache = new QueryCache(0);
      cache.set(0b1, 0, "value");
      expect(cache.get(0b1, 0)).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    test("invalidateMatchingQueries is a no-op", () => {
      const cache = new QueryCache(0);
      expect(() => {
        cache.invalidateMatchingQueries(0b1);
      }).not.toThrow();
      expect(cache.size).toBe(0);
    });
  });

  describe("basic get / set", () => {
    test("stores and retrieves a value", () => {
      const cache = new QueryCache(4);
      const value = { entities: [1, 2, 3] };
      cache.set(0b1, 0, value);
      expect(cache.get(0b1, 0)).toBe(value);
    });

    test("miss returns undefined", () => {
      const cache = new QueryCache(4);
      expect(cache.get(0b10, 0)).toBeUndefined();
    });
  });

  describe("key scheme (include vs include:exclude)", () => {
    test("same include with and without an exclude are distinct entries", () => {
      const cache = new QueryCache(4);
      const includeOnly = "include-only";
      const withExclude = "with-exclude";

      cache.set(0b101, 0, includeOnly); // numeric key
      cache.set(0b101, 0b10, withExclude); // "5:2" string key

      expect(cache.get(0b101, 0)).toBe(includeOnly);
      expect(cache.get(0b101, 0b10)).toBe(withExclude);
      expect(cache.size).toBe(2);
    });

    test("two different excludes on the same include do not collide", () => {
      const cache = new QueryCache(4);
      cache.set(0b1, 0b10, "exclude-2");
      cache.set(0b1, 0b100, "exclude-4");

      expect(cache.get(0b1, 0b10)).toBe("exclude-2");
      expect(cache.get(0b1, 0b100)).toBe("exclude-4");
    });
  });

  describe("LRU behavior", () => {
    test("get refreshes recency so the touched entry survives eviction", () => {
      const cache = new QueryCache(2);
      cache.set(0b1, 0, "A");
      cache.set(0b10, 0, "B");

      // Touch A -> A becomes most-recently-used.
      expect(cache.get(0b1, 0)).toBe("A");

      // Inserting C evicts the LRU entry, which is now B (not A).
      cache.set(0b100, 0, "C");

      expect(cache.get(0b1, 0)).toBe("A");
      expect(cache.get(0b100, 0)).toBe("C");
      expect(cache.get(0b10, 0)).toBeUndefined();
      expect(cache.size).toBe(2);
    });

    test("eviction victim is the oldest insertion when nothing was touched", () => {
      const cache = new QueryCache(2);
      cache.set(0b1, 0, "A");
      cache.set(0b10, 0, "B");
      cache.set(0b100, 0, "C"); // evicts A (oldest)

      expect(cache.get(0b1, 0)).toBeUndefined();
      expect(cache.get(0b10, 0)).toBe("B");
      expect(cache.get(0b100, 0)).toBe("C");
    });

    test("updating an existing key does not evict", () => {
      const cache = new QueryCache(2);
      cache.set(0b1, 0, "A");
      cache.set(0b10, 0, "B");

      // Re-setting A's key is an update, not a new key -> no eviction.
      cache.set(0b1, 0, "A2");

      expect(cache.size).toBe(2);
      expect(cache.get(0b1, 0)).toBe("A2");
      expect(cache.get(0b10, 0)).toBe("B");
    });
  });

  describe("invalidateMatchingQueries", () => {
    test("drops entries whose include mask overlaps the changed bits", () => {
      const cache = new QueryCache(8);
      cache.set(0b0011, 0, "has-bit-1"); // include touches bit 0/1
      cache.set(0b1100, 0, "no-bit-1"); // include does not touch bit 0

      cache.invalidateMatchingQueries(0b0001);

      expect(cache.get(0b0011, 0)).toBeUndefined();
      expect(cache.get(0b1100, 0)).toBe("no-bit-1");
    });

    test("drops entries whose exclude mask overlaps the changed bits", () => {
      const cache = new QueryCache(8);
      // include-only bit 2, but excludes bit 0 -> keyed as "4:1"
      cache.set(0b100, 0b001, "excludes-bit-0");
      cache.set(0b100, 0b010, "excludes-bit-1");

      cache.invalidateMatchingQueries(0b001);

      expect(cache.get(0b100, 0b001)).toBeUndefined();
      expect(cache.get(0b100, 0b010)).toBe("excludes-bit-1");
    });

    test("componentBits === 0 is a no-op", () => {
      const cache = new QueryCache(4);
      cache.set(0b1, 0, "A");
      cache.invalidateMatchingQueries(0);
      expect(cache.get(0b1, 0)).toBe("A");
    });

    test("empty cache is a safe no-op", () => {
      const cache = new QueryCache(4);
      expect(() => {
        cache.invalidateMatchingQueries(0b1);
      }).not.toThrow();
    });
  });

  describe("clear", () => {
    test("empties the cache", () => {
      const cache = new QueryCache(4);
      cache.set(0b1, 0, "A");
      cache.set(0b10, 0, "B");
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get(0b1, 0)).toBeUndefined();
    });
  });
});
