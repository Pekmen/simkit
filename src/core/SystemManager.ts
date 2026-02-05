import type { System } from "./System";

export class SystemManager {
  private systems: System[] = [];
  private priorities = new Map<System, number>();

  addSystem(system: System, priority = 0): void {
    if (this.systems.includes(system)) {
      throw new Error(
        `addSystem: system already registered`,
      );
    }

    system.init?.();

    const insertIndex = this.systems.findIndex(
      (s) => (this.priorities.get(s) ?? 0) < priority,
    );
    if (insertIndex === -1) {
      this.systems.push(system);
    } else {
      this.systems.splice(insertIndex, 0, system);
    }
    this.priorities.set(system, priority);
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index === -1) {
      throw new Error(
        `removeSystem: system not registered`,
      );
    }
    try {
      system.destroy?.();
    } finally {
      this.systems.splice(index, 1);
      this.priorities.delete(system);
    }
  }

  hasSystem(system: System): boolean {
    return this.systems.includes(system);
  }

  updateAll(deltaTime: number): void {
    for (const system of [...this.systems]) {
      if (this.systems.includes(system)) {
        system.update(deltaTime);
      }
    }
  }

  destroyAll(): void {
    const errors: unknown[] = [];
    for (const system of [...this.systems]) {
      try {
        system.destroy?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.systems = [];
    this.priorities.clear();
    if (errors.length > 0) {
      throw new AggregateError(errors, "destroyAll: one or more systems threw");
    }
  }
}
