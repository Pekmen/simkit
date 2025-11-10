import { ComponentManager } from "./ComponentManager";
import type { EntityId } from "./Entity";
import { EntityManager } from "./EntityManager";
import type { QueryResult } from "./Query";
import type { System } from "./System";
import { SystemManager } from "./SystemManager";

interface WorldOptions {
  maxEntities: number;
}

type ComponentBlueprint<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P];
  };
};

export class World<T extends ComponentBlueprint<T>> {
  private readonly options: WorldOptions;
  readonly components: { [K in keyof T]: { _name: K } };

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
    );

    this.components = this.componentManager.components;
  }

  addEntity(): EntityId {
    return this.entityManager.addEntity();
  }

  removeEntity(entityId: EntityId): void {
    this.componentManager.removeEntityComponents(entityId);
  }

  addComponent<K extends keyof T>(
    entityId: EntityId,
    component: { _name: K },
    componentData: T[K],
  ): void {
    this.componentManager.addComponent(entityId, component, componentData);
  }

  removeComponent(entityId: EntityId, component: { _name: keyof T }): void {
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

  query<K extends keyof T>(
    ...components: { _name: K }[]
  ): QueryResult<T, K> {
    return this.componentManager.query(...components);
  }
}
