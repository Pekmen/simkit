export interface System {
  name?: string;
  priority?: number;
  init?(): void;
  update(deltaTime: number): void;
  destroy?(): void;
}
