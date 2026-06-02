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

export type ComponentStorageMap<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export type DenseComponentStorageMap<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P][];
  };
};

export type QueryResult<T extends ComponentBlueprint, K extends keyof T> = {
  entities: readonly EntityId[];
} & Pick<DenseComponentStorageMap<T>, K>;

export interface ComponentHandle<N extends string = string> {
  readonly name: N;
  readonly bitPosition: number;
}

export interface WorldOptions {
  maxEntities: number;
  queryCacheSize?: number;
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
