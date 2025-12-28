import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  ComponentStorageMapQuery,
  QueryResult,
  ComponentRef,
} from "./types";
import { BitsetManager } from "./BitsetManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in keyof T]: ComponentRef<Extract<K, string>> };
  private readonly maxEntities: number;
  private readonly entities: Set<EntityId>;
  private readonly bitsets: BitsetManager;
  private queryCacheEntities = new Map<number, EntityId[]>();

  constructor(blueprints: T, maxEntities: number, entities: Set<EntityId>) {
    this.maxEntities = maxEntities;
    this.componentBlueprints = blueprints;
    this.entities = entities;

    const componentCount = Object.keys(blueprints).length;
    this.bitsets = new BitsetManager(componentCount, maxEntities);

    this.componentStorages = {};
    for (const componentName in blueprints) {
      const schema = blueprints[componentName];
      const storage: ComponentStorage = {};
      for (const propName in schema) {
        storage[propName] = new Array(this.maxEntities).fill(undefined);
      }
      this.componentStorages[componentName] = storage;
    }

    this.components = {} as {
      [K in keyof T]: ComponentRef<Extract<K, string>>;
    };
    let bitPosition = 0;
    for (const key in blueprints) {
      this.components[key] = {
        _name: key,
        _bitPosition: bitPosition++,
      };
    }
  }

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
    componentData?: Partial<T[K]>,
  ): void {
    if (!this.entities.has(entityId)) {
      return;
    }
    const storage = this.componentStorages[component._name];
    const defaultComponentData = this.componentBlueprints[component._name];

    const data = { ...defaultComponentData, ...componentData };

    for (const prop in data) {
      storage[prop][entityId] = data[prop];
    }

    this.bitsets.add(entityId, component._bitPosition);

    if (this.queryCacheEntities.size > 0) {
      this.queryCacheEntities.clear();
    }
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
    if (!this.entities.has(entityId)) {
      return;
    }
    const storage = this.componentStorages[component._name];
    for (const prop in storage) {
      storage[prop][entityId] = undefined;
    }

    this.bitsets.remove(entityId, component._bitPosition);

    if (this.queryCacheEntities.size > 0) {
      this.queryCacheEntities.clear();
    }
  }

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
    if (!this.entities.has(entityId)) {
      return false;
    }
    return this.bitsets.has(entityId, component._bitPosition);
  }

  getComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
  ): T[K] | undefined {
    if (!this.hasComponent(entityId, component)) {
      return undefined;
    }

    const storage = this.componentStorages[component._name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData as T[K];
  }

  removeEntityComponents(entityId: EntityId): void {
    for (const key in this.componentStorages) {
      const storage = this.componentStorages[key];
      for (const prop in storage) {
        storage[prop][entityId] = undefined;
      }
    }

    this.bitsets.clear(entityId);

    if (this.queryCacheEntities.size > 0) {
      this.queryCacheEntities.clear();
    }
  }

  query<K extends keyof T>(
    ...componentRefs: ComponentRef<Extract<K, string>>[]
  ): QueryResult<T, K> {
    const bitPositions = componentRefs.map((ref) => ref._bitPosition);
    const mask = this.bitsets.createMask(bitPositions);

    const cachedEntities = this.queryCacheEntities.get(mask);

    if (cachedEntities) {
      const componentNames = componentRefs.map((ref) => ref._name);
      const storages: Record<string, ComponentStorage> = {};
      for (const name of componentNames) {
        storages[name] = this.componentStorages[name];
      }
      return {
        entities: cachedEntities,
        storages: storages as Pick<ComponentStorageMapQuery<T>, K>,
      };
    }

    const entities: EntityId[] = [];
    for (const entityId of this.entities) {
      if (this.bitsets.matchesMask(entityId, mask)) {
        entities.push(entityId);
      }
    }

    const componentNames = componentRefs.map((ref) => ref._name);
    const storages: Record<string, ComponentStorage> = {};
    for (const name of componentNames) {
      storages[name] = this.componentStorages[name];
    }

    const result: QueryResult<T, K> = {
      entities,
      storages: storages as Pick<ComponentStorageMapQuery<T>, K>,
    };

    this.queryCacheEntities.set(mask, entities);

    return result;
  }
}
