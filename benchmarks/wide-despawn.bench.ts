import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";
import type { EntityId } from "../src/core/types.js";

// Isolates removeAllComponents: a world with MANY declared component types but
// entities that each hold only a FEW. Old code looped over all declared types
// on every despawn; the set-bit walk loops only over what the entity actually
// has. The bigger the gap (30 declared vs 2 held), the larger the delta.
describe("Wide Despawn", () => {
  const TYPES = 30;
  const ENTITIES = 1000;

  bench("despawn 1000 entities in a 30-type world (2 components each)", () => {
    const blueprints: Record<string, { value: number }> = {};
    for (let i = 0; i < TYPES; i++) blueprints[`C${i}`] = { value: 0 };

    const world = new World(blueprints, { maxEntities: ENTITIES + 1 });
    const handles = world.components as Record<string, { value: number }> &
      Record<string, Parameters<typeof world.setComponent>[1]>;

    const ids: EntityId[] = [];
    for (let i = 0; i < ENTITIES; i++) {
      // Each entity holds just 2 of the 30 declared component types.
      ids.push(
        world.spawn({
          C0: { value: i },
          C1: { value: i },
        } as Parameters<typeof world.spawn>[0]),
      );
    }
    void handles;

    for (const id of ids) world.removeEntity(id);
  });
});
