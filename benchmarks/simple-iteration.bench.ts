import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";

describe("Simple Iteration", () => {
  bench("3 systems over 4 entity groups (4000 entities total)", () => {
    const blueprints = {
      A: { value: 0 },
      B: { value: 0 },
      C: { value: 0 },
      D: { value: 0 },
      E: { value: 0 },
    };

    const world = new World(blueprints, { maxEntities: 4000 });
    const { A, B, C, D, E } = world.components;

    // Group 1: 1000 entities with (A,B)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.addComponent(e, A, { value: 1 });
      world.addComponent(e, B, { value: 2 });
    }

    // Group 2: 1000 entities with (A,B,C)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.addComponent(e, A, { value: 1 });
      world.addComponent(e, B, { value: 2 });
      world.addComponent(e, C, { value: 3 });
    }

    // Group 3: 1000 entities with (A,B,C,D)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.addComponent(e, A, { value: 1 });
      world.addComponent(e, B, { value: 2 });
      world.addComponent(e, C, { value: 3 });
      world.addComponent(e, D, { value: 4 });
    }

    // Group 4: 1000 entities with (A,B,C,E)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.addComponent(e, A, { value: 1 });
      world.addComponent(e, B, { value: 2 });
      world.addComponent(e, C, { value: 3 });
      world.addComponent(e, E, { value: 5 });
    }

    // System 1: Swap A and B
    const { entities: abEntities, storages: abStorages } = world.query(A, B);
    for (const e of abEntities) {
      const temp = abStorages.A.value[e];
      abStorages.A.value[e] = abStorages.B.value[e];
      abStorages.B.value[e] = temp;
    }

    // System 2: Swap C and D
    const { entities: cdEntities, storages: cdStorages } = world.query(C, D);
    for (const e of cdEntities) {
      const temp = cdStorages.C.value[e];
      cdStorages.C.value[e] = cdStorages.D.value[e];
      cdStorages.D.value[e] = temp;
    }

    // System 3: Swap C and E
    const { entities: ceEntities, storages: ceStorages } = world.query(C, E);
    for (const e of ceEntities) {
      const temp = ceStorages.C.value[e];
      ceStorages.C.value[e] = ceStorages.E.value[e];
      ceStorages.E.value[e] = temp;
    }
  });
});
