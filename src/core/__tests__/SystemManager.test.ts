import type { System } from "../System";
import { SystemManager } from "../SystemManager";

describe("SystemManager", () => {
  test("addSystem adds a system", () => {
    const manager = new SystemManager();
    const system: System = {
      update: vi.fn(),
      destroy: vi.fn(),
    };

    manager.addSystem(system);

    // @ts-expect-error accessing private for test
    expect(manager.systems).toContain(system);
  });

  test("removeSystem removes and destroys a system", () => {
    const manager = new SystemManager();
    const system: System = {
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

  test("removeSystem throws if system not found", () => {
    const manager = new SystemManager();
    const system: System = {
      update: vi.fn(),
      destroy: vi.fn(),
    };

    // Should throw when system not registered
    expect(() => {
      manager.removeSystem(system);
    }).toThrow("removeSystem: Object not registered");
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
    const systemA: System = {
      destroy: vi.fn(),
      update: vi.fn(),
    };
    const systemB: System = {
      destroy: vi.fn(),
      update: vi.fn(),
    };

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

  test("addSystem calls init on the system", () => {
    const manager = new SystemManager();
    const system: System = { init: vi.fn(), update: vi.fn() };
    manager.addSystem(system);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(system.init).toHaveBeenCalledOnce();
  });

  test("addSystem throws on duplicate system", () => {
    const manager = new SystemManager();
    const system: System = { update: vi.fn() };
    manager.addSystem(system);
    expect(() => {
      manager.addSystem(system);
    }).toThrow("addSystem: Object already registered");
  });

  test("hasSystem returns true for registered system", () => {
    const manager = new SystemManager();
    const system: System = { update: vi.fn() };
    expect(manager.hasSystem(system)).toBe(false);
    manager.addSystem(system);
    expect(manager.hasSystem(system)).toBe(true);
  });

  test("hasSystem returns false after system is removed", () => {
    const manager = new SystemManager();
    const system: System = { update: vi.fn() };
    manager.addSystem(system);
    manager.removeSystem(system);
    expect(manager.hasSystem(system)).toBe(false);
  });

  test("systems with higher priority run first", () => {
    const manager = new SystemManager();
    const order: string[] = [];
    const systemA: System = { update: () => order.push("A") };
    const systemB: System = { update: () => order.push("B") };
    const systemC: System = { update: () => order.push("C") };
    manager.addSystem(systemA, 0);
    manager.addSystem(systemB, 10);
    manager.addSystem(systemC, 5);
    manager.updateAll(16);
    expect(order).toEqual(["B", "C", "A"]);
  });

  test("systems with same priority maintain insertion order", () => {
    const manager = new SystemManager();
    const order: string[] = [];
    const systemA: System = { update: () => order.push("A") };
    const systemB: System = { update: () => order.push("B") };
    const systemC: System = { update: () => order.push("C") };
    manager.addSystem(systemA, 0);
    manager.addSystem(systemB, 0);
    manager.addSystem(systemC, 0);
    manager.updateAll(16);
    expect(order).toEqual(["A", "B", "C"]);
  });

  test("removeSystem during updateAll is safe and skips removed system", () => {
    const manager = new SystemManager();
    const systemB: System = { update: vi.fn() };
    const systemA: System = {
      update: () => {
        manager.removeSystem(systemB);
      },
    };
    manager.addSystem(systemA);
    manager.addSystem(systemB);
    expect(() => {
      manager.updateAll(16);
    }).not.toThrow();
    // systemB was removed by systemA, so it should not be called
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemB.update).not.toHaveBeenCalled();
  });

  test("addSystem during updateAll is safe", () => {
    const manager = new SystemManager();
    const systemB: System = { update: vi.fn() };
    const systemA: System = {
      update: () => {
        manager.addSystem(systemB);
      },
    };
    manager.addSystem(systemA);
    expect(() => {
      manager.updateAll(16);
    }).not.toThrow();
    // systemB should not be called in this update cycle
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(systemB.update).not.toHaveBeenCalled();
  });
});
