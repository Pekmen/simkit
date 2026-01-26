import type { System } from "./System";

function getSystemName(system: System): string {
  return system.constructor.name;
}

export class SystemManager {
  private systems: System[] = [];
  private priorities = new Map<System, number>();

  addSystem(system: System, priority = 0): void {
    if (this.systems.includes(system)) {
      throw new Error(`addSystem: ${getSystemName(system)} already registered`);
    }

    system.init?.();

    // Insert at correct position based on priority (higher priority runs first)
    const insertIndex = this.systems.findIndex(
      (s) => (this.priorities.get(s) ?? 0) < priority
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
      throw new Error(`removeSystem: ${getSystemName(system)} not registered`);
    }
    system.destroy?.();
    this.systems.splice(index, 1);
    this.priorities.delete(system);
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
    for (const system of [...this.systems]) {
      system.destroy?.();
    }
    this.systems = [];
    this.priorities.clear();
  }
}
