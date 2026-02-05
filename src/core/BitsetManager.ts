import type { EntityId } from "./types";

export const MAX_COMPONENTS = 32;

export class BitsetManager {
  private readonly entityBits: Uint32Array;

  constructor(componentCount: number, maxEntities: number) {
    if (componentCount > MAX_COMPONENTS) {
      throw new Error(
        `Too many components (${componentCount}). Maximum is ${MAX_COMPONENTS}.`,
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

  toBitmask(bitPosition: number): number {
    return 1 << bitPosition;
  }

  createMask(refs: Iterable<{ bitPosition: number }>): number {
    let mask = 0;
    for (const ref of refs) {
      mask |= 1 << ref.bitPosition;
    }
    return mask;
  }

  matchesMask(entityId: EntityId, mask: number): boolean {
    return (this.entityBits[entityId] & mask) === mask;
  }

  getBits(entityId: EntityId): number {
    return this.entityBits[entityId];
  }

  setComponentMask(entityId: EntityId, bits: number): void {
    this.entityBits[entityId] = bits;
  }
}
