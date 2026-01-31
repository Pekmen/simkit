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

const { Position, Velocity, Size, Color } = world.components;

world.defineSystem({
  components: [Position, Velocity],
  update({ query }, dt) {
    const dt_s = dt / 1000;
    for (const e of query.entities) {
      const newX = query.Position.x[e] + query.Velocity.dx[e] * dt_s;
      const newY = query.Position.y[e] + query.Velocity.dy[e] * dt_s;
      query.Position.x[e] = newX;
      query.Position.y[e] = newY;
      if (newX < 10 || newX > canvas.width - 10) {
        query.Velocity.dx[e] = -query.Velocity.dx[e];
      }
      if (newY < 10 || newY > canvas.height - 10) {
        query.Velocity.dy[e] = -query.Velocity.dy[e];
      }
    }
  },
});

world.defineSystem({
  components: [Position, Size, Color],
  update({ query }) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const e of query.entities) {
      ctx.beginPath();
      ctx.arc(
        query.Position.x[e],
        query.Position.y[e],
        query.Size.val[e],
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = query.Color.val[e];
      ctx.fill();
    }
  },
});

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
