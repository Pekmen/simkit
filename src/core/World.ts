import type { EntityId } from "./Entity";

interface WorldOptions {
  maxEntities: number;
}

type ComponentBlueprint<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P];
  };
};

type ComponentStorageMap<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: (T[K][P] | undefined)[];
  };
};

export class World<T extends ComponentBlueprint<T>> {
  private readonly options: WorldOptions;
  private readonly componentBlueprints: ComponentBlueprint<T>;
  private readonly componentStorages: ComponentStorageMap<T>;

  constructor(blueprints: T, options?: Partial<WorldOptions>) {
    this.options = {
      maxEntities: 1000,
      ...options,
    };

    this.componentBlueprints = blueprints;
    this.componentStorages = this.createComponentStorages(blueprints);
  }

  private createComponentStorages(blueprints: T): ComponentStorageMap<T> {
    const storages = {} as ComponentStorageMap<T>;
    const { maxEntities } = this.options;

    for (const componentName in blueprints) {
      const key = componentName as keyof T;
      const componentSchema = blueprints[key];
      const componentStorage = {} as ComponentStorageMap<T>[typeof key];

      for (const propertyName in componentSchema) {
        const prop = propertyName as keyof T[typeof key];
        componentStorage[prop] = new Array(maxEntities).fill(undefined);
      }

      storages[key] = componentStorage;
    }

    return storages;
  }
}
