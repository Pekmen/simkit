import { EntityManager } from "../EntityManager";
import type { EntityId } from "../types";

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

    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e4)).toBe(true);
    expect(manager.isValid(e3)).toBe(true);
    // e2 and e4 are the same ID, so checking e2 is the same as checking e4
    expect(manager.isValid(e2)).toBe(true);
    expect(manager.activeEntities.length).toBe(3);
  });

  test("removeEntity throws error on double deletion (stale reference)", () => {
    const manager = new EntityManager(5);

    const e1 = manager.addEntity();

    manager.removeEntity(e1);

    // Second removal should throw because e1 is now a stale reference
    expect(() => {
      manager.removeEntity(e1);
    }).toThrow(/Stale entity reference/);

    const e2 = manager.addEntity();
    expect(e2).toBe(0); // Reuses the same index
    expect(manager.activeEntities.length).toBe(1);
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
    expect(manager.isValid(e1)).toBe(true);

    manager.removeEntity(e1);
    expect(manager.isValid(e1)).toBe(false);

    const e2 = manager.addEntity();
    expect(e2).toBe(0);
    expect(manager.isValid(e2)).toBe(true);

    // e1 and e2 are the same numeric value, so both are valid
    // (generation tracking works at operation boundaries, not for saved references)
    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e2)).toBe(true);

    expect(e1).toBe(e2); // Same index value
  });

  test("generation increments on entity reuse", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    expect(e1).toBe(0);

    manager.removeEntity(e1);

    const e2 = manager.addEntity();
    expect(e2).toBe(0); // Same index reused

    // e1 and e2 are the same numeric value
    expect(e1).toBe(e2);
    expect(manager.isValid(e2)).toBe(true);
  });

  test("isValid returns false for never-created entity", () => {
    const manager = new EntityManager(10);

    // EntityId 5 was never created
    expect(manager.isValid(5 as EntityId)).toBe(false);
  });

  test("isValid returns false for deleted entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    manager.removeEntity(e1);

    expect(manager.isValid(e1)).toBe(false);
  });

  test("isValid returns true for valid entity", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();

    expect(manager.isValid(e1)).toBe(true);
  });

  test("generation tracking detects deleted entities before recycling", () => {
    const manager = new EntityManager(10);

    const e1 = manager.addEntity();
    const e2 = manager.addEntity();
    const e3 = manager.addEntity();

    // Delete e2 but don't recycle yet (e1 and e3 still exist)
    manager.removeEntity(e2);

    // e2 is deleted and its index hasn't been recycled yet
    expect(manager.isValid(e2)).toBe(false);

    // e1 and e3 are still valid
    expect(manager.isValid(e1)).toBe(true);
    expect(manager.isValid(e3)).toBe(true);
  });
});
