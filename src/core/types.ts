export type EntityId = number;

export type ComponentBlueprint = Record<string, Record<string, unknown>>;

export type ComponentStorage = Record<string, unknown[]>;

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

export interface QueryResult<T extends ComponentBlueprint, K extends keyof T> {
  entities: number[];
  storages: Pick<ComponentStorageMapQuery<T>, K>;
}

export interface ComponentRef<K extends string = string> {
  readonly _name: K;
  readonly _bitPosition: number;
}
