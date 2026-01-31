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
    world.defineSystem({
      components: [A, B],
      update({ query: { entities, A: a, B: b } }) {
        for (const e of entities) {
          const temp = a.value[e];
          a.value[e] = b.value[e];
          b.value[e] = temp;
        }
      },
    });

    // System 2: Swap C and D
    world.defineSystem({
      components: [C, D],
      update({ query: { entities, C: c, D: d } }) {
        for (const e of entities) {
          const temp = c.value[e];
          c.value[e] = d.value[e];
          d.value[e] = temp;
        }
      },
    });

    // System 3: Swap C and E
    world.defineSystem({
      components: [C, E],
      update({ query: { entities, C: c, E: eComp } }) {
        for (const e of entities) {
          const temp = c.value[e];
          c.value[e] = eComp.value[e];
          eComp.value[e] = temp;
        }
      },
    });

    world.update(0);
  });
});
