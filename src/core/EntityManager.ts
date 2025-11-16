import type { EntityId } from "./Entity";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;
  private freeEntityIds: EntityId[] = [];
  readonly activeEntities = new Set<EntityId>();

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
  }

  addEntity(): EntityId {
    const recycled = this.freeEntityIds.pop();

    const entityId = recycled ?? this.nextEntityId++;

    if (entityId >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    this.activeEntities.add(entityId);

    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    if (!this.activeEntities.has(entityId)) {
      return;
    }
    this.freeEntityIds.push(entityId);
    this.activeEntities.delete(entityId);
  }

  getEntityCount(): number {
    return this.activeEntities.size;
  }
}
