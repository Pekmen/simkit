import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorageMap,
  QueryStorageMap,
  QueryResult,
} from "./types";

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
    componentData?: T[K],
  ): void {
    const storage = this.componentStorages[component._name];
    const defaultComponentData = this.componentBlueprints[component._name];

    const data = { ...defaultComponentData, ...componentData };

    for (const prop in data) {
      storage[prop][entityId] = data[prop];
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

  query<K extends keyof T>(
    ...componentRefs: { _name: K }[]
  ): QueryResult<T, K> {
    const entities: EntityId[] = [];
    const componentNames = componentRefs.map((ref) => ref._name);

    for (let entityId = 0; entityId < this.maxEntities; entityId++) {
      const hasAllComponents = componentNames.every((name) => {
        const storage = this.componentStorages[name];
        const firstProp = Object.keys(storage)[0] as keyof T[K];
        return storage[firstProp][entityId] !== undefined;
      });

      if (hasAllComponents) {
        entities.push(entityId as EntityId);
      }
    }

    const storages = {} as Pick<QueryStorageMap<T>, K>;
    for (const name of componentNames) {
      storages[name] = this.componentStorages[name] as QueryStorageMap<T>[K];
    }

    return { entities, storages };
  }
}
