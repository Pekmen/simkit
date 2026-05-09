import type { System } from "./System";

export class SystemManager {
  private readonly systems = new Map<System, number>(); // key=system, value=priority
  private sortedSystems: System[] = []; // execution order (descending priority)

  addSystem(system: System, priority = 0): void {
    if (this.systems.has(system)) {
      throw new Error(
        `addSystem: system${system.name ? ` "${system.name}"` : ""} already registered`,
      );
    }

    system.init?.();

    const insertIndex = this.sortedSystems.findIndex(
      (s) => (this.systems.get(s) ?? 0) < priority,
    );
    if (insertIndex === -1) {
      this.sortedSystems.push(system);
    } else {
      this.sortedSystems.splice(insertIndex, 0, system);
    }
    this.systems.set(system, priority);
  }

  removeSystem(system: System): void {
    if (!this.systems.has(system)) {
      throw new Error(
        `removeSystem: system${system.name ? ` "${system.name}"` : ""} not registered`,
      );
    }
    try {
      system.destroy?.();
    } finally {
      this.systems.delete(system);
      const idx = this.sortedSystems.indexOf(system);
      if (idx !== -1) this.sortedSystems.splice(idx, 1);
    }
  }

  hasSystem(system: System): boolean {
    return this.systems.has(system);
  }

  updateAll(deltaTime: number): void {
    const errors: unknown[] = [];
    for (const system of [...this.sortedSystems]) {
      if (this.systems.has(system)) {
        try {
          system.update(deltaTime);
        } catch (error) {
          errors.push(error);
        }
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "updateAll: one or more systems threw");
    }
  }

  destroyAll(): void {
    const errors: unknown[] = [];
    for (const system of [...this.sortedSystems]) {
      if (!this.systems.has(system)) continue;
      try {
        system.destroy?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.systems.clear();
    this.sortedSystems = [];
    if (errors.length > 0) {
      throw new AggregateError(errors, "destroyAll: one or more systems threw");
    }
  }
}
