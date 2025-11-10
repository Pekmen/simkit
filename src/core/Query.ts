import type { EntityId } from "./Entity";
import type {
  ComponentBlueprint,
  ComponentStorageMap,
} from "./ComponentManager";

export interface QueryResult<
  T extends ComponentBlueprint<T>,
  K extends keyof T,
> {
  entities: EntityId[];
  storages: Pick<ComponentStorageMap<T>, K>;
}
