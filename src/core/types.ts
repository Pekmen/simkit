export type EntityId = number & { readonly __brand: "EntityId" };

export interface EntityRef {
  readonly index: EntityId;
  readonly generation: number;
}

export type StringKey<T> = Extract<keyof T, string>;

export type ValidComponentProp = number | string | boolean;
export type ComponentBlueprint = Record<
  string,
  Record<string, ValidComponentProp>
>;

export type ComponentStorage = Record<string, unknown[] | Float64Array>;

// A non-numeric column is backed by a plain Array at runtime, but it is exposed as
// a fixed-length, index-addressable view: indexed get/set works, while length-mutating
// Array methods (push/pop/splice/…) are not part of the type. This mirrors the safety
// Float64Array already gives numeric columns — mutating a column's length would corrupt
// the dense struct-of-arrays layout, so it is a compile error rather than a runtime crash.
export interface FixedColumn<V> {
  [index: number]: V;
  readonly length: number;
}

// Numeric props are stored in a fixed-length Float64Array at runtime (see
// ComponentManager); everything else is a plain Array surfaced as a FixedColumn.
export type ColumnFor<V extends ValidComponentProp> = V extends number
  ? Float64Array
  : FixedColumn<V>;

export type DenseComponentStorageMap<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: ColumnFor<T[K][P]>;
  };
};

export type QueryResult<T extends ComponentBlueprint, K extends keyof T> = {
  entities: readonly EntityId[];
} & Pick<DenseComponentStorageMap<T>, K>;

export interface ComponentHandle<N extends string = string> {
  readonly name: N;
  readonly bitPosition: number;
  readonly bitMask: number;
}

export const DEFAULT_QUERY_CACHE_SIZE = 64;

export interface WorldOptions {
  maxEntities: number;
  queryCacheSize: number;
}

export type SpawnConfig<T extends ComponentBlueprint> = Partial<{
  [K in keyof T]: Partial<T[K]> | ComponentHandle<K & string>;
}>;

export interface QueryOptions<
  T extends ComponentBlueprint,
  K extends StringKey<T> = never,
> {
  with?: ComponentHandle<K>[];
  without?: ComponentHandle<StringKey<T>>[];
}

export const tag = Object.freeze({}) as Record<string, never>;

export function staleEntityError(entityId: EntityId): Error {
  return new Error(
    `Stale entity reference: EntityId ${entityId}. ` +
      `To use an entity across frames, save world.ref(id) while it is alive ` +
      `and restore it with world.resolve(ref).`,
  );
}
