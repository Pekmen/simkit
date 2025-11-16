import { ComponentManager } from "../ComponentManager";
import { EntityManager } from "../EntityManager";

describe("ComponentManager", () => {
  test("initializing creates component storages with correct length", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const entityManager = new EntityManager(10);
    const manager = new ComponentManager(blueprints, 10, entityManager);

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
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = 0;
    manager.addComponent(entityId, Position, { x: 10, y: 20 });

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    expect(storages.Position.x[entityId]).toBe(10);
    expect(storages.Position.y[entityId]).toBe(20);
  });

  test("removeComponent clears the component data for the entity", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = 0;
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
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position, Velocity } = manager.components;

    const entityId = 0;
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
});
