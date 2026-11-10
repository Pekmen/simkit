import type { System } from "./types";

interface SystemRecord {
  system: System;
  priority: number;
}

export class SystemManager {
  private readonly systems = new Set<System>();
  private sortedRecords: SystemRecord[] = [];

  addSystem(system: System, priority = 0): void {
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
    const idx = this.sortedRecords.findIndex(
      (record) => record.system === system,
    );
    try {
      system.destroy?.();
    } catch (error) {
      throw this.tagError(error, system, idx);
    } finally {
      this.systems.delete(system);
      if (idx !== -1) this.sortedRecords.splice(idx, 1);
    }
  }

  hasSystem(system: System): boolean {
    return this.systems.has(system);
  }

  updateAll(deltaTime: number): void {
    this.runAll((system) => {
      system.update(deltaTime);
    }, "updateAll: one or more systems threw");
  }

  destroyAll(): void {
    try {
      this.runAll((system) => {
        system.destroy?.();
      }, "destroyAll: one or more systems threw");
    } finally {
      this.systems.clear();
      this.sortedRecords = [];
    }
  }

  private runAll(
    action: (system: System) => void,
    aggregateMessage: string,
  ): void {
    const errors: unknown[] = [];
    for (const [index, { system }] of [...this.sortedRecords].entries()) {
      if (!this.systems.has(system)) continue;
      try {
        action(system);
      } catch (error) {
        errors.push(this.tagError(error, system, index));
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, aggregateMessage);
    }
  }

  private tagError(error: unknown, system: System, index: number): unknown {
    if (
      typeof error === "object" &&
      error !== null &&
      Object.isExtensible(error)
    ) {
      (error as Record<string, unknown>).systemName =
        system.name ?? `system#${index}`;
    }
    return error;
  }
}
