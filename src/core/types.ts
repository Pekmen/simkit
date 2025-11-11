export type EntityId = number & { readonly __brand: "EntityId" };

export type ComponentBlueprint<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P];
  };
};

export type ComponentStorageMap<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export type QueryStorageMap<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P][];
  };
};

export interface QueryResult<
  T extends ComponentBlueprint<T>,
  K extends keyof T,
> {
  entities: EntityId[];
  storages: Pick<QueryStorageMap<T>, K>;
}

export interface ComponentRef<K extends string = string> {
  _name: K;
}
