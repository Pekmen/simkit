import { ComponentManager } from "./ComponentManager";
import type { EntityId } from "./Entity";
import { EntityManager } from "./EntityManager";

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
  private entityManager: EntityManager;
  private componentManager: ComponentManager<T>;
  components: { [K in keyof T]: { _name: K } };

  constructor(blueprints: T, options?: Partial<WorldOptions>) {
    this.options = {
      maxEntities: 1000,
      ...options,
    };

    this.entityManager = new EntityManager(this.options.maxEntities);
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
}
