import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  QueryResult,
  ComponentHandle,
  SpawnConfig,
  StringKey,
} from "./types";
import { BitsetManager } from "./BitsetManager";
import { QueryCache } from "./QueryCache";
import type { EntityManager } from "./EntityManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in StringKey<T>]: ComponentHandle<K> };
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
      const blueprint = blueprints[componentName];
      const storage: ComponentStorage = {};
      for (const propName in blueprint) {
        const defaultValue = blueprint[propName];
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
      [K in StringKey<T>]: ComponentHandle<K>;
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
    isNew: boolean,
  ): void {
    const storage = this.componentStorages[componentName];
    const defaults = this.componentBlueprints[componentName];

    for (const prop in defaults) {
      const provided = componentData?.[prop as keyof T[K]];

      if (provided !== undefined) {
        const expectedType = typeof defaults[prop];
        const actualType = typeof provided;
        if (actualType !== expectedType) {
          throw new TypeError(
            `${componentName}.${prop}: expected ${expectedType}, got ${actualType}`,
          );
        }
        storage[prop][entityId] = provided;
      } else if (isNew || componentData === undefined) {
        storage[prop][entityId] = defaults[prop];
      }
    }
  }

  setComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    const isNew = !this.bitsets.has(entityId, component.bitPosition);

    this.setComponentData(entityId, component.name, componentData, isNew);

    if (isNew) {
      this.bitsets.add(entityId, component.bitPosition);
      this.queryCache.invalidateMatchingQueries(
        this.bitsets.toBitmask(component.bitPosition),
      );
    }
  }

  setComponentsFromConfig(entityId: EntityId, config: SpawnConfig<T>): void {
    this.validateEntity(entityId);
    let mask = 0;

    for (const key in config) {
      const component = this.components[key];
      const data = config[key];
      this.setComponentData(
        entityId,
        key,
        data === component ? undefined : (data as Partial<T[typeof key]>),
        true,
      );
      mask |= this.bitsets.toBitmask(component.bitPosition);
    }

    if (mask !== 0) {
      this.bitsets.setComponentMask(entityId, mask);
      this.queryCache.invalidateMatchingQueries(mask);
    }
  }

  removeComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): void {
    this.validateEntity(entityId);

    const hadComponent = this.bitsets.has(entityId, component.bitPosition);

    if (!hadComponent) {
      throw new Error(
        `removeComponent: Entity ${entityId} does not have component ${component.name}`,
      );
    }

    const storage = this.componentStorages[component.name];
    for (const prop in storage) {
      this.clearStorageValue(storage[prop], entityId);
    }

    this.bitsets.remove(entityId, component.bitPosition);

    this.queryCache.invalidateMatchingQueries(
      this.bitsets.toBitmask(component.bitPosition),
    );
  }

  hasComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): boolean {
    this.validateEntity(entityId);
    return this.bitsets.has(entityId, component.bitPosition);
  }

  private clearStorageValue(
    array: unknown[] | Float64Array | Uint8Array,
    entityId: EntityId,
  ): void {
    if (array instanceof Float64Array || array instanceof Uint8Array) {
      array[entityId] = 0;
    } else {
      array[entityId] = undefined;
    }
  }

  getComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
  ): T[K] {
    this.validateEntity(entityId);

    if (!this.bitsets.has(entityId, component.bitPosition)) {
      throw new Error(
        `getComponent: Entity ${entityId} does not have component ${component.name}`,
      );
    }

    const storage = this.componentStorages[component.name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData as T[K];
  }
  removeAllComponents(entityId: EntityId): void {
    this.validateEntity(entityId);

    const entityBits = this.bitsets.getBits(entityId);
    this.queryCache.invalidateMatchingQueries(entityBits);

    for (const key in this.components) {
      if (
        (entityBits &
          this.bitsets.toBitmask(this.components[key].bitPosition)) !==
        0
      ) {
        const storage = this.componentStorages[key];
        for (const prop in storage) {
          this.clearStorageValue(storage[prop], entityId);
        }
      }
    }

    this.bitsets.clear(entityId);
  }

  query<K extends StringKey<T>>(
    ...componentHandles: ComponentHandle<K>[]
  ): QueryResult<T, K> {
    if (componentHandles.length === 0) {
      throw new Error("query() requires at least one component");
    }
    const mask = this.bitsets.createMask(componentHandles);

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

    const result = this.buildQueryResult<K>(entities, componentHandles);

    this.queryCache.set(mask, result);

    return result;
  }

  private buildQueryResult<K extends StringKey<T>>(
    entities: EntityId[],
    componentHandles: ComponentHandle<K>[],
  ): QueryResult<T, K> {
    const result = {
      entities,
    } as { entities: EntityId[] } & Record<string, ComponentStorage>;

    for (const handle of componentHandles) {
      result[handle.name] = this.componentStorages[handle.name];
    }

    return result as QueryResult<T, K>;
  }
}
