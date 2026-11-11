import { DEFAULT_QUERY_CACHE_SIZE } from "./types";
import type {
  EntityId,
  ComponentBlueprint,
  ComponentHandleMap,
  ComponentStorage,
  StorageColumn,
  QueryResult,
  QueryOptions,
  ComponentHandle,
  SpawnConfig,
  StringKey,
  ValidComponentProp,
} from "./types";
import { BitsetManager, matchesMask } from "./BitsetManager";
import { QueryCache } from "./QueryCache";
import type { CacheEntry } from "./QueryCache";
import type { EntityManager } from "./EntityManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: ComponentHandleMap<T>;
  private readonly entityManager: EntityManager;
  private readonly bitsets: BitsetManager;
  private readonly queryCache: QueryCache;
  private readonly bitToComponentName: string[] = [];

  private readonly propNames: Record<string, string[]> = {};

  constructor(
    blueprints: T,
    maxEntities: number,
    entityManager: EntityManager,
    maxCacheSize = DEFAULT_QUERY_CACHE_SIZE,
  ) {
    this.queryCache = new QueryCache(maxCacheSize, maxEntities);
    this.componentBlueprints = blueprints;
    this.entityManager = entityManager;

    this.bitsets = new BitsetManager(maxEntities);

    this.componentStorages = {};
    this.components = {} as ComponentHandleMap<T>;
    let bitPosition = 0;
    for (const key in blueprints) {
      const blueprint = blueprints[key];
      const storage: ComponentStorage = {};
      const names: string[] = [];
      for (const propName in blueprint) {
        names.push(propName);

        storage[propName] =
          typeof blueprint[propName] === "number"
            ? new Float64Array(maxEntities)
            : new Array(maxEntities).fill(undefined);
      }
      this.componentStorages[key] = storage;
      this.propNames[key] = names;

      const handle = Object.freeze({
        name: key,
        bitPosition,
        bitMask: 1 << bitPosition,
      });
      this.components[key] = handle as ComponentHandle<typeof key>;
      this.bitToComponentName[bitPosition] = key;
      bitPosition++;
    }
  }

  private writeComponentData(
    entityId: EntityId,
    componentName: string,
    names: string[],
    componentData: Partial<Record<string, ValidComponentProp>> | undefined,
    isNew: boolean,
  ): void {
    const storage = this.componentStorages[componentName];
    const defaults = this.componentBlueprints[componentName];

    for (const prop of names) {
      const provided = componentData?.[prop];

      if (provided !== undefined) {
        storage[prop][entityId] = provided;
      } else if (isNew) {
        storage[prop][entityId] = defaults[prop];
      }
    }
  }

  setComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
    componentData?: Partial<T[K]>,
  ): void {
    const oldBits = this.bitsets.getBits(entityId);
    const isNew = (oldBits & component.bitMask) === 0;

    this.writeComponentData(
      entityId,
      component.name,
      this.propNames[component.name],
      componentData,
      isNew,
    );

    if (isNew) {
      this.bitsets.add(entityId, component.bitMask);
      this.queryCache.onMembershipChanged(
        entityId,
        oldBits,
        oldBits | component.bitMask,
      );
    }
  }

  setComponentsFromConfig(entityId: EntityId, config: SpawnConfig<T>): void {
    let mask = 0;
    for (const key in config) {
      const component = this.components[key];
      const data: unknown = config[key];

      const componentData:
        | Partial<Record<string, ValidComponentProp>>
        | undefined =
        data === component
          ? undefined
          : (data as Partial<Record<string, ValidComponentProp>>);
      this.writeComponentData(
        entityId,
        component.name,
        this.propNames[key],
        componentData,
        true,
      );
      mask |= component.bitMask;
    }

    if (mask !== 0) {
      const oldBits = this.bitsets.getBits(entityId);
      const newBits = oldBits | mask;
      this.bitsets.setBits(entityId, newBits);
      this.queryCache.onMembershipChanged(entityId, oldBits, newBits);
    }
  }

  removeComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): void {
    const oldBits = this.bitsets.getBits(entityId);

    this.clearComponentStorage(component.name, entityId);

    this.bitsets.remove(entityId, component.bitMask);

    this.queryCache.onMembershipChanged(
      entityId,
      oldBits,
      oldBits & ~component.bitMask,
    );
  }

  hasComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): boolean {
    return this.bitsets.has(entityId, component.bitMask);
  }

  private clearStorageValue(array: StorageColumn, entityId: EntityId): void {
    if (array instanceof Float64Array) {
      array[entityId] = 0;
    } else {
      array[entityId] = undefined;
    }
  }

  private clearComponentStorage(
    componentName: string,
    entityId: EntityId,
  ): void {
    const storage = this.componentStorages[componentName];
    for (const prop of this.propNames[componentName]) {
      this.clearStorageValue(storage[prop], entityId);
    }
  }

  getComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
  ): T[K] {
    const storage = this.componentStorages[component.name];
    const componentData: Record<string, unknown> = {};
    for (const prop of this.propNames[component.name]) {
      componentData[prop] = storage[prop][entityId];
    }

    return componentData as T[K];
  }

  removeAllComponents(entityId: EntityId): void {
    const oldBits = this.bitsets.getBits(entityId);
    let bits = oldBits;

    while (bits !== 0) {
      const bitPosition = 31 - Math.clz32(bits & -bits);
      this.clearComponentStorage(
        this.bitToComponentName[bitPosition],
        entityId,
      );
      bits &= bits - 1;
    }

    this.bitsets.clear(entityId);
    this.queryCache.onMembershipChanged(entityId, oldBits, 0);
  }

  clearAll(): void {
    for (const componentName in this.componentStorages) {
      const storage = this.componentStorages[componentName];
      for (const prop of this.propNames[componentName]) {
        const column = storage[prop];
        if (column instanceof Float64Array) {
          column.fill(0);
        } else {
          column.fill(undefined);
        }
      }
    }
    this.bitsets.clearAll();
    this.queryCache.clear();
  }

  runQuery<K extends StringKey<T>>(
    first: ComponentHandle<K> | QueryOptions<T, K> | undefined,
    rest: ComponentHandle<K>[],
  ): QueryResult<T, K> {
    let withHandles: ComponentHandle<K>[];
    let withoutHandles: ComponentHandle<StringKey<T>>[];

    if (first === undefined || "bitPosition" in first) {
      withHandles = first !== undefined ? [first, ...rest] : [];
      withoutHandles = [];
    } else {
      withHandles = first.with ?? [];
      withoutHandles = first.without ?? [];
    }

    const { includeMask, excludeMask } = this.computeMasks(
      withHandles,
      withoutHandles,
    );
    return this.fetchQuery(includeMask, excludeMask, withHandles);
  }

  createQueryFn<K extends StringKey<T>>(
    withHandles: ComponentHandle<K>[],
    withoutHandles: ComponentHandle<StringKey<T>>[],
  ): () => QueryResult<T, K> {
    const { includeMask, excludeMask } = this.computeMasks(
      withHandles,
      withoutHandles,
    );
    return () => this.fetchQuery(includeMask, excludeMask, withHandles);
  }

  private computeMasks(
    withHandles: ComponentHandle<StringKey<T>>[],
    withoutHandles: ComponentHandle<StringKey<T>>[],
  ): { includeMask: number; excludeMask: number } {
    return {
      includeMask: this.bitsets.createMask(withHandles),
      excludeMask: this.bitsets.createMask(withoutHandles),
    };
  }

  private fetchQuery<K extends StringKey<T>>(
    includeMask: number,
    excludeMask: number,
    withHandles: ComponentHandle<K>[],
  ): QueryResult<T, K> {
    const cacheable = includeMask !== 0;

    let entry: CacheEntry | undefined;
    if (cacheable) {
      entry = this.queryCache.getEntry(includeMask, excludeMask);
      if (entry !== undefined && !entry.dirty) {
        return entry.result as QueryResult<T, K>;
      }
    }

    let list: EntityId[];
    if (entry !== undefined) {
      list = entry.list;
    } else {
      list = [];
      for (const entityId of this.entityManager.activeEntities) {
        const bits = this.bitsets.getBits(entityId);
        if (matchesMask(bits, includeMask, excludeMask)) {
          list.push(entityId);
        }
      }
      if (cacheable) {
        entry = this.queryCache.createEntry(includeMask, excludeMask, list);
      }
    }

    const entities =
      entry !== undefined
        ? Object.freeze([...entry.list])
        : Object.freeze(list);

    const result = this.buildQueryResult<K>(entities, withHandles);
    if (entry !== undefined) {
      entry.result = result;
      entry.dirty = false;
    }
    return result;
  }

  private buildQueryResult<K extends StringKey<T>>(
    entities: readonly EntityId[],
    componentHandles: ComponentHandle<K>[],
  ): QueryResult<T, K> {
    const result = {
      entities,
    } as { entities: readonly EntityId[] } & Record<string, ComponentStorage>;

    for (const handle of componentHandles) {
      result[handle.name] = this.componentStorages[handle.name];
    }

    return result as QueryResult<T, K>;
  }
}
