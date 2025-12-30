import type { EntityId } from "./types";

export class BitsetManager {
  private readonly entityBits: Uint32Array;

  constructor(componentCount: number, maxEntities: number) {
    if (componentCount > 32) {
      throw new Error(
        `Too many components (${componentCount}). Maximum is 32.`,
      );
    }

    this.entityBits = new Uint32Array(maxEntities);
  }

  add(entityId: EntityId, bitPosition: number): void {
    this.entityBits[entityId] |= 1 << bitPosition;
  }

  remove(entityId: EntityId, bitPosition: number): void {
    this.entityBits[entityId] &= ~(1 << bitPosition);
  }

  clear(entityId: EntityId): void {
    this.entityBits[entityId] = 0;
  }

  has(entityId: EntityId, bitPosition: number): boolean {
    return (this.entityBits[entityId] & (1 << bitPosition)) !== 0;
  }

  createMask(bitPositions: number[]): number {
    let mask = 0;
    for (const bitPos of bitPositions) {
      mask |= 1 << bitPos;
    }
    return mask;
  }

  matchesMask(entityId: EntityId, mask: number): boolean {
    return (this.entityBits[entityId] & mask) === mask;
  }

  getBits(entityId: EntityId): number {
    return this.entityBits[entityId];
  }
}
