export type EntityId = number & { readonly __brand: "EntityId" };

export type ComponentBlueprint = Record<string, Record<string, unknown>>;

export type ComponentStorageMap<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export type QueryStorageMap<T extends ComponentBlueprint> =
  ComponentStorageMap<T>;

export interface QueryResult<T extends ComponentBlueprint, K extends keyof T> {
  entities: EntityId[];
  storages: Pick<QueryStorageMap<T>, K>;
}

export interface ComponentRef<K extends string = string> {
  readonly _name: K;
}
