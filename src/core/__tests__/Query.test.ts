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

    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);
    // @ts-expect-error Accessing private entityManager for testing
    const e2Index = world.entityManager.getEntityIndex(e2);
    // @ts-expect-error Accessing private entityManager for testing
    const e3Index = world.entityManager.getEntityIndex(e3);

    expect(entities).toHaveLength(1);
    expect(entities).toContain(e1Index);
    expect(entities).not.toContain(e2Index);
    expect(entities).not.toContain(e3Index);
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

    const { storages } = world.query(Position, Velocity);

    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);

    expect(storages.Position.x[e1Index]).toBe(10);
    expect(storages.Position.y[e1Index]).toBe(20);
    expect(storages.Velocity.dx[e1Index]).toBe(1);
    expect(storages.Velocity.dy[e1Index]).toBe(2);
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

    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);
    // @ts-expect-error Accessing private entityManager for testing
    const e2Index = world.entityManager.getEntityIndex(e2);
    // @ts-expect-error Accessing private entityManager for testing
    const e3Index = world.entityManager.getEntityIndex(e3);

    expect(entities).toHaveLength(2);
    expect(entities).toContain(e1Index);
    expect(entities).toContain(e2Index);
    expect(entities).not.toContain(e3Index);
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

    const {
      entities,
      storages: { Position: pos, Velocity: vel },
    } = world.query(Position, Velocity);

    for (const e of entities) {
      pos.x[e] = pos.x[e] + vel.dx[e];
      pos.y[e] = pos.y[e] + vel.dy[e];
    }

    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);

    expect(pos.x[e1Index]).toBe(11);
    expect(pos.y[e1Index]).toBe(22);
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
    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);
    expect(entities).toHaveLength(1);
    expect(entities).toContain(e1Index);
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

    // @ts-expect-error Accessing private entityManager for testing
    const e1Index = world.entityManager.getEntityIndex(e1);
    // @ts-expect-error Accessing private entityManager for testing
    const e2Index = world.entityManager.getEntityIndex(e2);

    expect(movingEntities.entities).toHaveLength(1);
    expect(movingEntities.entities).toContain(e1Index);

    expect(livingEntities.entities).toHaveLength(1);
    expect(livingEntities.entities).toContain(e2Index);
  });

  test("query results contain EntityIndex, not EntityId", () => {
    const world = new World(
      { Position: { x: 0, y: 0 } },
      { maxEntities: 10 },
    );
    const { Position } = world.components;

    // Create and remove entity to trigger recycling
    const e1 = world.addEntity();
    world.addComponent(e1, Position, { x: 1, y: 1 });
    world.removeEntity(e1);

    // Recycled entity with generation > 0
    const e2 = world.addEntity();
    world.addComponent(e2, Position, { x: 2, y: 2 });

    const { entities, storages } = world.query(Position);

    // Entity array contains indices, not IDs
    expect(entities).toHaveLength(1);
    const indexInResult = entities[0];
    // @ts-expect-error Accessing private entityManager for testing
    const e2Index = world.entityManager.getEntityIndex(e2);

    expect(indexInResult).toBe(e2Index);
    expect(indexInResult).toBe(0); // Index 0 was recycled
    expect(indexInResult).not.toBe(e2); // e2 has generation bits set

    // Storage access works with the index
    expect(storages.Position.x[indexInResult]).toBe(2);
    expect(storages.Position.y[indexInResult]).toBe(2);
  });
});
