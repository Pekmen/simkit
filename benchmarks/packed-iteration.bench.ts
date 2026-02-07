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

    // Benchmark: 5 systems doubling values
    world.addSystem({
      components: [A],
      update({ query: { entities, A: a } }) {
        for (const e of entities) {
          a.value[e] = (a.value[e] ?? 0) * 2;
        }
      },
    });

    world.addSystem({
      components: [B],
      update({ query: { entities, B: b } }) {
        for (const e of entities) {
          b.value[e] = (b.value[e] ?? 0) * 2;
        }
      },
    });

    world.addSystem({
      components: [C],
      update({ query: { entities, C: c } }) {
        for (const e of entities) {
          c.value[e] = (c.value[e] ?? 0) * 2;
        }
      },
    });

    world.addSystem({
      components: [D],
      update({ query: { entities, D: d } }) {
        for (const e of entities) {
          d.value[e] = (d.value[e] ?? 0) * 2;
        }
      },
    });

    world.addSystem({
      components: [E],
      update({ query: { entities, E: eComp } }) {
        for (const e of entities) {
          eComp.value[e] = (eComp.value[e] ?? 0) * 2;
        }
      },
    });

    world.update(0);
  });
});
