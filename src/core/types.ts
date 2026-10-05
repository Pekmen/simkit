import type { World } from "./World";

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

export type StorageColumn = (ValidComponentProp | undefined)[] | Float64Array;
export type ComponentStorage = Record<string, StorageColumn>;

export interface FixedColumn<V> {
  [index: number]: V;
  readonly length: number;
}

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

export interface System {
  name?: string;
  init?(): void;
  update(deltaTime: number): void;
  destroy?(): void;
}

export interface SystemContext<T extends ComponentBlueprint, S> {
  state: S;
  world: World<T>;
}

export interface SystemUpdateContext<
  T extends ComponentBlueprint,
  K extends StringKey<T>,
  S,
> extends SystemContext<T, S> {
  query: QueryResult<T, K>;
}

export interface SystemConfig<
  T extends ComponentBlueprint,
  K extends StringKey<T> = never,
  S = Record<string, never>,
> {
  name?: string;
  components?: ComponentHandle<K>[];
  exclude?: ComponentHandle<StringKey<T>>[];
  state?: S;
  priority?: number;
  init?: (ctx: SystemContext<T, S>) => void;
  update: (ctx: SystemUpdateContext<T, K, S>, dt: number) => void;
  destroy?: (ctx: SystemContext<T, S>) => void;
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

export function missingComponentError(
  caller: string,
  entityId: EntityId,
  componentName: string,
): Error {
  return new Error(
    `${caller}: entity ${entityId} does not have component ${componentName}`,
  );
}
