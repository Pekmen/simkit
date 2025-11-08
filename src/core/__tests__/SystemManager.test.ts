import type { System } from "../System";
import { SystemManager } from "../SystemManager";

describe("SystemManager", () => {
  test("addSystem adds and initializes a system", () => {
    const manager = new SystemManager();
    const system: System = {
      init: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    };

    manager.addSystem(system);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(system.init).toHaveBeenCalled();
  });

  test("removeSystem removes and destroys a system", () => {
    const manager = new SystemManager();
    const system: System = {
      init: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    };

    manager.addSystem(system);
    manager.removeSystem(system);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(system.destroy).toHaveBeenCalled();
    // @ts-expect-error accessing private for test
    expect(manager.systems).not.toContain(system);
  });

  test("removeSystem does nothing if system not found", () => {
    const manager = new SystemManager();
    const system: System = {
      init: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    };

    // Should not throw or call destroy
    expect(() => {
      manager.removeSystem(system);
    }).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(system.destroy).not.toHaveBeenCalled();
  });

  test("updateAll calls update on all systems", () => {
    const manager = new SystemManager();
    const systemA: System = { update: vi.fn() };
    const systemB: System = { update: vi.fn() };

    manager.addSystem(systemA);
    manager.addSystem(systemB);

    manager.updateAll(16);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemA.update).toHaveBeenCalledWith(16);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemB.update).toHaveBeenCalledWith(16);
  });

  test("destroyAll destroys all systems and clears the list", () => {
    const manager = new SystemManager();
    const systemA: System = { destroy: vi.fn(), update: vi.fn() };
    const systemB: System = { destroy: vi.fn(), update: vi.fn() };

    manager.addSystem(systemA);
    manager.addSystem(systemB);

    manager.destroyAll();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemA.destroy).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemB.destroy).toHaveBeenCalled();

    // @ts-expect-error accessing private for test
    expect(manager.systems).toHaveLength(0);
  });

  test("updateAll handles empty system list without error", () => {
    const manager = new SystemManager();
    expect(() => {
      manager.updateAll(16);
    }).not.toThrow();
  });
});
