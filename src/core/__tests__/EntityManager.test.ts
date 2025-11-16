import { EntityManager } from "../EntityManager";
import type { EntityId } from "../Entity";

describe("EntityManager", () => {
  test("addEntity returns sequential entity IDs", () => {
    const manager = new EntityManager(5);

    const e1: EntityId = manager.addEntity();
    const e2: EntityId = manager.addEntity();
    const e3: EntityId = manager.addEntity();

    expect(e1).toBe(0);
    expect(e2).toBe(1);
    expect(e3).toBe(2);
  });

  test("addEntity throws error when exceeding maxEntities", () => {
    const manager = new EntityManager(2);

    manager.addEntity();
    manager.addEntity();

    expect(() => manager.addEntity()).toThrowError(
      "Maximum number of entities reached",
    );
  });

  test("get nextEntityId increments correctly", () => {
    const manager = new EntityManager(3);

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();

    expect(e1).toBe(0);
    expect(e2).toBe(1);
  });

  test("removeEntity allows entity ID to be reused", () => {
    const manager = new EntityManager(5);

    manager.addEntity(); // ID 0
    const e2 = manager.addEntity(); // ID 1
    manager.addEntity(); // ID 2

    manager.removeEntity(e2); // Remove ID 1

    const e4 = manager.addEntity(); // Should reuse ID 1

    expect(e4).toBe(1);
    expect(manager.activeEntities.has(0)).toBe(true);
    expect(manager.activeEntities.has(1)).toBe(true);
    expect(manager.activeEntities.has(2)).toBe(true);
    expect(manager.activeEntities.size).toBe(3);
  });

  test("removeEntity prevents duplicate IDs in free list", () => {
    const manager = new EntityManager(5);

    const e1 = manager.addEntity(); // ID 0

    // Remove the same entity multiple times
    manager.removeEntity(e1);
    manager.removeEntity(e1); // Second removal should be ignored

    const e2 = manager.addEntity(); // Should reuse ID 0
    const e3 = manager.addEntity(); // Should get ID 1 (not ID 0 again)

    expect(e2).toBe(0);
    expect(e3).toBe(1);
    expect(manager.activeEntities.size).toBe(2);
  });

  test("getEntityCount returns correct count", () => {
    const manager = new EntityManager(10);

    expect(manager.getEntityCount()).toBe(0);

    manager.addEntity();
    manager.addEntity();
    expect(manager.getEntityCount()).toBe(2);

    const e3 = manager.addEntity();
    expect(manager.getEntityCount()).toBe(3);

    manager.removeEntity(e3);
    expect(manager.getEntityCount()).toBe(2);
  });
});
