import { World, MAX_COMPONENTS, tag } from "../index";

// These tests import *only* from the public barrel (index.ts), the way a real
// consumer would, so the exported surface itself is verified at runtime.
describe("public API (index barrel)", () => {
  test("re-exports World, MAX_COMPONENTS and tag", () => {
    expect(typeof World).toBe("function");
    expect(MAX_COMPONENTS).toBe(32);
    expect(tag).toEqual({});
  });

  test("spawn -> query round-trip through the barrel", () => {
    const world = new World({
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    });
    const { Position, Velocity } = world.components;

    const entity = world.spawn({
      Position: { x: 5, y: 6 },
      Velocity: { dx: 1, dy: 2 },
    });

    const result = world.query(Position, Velocity);
    expect(result.entities).toEqual([entity]);
    expect(result.Position.x[entity]).toBe(5);
    expect(result.Velocity.dy[entity]).toBe(2);
  });

  describe("tag components (public tag constant)", () => {
    test("a tag component gets a bit position but no storage columns", () => {
      const world = new World({
        Position: { x: 0, y: 0 },
        isZombie: tag,
      });
      const { isZombie } = world.components;

      expect(typeof isZombie.bitPosition).toBe("number");
      expect(isZombie.bitMask).toBe(1 << isZombie.bitPosition);

      // @ts-expect-error accessing private storage map for verification
      const storages = world.componentManager.componentStorages;
      // Tag component allocates an (empty) storage object with no prop columns.
      expect(Object.keys(storages.isZombie)).toEqual([]);
    });

    test("a tag is settable and queryable purely via the bitset", () => {
      const world = new World({
        Position: { x: 0, y: 0 },
        isZombie: tag,
      });
      const { Position, isZombie } = world.components;

      const zombie = world.spawn({ Position: { x: 1, y: 1 }, isZombie });
      const human = world.spawn({ Position: { x: 2, y: 2 } });

      expect(world.hasComponent(zombie, isZombie)).toBe(true);
      expect(world.hasComponent(human, isZombie)).toBe(false);

      const zombies = world.query(isZombie);
      expect(zombies.entities).toEqual([zombie]);

      const humans = world.query({ with: [Position], without: [isZombie] });
      expect(humans.entities).toEqual([human]);
    });
  });
});
