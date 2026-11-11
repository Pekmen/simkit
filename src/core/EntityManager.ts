import type { EntityId, EntityRef } from "./types";
import { denseAdd, denseRemove } from "./denseArray";

export class EntityManager {
  private nextEntityId = 0;
  private readonly maxEntities: number;
  private freeEntityIds: EntityId[] = [];
  readonly activeEntities: EntityId[] = [];
  private readonly entityToIndex: Int32Array;
  private readonly generations: Uint32Array;

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
    this.entityToIndex = new Int32Array(maxEntities).fill(-1);
    this.generations = new Uint32Array(maxEntities).fill(1);
  }

  addEntity(): EntityId {
    let entityId = this.freeEntityIds.pop();
    entityId ??= this.nextEntityId++ as EntityId;

    denseAdd(this.activeEntities, this.entityToIndex, entityId);
    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    denseRemove(this.activeEntities, this.entityToIndex, entityId);

    this.generations[entityId]++;
    this.freeEntityIds.push(entityId);
  }

  isValid(entityId: EntityId): boolean {
    return (
      Number.isInteger(entityId) &&
      entityId >= 0 &&
      entityId < this.maxEntities &&
      this.entityToIndex[entityId] !== -1
    );
  }

  ref(entityId: EntityId): EntityRef {
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

  clear(): void {
    for (const entityId of this.activeEntities) {
      this.entityToIndex[entityId] = -1;
      this.generations[entityId]++;
      this.freeEntityIds.push(entityId);
    }
    this.activeEntities.length = 0;
  }
}
