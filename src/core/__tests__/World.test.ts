import { World } from "../World";
import type { EntityId } from "../types";
import type { System } from "../System";

describe("World", () => {
  test("initializing world sets up component manager and handles", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const world = new World(blueprints, { maxEntities: 10 });

    const { Position, Velocity } = world.components;

    expect(Position.name).toBe("Position");
    expect(Velocity.name).toBe("Velocity");
  });

  test("addEntity returns valid sequential entity IDs", () => {
    const world = new World({}, { maxEntities: 3 });

    const e1: EntityId = world.addEntity();
    const e2: EntityId = world.addEntity();
    const e3: EntityId = world.addEntity();

    expect(e1).toBe(0);
    expect(e2).toBe(1);
    expect(e3).toBe(2);
  });

  test("setting a component stores the data correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });

    const { Position } = world.components;
    const entityId = world.addEntity();

    world.setComponent(entityId, Position, { x: 10, y: 20 });

    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    expect(storages.Position.x[entityId]).toBe(10);
    expect(storages.Position.y[entityId]).toBe(20);
  });

  test("removing a component clears its data for the entity", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });

    const { Position } = world.components;
    const entityId = world.addEntity();

    world.setComponent(entityId, Position, { x: 10, y: 20 });
    world.removeComponent(entityId, Position);

    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    // TypedArrays (Float64Array) default to 0, not undefined
    expect(storages.Position.x[entityId]).toBe(0);
    expect(storages.Position.y[entityId]).toBe(0);
  });

  test("removing an entity clears all its components", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const world = new World(blueprints, { maxEntities: 5 });
    const { Position, Velocity } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });
    world.setComponent(entityId, Velocity, { dx: 1, dy: 2 });

    world.removeEntity(entityId);

    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    // TypedArrays (Float64Array) default to 0, not undefined
    expect(storages.Position.x[entityId]).toBe(0);
    expect(storages.Position.y[entityId]).toBe(0);
    expect(storages.Velocity.dx[entityId]).toBe(0);
    expect(storages.Velocity.dy[entityId]).toBe(0);
  });

  test("adding an entity beyond maxEntities throws an error", () => {
    const world = new World({}, { maxEntities: 2 });

    world.addEntity();
    world.addEntity();

    expect(() => world.addEntity()).toThrow(
      "Maximum number of entities reached",
    );
  });

  test("getEntityCount tracks entity additions and removals", () => {
    const world = new World({}, { maxEntities: 10 });

    expect(world.getEntityCount()).toBe(0);

    const e1 = world.addEntity();
    world.addEntity();
    expect(world.getEntityCount()).toBe(2);

    world.removeEntity(e1);
    expect(world.getEntityCount()).toBe(1);

    world.addEntity(); // Reuses e1's ID
    expect(world.getEntityCount()).toBe(2);
  });

  test("getActiveEntities returns live entity IDs", () => {
    const world = new World({}, { maxEntities: 10 });

    expect(world.getActiveEntities()).toEqual([]);

    const e1 = world.addEntity();
    const e2 = world.addEntity();
    const e3 = world.addEntity();
    expect(world.getActiveEntities()).toEqual([e1, e2, e3]);

    world.removeEntity(e2);
    expect(world.getActiveEntities()).toEqual([e1, e3]);

    const e4 = world.addEntity(); // Reuses e2's ID
    expect(world.getActiveEntities()).toEqual([e1, e3, e4]);
  });

  test("getComponent returns component data as object", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });

    const component = world.getComponent(entityId, Position);

    expect(component).toEqual({ x: 10, y: 20 });
  });

  test("getComponent throws for entity without component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();

    expect(() => world.getComponent(entityId, Position)).toThrow(
      "getComponent: Entity 0 does not have component Position",
    );
  });

  test("getComponent works with partial component data", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 15 }); // Only x, y should use default

    const component = world.getComponent(entityId, Position);

    expect(component).toEqual({ x: 15, y: 0 });
  });

  test("setComponent with partial data preserves existing fields", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });
    world.setComponent(entityId, Position, { x: 50 });

    const component = world.getComponent(entityId, Position);
    expect(component).toEqual({ x: 50, y: 20 });
  });

  test("component storage works correctly after entity recycling", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const world = new World(blueprints, { maxEntities: 10 });
    const { Position } = world.components;

    // Create and destroy entity at ID 0
    const e1 = world.addEntity();
    expect(e1).toBe(0);
    world.setComponent(e1, Position, { x: 100, y: 200 });
    world.removeEntity(e1);

    // Recycle ID 0 - will have same value as e1
    const e2 = world.addEntity();
    expect(e2).toBe(0);
    expect(e2).toBe(e1); // Same entity ID (no generation tracking)

    // Add component to recycled entity
    world.setComponent(e2, Position, { x: 50, y: 75 });

    // Verify correct data is stored
    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    expect(storages.Position.x[e2]).toBe(50);
    expect(storages.Position.y[e2]).toBe(75);

    // e1 and e2 are the same ID, so both checks return the same result
    expect(world.hasComponent(e1, Position)).toBe(true);
    expect(world.hasComponent(e2, Position)).toBe(true);
  });

  test("world respects queryCacheSize option", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, {
      maxEntities: 100,
      queryCacheSize: 2,
    });

    const { Position } = world.components;
    const e = world.addEntity();
    world.setComponent(e, Position, { x: 1, y: 2 });

    world.query(Position);

    // @ts-expect-error Accessing private property
    expect(world.componentManager.queryCache.size).toBe(1);
  });

  test("world uses default queryCacheSize of 64", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 100 });

    const { Position } = world.components;
    const e = world.addEntity();
    world.setComponent(e, Position, { x: 1, y: 2 });

    world.query(Position);

    // @ts-expect-error Accessing private property
    expect(world.componentManager.queryCache.size).toBe(1);
  });

  test("rejects negative queryCacheSize", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    expect(() => {
      new World(blueprints, { maxEntities: 100, queryCacheSize: -1 });
    }).toThrow("queryCacheSize must be non-negative");
  });

  test("hasSystem returns true for registered system", () => {
    const world = new World({}, { maxEntities: 10 });
    const updateFn = vi.fn();

    const system = world.addSystem({ update: updateFn });

    expect(world.hasSystem(system)).toBe(true);
  });

  test("hasSystem returns false for unregistered system", () => {
    const world = new World({}, { maxEntities: 10 });
    const system: System = { update: vi.fn() };

    expect(world.hasSystem(system)).toBe(false);
  });


  test("hasSystem returns false after system is removed", () => {
    const world = new World({}, { maxEntities: 10 });

    const system = world.addSystem({ update: vi.fn() });
    world.removeSystem(system);

    expect(world.hasSystem(system)).toBe(false);
  });

  test("addSystem with priority controls execution order", () => {
    const world = new World({}, { maxEntities: 10 });
    const order: string[] = [];

    world.addSystem({
      priority: 0,
      update() { order.push("A"); },
    });
    world.addSystem({
      priority: 10,
      update() { order.push("B"); },
    });
    world.addSystem({
      priority: 5,
      update() { order.push("C"); },
    });

    world.update(16);

    expect(order).toEqual(["B", "C", "A"]);
  });

  test("hasComponent throws for stale entity reference", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });
    world.removeEntity(entityId);

    expect(() => world.hasComponent(entityId, Position)).toThrow(
      `Stale entity reference: EntityId ${entityId}`,
    );
  });

  test("getComponent throws for stale entity reference", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });
    world.removeEntity(entityId);

    expect(() => world.getComponent(entityId, Position)).toThrow(
      `Stale entity reference: EntityId ${entityId}`,
    );
  });

  test("setComponent validates property types on new component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();

    expect(() => {
      world.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
      });
    }).toThrow(TypeError);
  });

  test("setComponent validates property types", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.setComponent(entityId, Position, { x: 10, y: 20 });

    expect(() => {
      world.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
      });
    }).toThrow(TypeError);
  });

  describe("addSystem", () => {
    test("registers and runs update with correct dt", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const world = new World(blueprints, { maxEntities: 10 });
      const { Position, Velocity } = world.components;

      const receivedDts: number[] = [];
      const sys = world.addSystem({
        components: [Position, Velocity],
        update({ query }, dt) {
          receivedDts.push(dt);
          void query;
        },
      });

      expect(world.hasSystem(sys)).toBe(true);

      world.update(16);
      world.update(32);

      expect(receivedDts).toEqual([16, 32]);
    });

    test("query result is fresh each frame", () => {
      const blueprints = { Position: { x: 0, y: 0 } };
      const world = new World(blueprints, { maxEntities: 10 });
      const { Position } = world.components;

      const entityCounts: number[] = [];
      world.addSystem({
        components: [Position],
        update({ query }) {
          entityCounts.push(query.entities.length);
        },
      });

      world.update(1);
      expect(entityCounts).toEqual([0]);

      const e = world.addEntity();
      world.setComponent(e, Position, { x: 1, y: 2 });
      world.update(1);

      expect(entityCounts).toEqual([0, 1]);
    });

    test("state persists across frames", () => {
      const world = new World(
        { Position: { x: 0, y: 0 } },
        { maxEntities: 10 },
      );
      const { Position } = world.components;

      let externalCount = 0;
      world.addSystem({
        state: { count: 0 },
        components: [Position],
        update({ state }) {
          state.count++;
          externalCount = state.count;
        },
      });

      world.update(1);
      world.update(1);
      world.update(1);

      expect(externalCount).toBe(3);
    });

    test("init is called on add", () => {
      const world = new World({}, { maxEntities: 10 });

      let initCalled = false;
      world.addSystem({
        init() {
          initCalled = true;
        },
        update() {
          // no-op
        },
      });

      expect(initCalled).toBe(true);
    });

    test("destroy is called on removeSystem", () => {
      const world = new World({}, { maxEntities: 10 });

      let destroyCalled = false;
      const sys = world.addSystem({
        destroy() {
          destroyCalled = true;
        },
        update() {
          // no-op
        },
      });

      expect(destroyCalled).toBe(false);

      world.removeSystem(sys);

      expect(destroyCalled).toBe(true);
    });

    test("priority controls execution order", () => {
      const world = new World({}, { maxEntities: 10 });
      const order: string[] = [];

      world.addSystem({
        priority: 0,
        update() {
          order.push("low");
        },
      });
      world.addSystem({
        priority: 10,
        update() {
          order.push("high");
        },
      });
      world.addSystem({
        priority: 5,
        update() {
          order.push("mid");
        },
      });

      world.update(1);

      expect(order).toEqual(["high", "mid", "low"]);
    });

    test("system without components receives state and world", () => {
      const blueprints = { Position: { x: 0, y: 0 } };
      const world = new World(blueprints, { maxEntities: 10 });

      let receivedWorld: unknown = null;
      let receivedEmptyEntities = false;
      world.addSystem({
        state: { tag: "no-query" },
        update({ state, world: w, query }) {
          receivedWorld = w;
          receivedEmptyEntities = query.entities.length === 0;
          void state;
        },
      });

      world.update(1);

      expect(receivedWorld).toBe(world);
      expect(receivedEmptyEntities).toBe(true);
    });

    test("rejects component handles from a different world", () => {
      const blueprints = { Position: { x: 0, y: 0 } };
      const world1 = new World(blueprints, { maxEntities: 10 });
      const world2 = new World(blueprints, { maxEntities: 10 });

      expect(() => {
        world2.addSystem({
          components: [world1.components.Position],
          update() {
            // no-op
          },
        });
      }).toThrow(
        'addSystem: component handle "Position" does not belong to this world',
      );
    });

    test("init and destroy receive state and world", () => {
      const world = new World({}, { maxEntities: 10 });

      let initState: unknown = null;
      let initWorld: unknown = null;
      let destroyState: unknown = null;
      let destroyWorld: unknown = null;

      const sys = world.addSystem({
        state: { value: 42 },
        init({ state, world: w }) {
          initState = state;
          initWorld = w;
        },
        update() {
          // no-op
        },
        destroy({ state, world: w }) {
          destroyState = state;
          destroyWorld = w;
        },
      });

      expect(initState).toEqual({ value: 42 });
      expect(initWorld).toBe(world);

      world.removeSystem(sys);

      expect(destroyState).toEqual({ value: 42 });
      expect(destroyWorld).toBe(world);
    });
  });

  describe("destroy", () => {
    test("calls destroy() on all systems", () => {
      const world = new World({}, { maxEntities: 10 });
      const destroyA = vi.fn();
      const destroyB = vi.fn();

      world.addSystem({
        update() { /* no-op */ },
        destroy() { destroyA(); },
      });
      world.addSystem({
        update() { /* no-op */ },
        destroy() { destroyB(); },
      });

      world.destroy();

      expect(destroyA).toHaveBeenCalledTimes(1);
      expect(destroyB).toHaveBeenCalledTimes(1);
    });

    test("removes all entities", () => {
      const blueprints = { Position: { x: 0, y: 0 } };
      const world = new World(blueprints, { maxEntities: 10 });
      const { Position } = world.components;

      const e1 = world.addEntity();
      const e2 = world.addEntity();
      const e3 = world.addEntity();

      world.setComponent(e1, Position, { x: 1, y: 1 });
      world.setComponent(e2, Position, { x: 2, y: 2 });
      world.setComponent(e3, Position, { x: 3, y: 3 });

      expect(world.getEntityCount()).toBe(3);

      world.destroy();

      expect(world.getEntityCount()).toBe(0);
    });

    test("removes entities even when a system's destroy throws", () => {
      const blueprints = { Position: { x: 0, y: 0 } };
      const world = new World(blueprints, { maxEntities: 10 });
      const { Position } = world.components;

      world.addSystem({
        update() { /* no-op */ },
        destroy() {
          throw new Error("boom");
        },
      });

      const e1 = world.addEntity();
      const e2 = world.addEntity();
      world.setComponent(e1, Position, { x: 1, y: 1 });
      world.setComponent(e2, Position, { x: 2, y: 2 });

      expect(world.getEntityCount()).toBe(2);

      expect(() => {
        world.destroy();
      }).toThrow();

      expect(world.getEntityCount()).toBe(0);
    });

    test("unregisters all systems", () => {
      const world = new World({}, { maxEntities: 10 });

      const systemA = world.addSystem({ update() { /* no-op */ } });
      const systemB = world.addSystem({ update() { /* no-op */ } });

      expect(world.hasSystem(systemA)).toBe(true);
      expect(world.hasSystem(systemB)).toBe(true);

      world.destroy();

      expect(world.hasSystem(systemA)).toBe(false);
      expect(world.hasSystem(systemB)).toBe(false);
    });
  });
});
