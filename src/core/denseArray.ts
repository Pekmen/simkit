import type { EntityId } from "./types";

export function denseAdd(
  list: EntityId[],
  slot: Int32Array,
  id: EntityId,
): void {
  slot[id] = list.length;
  list.push(id);
}

export function denseRemove(
  list: EntityId[],
  slot: Int32Array,
  id: EntityId,
): void {
  const index = slot[id];
  const last = list[list.length - 1];
  list[index] = last;
  slot[last] = index;
  list.pop();
  slot[id] = -1;
}
