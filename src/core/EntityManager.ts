import type { EntityId } from "./Entity";
import {
  ENTITY_INDEX_BITS,
  ENTITY_INDEX_MASK,
  MAX_ENTITY_INDEX,
  MAX_GENERATION,
} from "./constants";

export class EntityManager {
  private nextEntityIndex = 0;
  private readonly maxEntities: number;
  private freeEntityIndices: number[] = [];
  private readonly generations: Uint8Array;
  readonly activeEntities = new Set<EntityId>();

  constructor(maxEntities: number) {
    this.maxEntities = maxEntities;
    this.generations = new Uint8Array(maxEntities);
  }

  addEntity(): EntityId {
    const recycled = this.freeEntityIndices.pop();
    const index = recycled ?? this.nextEntityIndex++;

    if (index >= this.maxEntities) {
      throw new Error("Maximum number of entities reached");
    }

    if (index > MAX_ENTITY_INDEX) {
      throw new Error(
        `Entity index ${index} exceeds maximum supported index ${MAX_ENTITY_INDEX}`,
      );
    }

    const generation = this.generations[index];
    const entityId = (generation << ENTITY_INDEX_BITS) | index;

    this.activeEntities.add(entityId);

    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    if (!this.activeEntities.has(entityId)) {
      return;
    }

    const index = entityId & ENTITY_INDEX_MASK;

    this.generations[index] = (this.generations[index] + 1) & MAX_GENERATION;

    this.freeEntityIndices.push(index);
    this.activeEntities.delete(entityId);
  }

  getEntityCount(): number {
    return this.activeEntities.size;
  }

  getEntityIndex(entityId: EntityId): number {
    return entityId & ENTITY_INDEX_MASK;
  }
}
