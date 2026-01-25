import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  QueryResult,
  ComponentRef,
  SpawnConfig,
  StringKey,
} from "./types";
import { BitsetManager } from "./BitsetManager";
import { QueryCache } from "./QueryCache";
import type { EntityManager } from "./EntityManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in StringKey<T>]: ComponentRef<K> };
  private readonly maxEntities: number;
  private readonly entityManager: EntityManager;
  private readonly bitsets: BitsetManager;
  private readonly queryCache: QueryCache;

  constructor(
    blueprints: T,
    maxEntities: number,
    entityManager: EntityManager,
    maxCacheSize = 64,
  ) {
    this.maxEntities = maxEntities;
    this.queryCache = new QueryCache(maxCacheSize);
    this.componentBlueprints = blueprints;
    this.entityManager = entityManager;

    const componentCount = Object.keys(blueprints).length;
    this.bitsets = new BitsetManager(componentCount, maxEntities);

    this.componentStorages = {};
    for (const componentName in blueprints) {
      const schema = blueprints[componentName];
      const storage: ComponentStorage = {};
      for (const propName in schema) {
        const defaultValue = schema[propName];
        const valueType = typeof defaultValue;

        if (valueType === "number") {
          storage[propName] = new Float64Array(this.maxEntities);
        } else if (valueType === "boolean") {
          storage[propName] = new Uint8Array(this.maxEntities);
        } else {
          storage[propName] = new Array(this.maxEntities).fill(undefined);
        }
      }
      this.componentStorages[componentName] = storage;
    }

    this.components = {} as {
      [K in StringKey<T>]: ComponentRef<K>;
    };
    let bitPosition = 0;
    for (const key in blueprints) {
      this.components[key] = {
        name: key,
        bitPosition: bitPosition++,
      };
    }
  }

  private validateEntity(entityId: EntityId): void {
    if (!this.entityManager.isValid(entityId)) {
      throw new Error(`Stale entity reference: EntityId ${entityId}`);
    }
  }

  private setComponentData<K extends keyof T>(
    entityId: EntityId,
    componentName: string,
    componentData: Partial<T[K]> | undefined,
  ): void {
    const storage = this.componentStorages[componentName];
    const defaults = this.componentBlueprints[componentName];

    for (const prop in defaults) {
      const value = componentData?.[prop as keyof T[K]] ?? defaults[prop];
      const expectedType = typeof defaults[prop];
      const actualType = typeof value;

      if (actualType !== expectedType) {
        throw new TypeError(
          `${componentName}.${prop}: expected ${expectedType}, got ${actualType}`,
        );
      }

      storage[prop][entityId] = value;
    }
  }

  addComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentRef<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    if (this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `Entity ${entityId} already has component ${component.name}`,
      );
    }

    this.setComponentData(entityId, component.name, componentData);

    this.bitsets.add(entityId, component.bitPosition);
    const entityMask = this.bitsets.getBits(entityId);
    this.queryCache.invalidateMatchingQueries(entityMask);
  }

  setComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentRef<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    if (!this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `Entity ${entityId} does not have component ${component.name}`,
      );
    }

    this.setComponentData(entityId, component.name, componentData);
  }

  addComponentsFromConfig(entityId: EntityId, config: SpawnConfig<T>): void {
    this.validateEntity(entityId);
    let mask = 0;

    for (const key in config) {
      const component = this.components[key];
      this.setComponentData(entityId, key, config[key]);
      mask |= 1 << component.bitPosition;
    }

    if (mask !== 0) {
      this.bitsets.setComponentMask(entityId, mask);
      this.queryCache.invalidateMatchingQueries(mask);
    }
  }

  removeComponent(
    entityId: EntityId,
    component: ComponentRef<StringKey<T>>,
  ): void {
    this.validateEntity(entityId);

    const hadComponent = this.bitsets.has(entityId, component.bitPosition);

    if (!hadComponent) {
      throw new Error(
        `Entity ${entityId} does not have component ${component.name}`,
      );
    }

    const entityMask = this.bitsets.getBits(entityId);

    const storage = this.componentStorages[component.name];
    for (const prop in storage) {
      this.clearStorageValue(storage[prop], entityId);
    }

    this.bitsets.remove(entityId, component.bitPosition);

    this.queryCache.invalidateMatchingQueries(entityMask);
  }

  hasComponent(
    entityId: EntityId,
    component: ComponentRef<StringKey<T>>,
  ): boolean {
    this.validateEntity(entityId);
    return this.bitsets.has(entityId, component.bitPosition);
  }

  private clearStorageValue(
    array: unknown[] | Float64Array | Uint8Array,
    index: number,
  ): void {
    if (array instanceof Float64Array || array instanceof Uint8Array) {
      array[index] = 0;
    } else {
      array[index] = undefined;
    }
  }

  getComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentRef<K>,
  ): T[K] {
    this.validateEntity(entityId);

    if (!this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `Entity ${entityId} does not have component ${component.name}`,
      );
    }

    const storage = this.componentStorages[component.name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData as T[K];
  }

  removeEntityComponents(entityId: EntityId): void {
    this.validateEntity(entityId);

    const entityBits = this.bitsets.getBits(entityId);
    this.queryCache.invalidateMatchingQueries(entityBits);

    for (const key in this.components) {
      if ((entityBits & (1 << this.components[key].bitPosition)) !== 0) {
        const storage = this.componentStorages[key];
        for (const prop in storage) {
          this.clearStorageValue(storage[prop], entityId);
        }
      }
    }

    this.bitsets.clear(entityId);
  }

  query<K extends StringKey<T>>(
    ...componentRefs: ComponentRef<K>[]
  ): QueryResult<T, K> {
    if (componentRefs.length === 0) {
      throw new Error("query() requires at least one component");
    }
    const mask = this.bitsets.createMask(componentRefs);

    const cached = this.queryCache.get(mask);
    if (cached) {
      return cached as QueryResult<T, K>;
    }

    const entities: EntityId[] = [];
    for (const entityId of this.entityManager.activeEntities) {
      if (this.bitsets.matchesMask(entityId, mask)) {
        entities.push(entityId);
      }
    }

    const result = this.buildQueryResult<K>(entities, componentRefs);

    this.queryCache.set(mask, result);

    return result;
  }

  private buildQueryResult<K extends StringKey<T>>(
    entities: EntityId[],
    componentRefs: ComponentRef<K>[],
  ): QueryResult<T, K> {
    const result = {
      entities,
    } as { entities: EntityId[] } & Record<string, ComponentStorage>;

    for (const ref of componentRefs) {
      result[ref.name] = this.componentStorages[ref.name];
    }

    return result as QueryResult<T, K>;
  }
}
