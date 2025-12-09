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

    const { storages } = world.query(Position, Velocity);

    expect(storages.Position.x[e1]).toBe(10);
    expect(storages.Position.y[e1]).toBe(20);
    expect(storages.Velocity.dx[e1]).toBe(1);
    expect(storages.Velocity.dy[e1]).toBe(2);
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

    const {
      entities,
      storages: { Position: pos, Velocity: vel },
    } = world.query(Position, Velocity);

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
});
