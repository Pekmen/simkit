import { bench, describe } from "vitest";
import { World } from "../src/core/World.js";
import type { EntityId } from "../src/core/types.js";

// Models a real game loop: a stable population that spawns and despawns a slice
// of entities every frame. Every spawn/despawn flips membership in the movement
// system's cached query, so each frame the cache patches its entity list per
// change and re-snapshots on the next update(). This is the scenario the other
// benchmarks never exercise (they query once over a static set) and the one
// that stresses the membership-update path.
describe("Dynamic Churn", () => {
  const FRAMES = 60;
  const POPULATION = 1000;
  const CHURN_PER_FRAME = 100; // 10% spawned + 10% despawned each frame

  bench("move 1000 entities for 60 frames, churning 10% per frame", () => {
    const blueprints = {
      Position: { x: 0, y: 0 },
      Velocity: { x: 0, y: 0 },
    };

    // Headroom above POPULATION so recycled-id reuse never hits the hard cap.
    const world = new World(blueprints, { maxEntities: POPULATION * 2 });
    const { Position, Velocity } = world.components;

    // FIFO queue of live entity ids so each frame despawns the oldest slice.
    const live: EntityId[] = [];
    const spawn = (): void => {
      live.push(
        world.spawn({
          Position: { x: Math.random() * 100, y: Math.random() * 100 },
          Velocity: { x: 1, y: -1 },
        }),
      );
    };

    for (let i = 0; i < POPULATION; i++) spawn();

    world.addSystem({
      components: [Position, Velocity],
      update({ query: { entities, Position: pos, Velocity: vel } }) {
        for (const e of entities) {
          pos.x[e] += vel.x[e];
          pos.y[e] += vel.y[e];
        }
      },
    });

    for (let frame = 0; frame < FRAMES; frame++) {
      // Despawn the oldest slice, then refill — keeps population stable while
      // invalidating the query cache so the next update() rescans.
      for (let i = 0; i < CHURN_PER_FRAME; i++) {
        const e = live.shift();
        if (e !== undefined) world.removeEntity(e);
      }
      for (let i = 0; i < CHURN_PER_FRAME; i++) spawn();

      world.update(1 / 60);
    }
  });
});
