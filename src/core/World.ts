import { ComponentManager } from "./ComponentManager";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";
import type {
  EntityId,
  EntityRef,
  ComponentBlueprint,
  QueryResult,
  QueryOptions,
  ComponentHandle,
  WorldOptions,
  SpawnConfig,
  StringKey,
  System,
  SystemConfig,
  SystemUpdateContext,
} from "./types";
import { DEFAULT_QUERY_CACHE_SIZE } from "./types";

export class World<T extends ComponentBlueprint> {
  readonly components: { [K in StringKey<T>]: ComponentHandle<K> };

  private readonly entityManager: EntityManager;
  private readonly systemManager: SystemManager;
  private readonly componentManager: ComponentManager<T>;

  constructor(blueprints: T, options?: Partial<WorldOptions>) {
    const resolvedOptions: WorldOptions = {
      maxEntities: 1000,
      queryCacheSize: DEFAULT_QUERY_CACHE_SIZE,
      ...options,
    };

    this.entityManager = new EntityManager(resolvedOptions.maxEntities);
    this.systemManager = new SystemManager();
    this.componentManager = new ComponentManager(
      blueprints,
      resolvedOptions.maxEntities,
      this.entityManager,
      resolvedOptions.queryCacheSize,
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
    return [...this.entityManager.activeEntities];
  }

  ref(entityId: EntityId): EntityRef {
    return this.entityManager.ref(entityId);
  }

  resolve(ref: EntityRef): EntityId | undefined {
    return this.entityManager.resolve(ref);
  }

  isAlive(ref: EntityRef): boolean {
    return this.entityManager.isAlive(ref);
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

  clear(): void {
    this.componentManager.clearAll();
    this.entityManager.clear();
  }

  destroy(): void {
    try {
      this.systemManager.destroyAll();
    } finally {
      this.clear();
    }
  }

  query<K extends StringKey<T>>(
    ...components: ComponentHandle<K>[]
  ): QueryResult<T, K>;
  query<K extends StringKey<T> = never>(
    options: QueryOptions<T, K>,
  ): QueryResult<T, K>;
  query<K extends StringKey<T>>(
    first?: ComponentHandle<K> | QueryOptions<T, K>,
    ...rest: ComponentHandle<K>[]
  ): QueryResult<T, K> {
    return this.componentManager.runQuery(first, rest);
  }

  addSystem<K extends StringKey<T> = never, S = Record<string, never>>(
    config: SystemConfig<T, K, S>,
  ): System {
    const {
      name,
      components,
      exclude,
      state,
      priority,
      init,
      update,
      destroy,
    } = config;

    const emptyQuery = {
      entities: Object.freeze([] as EntityId[]),
    } as QueryResult<T, K>;
    const ctx: SystemUpdateContext<T, K, S> = {
      state: (state ?? {}) as S,
      world: this,
      query: emptyQuery,
    };

    const hasQuery =
      (components?.length ?? 0) > 0 || (exclude?.length ?? 0) > 0;
    const queryFn = hasQuery
      ? this.componentManager.createQueryFn(components ?? [], exclude ?? [])
      : null;

    const system: System = {
      name,
      init: init
        ? (): void => {
            init(ctx);
          }
        : undefined,
      update: (dt: number): void => {
        ctx.query = queryFn ? queryFn() : emptyQuery;
        update(ctx, dt);
      },
      destroy: destroy
        ? (): void => {
            destroy(ctx);
          }
        : undefined,
    };

    this.systemManager.addSystem(system, priority ?? 0);
    return system;
  }

  spawn(config: SpawnConfig<T>): EntityId {
    const entityId = this.entityManager.addEntity();
    this.componentManager.setComponentsFromConfig(entityId, config);
    return entityId;
  }
}
