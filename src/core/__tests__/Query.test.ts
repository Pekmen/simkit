import { World } from "../World";

describe("Query", () => {
  test("query returns entities with all requested components", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    const e2 = world.addEntity();
    const e3 = world.addEntity();

    world.addComponent(e1, Position, { x: 1, y: 2 });
    world.addComponent(e1, Velocity, { dx: 3, dy: 4 });

    world.addComponent(e2, Position, { x: 5, y: 6 });

    world.addComponent(e3, Velocity, { dx: 7, dy: 8 });

    const { entities } = world.query(Position, Velocity);

    expect(entities).toHaveLength(1);
    expect(entities).toContain(e1);
    expect(entities).not.toContain(e2);
    expect(entities).not.toContain(e3);
  });

  test("query returns correct storages", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 10, y: 20 });
    world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

    const { Position: pos, Velocity: vel } = world.query(Position, Velocity);

    expect(pos.x[e1]).toBe(10);
    expect(pos.y[e1]).toBe(20);
    expect(vel.dx[e1]).toBe(1);
    expect(vel.dy[e1]).toBe(2);
  });

  test("query with single component returns matching entities", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    const e2 = world.addEntity();
    const e3 = world.addEntity();

    world.addComponent(e1, Position, { x: 1, y: 2 });
    world.addComponent(e2, Position, { x: 3, y: 4 });
    world.addComponent(e3, Velocity, { dx: 5, dy: 6 });

    const { entities } = world.query(Position);

    expect(entities).toHaveLength(2);
    expect(entities).toContain(e1);
    expect(entities).toContain(e2);
    expect(entities).not.toContain(e3);
  });

  test("query returns empty array when no entities match", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const { entities } = world.query(Position, Velocity);

    expect(entities).toHaveLength(0);
  });

  test("query can be used to directly modify component data", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 10, y: 20 });
    world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

    const { entities, Position: pos, Velocity: vel } = world.query(
      Position,
      Velocity,
    );

    for (const e of entities) {
      pos.x[e] = pos.x[e] + vel.dx[e];
      pos.y[e] = pos.y[e] + vel.dy[e];
    }

    expect(pos.x[e1]).toBe(11);
    expect(pos.y[e1]).toBe(22);
  });

  test("query updates after components are added", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 1, y: 2 });

    let { entities } = world.query(Position, Velocity);
    expect(entities).toHaveLength(0);

    world.addComponent(e1, Velocity, { dx: 3, dy: 4 });

    ({ entities } = world.query(Position, Velocity));
    expect(entities).toHaveLength(1);
    expect(entities).toContain(e1);
  });

  test("query updates after components are removed", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 1, y: 2 });
    world.addComponent(e1, Velocity, { dx: 3, dy: 4 });

    let { entities } = world.query(Position, Velocity);
    expect(entities).toHaveLength(1);

    world.removeComponent(e1, Velocity);

    ({ entities } = world.query(Position, Velocity));
    expect(entities).toHaveLength(0);
  });

  test("multiple queries can be created for different component combinations", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
        Health: { hp: 100 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity, Health } = world.components;

    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 1, y: 2 });
    world.addComponent(e1, Velocity, { dx: 3, dy: 4 });

    const e2 = world.addEntity();
    world.addComponent(e2, Position, { x: 5, y: 6 });
    world.addComponent(e2, Health, { hp: 50 });

    const movingEntities = world.query(Position, Velocity);
    const livingEntities = world.query(Position, Health);

    expect(movingEntities.entities).toHaveLength(1);
    expect(movingEntities.entities).toContain(e1);

    expect(livingEntities.entities).toHaveLength(1);
    expect(livingEntities.entities).toContain(e2);
  });

  test("query results contain EntityId which can be used directly as index", () => {
    const world = new World(
      { Position: { x: 0, y: 0 } },
      { maxEntities: 10 },
    );
    const { Position } = world.components;

    // Create and remove entity to trigger recycling
    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 1, y: 1 });
    world.removeEntity(e1);

    // Recycled entity ID will be the same as e1
    const e2 = world.addEntity();
    world.addComponent(e2, Position, { x: 2, y: 2 });

    const { entities, Position: pos } = world.query(Position);

    // Entity array contains EntityIds
    expect(entities).toHaveLength(1);
    const entityInResult = entities[0];

    expect(entityInResult).toBe(e2);
    expect(entityInResult).toBe(0); // ID 0 was recycled
    expect(entityInResult).toBe(e1); // e2 has the same ID as e1 (no generation tracking)

    // Storage access works with the EntityId directly
    expect(pos.x[entityInResult]).toBe(2);
    expect(pos.y[entityInResult]).toBe(2);
  });
});
