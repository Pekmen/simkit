import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  QueryResult,
  ComponentRef,
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
        _name: key,
        _bitPosition: bitPosition++,
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

    const storage = this.componentStorages[component._name];
    const defaultComponentData = this.componentBlueprints[component._name];

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

    const hadComponent = this.bitsets.has(entityId, component._bitPosition);
    this.bitsets.add(entityId, component._bitPosition);

    if (!hadComponent) {
      const entityMask = this.bitsets.getBits(entityId);
      this.queryCache.invalidateForEntity(entityMask);
    }
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
    this.validateEntity(entityId);

    const hadComponent = this.bitsets.has(entityId, component._bitPosition);

    if (!hadComponent) {
      throw new Error(
        `Entity ${entityId} does not have component ${component._name}`,
      );
    }

    const entityMask = this.bitsets.getBits(entityId);

    const storage = this.componentStorages[component._name];
    for (const prop in storage) {
      this.clearStorageValue(storage[prop], entityId);
    }

    this.bitsets.remove(entityId, component._bitPosition);

    this.queryCache.invalidateForEntity(entityMask);
  }

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
    return this.bitsets.has(entityId, component._bitPosition);
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

    const storage = this.componentStorages[component._name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData as T[K];
  }

  removeEntityComponents(entityId: EntityId): void {
    this.validateEntity(entityId);

    const entityBits = this.bitsets.getBits(entityId);
    this.queryCache.invalidateForBitset(entityBits);

    for (const key in this.components) {
      if ((entityBits & (1 << this.components[key]._bitPosition)) !== 0) {
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
      result[ref._name] = this.componentStorages[ref._name];
    }

    return result as QueryResult<T, K>;
  }
}
