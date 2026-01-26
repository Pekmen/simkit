export interface System {
  init?(): void;
  update(deltaTime: number): void;
  destroy?(): void;
}
