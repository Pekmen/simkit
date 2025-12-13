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

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();
    const e3 = manager.addEntity();

    manager.removeEntity(e2);

    const e4 = manager.addEntity();

    expect(e4).toBe(1);
    expect(e4).toBe(e2);

    expect(manager.activeEntities.has(e1)).toBe(true);
    expect(manager.activeEntities.has(e4)).toBe(true);
    expect(manager.activeEntities.has(e3)).toBe(true);
    // e2 and e4 are the same ID, so checking e2 is the same as checking e4
    expect(manager.activeEntities.has(e2)).toBe(true);
    expect(manager.activeEntities.size).toBe(3);
  });

  test("removeEntity prevents duplicate IDs in free list", () => {
    const manager = new EntityManager(5);

    const e1 = manager.addEntity();

    manager.removeEntity(e1);
    manager.removeEntity(e1);

    const e2 = manager.addEntity();
    const e3 = manager.addEntity();

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

  test("recycled entity IDs have the same value as the deleted entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    expect(e1).toBe(0);
    expect(manager.activeEntities.has(e1)).toBe(true);

    manager.removeEntity(e1);
    expect(manager.activeEntities.has(e1)).toBe(false);

    const e2 = manager.addEntity();
    expect(e2).toBe(0);
    expect(manager.activeEntities.has(e2)).toBe(true);
    // e1 and e2 are the same ID, so checking e1 is the same as checking e2
    expect(manager.activeEntities.has(e1)).toBe(true);

    expect(e1).toBe(e2);
  });
});
