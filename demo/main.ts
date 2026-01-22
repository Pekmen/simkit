import { World } from "../src/core";

const canvas = document.getElementById("demo-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const fpsDisplay = document.getElementById(
  "fps-display",
) as HTMLParagraphElement;

let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

const blueprints = {
  Position: { x: 0, y: 0 },
  Velocity: { dx: 0, dy: 0 },
  Size: { val: 10 },
  Color: { val: "#ff0000" },
};

const world = new World(blueprints);

// Using the object-based spawn API for cleaner entity creation
for (let i = 0; i < 1000; i++) {
  world.spawn({
    Position: {
      x: 10 + Math.random() * (canvas.width - 20),
      y: 10 + Math.random() * (canvas.height - 20),
    },
    Velocity: {
      dx: (Math.random() - 0.5) * 200,
      dy: (Math.random() - 0.5) * 200,
    },
    Size: {},
    Color: {},
  });
}

const physicsSystem = {
  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const { Position, Velocity } = world.components;
    const { entities, Position: pos, Velocity: vel } = world.query(
      Position,
      Velocity,
    );

    for (const e of entities) {
      const x = pos.x[e];
      const y = pos.y[e];
      const dx = vel.dx[e];
      const dy = vel.dy[e];

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
  },
};

const renderSystem = {
  update(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { Position, Size, Color } = world.components;
    const { entities, Position: pos, Size: size, Color: color } = world.query(
      Position,
      Size,
      Color,
    );

    for (const e of entities) {
      const x = pos.x[e];
      const y = pos.y[e];
      const radius = size.val[e];
      const colorVal = color.val[e];

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colorVal;
      ctx.fill();
    }
  },
};

world.addSystem(physicsSystem);
world.addSystem(renderSystem);

let last = performance.now();

const loop = (now: number): void => {
  const deltaTime = now - last;
  last = now;
  world.update(deltaTime);

  // Update FPS counter
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    fpsDisplay.textContent = `FPS: ${fps} | Entities: ${world.getEntityCount()}`;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
