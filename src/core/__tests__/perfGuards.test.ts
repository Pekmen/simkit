import { World } from "../World";

// Deterministic guards for hot-path optimizations. These do not measure time;
// they assert the *shape* of the work done, so a regression that quietly turns
// a batched operation back into an O(n) loop fails the suite instead of only
// showing up as a slower benchmark.
describe("performance invariants", () => {
  test("spawn does one bitset write and one cache invalidation for a multi-component entity", () => {
    const world = new World(
      { A: { v: 0 }, B: { v: 0 }, C: { v: 0 } },
      { maxEntities: 10 },
    );
    // @ts-expect-error reaching into private managers for a perf invariant
    const bitsets = world.componentManager.bitsets;
    // @ts-expect-error reaching into private managers for a perf invariant
    const queryCache = world.componentManager.queryCache;

    const addSpy = vi.spyOn(bitsets, "add");
    const maskSpy = vi.spyOn(bitsets, "setComponentMask");
    const invSpy = vi.spyOn(queryCache, "invalidateMatchingQueries");

    world.spawn({ A: { v: 1 }, B: { v: 2 }, C: { v: 3 } });

    // The spawn fast-path writes the whole component mask once and invalidates
    // the cache once, rather than an incremental add()+invalidate() per component.
    expect(maskSpy).toHaveBeenCalledTimes(1);
    expect(invSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).not.toHaveBeenCalled();
  });

  test("createQueryFn computes masks once at registration, not per frame", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 10 });
    const { Position } = world.components;

    // @ts-expect-error reaching into private managers for a perf invariant
    const bitsets = world.componentManager.bitsets;
    const createMaskSpy = vi.spyOn(bitsets, "createMask");

    world.addSystem({ components: [Position], update: vi.fn() });
    const afterRegister = createMaskSpy.mock.calls.length;

    world.update(1);
    world.update(1);
    world.update(1);

    // No further mask computation happened during the update frames.
    expect(createMaskSpy.mock.calls.length).toBe(afterRegister);
  });

  test("repeated identical query returns the same frozen entities reference (cache hit)", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 10 });
    const { Position } = world.components;

    world.spawn({ Position: { x: 1, y: 1 } });

    const first = world.query(Position);
    const second = world.query(Position);

    expect(first.entities).toBe(second.entities);
    expect(Object.isFrozen(first.entities)).toBe(true);
  });
});
