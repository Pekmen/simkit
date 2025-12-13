export type EntityId = number & { readonly __brand: "EntityId" };

type ValidComponentProp = number | string | boolean | object;
export type ComponentBlueprint = Record<
  string,
  Record<string, ValidComponentProp>
>;

export type ComponentKeys<T extends ComponentBlueprint> = Extract<
  keyof T,
  string
>;

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
  entities: EntityId[];

  storages: Pick<ComponentStorageMapQuery<T>, K>;
}

export interface ComponentRef<K extends string = string> {
  readonly _name: K;
  readonly _bitPosition: number;
}
