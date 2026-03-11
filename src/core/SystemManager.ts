import type { System } from "./System";

export class SystemManager {
  private systems = new Map<System, number>(); // key=system, value=priority; insertion order = execution order

  addSystem(system: System, priority = 0): void {
    if (this.systems.has(system)) {
      throw new Error(
        `addSystem: system${system.name ? ` "${system.name}"` : ""} already registered`,
      );
    }

    system.init?.();

    const entries = [...this.systems.entries()];
    const insertIndex = entries.findIndex(([, p]) => p < priority);
    if (insertIndex === -1) {
      entries.push([system, priority]);
    } else {
      entries.splice(insertIndex, 0, [system, priority]);
    }
    this.systems = new Map(entries);
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
    }
  }

  hasSystem(system: System): boolean {
    return this.systems.has(system);
  }

  updateAll(deltaTime: number): void {
    const errors: unknown[] = [];
    for (const system of [...this.systems.keys()]) {
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
    for (const system of [...this.systems.keys()]) {
      try {
        system.destroy?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.systems.clear();
    if (errors.length > 0) {
      throw new AggregateError(errors, "destroyAll: one or more systems threw");
    }
  }
}
