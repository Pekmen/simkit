export type EntityId = number & { readonly __brand: "EntityId" };

export type StringKey<T> = Extract<keyof T, string>;

type ValidComponentProp = number | string | boolean;
export type ComponentBlueprint = Record<
  string,
  Record<string, ValidComponentProp>
>;

export type ComponentStorage = Record<
  string,
  unknown[] | Float64Array | Uint8Array
>;

export type ComponentStorageMapInternal<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export type ComponentStorageMapQuery<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P][];
  };
};

export type QueryResult<T extends ComponentBlueprint, K extends keyof T> = {
  entities: EntityId[];
} & Pick<ComponentStorageMapQuery<T>, K>;

export interface ComponentRef<K extends string = string> {
  readonly name: K;
  readonly bitPosition: number;
}

export interface WorldOptions {
  maxEntities: number;
  queryCacheSize?: number;
}

export type SpawnConfig<T extends ComponentBlueprint> = Partial<{
  [K in keyof T]: Partial<T[K]>;
}>;
