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

  getActiveEntities(): readonly EntityId[] {
    return this.entityManager.activeEntities;
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
    try {
      this.systemManager.destroyAll();
    } finally {
      for (const entityId of [...this.entityManager.activeEntities]) {
        this.removeEntity(entityId);
      }
    }
  }

  query<K extends StringKey<T>>(
    ...components: ComponentHandle<K>[]
  ): QueryResult<T, K> {
    return this.componentManager.query(...components);
  }

  addSystem<
    K extends StringKey<T> = never,
    S = Record<string, never>,
  >(config: {
    components?: ComponentHandle<K>[];
    state?: S;
    priority?: number;
    init?(ctx: { state: S; world: World<T> }): void;
    update(
      ctx: { state: S; world: World<T>; query: QueryResult<T, K> },
      dt: number,
    ): void;
    destroy?(ctx: { state: S; world: World<T> }): void;
  }): System {
    const handles = config.components;
    if (handles) {
      for (const handle of handles) {
        if (this.components[handle.name as StringKey<T>] !== handle) {
          throw new Error(
            `addSystem: component handle "${handle.name}" does not belong to this world`,
          );
        }
      }
    }

    const emptyQuery = { entities: Object.freeze([] as EntityId[]) } as QueryResult<T, K>;
    const ctx = { state: (config.state ?? {}) as S, world: this, query: emptyQuery };

    const system: System = {
      init: config.init
        ? (): void => {
            config.init?.(ctx);
          }
        : undefined,
      update: (dt: number): void => {
        ctx.query = handles ? this.query(...handles) : emptyQuery;
        config.update(ctx, dt);
      },
      destroy: config.destroy
        ? (): void => {
            config.destroy?.(ctx);
          }
        : undefined,
    };

    this.systemManager.addSystem(system, config.priority ?? 0);
    return system;
  }

  spawn(config: SpawnConfig<T>): EntityId {
    const entityId = this.entityManager.addEntity();
    this.componentManager.setComponentsFromConfig(entityId, config);
    return entityId;
  }
}
