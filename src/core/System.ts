export interface System {
  name?: string;
  init?(): void;
  update(deltaTime: number): void;
  destroy?(): void;
}
