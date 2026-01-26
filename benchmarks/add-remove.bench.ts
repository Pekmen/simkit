import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";

describe("Add/Remove", () => {
  bench("add and remove component B from 1000 entities", () => {
    const blueprints = {
      A: { value: 0 },
      B: { value: 0 },
    };

    const world = new World(blueprints, { maxEntities: 1000 });
    const { A, B } = world.components;

    // Setup: Create 1000 entities with component A and store their IDs
    const entityIds = [];
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.setComponent(e, A, { value: i });
      entityIds.push(e);
    }

    // Add component B to all A entities
    for (const e of entityIds) {
      world.setComponent(e, B, { value: 0 });
    }

    // Remove component B from all (A, B) entities
    for (const e of entityIds) {
      world.removeComponent(e, B);
    }
  });
});
