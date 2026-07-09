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

  add(entityId: EntityId, bitMask: number): void {
    this.entityBits[entityId] |= bitMask;
  }

  remove(entityId: EntityId, bitMask: number): void {
    this.entityBits[entityId] &= ~bitMask;
  }

  clear(entityId: EntityId): void {
    this.entityBits[entityId] = 0;
  }

  has(entityId: EntityId, bitMask: number): boolean {
    return (this.entityBits[entityId] & bitMask) !== 0;
  }

  createMask(refs: Iterable<{ bitMask: number }>): number {
    let mask = 0;
    for (const ref of refs) {
      mask |= ref.bitMask;
    }
    return mask;
  }

  getBits(entityId: EntityId): number {
    return this.entityBits[entityId];
  }

  setComponentMask(entityId: EntityId, bits: number): void {
    this.entityBits[entityId] = bits;
  }
}
