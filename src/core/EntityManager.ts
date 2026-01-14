import type { EntityId } from "./types";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;
  private freeEntityIds: EntityId[] = [];
  readonly activeEntities: EntityId[] = [];
  private readonly entityToIndex: Int32Array;

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
    this.entityToIndex = new Int32Array(maxEntities).fill(-1);
  }

  addEntity(): EntityId {
    const recycled = this.freeEntityIds.pop();
    const entityId = (recycled ?? this.nextEntityId++) as EntityId;

    if (entityId >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    this.entityToIndex[entityId] = this.activeEntities.length;
    this.activeEntities.push(entityId);

    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    const index = this.entityToIndex[entityId];
    if (index === -1) {
      throw new Error(`Stale entity reference: EntityId ${entityId}`);
    }

    const lastEntity = this.activeEntities[this.activeEntities.length - 1];
    this.activeEntities[index] = lastEntity;
    this.entityToIndex[lastEntity] = index;
    this.activeEntities.pop();

    this.entityToIndex[entityId] = -1;
    this.freeEntityIds.push(entityId);
  }

  isValid(entityId: EntityId): boolean {
    return (
      entityId >= 0 &&
      entityId < this.maxEntities &&
      this.entityToIndex[entityId] !== -1
    );
  }

  getEntityCount(): number {
    return this.activeEntities.length;
  }
}
