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
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.removeComponent(entityId, Position);

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    // TypedArrays (Float64Array) default to 0, not undefined
    expect(storages.Position.x[entityId]).toBe(0);
    expect(storages.Position.y[entityId]).toBe(0);
  });

  test("removeEntityComponents clears all components for the entity", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.addComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeEntityComponents(entityId);

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    // TypedArrays (Float64Array) default to 0, not undefined
    expect(storages.Position.x[entityId]).toBe(0);
    expect(storages.Position.y[entityId]).toBe(0);
    expect(storages.Velocity.dx[entityId]).toBe(0);
    expect(storages.Velocity.dy[entityId]).toBe(0);
  });

  test("getComponent returns component data as object", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });

    const component = manager.getComponent(entityId, Position);

    expect(component).toEqual({ x: 10, y: 20 });
  });

  test("getComponent returns undefined for entity without component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();

    const component = manager.getComponent(entityId, Position);

    expect(component).toBeUndefined();
  });

  test("getComponent returns undefined after component is removed", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
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
    const manager = new ComponentManager(blueprints, 5, entityManager);
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
    expect(() => new ComponentManager(blueprints, 10, entityManager)).toThrow(
      "Too many components (33). Maximum is 32.",
    );
  });

  test("removeEntityComponents clears all bitset flags", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.addComponent(entityId, Position, { x: 10, y: 20 });
    manager.addComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeEntityComponents(entityId);

    expect(manager.hasComponent(entityId, Position)).toBe(false);
    expect(manager.hasComponent(entityId, Velocity)).toBe(false);
  });

  describe("Query Caching", () => {
    test("query returns cached result on second call with same components", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.addComponent(entity2, Position, { x: 30, y: 40 });

      const result1 = manager.query(Position, Velocity);
      const result2 = manager.query(Position, Velocity);

      // Should return the same cached entities array
      expect(result1.entities).toBe(result2.entities);
      expect(result1.entities).toEqual([entity1]);
      // Storage arrays should be the same references
      expect(result1.Position).toBe(result2.Position);
      expect(result1.Velocity).toBe(result2.Velocity);
    });

    test("cache invalidates on addComponent", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1]);

      // Add component to entity2 - should invalidate cache
      manager.addComponent(entity2, Position, { x: 30, y: 40 });
      manager.addComponent(entity2, Velocity, { dx: 3, dy: 4 });

      const result2 = manager.query(Position, Velocity);

      // Should not be the same object (cache was invalidated)
      expect(result1).not.toBe(result2);
      expect(result2.entities).toEqual([entity1, entity2]);
    });

    test("cache invalidates on removeComponent", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.addComponent(entity2, Position, { x: 30, y: 40 });
      manager.addComponent(entity2, Velocity, { dx: 3, dy: 4 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1, entity2]);

      // Remove component - should invalidate cache
      manager.removeComponent(entity2, Velocity);

      const result2 = manager.query(Position, Velocity);

      // Should not be the same object (cache was invalidated)
      expect(result1).not.toBe(result2);
      expect(result2.entities).toEqual([entity1]);
    });

    test("cache invalidates on removeEntityComponents", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.addComponent(entity2, Position, { x: 30, y: 40 });
      manager.addComponent(entity2, Velocity, { dx: 3, dy: 4 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1, entity2]);

      // Remove all components from entity - should invalidate cache
      manager.removeEntityComponents(entity2);

      const result2 = manager.query(Position, Velocity);

      // Should not be the same object (cache was invalidated)
      expect(result1).not.toBe(result2);
      expect(result2.entities).toEqual([entity1]);
    });

    test("different queries cache separately", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
        Size: { width: 0, height: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity, Size } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.addComponent(entity2, Position, { x: 30, y: 40 });
      manager.addComponent(entity2, Size, { width: 5, height: 5 });

      const result1 = manager.query(Position, Velocity);
      const result2 = manager.query(Position, Size);
      const result3 = manager.query(Position, Velocity); // Same as result1
      const result4 = manager.query(Position, Size); // Same as result2

      // Different queries should have different results
      expect(result1.entities).toEqual([entity1]);
      expect(result2.entities).toEqual([entity2]);

      // Same queries should return cached entities arrays
      expect(result1.entities).toBe(result3.entities);
      expect(result2.entities).toBe(result4.entities);
      // Storage arrays should also be the same references
      expect(result1.Position).toBe(result3.Position);
      expect(result2.Position).toBe(result4.Position);
    });

    test("query cache returns correct storages from cache", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity = entityManager.addEntity();
      manager.addComponent(entity, Position, { x: 10, y: 20 });
      manager.addComponent(entity, Velocity, { dx: 1, dy: 2 });

      const result1 = manager.query(Position, Velocity);
      const result2 = manager.query(Position, Velocity);

      // Storage arrays should be the same references (pointing to actual storage arrays)
      expect(result1.Position).toBe(result2.Position);
      expect(result1.Velocity).toBe(result2.Velocity);
      expect(result1.Position).toBeDefined();
      expect(result1.Velocity).toBeDefined();
      expect(result1.Position.x[entity]).toBe(10);
      expect(result1.Velocity.dx[entity]).toBe(1);
    });

    test("selective cache invalidation on entity deletion", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
        Health: { hp: 100 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity, Health } = manager.components;

      // Create entity 1 with Position and Velocity
      const entity1 = entityManager.addEntity();
      manager.addComponent(entity1, Position, { x: 10, y: 20 });
      manager.addComponent(entity1, Velocity, { dx: 1, dy: 2 });

      // Create entity 2 with Health
      const entity2 = entityManager.addEntity();
      manager.addComponent(entity2, Health, { hp: 50 });

      // Cache two different queries
      const posVelResult1 = manager.query(Position, Velocity);
      const healthResult1 = manager.query(Health);

      expect(posVelResult1.entities).toEqual([entity1]);
      expect(healthResult1.entities).toEqual([entity2]);

      // Delete entity2 (which has Health component)
      manager.removeEntityComponents(entity2);

      // Query for Position+Velocity again - should still be cached
      const posVelResult2 = manager.query(Position, Velocity);
      // Query for Health again - should be invalidated and rebuilt
      const healthResult2 = manager.query(Health);

      // Position+Velocity query should return the SAME cached object
      // because entity2's deletion didn't affect Position or Velocity components
      expect(posVelResult1).toBe(posVelResult2);
      expect(posVelResult2.entities).toEqual([entity1]);

      // Health query should return a NEW object (cache was invalidated)
      // because entity2 had the Health component
      expect(healthResult1).not.toBe(healthResult2);
      expect(healthResult2.entities).toEqual([]);
    });
  });
});
