import type {
  EntityId,
  ComponentBlueprint,
  ComponentStorage,
  ComponentStorageMap,
  QueryResult,
  ComponentRef,
} from "./types";
import { EntityManager } from "./EntityManager";
import { BitsetManager } from "./BitsetManager";

export class ComponentManager<T extends ComponentBlueprint> {
  private readonly componentBlueprints: T;
  private readonly componentStorages: Record<string, ComponentStorage>;
  readonly components: { [K in keyof T]: ComponentRef };
  private readonly maxEntities: number;
  private readonly entityManager: EntityManager;
  private readonly bitsets: BitsetManager;

  constructor(
    blueprints: T,
    maxEntities: number,
    entityManager: EntityManager,
  ) {
    this.maxEntities = maxEntities;
    this.componentBlueprints = blueprints;
    this.entityManager = entityManager;

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

    this.components = {} as { [K in keyof T]: ComponentRef };
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
    component: ComponentRef,
    componentData?: Partial<T[K]>,
  ): void {
    const index = this.entityManager.getEntityIndex(entityId);
    const storage = this.componentStorages[component._name];
    const defaultComponentData = this.componentBlueprints[component._name];

    const data = { ...defaultComponentData, ...componentData };

    for (const prop in data) {
      storage[prop][index] = data[prop];
    }

    this.bitsets.add(index, component._bitPosition);
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
    const index = this.entityManager.getEntityIndex(entityId);
    const storage = this.componentStorages[component._name];
    for (const prop in storage) {
      storage[prop][index] = undefined;
    }

    this.bitsets.remove(index, component._bitPosition);
  }

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
    const index = this.entityManager.getEntityIndex(entityId);
    return this.bitsets.has(index, component._bitPosition);
  }

  getComponent(
    entityId: EntityId,
    component: ComponentRef,
  ): Record<string, unknown> | undefined {
    if (!this.hasComponent(entityId, component)) {
      return undefined;
    }

    const index = this.entityManager.getEntityIndex(entityId);
    const storage = this.componentStorages[component._name];
    const componentData: Record<string, unknown> = {};
    for (const prop in storage) {
      componentData[prop] = storage[prop][index];
    }

    return componentData;
  }

  removeEntityComponents(entityId: EntityId): void {
    const index = this.entityManager.getEntityIndex(entityId);
    for (const key in this.componentStorages) {
      const storage = this.componentStorages[key];
      for (const prop in storage) {
        storage[prop][index] = undefined;
      }
    }

    this.bitsets.clear(index);
  }

  query<K extends keyof T>(
    ...componentRefs: ComponentRef[]
  ): QueryResult<T, K> {
    const entities: number[] = [];
    const bitPositions = componentRefs.map((ref) => ref._bitPosition);
    const mask = this.bitsets.createMask(bitPositions);

    for (const entityId of this.entityManager.activeEntities) {
      const index = this.entityManager.getEntityIndex(entityId);
      if (this.bitsets.matchesMask(index, mask)) {
        // Return the index for direct storage access
        entities.push(index);
      }
    }

    const storages: Record<string, ComponentStorage> = {};
    const componentNames = componentRefs.map((ref) => ref._name);
    for (const name of componentNames) {
      storages[name] = this.componentStorages[name];
    }

    return { entities, storages: storages as Pick<ComponentStorageMap<T>, K> };
  }
}
