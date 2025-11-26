import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";

describe("Fragmented Iteration", () => {
  bench("iterate over fragmented dataset (26 component types, 2600 entities)", () => {
    const blueprints = {
      A: { value: 0 },
      B: { value: 0 },
      C: { value: 0 },
      D: { value: 0 },
      E: { value: 0 },
      F: { value: 0 },
      G: { value: 0 },
      H: { value: 0 },
      I: { value: 0 },
      J: { value: 0 },
      K: { value: 0 },
      L: { value: 0 },
      M: { value: 0 },
      N: { value: 0 },
      O: { value: 0 },
      P: { value: 0 },
      Q: { value: 0 },
      R: { value: 0 },
      S: { value: 0 },
      T: { value: 0 },
      U: { value: 0 },
      V: { value: 0 },
      W: { value: 0 },
      X: { value: 0 },
      Y: { value: 0 },
      Z: { value: 0 },
      Data: { value: 0 },
    };

    const world = new World(blueprints, { maxEntities: 2600 });
    const components = world.components;

    // Create 100 entities for each letter A-Z, each with Data component
    const letters = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];

    for (const letter of letters) {
      for (let i = 0; i < 100; i++) {
        const e = world.addEntity();
        world.addComponent(e, components[letter as keyof typeof components], {
          value: i,
        });
        world.addComponent(e, components.Data, { value: i });
      }
    }

    // Query Data component and double all values
    const { entities: dataEntities, storages: dataStorages } =
      world.query(components.Data);
    for (const e of dataEntities) {
      dataStorages.Data.value[e] = (dataStorages.Data.value[e] ?? 0) * 2;
    }

    // Query Z component and double all values
    const { entities: zEntities, storages: zStorages } =
      world.query(components.Z);
    for (const e of zEntities) {
      zStorages.Z.value[e] = (zStorages.Z.value[e] ?? 0) * 2;
    }
  });
});
