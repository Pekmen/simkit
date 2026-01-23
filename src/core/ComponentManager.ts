import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  QueryResult,
  ComponentRef,
  SpawnConfig,
} from "./types";
import { BitsetManager } from "./BitsetManager";
import { QueryCache } from "./QueryCache";
import type { EntityManager } from "./EntityManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in keyof T]: ComponentRef<Extract<K, string>> };
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
      [K in keyof T]: ComponentRef<Extract<K, string>>;
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

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    if (this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `Entity ${entityId} already has component ${component.name}`,
      );
    }

    const storage = this.componentStorages[component.name];
    const defaultComponentData = this.componentBlueprints[component.name];

    if (!componentData) {
      for (const prop in defaultComponentData) {
        storage[prop][entityId] = defaultComponentData[prop];
      }
    } else {
      for (const prop in defaultComponentData) {
        storage[prop][entityId] =
          (componentData as Record<string, unknown>)[prop] ??
          defaultComponentData[prop];
      }
    }

    this.bitsets.add(entityId, component.bitPosition);
    const entityMask = this.bitsets.getBits(entityId);
    this.queryCache.invalidateMatchingQueries(entityMask);
  }

  updateComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    if (!this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `Entity ${entityId} does not have component ${component.name}`,
      );
    }

    const storage = this.componentStorages[component.name];
    const defaultComponentData = this.componentBlueprints[component.name];

    if (!componentData) {
      for (const prop in defaultComponentData) {
        storage[prop][entityId] = defaultComponentData[prop];
      }
    } else {
      for (const prop in defaultComponentData) {
        storage[prop][entityId] =
          (componentData as Record<string, unknown>)[prop] ??
          defaultComponentData[prop];
      }
    }
    // No bitset change needed - component already exists
    // No query cache invalidation needed - entity composition unchanged
  }

  addComponentsFromConfig(entityId: EntityId, config: SpawnConfig<T>): void {
    let mask = 0;

    for (const key in config) {
      const component = this.components[key];
      const data = config[key];
      const storage = this.componentStorages[key];
      const defaults = this.componentBlueprints[key];

      for (const prop in defaults) {
        const value = data?.[prop] ?? defaults[prop];
        const expectedType = typeof defaults[prop];
        const actualType = typeof value;

        if (actualType !== expectedType) {
          throw new TypeError(
            `${key}.${prop}: expected ${expectedType}, got ${actualType}`,
          );
        }

        storage[prop][entityId] = value;
      }

      mask |= 1 << component.bitPosition;
    }

    if (mask !== 0) {
      this.bitsets.setBits(entityId, mask);
      this.queryCache.invalidateMatchingQueries(mask);
    } else {
      this.queryCache.invalidateEmptyQuery();
    }
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
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

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
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

  getComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
  ): T[K] | undefined {
    if (!this.hasComponent(entityId, component)) {
      return undefined;
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

  invalidateEmptyQueryCache(): void {
    this.queryCache.invalidateEmptyQuery();
  }

  query<K extends keyof T>(
    ...componentRefs: ComponentRef<Extract<K, string>>[]
  ): QueryResult<T, K> {
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

  private buildQueryResult<K extends keyof T>(
    entities: EntityId[],
    componentRefs: ComponentRef<Extract<K, string>>[],
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
