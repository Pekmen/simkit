import { ComponentManager } from "./ComponentManager";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";
import type { System } from "./System";
import type {
  EntityId,
  ComponentBlueprint,
  QueryResult,
  ComponentRef,
} from "./types";

interface WorldOptions {
  maxEntities: number;
}

export class World<T extends ComponentBlueprint> {
  private readonly options: WorldOptions;
  readonly components: { [K in keyof T]: ComponentRef<Extract<K, string>> };

  private entityManager: EntityManager;
  private systemManager: SystemManager;
  private componentManager: ComponentManager<T>;

  constructor(blueprints: T, options?: Partial<WorldOptions>) {
    this.options = {
      maxEntities: 1000,
      ...options,
    };

    this.entityManager = new EntityManager(this.options.maxEntities);
    this.systemManager = new SystemManager();
    this.componentManager = new ComponentManager(
      blueprints,
      this.options.maxEntities,
      this.entityManager,
    );

    this.components = this.componentManager.components;
  }

  addEntity(): EntityId {
    return this.entityManager.addEntity();
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

  query<K1 extends keyof T>(
    c1: ComponentRef<Extract<K1, string>>,
  ): QueryResult<T, K1>;
  query<K1 extends keyof T, K2 extends keyof T>(
    c1: ComponentRef<Extract<K1, string>>,
    c2: ComponentRef<Extract<K2, string>>,
  ): QueryResult<T, K1 | K2>;
  query<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T>(
    c1: ComponentRef<Extract<K1, string>>,
    c2: ComponentRef<Extract<K2, string>>,
    c3: ComponentRef<Extract<K3, string>>,
  ): QueryResult<T, K1 | K2 | K3>;
  query<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
  >(
    c1: ComponentRef<Extract<K1, string>>,
    c2: ComponentRef<Extract<K2, string>>,
    c3: ComponentRef<Extract<K3, string>>,
    c4: ComponentRef<Extract<K4, string>>,
  ): QueryResult<T, K1 | K2 | K3 | K4>;
  query<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
    K5 extends keyof T,
  >(
    c1: ComponentRef<Extract<K1, string>>,
    c2: ComponentRef<Extract<K2, string>>,
    c3: ComponentRef<Extract<K3, string>>,
    c4: ComponentRef<Extract<K4, string>>,
    c5: ComponentRef<Extract<K5, string>>,
  ): QueryResult<T, K1 | K2 | K3 | K4 | K5>;
  query<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
    K5 extends keyof T,
    K6 extends keyof T,
  >(
    c1: ComponentRef<Extract<K1, string>>,
    c2: ComponentRef<Extract<K2, string>>,
    c3: ComponentRef<Extract<K3, string>>,
    c4: ComponentRef<Extract<K4, string>>,
    c5: ComponentRef<Extract<K5, string>>,
    c6: ComponentRef<Extract<K6, string>>,
  ): QueryResult<T, K1 | K2 | K3 | K4 | K5 | K6>;
  query<K extends keyof T>(...components: ComponentRef[]): QueryResult<T, K> {
    // @ts-expect-error - Spreading rest parameter into overloaded method
    return this.componentManager.query(...components);
  }
}
