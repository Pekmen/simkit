import type { EntityId } from "./Entity";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;
  private freeEntityIds: EntityId[] = [];

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
  }

  addEntity(): EntityId {
    const recycled = this.freeEntityIds.pop();
    if (recycled !== undefined) {
      return recycled;
    }

    if (this.nextEntityId >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    return this.nextEntityId++;
  }

  removeEntity(entityId: EntityId): void {
    this.freeEntityIds.push(entityId);
  }
}
