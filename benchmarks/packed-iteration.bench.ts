import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";

describe("Packed Iteration (5 queries)", () => {
  bench("query and double 5 components across 1000 entities", () => {
    const blueprints = {
      A: { value: 0 },
      B: { value: 0 },
      C: { value: 0 },
      D: { value: 0 },
      E: { value: 0 },
    };

    const world = new World(blueprints, { maxEntities: 1000 });
    const { A, B, C, D, E } = world.components;

    // Create 1000 entities with all 5 components
    for (let i = 0; i < 1000; i++) {
      const entity = world.addEntity();
      world.addComponent(entity, A, { value: 1 });
      world.addComponent(entity, B, { value: 1 });
      world.addComponent(entity, C, { value: 1 });
      world.addComponent(entity, D, { value: 1 });
      world.addComponent(entity, E, { value: 1 });
    }

    // Benchmark: 5 separate queries doubling values
    const { entities: aEntities, storages: aStorages } = world.query(A);
    for (const e of aEntities) {
      aStorages.A.value[e] = (aStorages.A.value[e] ?? 0) * 2;
    }

    const { entities: bEntities, storages: bStorages } = world.query(B);
    for (const e of bEntities) {
      bStorages.B.value[e] = (bStorages.B.value[e] ?? 0) * 2;
    }

    const { entities: cEntities, storages: cStorages } = world.query(C);
    for (const e of cEntities) {
      cStorages.C.value[e] = (cStorages.C.value[e] ?? 0) * 2;
    }

    const { entities: dEntities, storages: dStorages } = world.query(D);
    for (const e of dEntities) {
      dStorages.D.value[e] = (dStorages.D.value[e] ?? 0) * 2;
    }

    const { entities: eEntities, storages: eStorages } = world.query(E);
    for (const e of eEntities) {
      eStorages.E.value[e] = (eStorages.E.value[e] ?? 0) * 2;
    }
  });
});
