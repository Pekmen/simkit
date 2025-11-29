/**
 * Entity ID encoding constants.
 *
 * Entity IDs are encoded as a single number with:
 * - Upper 8 bits: generation (allows 256 reuses per index)
 * - Lower 24 bits: entity index (allows ~16.7M entities)
 */

/** Number of bits used for entity index (lower bits) */
export const ENTITY_INDEX_BITS = 24;

/** Number of bits used for generation counter (upper bits) */
export const ENTITY_GENERATION_BITS = 8;

/** Bitmask to extract the entity index from an encoded EntityId */
export const ENTITY_INDEX_MASK = (1 << ENTITY_INDEX_BITS) - 1; // 0xFFFFFF

/** Bitmask to extract the generation from an encoded EntityId */
export const ENTITY_GENERATION_MASK = ((1 << ENTITY_GENERATION_BITS) - 1) << ENTITY_INDEX_BITS; // 0xFF000000

/** Maximum number of entities supported by the index encoding */
export const MAX_ENTITY_INDEX = ENTITY_INDEX_MASK; // 16,777,215

/** Maximum generation value before wrapping (256 reuses) */
export const MAX_GENERATION = (1 << ENTITY_GENERATION_BITS) - 1; // 255
