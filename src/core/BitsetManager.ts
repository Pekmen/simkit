import type { EntityIndex } from "./types";

export class BitsetManager {
  private readonly entityBits: number[];

  constructor(componentCount: number, maxEntities: number) {
    if (componentCount > 32) {
      throw new Error(
        `Too many components (${componentCount}). Maximum is 32.`,
      );
    }

    this.entityBits = new Array<number>(maxEntities).fill(0);
  }

  add(entityIndex: EntityIndex, bitPosition: number): void {
    this.entityBits[entityIndex] |= 1 << bitPosition;
  }

  remove(entityIndex: EntityIndex, bitPosition: number): void {
    this.entityBits[entityIndex] &= ~(1 << bitPosition);
  }

  clear(entityIndex: EntityIndex): void {
    this.entityBits[entityIndex] = 0;
  }

  has(entityIndex: EntityIndex, bitPosition: number): boolean {
    return (this.entityBits[entityIndex] & (1 << bitPosition)) !== 0;
  }

  createMask(bitPositions: number[]): number {
    let mask = 0;
    for (const bitPos of bitPositions) {
      mask |= 1 << bitPos;
    }
    return mask;
  }

  matchesMask(entityIndex: EntityIndex, mask: number): boolean {
    return (this.entityBits[entityIndex] & mask) === mask;
  }
}
