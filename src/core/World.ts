import { ComponentManager } from "./ComponentManager";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";
import type { System } from "./System";
import type {
  EntityId,
  ComponentBlueprint,
  QueryResult,
  ComponentHandle,
  WorldOptions,
  SpawnConfig,
  StringKey,
} from "./types";

export class World<T extends ComponentBlueprint> {
  private readonly options: WorldOptions;
  readonly components: { [K in StringKey<T>]: ComponentHandle<K> };

  private entityManager: EntityManager;
  private systemManager: SystemManager;
  private componentManager: ComponentManager<T>;

  constructor(blueprints: T, options?: Partial<WorldOptions>) {
    this.options = {
      maxEntities: 1000,
      queryCacheSize: 64,
      ...options,
    };

    this.entityManager = new EntityManager(this.options.maxEntities);
    this.systemManager = new SystemManager();
    this.componentManager = new ComponentManager(
      blueprints,
      this.options.maxEntities,
      this.entityManager,
      this.options.queryCacheSize,
    );

    this.components = this.componentManager.components;
  }

  addEntity(): EntityId {
    return this.entityManager.addEntity();
  }

  removeEntity(entityId: EntityId): void {
    this.componentManager.removeAllComponents(entityId);
    this.entityManager.removeEntity(entityId);
  }

  getEntityCount(): number {
    return this.entityManager.getEntityCount();
  }

  addComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.componentManager.addComponent(entityId, component, componentData);
  }

  setComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
    componentData?: Partial<T[K]>,
  ): void {
    this.componentManager.setComponent(entityId, component, componentData);
  }

  hasComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): boolean {
    return this.componentManager.hasComponent(entityId, component);
  }

  getComponent<K extends StringKey<T>>(
    entityId: EntityId,
    component: ComponentHandle<K>,
  ): T[K] {
    return this.componentManager.getComponent(entityId, component);
  }

  removeComponent(
    entityId: EntityId,
    component: ComponentHandle<StringKey<T>>,
  ): void {
    this.componentManager.removeComponent(entityId, component);
  }

  addSystem(system: System, priority = 0): void {
    this.systemManager.addSystem(system, priority);
  }

  removeSystem(system: System): void {
    this.systemManager.removeSystem(system);
  }

  hasSystem(system: System): boolean {
    return this.systemManager.hasSystem(system);
  }

  update(deltaTime: number): void {
    this.systemManager.updateAll(deltaTime);
  }

  destroy(): void {
    this.systemManager.destroyAll();
    for (const entityId of [...this.entityManager.activeEntities]) {
      this.removeEntity(entityId);
    }
  }

  query<K extends StringKey<T>>(
    ...components: ComponentHandle<K>[]
  ): QueryResult<T, K> {
    return this.componentManager.query(...components);
  }

  spawn(config: SpawnConfig<T>): EntityId {
    const entityId = this.entityManager.addEntity();
    this.componentManager.setComponentsFromConfig(entityId, config);
    return entityId;
  }
}
