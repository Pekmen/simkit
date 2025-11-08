import { World } from "../World";

describe("World", () => {
  test("intiializing world creates component storages", () => {
    const blueprints = {
      Position: {
        x: 0,
        y: 0,
      },
      Velocity: {
        dx: 0,
        dy: 0,
      },
    };

    const world = new World(blueprints, { maxEntities: 10 });

    // @ts-expect-error Accessing private property for testing
    const storages = world.componentStorages;

    expect(storages.Position.x.length).toBe(10);
    expect(storages.Position.y.length).toBe(10);
    expect(storages.Velocity.dx.length).toBe(10);
    expect(storages.Velocity.dy.length).toBe(10);
  });
});
