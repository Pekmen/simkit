export type EntityId = number;

export type ComponentBlueprint = Record<string, Record<string, unknown>>;

export type ComponentStorage = Record<string, unknown[]>;

export type ComponentStorageMap<T extends ComponentBlueprint> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export interface QueryResult<T extends ComponentBlueprint, K extends keyof T> {
  entities: EntityId[];
  storages: Pick<ComponentStorageMap<T>, K>;
}

export interface ComponentRef {
  readonly _name: string;
  readonly _bitPosition: number;
}
