import type { EntityId, ComponentBlueprint, ComponentRef } from "./types";
import type { World } from "./World";

export class EntityBuilder<T extends ComponentBlueprint> {
  private world: World<T>;
  private entityId: EntityId;

  constructor(world: World<T>) {
    this.world = world;
    this.entityId = world.addEntity();
  }

  with<K extends keyof T>(
    component: ComponentRef<Extract<K, string>>,
    data?: Partial<T[K]>,
  ): this {
    this.world.addComponent(this.entityId, component, data);
    return this;
  }

  build(): EntityId {
    return this.entityId;
  }
}
