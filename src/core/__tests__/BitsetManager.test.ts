import { BitsetManager, MAX_COMPONENTS } from "../BitsetManager";
import type { EntityId } from "../types";

// BitsetManager stores one 32-bit component mask per entity. These tests pin the
// raw bitwise semantics directly, without going through ComponentManager.
const e = (n: number): EntityId => n as EntityId;

describe("BitsetManager", () => {
  describe("constructor", () => {
    test("throws when component count exceeds MAX_COMPONENTS", () => {
      expect(() => new BitsetManager(33, 10)).toThrow(
        "Too many components (33). Maximum is 32.",
      );
    });

    test("allows exactly MAX_COMPONENTS components", () => {
      expect(() => new BitsetManager(32, 10)).not.toThrow();
    });

    test("all entities start with zero bits", () => {
      const bits = new BitsetManager(4, 5);
      for (let i = 0; i < 5; i++) {
        expect(bits.getBits(e(i))).toBe(0);
        expect(bits.has(e(i), 0b1)).toBe(false);
      }
    });
  });

  describe("add / remove / has", () => {
    test("add sets a bit and has detects it", () => {
      const bits = new BitsetManager(4, 5);
      bits.add(e(0), 0b10);
      expect(bits.has(e(0), 0b10)).toBe(true);
      expect(bits.has(e(0), 0b01)).toBe(false);
    });

    test("add is idempotent (OR keeps a single bit)", () => {
      const bits = new BitsetManager(4, 5);
      bits.add(e(0), 0b100);
      bits.add(e(0), 0b100);
      expect(bits.getBits(e(0))).toBe(0b100);
    });

    test("remove clears a bit", () => {
      const bits = new BitsetManager(4, 5);
      bits.add(e(0), 0b110);
      bits.remove(e(0), 0b010);
      expect(bits.getBits(e(0))).toBe(0b100);
    });

    test("removing an unset bit is a no-op", () => {
      const bits = new BitsetManager(4, 5);
      bits.add(e(0), 0b100);
      bits.remove(e(0), 0b001);
      expect(bits.getBits(e(0))).toBe(0b100);
    });

    test("has is ANY-match: true if any requested bit is present", () => {
      const bits = new BitsetManager(4, 5);
      bits.add(e(0), 0b0010);
      // Multi-bit mask overlapping in one position still returns true. This is
      // why ComponentManager must do its own ALL-match with === includeMask
      // rather than reusing has() for multi-component queries.
      expect(bits.has(e(0), 0b0110)).toBe(true);
      expect(bits.has(e(0), 0b1100)).toBe(false);
    });
  });

  describe("clear", () => {
    test("zeroes the entire word regardless of how many bits are set", () => {
      const bits = new BitsetManager(8, 5);
      bits.add(e(0), 0b10110);
      bits.clear(e(0));
      expect(bits.getBits(e(0))).toBe(0);
    });
  });

  describe("createMask", () => {
    test("empty iterable yields 0", () => {
      const bits = new BitsetManager(4, 5);
      expect(bits.createMask([])).toBe(0);
    });

    test("single ref yields its bitMask", () => {
      const bits = new BitsetManager(4, 5);
      expect(bits.createMask([{ bitMask: 0b100 }])).toBe(0b100);
    });

    test("ORs multiple bitMasks together", () => {
      const bits = new BitsetManager(4, 5);
      expect(bits.createMask([{ bitMask: 0b001 }, { bitMask: 0b100 }])).toBe(
        0b101,
      );
    });

    test("overlapping bitMasks dedupe via OR", () => {
      const bits = new BitsetManager(4, 5);
      expect(bits.createMask([{ bitMask: 0b110 }, { bitMask: 0b011 }])).toBe(
        0b111,
      );
    });
  });

  describe("getBits / setComponentMask", () => {
    test("getBits reflects the composed word after add/remove", () => {
      const bits = new BitsetManager(8, 5);
      bits.add(e(0), 0b0001);
      bits.add(e(0), 0b1000);
      bits.remove(e(0), 0b0001);
      expect(bits.getBits(e(0))).toBe(0b1000);
    });

    test("setComponentMask overwrites the whole word (replace, not OR)", () => {
      const bits = new BitsetManager(8, 5);
      bits.add(e(0), 0b1111);
      bits.setComponentMask(e(0), 0b0100);
      expect(bits.getBits(e(0))).toBe(0b0100);
    });
  });

  describe("entity isolation", () => {
    test("operations on one entity never touch another", () => {
      const bits = new BitsetManager(8, 5);
      bits.add(e(1), 0b101);
      bits.setComponentMask(e(2), 0b010);
      expect(bits.getBits(e(0))).toBe(0);
      expect(bits.getBits(e(1))).toBe(0b101);
      expect(bits.getBits(e(2))).toBe(0b010);
    });
  });

  test("MAX_COMPONENTS is 32", () => {
    expect(MAX_COMPONENTS).toBe(32);
  });
});
