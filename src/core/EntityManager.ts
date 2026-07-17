import { staleEntityError } from "./types";
import type { EntityId, EntityRef } from "./types";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;
  private freeEntityIds: EntityId[] = [];
  readonly activeEntities: EntityId[] = [];
  private readonly entityToIndex: Int32Array;
  private readonly generations: Uint32Array;

  constructor(maxEntities: number) {
    if (maxEntities <= 0) {
      throw new Error("maxEntities must be greater than 0");
    }
    this.maxEntities = maxEntities;
    this.entityToIndex = new Int32Array(maxEntities).fill(-1);
    this.generations = new Uint32Array(maxEntities).fill(1);
  }

  addEntity(): EntityId {
    let entityId = this.freeEntityIds.pop();
    if (entityId === undefined) {
      if (this.nextEntityId >= this.maxEntities) {
        throw new Error(
          `Maximum number of entities reached (${this.maxEntities})`,
        );
      }
      entityId = this.nextEntityId++ as EntityId;
    }

    this.entityToIndex[entityId] = this.activeEntities.length;
    this.activeEntities.push(entityId);
    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    const index = this.entityToIndex[entityId];
    if (index === -1) {
      throw staleEntityError(entityId);
    }

    const lastEntity = this.activeEntities[this.activeEntities.length - 1];
    this.activeEntities[index] = lastEntity;
    this.entityToIndex[lastEntity] = index;
    this.activeEntities.pop();

    this.entityToIndex[entityId] = -1;
    this.generations[entityId]++;
    this.freeEntityIds.push(entityId);
  }

  isValid(entityId: EntityId): boolean {
    return (
      entityId >= 0 &&
      entityId < this.maxEntities &&
      this.entityToIndex[entityId] !== -1
    );
  }

  ref(entityId: EntityId): EntityRef {
    if (!this.isValid(entityId)) {
      throw staleEntityError(entityId);
    }
    return { index: entityId, generation: this.generations[entityId] };
  }

  resolve(ref: EntityRef): EntityId | undefined {
    return this.isAlive(ref) ? ref.index : undefined;
  }

  isAlive(ref: EntityRef): boolean {
    return (
      this.isValid(ref.index) && this.generations[ref.index] === ref.generation
    );
  }

  getEntityCount(): number {
    return this.activeEntities.length;
  }
}
