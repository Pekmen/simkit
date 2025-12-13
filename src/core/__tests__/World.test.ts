import { World } from "../World";
import type { EntityId } from "../Entity";

describe("World", () => {
  test("initializing world sets up component manager and handles", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const world = new World(blueprints, { maxEntities: 10 });

    const { Position, Velocity } = world.components;

    expect(Position._name).toBe("Position");
    expect(Velocity._name).toBe("Velocity");
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

  test("adding a component stores the data correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });

    const { Position } = world.components;
    const entityId = world.addEntity();

    world.addComponent(entityId, Position, { x: 10, y: 20 });

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

    world.addComponent(entityId, Position, { x: 10, y: 20 });
    world.removeComponent(entityId, Position);

    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    expect(storages.Position.x[entityId]).toBeUndefined();
    expect(storages.Position.y[entityId]).toBeUndefined();
  });

  test("removing an entity clears all its components", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const world = new World(blueprints, { maxEntities: 5 });
    const { Position, Velocity } = world.components;

    const entityId = world.addEntity();
    world.addComponent(entityId, Position, { x: 10, y: 20 });
    world.addComponent(entityId, Velocity, { dx: 1, dy: 2 });

    world.removeEntity(entityId);

    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    expect(storages.Position.x[entityId]).toBeUndefined();
    expect(storages.Position.y[entityId]).toBeUndefined();
    expect(storages.Velocity.dx[entityId]).toBeUndefined();
    expect(storages.Velocity.dy[entityId]).toBeUndefined();
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

  test("getComponent returns component data as object", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.addComponent(entityId, Position, { x: 10, y: 20 });

    const component = world.getComponent(entityId, Position);

    expect(component).toEqual({ x: 10, y: 20 });
  });

  test("getComponent returns undefined for entity without component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();

    const component = world.getComponent(entityId, Position);

    expect(component).toBeUndefined();
  });

  test("getComponent works with partial component data", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const world = new World(blueprints, { maxEntities: 5 });
    const { Position } = world.components;

    const entityId = world.addEntity();
    world.addComponent(entityId, Position, { x: 15 }); // Only x, y should use default

    const component = world.getComponent(entityId, Position);

    expect(component).toEqual({ x: 15, y: 0 });
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
    world.addComponent(e1, Position, { x: 100, y: 200 });
    world.removeEntity(e1);

    // Recycle ID 0 - will have same value as e1
    const e2 = world.addEntity();
    expect(e2).toBe(0);
    expect(e2).toBe(e1); // Same entity ID (no generation tracking)

    // Add component to recycled entity
    world.addComponent(e2, Position, { x: 50, y: 75 });

    // Verify correct data is stored
    // @ts-expect-error Accessing private storage for testing
    const storages = world.componentManager.componentStorages;

    expect(storages.Position.x[e2]).toBe(50);
    expect(storages.Position.y[e2]).toBe(75);

    // e1 and e2 are the same ID, so both checks return the same result
    expect(world.hasComponent(e1, Position)).toBe(true);
    expect(world.hasComponent(e2, Position)).toBe(true);
  });
});
