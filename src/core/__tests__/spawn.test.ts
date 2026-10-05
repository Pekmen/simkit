import { World } from "../World";

describe("spawn", () => {
  test("spawn returns entity ID", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const entityId = world.spawn({
      Position: { x: 10, y: 20 },
    });

    expect(typeof entityId).toBe("number");
    expect(world.hasComponent(entityId, world.components.Position)).toBe(true);
  });

  test("spawn throws a clear error for an unknown component key", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 10 });

    expect(() => world.spawn({ Velocity: { dx: 1, dy: 1 } } as never)).toThrow(
      'spawn: unknown component "Velocity"',
    );
  });

  test("spawn surfaces the entity cap error", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 1 });
    world.spawn({ Position: { x: 1, y: 1 } });

    expect(() => world.spawn({ Position: { x: 2, y: 2 } })).toThrow(
      "maximum number of entities reached (1)",
    );
  });

  test("spawn does not leak an entity slot when config validation fails", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 10 });

    expect(() =>
      world.spawn({ Velocity: { dx: 1, dy: 1 } } as never),
    ).toThrow();
    expect(world.getEntityCount()).toBe(0);

    // The freed id must be reusable, not stuck as a phantom active entity.
    const entity = world.spawn({ Position: { x: 1, y: 1 } });
    expect(world.getEntityCount()).toBe(1);
    expect(entity).toBe(0);
  });

  test("spawn does not leak partial storage when a later component in the config fails validation", () => {
    const world = new World({ A: { x: 0 }, B: { y: 0 } }, { maxEntities: 10 });
    const { A } = world.components;

    expect(() =>
      world.spawn({ A: { x: 42 }, B: { y: "bad" as never } }),
    ).toThrow(/expected number, got string/);

    // A's bit was never set, so it's correctly absent via the public API...
    expect(world.query(A).entities).toEqual([]);

    // ...and, unlike before this fix, A's raw storage was never written either,
    // so a freshly recycled entity doesn't inherit stale data from the failed spawn.
    const recycled = world.spawn({ B: { y: 7 } });
    expect(world.hasComponent(recycled, A)).toBe(false);
    expect(world.query(A).A.x[recycled]).toBe(0);
  });

  test("spawn with single component", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;
    const entity = world.spawn({
      Position: { x: 10, y: 20 },
    });

    expect(world.hasComponent(entity, Position)).toBe(true);
    expect(world.getComponent(entity, Position)).toEqual({ x: 10, y: 20 });
  });

  test("spawn with multiple components", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
        Health: { hp: 100 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity, Health } = world.components;

    const entity = world.spawn({
      Position: { x: 10, y: 20 },
      Velocity: { dx: 5, dy: 0 },
      Health: { hp: 50 },
    });

    expect(world.hasComponent(entity, Position)).toBe(true);
    expect(world.hasComponent(entity, Velocity)).toBe(true);
    expect(world.hasComponent(entity, Health)).toBe(true);

    expect(world.getComponent(entity, Position)).toEqual({ x: 10, y: 20 });
    expect(world.getComponent(entity, Velocity)).toEqual({ dx: 5, dy: 0 });
    expect(world.getComponent(entity, Health)).toEqual({ hp: 50 });
  });

  test("spawn with empty object for defaults", () => {
    const world = new World(
      {
        Position: { x: 100, y: 200 },
        Velocity: { dx: 10, dy: 20 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const entity = world.spawn({
      Position: {},
      Velocity: {},
    });

    expect(world.getComponent(entity, Position)).toEqual({ x: 100, y: 200 });
    expect(world.getComponent(entity, Velocity)).toEqual({ dx: 10, dy: 20 });
  });

  test("spawn merges partial data with blueprint defaults", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;

    const entity = world.spawn({
      Position: { x: 42 },
    });

    expect(world.getComponent(entity, Position)).toEqual({ x: 42, y: 0 });
  });

  test("entity can be queried after spawn", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const entity = world.spawn({
      Position: { x: 10, y: 20 },
      Velocity: { dx: 5, dy: 0 },
    });

    const {
      entities,
      Position: pos,
      Velocity: vel,
    } = world.query(Position, Velocity);

    expect(entities).toContain(entity);
    expect(pos.x[entity]).toBe(10);
    expect(pos.y[entity]).toBe(20);
    expect(vel.dx[entity]).toBe(5);
    expect(vel.dy[entity]).toBe(0);
  });

  test("multiple entities can be spawned in sequence", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;

    const entity1 = world.spawn({ Position: { x: 1, y: 2 } });
    const entity2 = world.spawn({ Position: { x: 3, y: 4 } });
    const entity3 = world.spawn({ Position: { x: 5, y: 6 } });

    expect(entity1).not.toBe(entity2);
    expect(entity2).not.toBe(entity3);
    expect(entity1).not.toBe(entity3);

    const { entities } = world.query(Position);
    expect(entities).toHaveLength(3);
    expect(entities).toContain(entity1);
    expect(entities).toContain(entity2);
    expect(entities).toContain(entity3);
  });

  test("spawn with empty config creates entity without components", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;

    const entity = world.spawn({});

    expect(world.getEntityCount()).toBe(1);
    expect(world.hasComponent(entity, Position)).toBe(false);
  });

  test("spawn with component handle shorthand uses defaults", () => {
    const world = new World(
      {
        Position: { x: 100, y: 200 },
        Velocity: { dx: 10, dy: 20 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const entity = world.spawn({
      Position,
      Velocity,
    });

    expect(world.getComponent(entity, Position)).toEqual({ x: 100, y: 200 });
    expect(world.getComponent(entity, Velocity)).toEqual({ dx: 10, dy: 20 });
  });

  test("spawn with mixed handles and data objects", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 10, dy: 20 },
        Health: { hp: 100 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity, Health } = world.components;

    const entity = world.spawn({
      Position: { x: 42, y: 99 },
      Velocity,
      Health,
    });

    expect(world.getComponent(entity, Position)).toEqual({ x: 42, y: 99 });
    expect(world.getComponent(entity, Velocity)).toEqual({ dx: 10, dy: 20 });
    expect(world.getComponent(entity, Health)).toEqual({ hp: 100 });
  });

  test("spawn invalidates query cache correctly", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    // Initial query creates cache entry
    const result1 = world.query(Position, Velocity);
    expect(result1.entities).toHaveLength(0);

    // Spawn entity with Position and Velocity
    world.spawn({
      Position: { x: 10, y: 20 },
      Velocity: { dx: 5, dy: 0 },
    });

    // Query should return the new entity (cache was invalidated)
    const result2 = world.query(Position, Velocity);
    expect(result2.entities).toHaveLength(1);
  });
});
