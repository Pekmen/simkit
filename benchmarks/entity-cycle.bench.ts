import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";

describe("Entity Cycle", () => {
  bench("create and destroy 1000 entities per iteration", () => {
    const blueprints = {
      A: { value: 0 },
      B: { value: 0 },
    };

    const world = new World(blueprints, { maxEntities: 2000 });
    const { A, B } = world.components;

    // Setup: Create 1000 entities with component A
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.addComponent(e, A, { value: i });
    }

    // Spawn B entities (one for each A entity)
    const { entities: aEntities, storages: aStorages } = world.query(A);
    for (const e of aEntities) {
      const newEntity = world.addEntity();
      world.addComponent(newEntity, B, { value: aStorages.A.value[e] ?? 0 });
    }

    // Destroy all B entities
    const { entities: bEntities } = world.query(B);
    for (const e of bEntities) {
      world.removeEntity(e);
    }
  });
});
