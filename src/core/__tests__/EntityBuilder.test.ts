import { World } from "../World";
import { EntityBuilder } from "../EntityBuilder";

describe("EntityBuilder", () => {
  test("spawn creates an EntityBuilder instance", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const builder = world.spawn();

    expect(builder).toBeInstanceOf(EntityBuilder);
  });

  test("with() adds components and returns this for chaining", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const builder = world
      .spawn()
      .with(Position, { x: 10, y: 20 })
      .with(Velocity, { dx: 5, dy: 0 });

    expect(builder).toBeInstanceOf(EntityBuilder);
  });

  test("build() returns the entity ID", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;

    const entityId = world.spawn().with(Position, { x: 10, y: 20 }).build();

    expect(typeof entityId).toBe("number");
    expect(world.hasComponent(entityId, Position)).toBe(true);
  });

  test("components are added correctly via builder", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
        Health: { hp: 100 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity, Health } = world.components;

    const entity = world
      .spawn()
      .with(Position, { x: 10, y: 20 })
      .with(Velocity, { dx: 5, dy: 0 })
      .with(Health, { hp: 50 })
      .build();

    expect(world.hasComponent(entity, Position)).toBe(true);
    expect(world.hasComponent(entity, Velocity)).toBe(true);
    expect(world.hasComponent(entity, Health)).toBe(true);

    const pos = world.getComponent(entity, Position);
    const vel = world.getComponent(entity, Velocity);
    const health = world.getComponent(entity, Health);

    expect(pos).toEqual({ x: 10, y: 20 });
    expect(vel).toEqual({ dx: 5, dy: 0 });
    expect(health).toEqual({ hp: 50 });
  });

  test("with() uses blueprint defaults when no data provided", () => {
    const world = new World(
      {
        Position: { x: 100, y: 200 },
        Velocity: { dx: 10, dy: 20 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const entity = world.spawn().with(Position).with(Velocity).build();

    const pos = world.getComponent(entity, Position);
    const vel = world.getComponent(entity, Velocity);

    expect(pos).toEqual({ x: 100, y: 200 });
    expect(vel).toEqual({ dx: 10, dy: 20 });
  });

  test("with() merges partial data with blueprint defaults", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position } = world.components;

    const entity = world.spawn().with(Position, { x: 42 }).build();

    const pos = world.getComponent(entity, Position);

    expect(pos).toEqual({ x: 42, y: 0 });
  });

  test("entity can be queried after being built", () => {
    const world = new World(
      {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      },
      { maxEntities: 10 },
    );

    const { Position, Velocity } = world.components;

    const entity = world
      .spawn()
      .with(Position, { x: 10, y: 20 })
      .with(Velocity, { dx: 5, dy: 0 })
      .build();

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

    const entity1 = world.spawn().with(Position, { x: 1, y: 2 }).build();
    const entity2 = world.spawn().with(Position, { x: 3, y: 4 }).build();
    const entity3 = world.spawn().with(Position, { x: 5, y: 6 }).build();

    expect(entity1).not.toBe(entity2);
    expect(entity2).not.toBe(entity3);
    expect(entity1).not.toBe(entity3);

    const { entities } = world.query(Position);
    expect(entities).toHaveLength(3);
    expect(entities).toContain(entity1);
    expect(entities).toContain(entity2);
    expect(entities).toContain(entity3);
  });
});
