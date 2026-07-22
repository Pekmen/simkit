// Type-level assertions for the EntityId (number) vs EntityRef (object) brand
// boundary. Uses the `.test-d.ts` type-test convention: it is NOT matched by the
// default vitest runtime glob (`*.{test,spec}.ts`), so the runner never executes
// it; instead `tsc` (npm run build) type-checks it via the `src` include. The
// `@ts-expect-error` lines fail the build if a dangerous move ever stops being a
// type error.
import { World } from "../World";
import type { EntityId, EntityRef } from "../types";

const world = new World(
  { Position: { x: 0, y: 0 }, Label: { text: "" } },
  { maxEntities: 10 },
);
const { Position, Label } = world.components;

const id: EntityId = world.spawn({ Position: { x: 0, y: 0 } });
const ref: EntityRef = world.ref(id);
const column = world.query(Position).Position.x;

declare function wantsRef(r: EntityRef): void;

// @ts-expect-error - a ref is an object and cannot index a storage column
void column[ref];

// @ts-expect-error - numeric columns are a fixed-length Float64Array, not Array
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- `.push` doesn't exist on Float64Array, which is exactly what's being asserted
column.push(0);

// String/boolean columns are likewise fixed-length: indexed get/set works, but
// length-mutating Array methods are not part of the type.
const textColumn = world.query(Label).Label.text;
const firstLabel: string = textColumn[id];
textColumn[id] = firstLabel;
// @ts-expect-error - non-numeric columns are a FixedColumn, not a mutable Array
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- `.push` doesn't exist on FixedColumn, which is exactly what's being asserted
textColumn.push("x");

// @ts-expect-error - world APIs take a raw EntityId, not a ref (resolve first)
world.setComponent(ref, Position, { x: 1 });

// @ts-expect-error - a raw EntityId is not assignable where an EntityRef is expected
wantsRef(id);

// resolve() narrows to a usable EntityId for both world APIs and column access
const resolved = world.resolve(ref);
if (resolved !== undefined) {
  world.setComponent(resolved, Position, { x: 1 });
  void column[resolved];
}
