import { ComponentManager } from "./ComponentManager";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";
import type { System } from "./System";
import type {
  EntityId,
  ComponentBlueprint,
  QueryResult,
  ComponentRef,
  WorldOptions,
  SpawnConfig,
} from "./types";

export class World<T extends ComponentBlueprint> {
  private readonly options: WorldOptions;
  readonly components: { [K in keyof T]: ComponentRef<Extract<K, string>> };

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
    const entityId = this.entityManager.addEntity();
    this.componentManager.invalidateEmptyQueryCache();
    return entityId;
  }

  removeEntity(entityId: EntityId): void {
    this.componentManager.removeEntityComponents(entityId);
    this.entityManager.removeEntity(entityId);
  }

  getEntityCount(): number {
    return this.entityManager.getEntityCount();
  }

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
    componentData?: Partial<T[K]>,
  ): void {
    this.componentManager.addComponent(entityId, component, componentData);
  }

  updateComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
    componentData?: Partial<T[K]>,
  ): void {
    this.componentManager.updateComponent(entityId, component, componentData);
  }

  hasComponent(entityId: EntityId, component: ComponentRef): boolean {
    return this.componentManager.hasComponent(entityId, component);
  }

  getComponent<K extends keyof T>(
    entityId: EntityId,
    component: ComponentRef<Extract<K, string>>,
  ): T[K] | undefined {
    return this.componentManager.getComponent(entityId, component);
  }

  removeComponent(entityId: EntityId, component: ComponentRef): void {
    this.componentManager.removeComponent(entityId, component);
  }

  addSystem(system: System): void {
    this.systemManager.addSystem(system);
  }

  removeSystem(system: System): void {
    this.systemManager.removeSystem(system);
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

  query<K extends keyof T>(
    ...components: ComponentRef<Extract<K, string>>[]
  ): QueryResult<T, K> {
    return this.componentManager.query(...components);
  }

  spawn(config: SpawnConfig<T>): EntityId {
    const entityId = this.entityManager.addEntity();
    this.componentManager.addComponentsFromConfig(entityId, config);
    return entityId;
  }
}
