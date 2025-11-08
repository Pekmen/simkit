export abstract class System {
  init?(): void {
    /* empty */
  }

  destroy?(): void {
    /* empty */
  }

  abstract update(deltaTime: number): void;
}
