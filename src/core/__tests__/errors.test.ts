import { World } from "../index";
import {
  StaleEntityError,
  MissingComponentError,
  EntityCapacityError,
  WorldConfigError,
  InvalidComponentDataError,
} from "../index";

// These tests exist alongside the existing message-based assertions elsewhere
// (ComponentManager.test.ts, EntityManager.test.ts, SystemManager.test.ts, ...),
// which already cover behavior and exact wording. This file only locks in the
// *type* a consumer can catch on — i.e. that production code can do
// `catch (e) { if (e instanceof StaleEntityError) ... }` and have it actually
// discriminate, rather than every failure being an indistinguishable `Error`.
describe("typed errors (public API)", () => {
  test("a stale/removed entity reference throws StaleEntityError", () => {
    const world = new World({ Position: { x: 0, y: 0 } });
    const entity = world.spawn({ Position: { x: 1, y: 1 } });
    world.removeEntity(entity);

    expect(() => {
      world.removeEntity(entity);
    }).toThrow(StaleEntityError);
    expect(() => {
      world.removeEntity(entity);
    }).not.toThrow(WorldConfigError);
  });

  test("removing/reading an absent component throws MissingComponentError", () => {
    const world = new World({ Position: { x: 0, y: 0 } });
    const entity = world.spawn({});

    expect(() => {
      world.removeComponent(entity, world.components.Position);
    }).toThrow(MissingComponentError);
  });

  test("exhausting the entity pool throws EntityCapacityError", () => {
    const world = new World({ Position: { x: 0, y: 0 } }, { maxEntities: 1 });
    world.addEntity();

    expect(() => world.addEntity()).toThrow(EntityCapacityError);
  });

  test("invalid component data throws InvalidComponentDataError (and is still a TypeError)", () => {
    const world = new World({ Position: { x: 0, y: 0 } });
    const entity = world.addEntity();

    expect(() => {
      world.setComponent(entity, world.components.Position, {
        x: "bad" as never,
      });
    }).toThrow(InvalidComponentDataError);
    expect(() => {
      world.setComponent(entity, world.components.Position, {
        x: "bad" as never,
      });
    }).toThrow(TypeError);
  });

  test("API misuse throws WorldConfigError across call sites", () => {
    expect(
      () => new World({ Position: { x: 0, y: 0 } }, { maxEntities: 0 }),
    ).toThrow(WorldConfigError);
    expect(
      () => new World({ Position: { x: 0, y: 0 } }, { queryCacheSize: -1 }),
    ).toThrow(WorldConfigError);
    expect(() => new World({ entities: { x: 0 } } as never)).toThrow(
      WorldConfigError,
    );

    const world = new World({ Position: { x: 0, y: 0 } });
    expect(() => world.spawn({ Velocity: { dx: 1 } } as never)).toThrow(
      WorldConfigError,
    );

    expect(() => {
      world.addSystem({ update: vi.fn(), priority: 1.5 });
    }).toThrow(WorldConfigError);

    const registered = world.addSystem({ update: vi.fn() });
    world.removeSystem(registered);
    expect(() => {
      world.removeSystem(registered);
    }).toThrow(WorldConfigError);

    const otherWorld = new World({ Position: { x: 0, y: 0 } });
    expect(() => {
      world.setComponent(world.addEntity(), otherWorld.components.Position, {
        x: 1,
        y: 1,
      });
    }).toThrow(WorldConfigError);
  });
});
