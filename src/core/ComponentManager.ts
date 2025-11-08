import type { EntityId } from "./Entity";

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

export class ComponentManager<T extends ComponentBlueprint<T>> {
  private readonly componentBlueprints: ComponentBlueprint<T>;
  private readonly componentStorages: ComponentStorageMap<T>;
  readonly components: { [K in keyof T]: { _name: K } };
  private readonly maxEntities: number;

  constructor(blueprints: T, maxEntities: number) {
    this.maxEntities = maxEntities;
    this.componentBlueprints = blueprints;
    this.componentStorages = this.initializeComponentStorages(blueprints);
    this.components = {} as { [K in keyof T]: { _name: K } };

    for (const key in blueprints) {
      this.components[key as keyof T] = { _name: key } as { _name: typeof key };
    }
  }

  private initializeComponentStorages(blueprints: T): ComponentStorageMap<T> {
    const storages = {} as ComponentStorageMap<T>;

    for (const key in blueprints) {
      const schema = blueprints[key as keyof T];
      const storage = {} as ComponentStorageMap<T>[typeof key];

      for (const prop in schema) {
        storage[prop as keyof T[typeof key]] = new Array(this.maxEntities).fill(
          undefined,
        );
      }

      storages[key as keyof T] = storage;
    }

    return storages;
  }

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: { _name: K },
    componentData: T[K],
  ): void {
    const storage = this.componentStorages[component._name];
    for (const prop in componentData) {
      const p = prop as keyof T[K];
      storage[p][entityId] = componentData[p];
    }
  }

  removeComponent(entityId: EntityId, component: { _name: keyof T }): void {
    const storage = this.componentStorages[component._name];
    for (const prop in storage) {
      const p = prop as keyof T[keyof T];
      storage[p][entityId] = undefined;
    }
  }

  removeEntityComponents(entityId: EntityId): void {
    for (const key in this.componentStorages) {
      const storage = this.componentStorages[key as keyof T];
      for (const prop in storage) {
        const p = prop as keyof T[keyof T];
        storage[p][entityId] = undefined;
      }
    }
  }
}
