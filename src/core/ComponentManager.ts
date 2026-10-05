import {
  staleEntityError,
  missingComponentError,
  DEFAULT_QUERY_CACHE_SIZE,
} from "./types";
import type {
  EntityId,
  ComponentBlueprint,
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

// "entities" is the key the query result reserves for its EntityId list, so it
// cannot double as a component name.
const RESERVED_COMPONENT_NAMES = new Set(["entities"]);

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in StringKey<T>]: ComponentHandle<K> };
  private readonly entityManager: EntityManager;
  private readonly bitsets: BitsetManager;
  private readonly queryCache: QueryCache;
  private readonly bitToComponentName: string[] = [];
  private readonly ownedHandles = new WeakSet<ComponentHandle>();

  private readonly propMeta: Record<
    string,
    { names: string[]; types: string[] }
  > = {};

  constructor(
    blueprints: T,
    maxEntities: number,
    entityManager: EntityManager,
    maxCacheSize = DEFAULT_QUERY_CACHE_SIZE,
  ) {
    this.queryCache = new QueryCache(maxCacheSize, maxEntities);
    this.componentBlueprints = blueprints;
    this.entityManager = entityManager;

    for (const componentName in blueprints) {
      if (RESERVED_COMPONENT_NAMES.has(componentName)) {
        throw new Error(
          `World: component name "${componentName}" is reserved and cannot be used`,
        );
      }
    }

    const componentCount = Object.keys(blueprints).length;
    this.bitsets = new BitsetManager(componentCount, maxEntities);

    this.componentStorages = {};
    this.components = {} as {
      [K in StringKey<T>]: ComponentHandle<K>;
    };
    let bitPosition = 0;
    for (const key in blueprints) {
      const blueprint = blueprints[key];
      const storage: ComponentStorage = {};
      const names: string[] = [];
      const types: string[] = [];
      for (const propName in blueprint) {
        const valueType = typeof blueprint[propName];
        names.push(propName);
        types.push(valueType);

        if (valueType === "number") {
          storage[propName] = new Float64Array(maxEntities);
        } else if (valueType === "boolean") {
          storage[propName] = new Array(maxEntities).fill(false);
        } else {
          storage[propName] = new Array(maxEntities).fill(undefined);
        }
      }
      this.componentStorages[key] = storage;
      this.propMeta[key] = { names, types };

      this.components[key] = Object.freeze({
        name: key,
        bitPosition,
        bitMask: 1 << bitPosition,
      });
      this.ownedHandles.add(this.components[key]);
      this.bitToComponentName[bitPosition] = key;
      bitPosition++;
    }
  }

  private validateEntity(entityId: EntityId): void {
    if (!this.entityManager.isValid(entityId)) {
      throw staleEntityError(entityId);
    }
  }

  private validateComponentData(
    componentName: string,
    names: string[],
    types: string[],
    componentData: Partial<Record<string, ValidComponentProp>> | undefined,
  ): void {
    for (let i = 0; i < names.length; i++) {
      const provided = componentData?.[names[i]];
      if (provided !== undefined && typeof provided !== types[i]) {
        throw new TypeError(
          `${componentName}.${names[i]}: expected ${types[i]}, got ${typeof provided}`,
        );
      }
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

  private setComponentData(
    entityId: EntityId,
    componentName: string,
    componentData: Partial<Record<string, ValidComponentProp>> | undefined,
    isNew: boolean,
  ): void {
    const { names, types } = this.propMeta[componentName];
    this.validateComponentData(componentName, names, types, componentData);
    this.writeComponentData(
      entityId,
      componentName,
      names,
      componentData,
      isNew,
    );
  }

  setComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.validateEntity(entityId);

    const oldBits = this.bitsets.getBits(entityId);
    const isNew = (oldBits & component.bitMask) === 0;

    this.setComponentData(entityId, component.name, componentData, isNew);

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
    const staged: {
      component: ComponentHandle<StringKey<T>>;
      names: string[];
      componentData: Partial<Record<string, ValidComponentProp>> | undefined;
    }[] = [];

    for (const key in config) {
      if (!Object.hasOwn(this.components, key)) {
        throw new Error(`spawn: unknown component "${key}"`);
      }
      const component = this.components[key];
      const data = config[key];

      const componentData =
        data === component
          ? undefined
          : (data as Partial<Record<string, ValidComponentProp>>);
      const { names, types } = this.propMeta[key];
      this.validateComponentData(key, names, types, componentData);
      staged.push({ component, names, componentData });
    }

    let mask = 0;
    for (const { component, names, componentData } of staged) {
      this.writeComponentData(
        entityId,
        component.name,
        names,
        componentData,
        true,
      );
      mask |= component.bitMask;
    }

    if (mask !== 0) {
      const oldBits = this.bitsets.getBits(entityId);
      const newBits = oldBits | mask;
      this.bitsets.setComponentMask(entityId, newBits);
      this.queryCache.onMembershipChanged(entityId, oldBits, newBits);
    }
  }

  removeComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): void {
    this.validateEntity(entityId);

    const oldBits = this.bitsets.getBits(entityId);

    if ((oldBits & component.bitMask) === 0) {
      throw missingComponentError("removeComponent", entityId, component.name);
    }

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
    this.validateEntity(entityId);
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
    for (const prop in storage) {
      this.clearStorageValue(storage[prop], entityId);
    }
  }

  getComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
  ): T[K] {
    this.validateEntity(entityId);

    if (!this.bitsets.has(entityId, component.bitMask)) {
      throw missingComponentError("getComponent", entityId, component.name);
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

    const oldBits = this.bitsets.getBits(entityId);
    let bits = oldBits;

    while (bits !== 0) {
      // bits & -bits isolates the lowest set bit; clz32 turns it into a bit index.
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
      for (const prop in storage) {
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

    const { includeMask, excludeMask } = this.validateAndComputeMasks(
      withHandles,
      withoutHandles,
      "query",
    );
    return this.fetchQuery(includeMask, excludeMask, withHandles);
  }

  createQueryFn<K extends StringKey<T>>(
    withHandles: ComponentHandle<K>[],
    withoutHandles: ComponentHandle<StringKey<T>>[],
  ): () => QueryResult<T, K> {
    const { includeMask, excludeMask } = this.validateAndComputeMasks(
      withHandles,
      withoutHandles,
      "addSystem",
    );
    return () => this.fetchQuery(includeMask, excludeMask, withHandles);
  }

  private validateHandlesOwned(
    handles: ComponentHandle<StringKey<T>>[],
    caller: string,
  ): void {
    for (const handle of handles) {
      if (!this.ownedHandles.has(handle)) {
        throw new Error(
          `${caller}: component handle "${handle.name}" does not belong to this world`,
        );
      }
    }
  }

  private validateAndComputeMasks(
    withHandles: ComponentHandle<StringKey<T>>[],
    withoutHandles: ComponentHandle<StringKey<T>>[],
    caller: string,
  ): { includeMask: number; excludeMask: number } {
    if (withHandles.length === 0 && withoutHandles.length === 0) {
      throw new Error(
        `${caller}: requires at least one component in "with" or "without"`,
      );
    }
    this.validateHandlesOwned(withHandles, caller);
    this.validateHandlesOwned(withoutHandles, caller);
    const includeMask = this.bitsets.createMask(withHandles);
    const excludeMask = this.bitsets.createMask(withoutHandles);
    if ((includeMask & excludeMask) !== 0) {
      throw new Error(
        `${caller}: a component cannot appear in both with and without`,
      );
    }
    return { includeMask, excludeMask };
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
