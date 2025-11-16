import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  ComponentStorageMap,
  QueryResult,
  ComponentRef,
} from "./types";
import type { EntityManager } from "./EntityManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in keyof T]: ComponentRef };
  private readonly maxEntities: number;
  private readonly entityManager: EntityManager;

  constructor(
    blueprints: T,
    maxEntities: number,
    entityManager: EntityManager,
  ) {
    this.maxEntities = maxEntities;
    this.componentBlueprints = blueprints;
    this.entityManager = entityManager;

    this.componentStorages = {};
    for (const componentName in blueprints) {
      const schema = blueprints[componentName];
      const storage: ComponentStorage = {};
      for (const propName in schema) {
        storage[propName] = new Array(this.maxEntities).fill(undefined);
      }
      this.componentStorages[componentName] = storage;
    }

    this.components = {} as { [K in keyof T]: ComponentRef };
    for (const key in blueprints) {
      this.components[key] = { _name: key };
    }
  }

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef,
    componentData?: Partial<T[K]>,
  ): void {
    const storage = this.componentStorages[component._name];
    const defaultComponentData = this.componentBlueprints[component._name];

    const data = { ...defaultComponentData, ...componentData };

    for (const prop in data) {
      storage[prop][entityId] = data[prop];
    }
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
    const storage = this.componentStorages[component._name];
    for (const prop in storage) {
      storage[prop][entityId] = undefined;
    }
  }

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
    const storage = this.componentStorages[component._name];
    const firstProp = Object.keys(storage)[0];
    if (!firstProp) {
      return false;
    }
    return storage[firstProp][entityId] !== undefined;
  }

  getComponent(
    entityId: EntityId,
    component: ComponentRef,
  ): Record<string, unknown> | undefined {
    if (!this.hasComponent(entityId, component)) {
      return undefined;
    }

    const storage = this.componentStorages[component._name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData;
  }

  removeEntityComponents(entityId: EntityId): void {
    for (const key in this.componentStorages) {
      const storage = this.componentStorages[key];
      for (const prop in storage) {
        storage[prop][entityId] = undefined;
      }
    }
  }

  query<K extends keyof T>(
    ...componentRefs: ComponentRef[]
  ): QueryResult<T, K> {
    const entities: EntityId[] = [];
    const componentNames = componentRefs.map((ref) => ref._name);

    for (const entityId of this.entityManager.activeEntities) {
      const hasAllComponents = componentNames.every((name) => {
        const storage = this.componentStorages[name];
        const firstProp = Object.keys(storage)[0];
        return storage[firstProp][entityId] !== undefined;
      });

      if (hasAllComponents) {
        entities.push(entityId);
      }
    }

    const storages: Record<string, ComponentStorage> = {};
    for (const name of componentNames) {
      storages[name] = this.componentStorages[name];
    }

    return { entities, storages: storages as Pick<ComponentStorageMap<T>, K> };
  }
}
