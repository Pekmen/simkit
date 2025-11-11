import { World, System } from "../src/core";

const canvas = document.createElement("canvas");
canvas.width = 400;
canvas.height = 300;
canvas.style.border = "2px solid black";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

const world = new World({
  Position: { x: 0, y: 0 },
  Velocity: { dx: 0, dy: 0 },
  Size: { val: 10 },
  Color: { val: "#ff0000" },
});

const { Position, Velocity, Size, Color } = world.components;

for (let i = 0; i < 3; i++) {
  const entity = world.addEntity();

  world.addComponent(entity, Position, {
    x: 50 + i * 100,
    y: 50 + i * 50,
  });
  world.addComponent(entity, Velocity, {
    dx: 50 + i * 30,
    dy: 100 + i * 50,
  });
  world.addComponent(entity, Size);
  world.addComponent(entity, Color);
}

class PhysicsSystem extends System {
  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    const {
      entities,
      storages: { Position: pos, Velocity: vel },
    } = world.query(Position, Velocity);

    for (const e of entities) {
      const x = pos.x[e];
      const y = pos.y[e];
      const dx = vel.dx[e];
      const dy = vel.dy[e];

      if (
        x === undefined ||
        y === undefined ||
        dx === undefined ||
        dy === undefined
      ) {
        continue;
      }

      const newX = x + dx * dt;
      const newY = y + dy * dt;

      pos.x[e] = newX;
      pos.y[e] = newY;

      if (newX < 10 || newX > canvas.width - 10) {
        vel.dx[e] = -dx;
      }
      if (newY < 10 || newY > canvas.height - 10) {
        vel.dy[e] = -dy;
      }
    }
  }
}

class RenderSystem extends System {
  update(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { entities, storages } = world.query(Position, Size, Color);

    for (const e of entities) {
      const x = storages.Position.x[e];
      const y = storages.Position.y[e];
      const radius = storages.Size.val[e];
      const color = storages.Color.val[e];

      if (
        x === undefined ||
        y === undefined ||
        radius === undefined ||
        color === undefined
      ) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

world.addSystem(new PhysicsSystem());
world.addSystem(new RenderSystem());

let last = performance.now();

const loop = (now: number): void => {
  const deltaTime = now - last;
  last = now;
  world.update(deltaTime);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
