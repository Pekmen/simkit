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
      world.setComponent(e, A, { value: 1 });
      world.setComponent(e, B, { value: 2 });
    }

    // Group 2: 1000 entities with (A,B,C)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.setComponent(e, A, { value: 1 });
      world.setComponent(e, B, { value: 2 });
      world.setComponent(e, C, { value: 3 });
    }

    // Group 3: 1000 entities with (A,B,C,D)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.setComponent(e, A, { value: 1 });
      world.setComponent(e, B, { value: 2 });
      world.setComponent(e, C, { value: 3 });
      world.setComponent(e, D, { value: 4 });
    }

    // Group 4: 1000 entities with (A,B,C,E)
    for (let i = 0; i < 1000; i++) {
      const e = world.addEntity();
      world.setComponent(e, A, { value: 1 });
      world.setComponent(e, B, { value: 2 });
      world.setComponent(e, C, { value: 3 });
      world.setComponent(e, E, { value: 5 });
    }

    // System 1: Swap A and B
    const { entities: abEntities, A: aComp, B: bComp } = world.query(A, B);
    for (const e of abEntities) {
      const temp = aComp.value[e];
      aComp.value[e] = bComp.value[e];
      bComp.value[e] = temp;
    }

    // System 2: Swap C and D
    const { entities: cdEntities, C: cComp, D: dComp } = world.query(C, D);
    for (const e of cdEntities) {
      const temp = cComp.value[e];
      cComp.value[e] = dComp.value[e];
      dComp.value[e] = temp;
    }

    // System 3: Swap C and E
    const { entities: ceEntities, C: cComp2, E: eComp } = world.query(C, E);
    for (const e of ceEntities) {
      const temp = cComp2.value[e];
      cComp2.value[e] = eComp.value[e];
      eComp.value[e] = temp;
    }
  });
});
