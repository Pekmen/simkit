import { ComponentManager } from "../ComponentManager";
import { EntityManager } from "../EntityManager";

describe("ComponentManager", () => {
  test("initializing creates component storages with correct length", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const entityManager = new EntityManager(10);
    const manager = new ComponentManager(blueprints, 10, entityManager.activeEntities);

    // @ts-expect-error Accessing private property for testing
    const storages = manager.componentStorages;

    expect(storages.Position.x.length).toBe(10);
    expect(storages.Position.y.length).toBe(10);
    expect(storages.Velocity.dx.length).toBe(10);
    expect(storages.Velocity.dy.length).toBe(10);
  });

  test("addComponent stores the component data correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    expect(storages.Position.x[entityId]).toBe(10);
    expect(storages.Position.y[entityId]).toBe(20);
  });

  test("removeComponent clears the component data for the entity", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.removeComponent(entityId, Position);

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    expect(storages.Position.x[entityId]).toBeUndefined();
    expect(storages.Position.y[entityId]).toBeUndefined();
  });

  test("removeEntityComponents clears all components for the entity", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.addComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeEntityComponents(entityId);

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    expect(storages.Position.x[entityId]).toBeUndefined();
    expect(storages.Position.y[entityId]).toBeUndefined();
    expect(storages.Velocity.dx[entityId]).toBeUndefined();
    expect(storages.Velocity.dy[entityId]).toBeUndefined();
  });

  test("getComponent returns component data as object", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });

    const component = manager.getComponent(entityId, Position);

    expect(component).toEqual({ x: 10, y: 20 });
  });

  test("getComponent returns undefined for entity without component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();

    const component = manager.getComponent(entityId, Position);

    expect(component).toBeUndefined();
  });

  test("getComponent returns undefined after component is removed", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.removeComponent(entityId, Position);

    const component = manager.getComponent(entityId, Position);

    expect(component).toBeUndefined();
  });

  test("hasComponent uses bitset correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    expect(manager.hasComponent(entityId, Position)).toBe(false);

    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    expect(manager.hasComponent(entityId, Position)).toBe(true);

    manager.removeComponent(entityId, Position);
    expect(manager.hasComponent(entityId, Position)).toBe(false);
  });

  test("throws error when more than 32 components", () => {
    const blueprints = {} as Record<string, Record<string, number>>;
    for (let i = 0; i < 33; i++) {
      blueprints[`Component${i}`] = { value: 0 };
    }

    const entityManager = new EntityManager(10);
    expect(() => new ComponentManager(blueprints, 10, entityManager.activeEntities)).toThrow(
      "Too many components (33). Maximum is 32.",
    );
  });

  test("removeEntityComponents clears all bitset flags", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager.activeEntities);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.addComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeEntityComponents(entityId);

    expect(manager.hasComponent(entityId, Position)).toBe(false);
    expect(manager.hasComponent(entityId, Velocity)).toBe(false);
  });
});
