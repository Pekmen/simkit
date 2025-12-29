import type { EntityId } from "./types";

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
    const index = recycled ?? this.nextEntityId++;

    if (index >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    const entityId = index as EntityId;
    this.activeEntities.add(entityId);

    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    if (!this.activeEntities.has(entityId)) {
      throw new Error(`Stale entity reference: EntityId ${entityId}`);
    }

    this.freeEntityIds.push(entityId);
    this.activeEntities.delete(entityId);
  }

  isValid(entityId: EntityId): boolean {
    return this.activeEntities.has(entityId);
  }

  getEntityCount(): number {
    return this.activeEntities.size;
  }
}
