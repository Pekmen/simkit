import type { System } from "./System";

export class SystemManager {
  private systems: System[] = [];

  addSystem(system: System): void {
    this.systems.push(system);
    system.init?.();
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      system.destroy?.();
      this.systems.splice(index, 1);
    }
  }

  updateAll(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  destroyAll(): void {
    for (const system of this.systems) {
      system.destroy?.();
    }
    this.systems = [];
  }
}
