import type { EntityId } from "./Entity";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
  }

  addEntity(): EntityId {
    if (this.nextEntityId >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    return this.nextEntityId++ as EntityId;
  }

  removeEntity(_entityId: EntityId): void {
    // Currently, no specific logic is needed here.
  }
}
