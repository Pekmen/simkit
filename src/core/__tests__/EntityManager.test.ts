import { EntityManager } from "../EntityManager";
import type { EntityId } from "../types";

describe("EntityManager", () => {
  test("addEntity returns sequential entity IDs", () => {
    const manager = new EntityManager(5);

    const e1: EntityId = manager.addEntity();
    const e2: EntityId = manager.addEntity();
    const e3: EntityId = manager.addEntity();

    expect(e1).toBe(0);
    expect(e2).toBe(1);
    expect(e3).toBe(2);
  });

  test("addEntity throws error when exceeding maxEntities", () => {
    const manager = new EntityManager(2);

    manager.addEntity();
    manager.addEntity();

    expect(() => manager.addEntity()).toThrowError(
      "Maximum number of entities reached",
    );
  });

  test("get nextEntityId increments correctly", () => {
    const manager = new EntityManager(3);

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();

    expect(e1).toBe(0);
    expect(e2).toBe(1);
  });

  test("removeEntity allows entity ID to be reused", () => {
    const manager = new EntityManager(5);

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();
    const e3 = manager.addEntity();

    manager.removeEntity(e2);

    const e4 = manager.addEntity();

    expect(e4).toBe(1);
    expect(e4).toBe(e2);

    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e4)).toBe(true);
    expect(manager.isValid(e3)).toBe(true);
    // e2 and e4 are the same ID, so checking e2 is the same as checking e4
    expect(manager.isValid(e2)).toBe(true);
    expect(manager.activeEntities.length).toBe(3);
  });

  test("removeEntity throws error on double deletion (stale reference)", () => {
    const manager = new EntityManager(5);

    const e1 = manager.addEntity();

    manager.removeEntity(e1);

    // Second removal should throw because e1 is now a stale reference
    expect(() => {
      manager.removeEntity(e1);
    }).toThrow(/Stale entity reference/);

    const e2 = manager.addEntity();
    expect(e2).toBe(0); // Reuses the same index
    expect(manager.activeEntities.length).toBe(1);
  });

  test("getEntityCount returns correct count", () => {
    const manager = new EntityManager(10);

    expect(manager.getEntityCount()).toBe(0);

    manager.addEntity();
    manager.addEntity();
    expect(manager.getEntityCount()).toBe(2);

    const e3 = manager.addEntity();
    expect(manager.getEntityCount()).toBe(3);

    manager.removeEntity(e3);
    expect(manager.getEntityCount()).toBe(2);
  });

  test("recycled entity IDs have the same value as the deleted entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    expect(e1).toBe(0);
    expect(manager.isValid(e1)).toBe(true);

    manager.removeEntity(e1);
    expect(manager.isValid(e1)).toBe(false);

    const e2 = manager.addEntity();
    expect(e2).toBe(0);
    expect(manager.isValid(e2)).toBe(true);

    // e1 and e2 are the same numeric value, so both are valid
    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e2)).toBe(true);

    expect(e1).toBe(e2); // Same index value
  });

  test("entity ID is reused after deletion", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    expect(e1).toBe(0);

    manager.removeEntity(e1);

    const e2 = manager.addEntity();
    expect(e2).toBe(0); // Same index reused

    // e1 and e2 are the same numeric value
    expect(e1).toBe(e2);
    expect(manager.isValid(e2)).toBe(true);
  });

  test("isValid returns false for never-created entity", () => {
    const manager = new EntityManager(10);

    // EntityId 5 was never created
    expect(manager.isValid(5 as EntityId)).toBe(false);
  });

  test("isValid returns false for deleted entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    manager.removeEntity(e1);

    expect(manager.isValid(e1)).toBe(false);
  });

  test("isValid returns true for valid entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();

    expect(manager.isValid(e1)).toBe(true);
  });

  test("deleted entities are marked invalid before recycling", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();
    const e3 = manager.addEntity();

    // Delete e2 but don't recycle yet (e1 and e3 still exist)
    manager.removeEntity(e2);

    // e2 is deleted and its index hasn't been recycled yet
    expect(manager.isValid(e2)).toBe(false);

    // e1 and e3 are still valid
    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e3)).toBe(true);
  });

  describe("entity refs", () => {
    test("resolve returns the same id while the entity is alive", () => {
      const manager = new EntityManager(10);

      const e1 = manager.addEntity();
      const ref = manager.ref(e1);

      expect(ref.index).toBe(e1);
      expect(manager.resolve(ref)).toBe(e1);
      expect(manager.isAlive(ref)).toBe(true);
    });

    test("resolve is undefined and isAlive false after removal", () => {
      const manager = new EntityManager(10);

      const e1 = manager.addEntity();
      const ref = manager.ref(e1);

      manager.removeEntity(e1);

      expect(manager.resolve(ref)).toBeUndefined();
      expect(manager.isAlive(ref)).toBe(false);
    });

    test("recycled slot does not resolve a stale ref", () => {
      const manager = new EntityManager(10);

      const e1 = manager.addEntity();
      const staleRef = manager.ref(e1);

      manager.removeEntity(e1);
      const e2 = manager.addEntity();

      // Same numeric slot is reused...
      expect(e2).toBe(e1);
      expect(manager.isValid(e2)).toBe(true);

      // ...but the old ref is detected as stale, while a fresh ref works.
      expect(manager.resolve(staleRef)).toBeUndefined();
      expect(manager.isAlive(staleRef)).toBe(false);
      expect(manager.resolve(manager.ref(e2))).toBe(e2);
    });

    test("generation increments across multiple recycle cycles", () => {
      const manager = new EntityManager(10);

      const refs = [];
      for (let i = 0; i < 4; i++) {
        const e = manager.addEntity();
        refs.push(manager.ref(e));
        manager.removeEntity(e);
      }

      // Every slot here is index 0, distinguished only by generation.
      const generations = refs.map((r) => r.generation);
      expect(new Set(generations).size).toBe(refs.length);
      // None of the now-removed refs resolve.
      for (const r of refs) {
        expect(manager.resolve(r)).toBeUndefined();
      }
    });

    test("resolve is undefined for an out-of-range / never-used index", () => {
      const manager = new EntityManager(10);

      expect(
        manager.resolve({ index: 5 as EntityId, generation: 1 }),
      ).toBeUndefined();
      expect(
        manager.resolve({ index: 99 as EntityId, generation: 1 }),
      ).toBeUndefined();
    });

    test("ref throws on a stale id", () => {
      const manager = new EntityManager(10);

      const e1 = manager.addEntity();
      manager.removeEntity(e1);

      expect(() => manager.ref(e1)).toThrow(/Stale entity reference/);
    });

    test("stale-reference error message guides toward ref/resolve", () => {
      const manager = new EntityManager(10);

      const e1 = manager.addEntity();
      manager.removeEntity(e1);

      expect(() => {
        manager.removeEntity(e1);
      }).toThrow(/world\.ref/);
      expect(() => manager.ref(e1)).toThrow(/world\.resolve/);
    });

    describe("generation wrap-around", () => {
      // White-box access to the private per-slot generation counters. A real
      // wrap only happens after 2^32 reuses of a slot — impossible to reach by
      // looping — so we seed the counter near the boundary directly.
      const gensOf = (m: EntityManager): Uint32Array =>
        (m as unknown as { generations: Uint32Array }).generations;

      test("counter wraps 0xFFFFFFFF -> 0 on removal, pre-wrap ref stays stale", () => {
        const manager = new EntityManager(10);
        const e = manager.addEntity(); // slot 0
        gensOf(manager)[e] = 0xffffffff; // park at the Uint32 max

        const maxedRef = manager.ref(e);
        expect(maxedRef.generation).toBe(0xffffffff);
        expect(manager.resolve(maxedRef)).toBe(e);

        manager.removeEntity(e); // 0xFFFFFFFF + 1 wraps to 0
        expect(gensOf(manager)[e]).toBe(0);

        const reused = manager.addEntity(); // same slot, generation 0
        expect(reused).toBe(e);
        expect(manager.resolve(maxedRef)).toBeUndefined();
        expect(manager.isAlive(maxedRef)).toBe(false);
      });

      test("a wrapped-to-zero generation is itself valid and resolvable", () => {
        const manager = new EntityManager(10);
        const e = manager.addEntity();
        gensOf(manager)[e] = 0xffffffff;
        manager.removeEntity(e); // wraps to 0
        const reused = manager.addEntity(); // slot 0, generation 0

        const ref = manager.ref(reused);
        expect(ref.generation).toBe(0);
        expect(manager.resolve(ref)).toBe(reused);
        expect(manager.isAlive(ref)).toBe(true);
      });

      test("aliasing only occurs after a full 2^32 wrap (documented limitation)", () => {
        const manager = new EntityManager(10);
        const e = manager.addEntity();
        const ref = manager.ref(e); // generation 1
        expect(ref.generation).toBe(1);

        manager.removeEntity(e); // generation -> 2
        const reused = manager.addEntity(); // slot 0, generation 2
        // Different generation => correctly detected as stale.
        expect(manager.resolve(ref)).toBeUndefined();

        // Simulate the counter returning to the ref's original value, which
        // in reality requires 2^32 reuses of this slot. Only then does the old
        // ref alias the live entity — the accepted limit of 32-bit gens.
        gensOf(manager)[reused] = ref.generation;
        expect(manager.resolve(ref)).toBe(reused);
      });
    });
  });
});
