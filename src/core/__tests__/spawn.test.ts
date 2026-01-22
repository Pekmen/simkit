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

    const { entities, Position: pos, Velocity: vel } = world.query(
      Position,
      Velocity,
    );

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
