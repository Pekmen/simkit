import type { System } from "./types";

interface SystemRecord {
  system: System;
  priority: number;
}

export class SystemManager {
  private readonly systems = new Set<System>();
  private sortedRecords: SystemRecord[] = [];

  addSystem(system: System, priority = 0): void {
    if (this.systems.has(system)) {
      throw new Error(
        `addSystem: system${system.name ? ` "${system.name}"` : ""} already registered`,
      );
    }

    system.init?.();

    const insertIndex = this.sortedRecords.findIndex(
      (record) => record.priority < priority,
    );
    const record: SystemRecord = { system, priority };
    if (insertIndex === -1) {
      this.sortedRecords.push(record);
    } else {
      this.sortedRecords.splice(insertIndex, 0, record);
    }
    this.systems.add(system);
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
      const idx = this.sortedRecords.findIndex(
        (record) => record.system === system,
      );
      if (idx !== -1) this.sortedRecords.splice(idx, 1);
    }
  }

  hasSystem(system: System): boolean {
    return this.systems.has(system);
  }

  updateAll(deltaTime: number): void {
    this.runAll(
      (system) => {
        system.update(deltaTime);
      },
      "updateAll: one or more systems threw",
    );
  }

  destroyAll(): void {
    try {
      this.runAll(
        (system) => {
          system.destroy?.();
        },
        "destroyAll: one or more systems threw",
      );
    } finally {
      this.systems.clear();
      this.sortedRecords = [];
    }
  }

  // Runs `action` for every currently-registered system (snapshotting the
  // order first, since `action` may itself remove systems), collecting
  // thrown errors instead of letting one failing system stop the rest.
  private runAll(
    action: (system: System) => void,
    aggregateMessage: string,
  ): void {
    const errors: unknown[] = [];
    for (const { system } of [...this.sortedRecords]) {
      if (!this.systems.has(system)) continue;
      try {
        action(system);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, aggregateMessage);
    }
  }
}
