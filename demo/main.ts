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
});

const { Position, Velocity } = world.components;

const entity = world.addEntity();

const position = { x: 100, y: 100 };
const velocity = { dx: 100, dy: 200 };

world.addComponent(entity, Position, position);
world.addComponent(entity, Velocity, velocity);

class PhysicsSystem extends System {
  update(deltaTime: number): void {
    position.x += velocity.dx * (deltaTime / 1000);
    position.y += velocity.dy * (deltaTime / 1000);

    if (position.x < 10 || position.x > canvas.width - 10) velocity.dx *= -1;
    if (position.y < 10 || position.y > canvas.height - 10) velocity.dy *= -1;
  }
}

class RenderSystem extends System {
  update(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "skyblue";
    ctx.fill();
  }
}

world.addSystem(new PhysicsSystem());
world.addSystem(new RenderSystem());

let last = performance.now();

const loop = (now: number): void => {
  const deltaTime = now - last;
  console.log("deltaTime___", deltaTime);
  last = now;
  world.update(deltaTime);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
