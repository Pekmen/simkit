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

    world.setComponent(e1, Position, { x: 1, y: 2 });
    world.setComponent(e1, Velocity, { dx: 3, dy: 4 });

    world.setComponent(e2, Position, { x: 5, y: 6 });

    world.setComponent(e3, Velocity, { dx: 7, dy: 8 });

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
    world.setComponent(e1, Position, { x: 10, y: 20 });
    world.setComponent(e1, Velocity, { dx: 1, dy: 2 });

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

    world.setComponent(e1, Position, { x: 1, y: 2 });
    world.setComponent(e2, Position, { x: 3, y: 4 });
    world.setComponent(e3, Velocity, { dx: 5, dy: 6 });

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
    world.setComponent(e1, Position, { x: 10, y: 20 });
    world.setComponent(e1, Velocity, { dx: 1, dy: 2 });

    const {
      entities,
      Position: pos,
      Velocity: vel,
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
    world.setComponent(e1, Position, { x: 1, y: 2 });

    let { entities } = world.query(Position, Velocity);
    expect(entities).toHaveLength(0);

    world.setComponent(e1, Velocity, { dx: 3, dy: 4 });

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
    world.setComponent(e1, Position, { x: 1, y: 2 });
    world.setComponent(e1, Velocity, { dx: 3, dy: 4 });

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
    world.setComponent(e1, Position, { x: 1, y: 2 });
    world.setComponent(e1, Velocity, { dx: 3, dy: 4 });

    const e2 = world.addEntity();
    world.setComponent(e2, Position, { x: 5, y: 6 });
    world.setComponent(e2, Health, { hp: 50 });

    const movingEntities = world.query(Position, Velocity);
    const livingEntities = world.query(Position, Health);

    expect(movingEntities.entities).toHaveLength(1);
    expect(movingEntities.entities).toContain(e1);

    expect(livingEntities.entities).toHaveLength(1);
    expect(livingEntities.entities).toContain(e2);
  });

  describe("query exclusion (without)", () => {
    const setup = (): {
      world: World<{
        Position: { x: number; y: number };
        Velocity: { dx: number; dy: number };
        Dead: Record<string, never>;
      }>;
      e1: ReturnType<typeof World.prototype.addEntity>;
      e2: ReturnType<typeof World.prototype.addEntity>;
      e3: ReturnType<typeof World.prototype.addEntity>;
    } => {
      const world = new World(
        { Position: { x: 0, y: 0 }, Velocity: { dx: 0, dy: 0 }, Dead: {} },
        { maxEntities: 10 },
      );
      const { Position, Velocity, Dead } = world.components;
      const e1 = world.addEntity();
      world.setComponent(e1, Position);
      world.setComponent(e1, Velocity);

      const e2 = world.addEntity();
      world.setComponent(e2, Position);
      world.setComponent(e2, Velocity);
      world.setComponent(e2, Dead);

      const e3 = world.addEntity();
      world.setComponent(e3, Position);
      return { world, e1, e2, e3 };
    };

    test("query({ with, without }) excludes entities with the excluded component", () => {
      const { world, e1, e2 } = setup();
      const { Position, Velocity, Dead } = world.components;
      const { entities } = world.query({ with: [Position, Velocity], without: [Dead] });
      expect(entities).toContain(e1);
      expect(entities).not.toContain(e2);
    });

    test("query({ without }) with no with returns all entities lacking the component", () => {
      const { world, e1, e2, e3 } = setup();
      const { Dead } = world.components;
      const { entities } = world.query({ without: [Dead] });
      expect(entities).toContain(e1);
      expect(entities).toContain(e3);
      expect(entities).not.toContain(e2);
    });

    test("query({ with }) without exclusion behaves identically to rest-param form", () => {
      const { world } = setup();
      const { Position } = world.components;
      const optionsResult = world.query({ with: [Position] });
      const restResult = world.query(Position);
      expect(optionsResult.entities).toEqual(restResult.entities);
    });

    test("throws when the same component appears in both with and without", () => {
      const { world } = setup();
      const { Position } = world.components;
      expect(() => {
        world.query({ with: [Position], without: [Position] });
      }).toThrow("with and without");
    });

    test("throws when both with and without are empty", () => {
      const { world } = setup();
      expect(() => {
        world.query({});
      }).toThrow();
    });

    test("cache is invalidated when a component in without is added to an entity", () => {
      const { world, e1 } = setup();
      const { Position, Velocity, Dead } = world.components;
      const before = world.query({ with: [Position, Velocity], without: [Dead] });
      expect(before.entities).toContain(e1);

      world.setComponent(e1, Dead);

      const after = world.query({ with: [Position, Velocity], without: [Dead] });
      expect(after.entities).not.toContain(e1);
    });

    test("cache is invalidated when a component in without is removed from an entity", () => {
      const { world, e2 } = setup();
      const { Position, Velocity, Dead } = world.components;
      const before = world.query({ with: [Position, Velocity], without: [Dead] });
      expect(before.entities).not.toContain(e2);

      world.removeComponent(e2, Dead);

      const after = world.query({ with: [Position, Velocity], without: [Dead] });
      expect(after.entities).toContain(e2);
    });

    test("pure without query reflects entities spawned after it was first run", () => {
      const { world } = setup();
      const { Dead } = world.components;
      world.query({ without: [Dead] }); // prime
      const e4 = world.spawn({ Position: { x: 1, y: 1 } });
      expect(world.query({ without: [Dead] }).entities).toContain(e4);
    });

    test("pure without query reflects bare addEntity after it was first run", () => {
      const { world } = setup();
      const { Dead } = world.components;
      world.query({ without: [Dead] }); // prime
      const e4 = world.addEntity();
      expect(world.query({ without: [Dead] }).entities).toContain(e4);
    });

    test("pure without query drops an entity removed after it was first run", () => {
      const { world, e1 } = setup();
      const { Dead } = world.components;
      expect(world.query({ without: [Dead] }).entities).toContain(e1); // prime
      world.removeEntity(e1);
      expect(world.query({ without: [Dead] }).entities).not.toContain(e1);
    });

    test("addSystem with exclude only receives entities lacking the excluded component", () => {
      const { world, e1, e2 } = setup();
      const { Position, Velocity, Dead } = world.components;
      const seen: number[] = [];
      world.addSystem({
        components: [Position, Velocity],
        exclude: [Dead],
        update({ query }) {
          for (const e of query.entities) seen.push(e);
        },
      });
      world.update(1);
      expect(seen).toContain(e1);
      expect(seen).not.toContain(e2);
    });
  });

  test("query results contain EntityId which can be used directly as index", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 10 });
    const { Position } = world.components;

    // Create and remove entity to trigger recycling
    const e1 = world.addEntity();
    world.setComponent(e1, Position, { x: 1, y: 1 });
    world.removeEntity(e1);

    // Recycled entity ID will be the same as e1
    const e2 = world.addEntity();
    world.setComponent(e2, Position, { x: 2, y: 2 });

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
