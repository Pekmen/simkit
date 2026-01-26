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

  test("setComponent stores the component data correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });

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
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.removeComponent(entityId, Position);

    // @ts-expect-error Accessing private property
    const storages = manager.componentStorages;

    // TypedArrays (Float64Array) default to 0, not undefined
    expect(storages.Position.x[entityId]).toBe(0);
    expect(storages.Position.y[entityId]).toBe(0);
  });

  test("removeAllComponents clears all components for the entity", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };

    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.setComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeAllComponents(entityId);

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
    manager.setComponent(entityId, Position, { x: 10, y: 20 });

    const component = manager.getComponent(entityId, Position);

    expect(component).toEqual({ x: 10, y: 20 });
  });

  test("getComponent throws for entity without component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();

    expect(() => manager.getComponent(entityId, Position)).toThrow(
      "getComponent: Entity 0 does not have component Position",
    );
  });

  test("getComponent throws after component is removed", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.removeComponent(entityId, Position);

    expect(() => manager.getComponent(entityId, Position)).toThrow(
      "getComponent: Entity 0 does not have component Position",
    );
  });

  test("hasComponent uses bitset correctly", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    expect(manager.hasComponent(entityId, Position)).toBe(false);

    manager.setComponent(entityId, Position, { x: 10, y: 20 });
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

  test("supports exactly 32 components", () => {
    const blueprints = {} as Record<string, Record<string, number>>;
    for (let i = 0; i < 32; i++) {
      blueprints[`Component${i}`] = { value: 0 };
    }

    const entityManager = new EntityManager(10);
    const manager = new ComponentManager(blueprints, 10, entityManager);

    // Should not throw
    expect(Object.keys(manager.components)).toHaveLength(32);
  });

  test("removeAllComponents clears all bitset flags", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { dx: 0, dy: 0 },
    };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position, Velocity } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.setComponent(entityId, Velocity, { dx: 1, dy: 2 });

    manager.removeAllComponents(entityId);

    expect(manager.hasComponent(entityId, Position)).toBe(false);
    expect(manager.hasComponent(entityId, Velocity)).toBe(false);
  });

  test("setComponent creates component when it does not exist", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    expect(manager.hasComponent(entityId, Position)).toBe(false);

    manager.setComponent(entityId, Position, { x: 10, y: 20 });

    expect(manager.hasComponent(entityId, Position)).toBe(true);
    expect(manager.getComponent(entityId, Position)).toEqual({ x: 10, y: 20 });
  });

  test("setComponent updates existing component data", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.setComponent(entityId, Position, { x: 30, y: 40 });

    const component = manager.getComponent(entityId, Position);
    expect(component).toEqual({ x: 30, y: 40 });
  });

  test("setComponent performs upsert (create or update)", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();

    // Create
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    expect(manager.getComponent(entityId, Position)).toEqual({ x: 10, y: 20 });

    // Update
    manager.setComponent(entityId, Position, { x: 30, y: 40 });
    expect(manager.getComponent(entityId, Position)).toEqual({ x: 30, y: 40 });
  });

  test("setComponent with no data resets to defaults", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    manager.setComponent(entityId, Position);

    const component = manager.getComponent(entityId, Position);
    expect(component).toEqual({ x: 0, y: 0 });
  });

  test("setComponent throws TypeError for wrong property type on new component", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();

    expect(() => {
      manager.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
        y: 20,
      });
    }).toThrow(TypeError);
    expect(() => {
      manager.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
        y: 20,
      });
    }).toThrow("Position.x: expected number, got string");
  });

  test("setComponent throws TypeError for wrong property type", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });

    expect(() => {
      manager.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
      });
    }).toThrow(TypeError);
    expect(() => {
      manager.setComponent(entityId, Position, {
        x: "not a number" as unknown as number,
      });
    }).toThrow("Position.x: expected number, got string");
  });

  test("hasComponent throws for invalid entity", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    entityManager.removeEntity(entityId);

    expect(() => manager.hasComponent(entityId, Position)).toThrow(
      `Stale entity reference: EntityId ${entityId}`,
    );
  });

  test("getComponent throws for invalid entity", () => {
    const blueprints = { Position: { x: 0, y: 0 } };
    const entityManager = new EntityManager(5);
    const manager = new ComponentManager(blueprints, 5, entityManager);
    const { Position } = manager.components;

    const entityId = entityManager.addEntity();
    manager.setComponent(entityId, Position, { x: 10, y: 20 });
    entityManager.removeEntity(entityId);

    expect(() => manager.getComponent(entityId, Position)).toThrow(
      `Stale entity reference: EntityId ${entityId}`,
    );
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
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.setComponent(entity2, Position, { x: 30, y: 40 });

      const result1 = manager.query(Position, Velocity);
      const result2 = manager.query(Position, Velocity);

      // Should return the same cached entities array
      expect(result1.entities).toBe(result2.entities);
      expect(result1.entities).toEqual([entity1]);
      // Storage arrays should be the same references
      expect(result1.Position).toBe(result2.Position);
      expect(result1.Velocity).toBe(result2.Velocity);
    });

    test("cache invalidates on setComponent", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1]);

      // Add component to entity2 - should invalidate cache
      manager.setComponent(entity2, Position, { x: 30, y: 40 });
      manager.setComponent(entity2, Velocity, { dx: 3, dy: 4 });

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
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.setComponent(entity2, Position, { x: 30, y: 40 });
      manager.setComponent(entity2, Velocity, { dx: 3, dy: 4 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1, entity2]);

      // Remove component - should invalidate cache
      manager.removeComponent(entity2, Velocity);

      const result2 = manager.query(Position, Velocity);

      // Should not be the same object (cache was invalidated)
      expect(result1).not.toBe(result2);
      expect(result2.entities).toEqual([entity1]);
    });

    test("cache invalidates on removeAllComponents", () => {
      const blueprints = {
        Position: { x: 0, y: 0 },
        Velocity: { dx: 0, dy: 0 },
      };
      const entityManager = new EntityManager(10);
      const manager = new ComponentManager(blueprints, 10, entityManager);
      const { Position, Velocity } = manager.components;

      const entity1 = entityManager.addEntity();
      const entity2 = entityManager.addEntity();
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.setComponent(entity2, Position, { x: 30, y: 40 });
      manager.setComponent(entity2, Velocity, { dx: 3, dy: 4 });

      const result1 = manager.query(Position, Velocity);
      expect(result1.entities).toEqual([entity1, entity2]);

      // Remove all components from entity - should invalidate cache
      manager.removeAllComponents(entity2);

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
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });
      manager.setComponent(entity2, Position, { x: 30, y: 40 });
      manager.setComponent(entity2, Size, { width: 5, height: 5 });

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
      manager.setComponent(entity, Position, { x: 10, y: 20 });
      manager.setComponent(entity, Velocity, { dx: 1, dy: 2 });

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
      manager.setComponent(entity1, Position, { x: 10, y: 20 });
      manager.setComponent(entity1, Velocity, { dx: 1, dy: 2 });

      // Create entity 2 with Health
      const entity2 = entityManager.addEntity();
      manager.setComponent(entity2, Health, { hp: 50 });

      // Cache two different queries
      const posVelResult1 = manager.query(Position, Velocity);
      const healthResult1 = manager.query(Health);

      expect(posVelResult1.entities).toEqual([entity1]);
      expect(healthResult1.entities).toEqual([entity2]);

      // Delete entity2 (which has Health component)
      manager.removeAllComponents(entity2);

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

    test("query cache respects size limit", () => {
      const blueprints = {
        A: { value: 0 },
        B: { value: 0 },
        C: { value: 0 },
      };
      const entityManager = new EntityManager(100);
      // Create manager with small cache (size 2)
      const manager = new ComponentManager(blueprints, 100, entityManager, 2);
      const { A, B, C } = manager.components;

      const e1 = entityManager.addEntity();
      manager.setComponent(e1, A, { value: 1 });
      manager.setComponent(e1, B, { value: 2 });
      manager.setComponent(e1, C, { value: 3 });

      // Execute 3 queries with cache size 2
      manager.query(A); // Cache: [A]
      manager.query(B); // Cache: [A, B]
      manager.query(C); // Cache: [B, C] (A evicted)

      // Accessing internal cache to verify
      // @ts-expect-error Accessing private for testing
      expect(manager.queryCache.size).toBe(2);
    });

    test("query cache evicts least recently used entry", () => {
      const blueprints = { A: { v: 0 }, B: { v: 0 }, C: { v: 0 } };
      const entityManager = new EntityManager(100);
      const manager = new ComponentManager(blueprints, 100, entityManager, 2); // Cache size 2
      const { A, B, C } = manager.components;

      const e1 = entityManager.addEntity();
      manager.setComponent(e1, A, { v: 1 });
      manager.setComponent(e1, B, { v: 2 });
      manager.setComponent(e1, C, { v: 3 });

      const r1 = manager.query(A); // Cache: [A]
      const r2 = manager.query(B); // Cache: [A, B]

      // Access A again to make it most recent
      const r3 = manager.query(A); // Cache: [B, A] (A moved to end)
      expect(r1.entities).toBe(r3.entities); // Should be cached

      // Add C - should evict B (least recently used)
      manager.query(C); // Cache: [A, C] (B evicted)

      // Verify A is still cached
      const r5 = manager.query(A);
      expect(r3.entities).toBe(r5.entities); // Same cached object

      // Verify B was evicted and rebuilt
      const r6 = manager.query(B);
      expect(r2.entities).not.toBe(r6.entities); // New object
    });

    test("query cache can be disabled with size 0", () => {
      const blueprints = { A: { value: 0 } };
      const entityManager = new EntityManager(100);
      const manager = new ComponentManager(blueprints, 100, entityManager, 0);
      const { A } = manager.components;

      const e1 = entityManager.addEntity();
      manager.setComponent(e1, A, { value: 1 });

      manager.query(A);

      // @ts-expect-error Accessing private for testing
      expect(manager.queryCache.size).toBe(0);
    });
  });
});
