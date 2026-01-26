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
      world.setComponent(entity, A, { value: 1 });
      world.setComponent(entity, B, { value: 1 });
      world.setComponent(entity, C, { value: 1 });
      world.setComponent(entity, D, { value: 1 });
      world.setComponent(entity, E, { value: 1 });
    }

    // Benchmark: 5 separate queries doubling values
    const { entities: aEntities, A: aComp } = world.query(A);
    for (const e of aEntities) {
      aComp.value[e] = (aComp.value[e] ?? 0) * 2;
    }

    const { entities: bEntities, B: bComp } = world.query(B);
    for (const e of bEntities) {
      bComp.value[e] = (bComp.value[e] ?? 0) * 2;
    }

    const { entities: cEntities, C: cComp } = world.query(C);
    for (const e of cEntities) {
      cComp.value[e] = (cComp.value[e] ?? 0) * 2;
    }

    const { entities: dEntities, D: dComp } = world.query(D);
    for (const e of dEntities) {
      dComp.value[e] = (dComp.value[e] ?? 0) * 2;
    }

    const { entities: eEntities, E: eComp } = world.query(E);
    for (const e of eEntities) {
      eComp.value[e] = (eComp.value[e] ?? 0) * 2;
    }
  });
});
