import { World, tag } from "../src/core";
import type { EntityId } from "../src/core";

const canvas = document.getElementById("demo-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Could not get 2D rendering context");
const statsDisplay = document.getElementById(
  "fps-display",
) as HTMLParagraphElement;

const W = canvas.width;
const H = canvas.height;

const ENTITY_RADIUS = 5;
const INFECTION_RADIUS = 15;
const ZOMBIE_SPEED = 50;
const HUMAN_SPEED = 80;
const DETECTION_RANGE = 100;
const RESPAWN_INTERVAL = 4000;
const MAX_HUMANS = 80;
const INITIAL_HUMANS = 60;
const INITIAL_ZOMBIES = 3;

const blueprints = {
  Position: { x: 0, y: 0 },
  Velocity: { dx: 0, dy: 0 },
  isHuman: tag,
  isZombie: tag,
};

const world = new World(blueprints);
const { Position, Velocity, isHuman, isZombie } = world.components;

function randomPos(): { x: number; y: number } {
  return {
    x: ENTITY_RADIUS + Math.random() * (W - ENTITY_RADIUS * 2),
    y: ENTITY_RADIUS + Math.random() * (H - ENTITY_RADIUS * 2),
  };
}

function randomVelocity(speed: number): { dx: number; dy: number } {
  const angle = Math.random() * Math.PI * 2;
  return { dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed };
}

function spawnHuman(): void {
  world.spawn({
    Position: randomPos(),
    Velocity: randomVelocity(HUMAN_SPEED),
    isHuman,
  });
}

function spawnZombie(): void {
  world.spawn({
    Position: randomPos(),
    Velocity: randomVelocity(ZOMBIE_SPEED),
    isZombie,
  });
}

// SpawnSystem — seeds initial entities, periodically rescues survivors
world.addSystem({
  name: "SpawnSystem",
  state: { spawnTimer: 0 },
  priority: 40,
  init(_ctx): void {
    for (let i = 0; i < INITIAL_HUMANS; i++) spawnHuman();
    for (let i = 0; i < INITIAL_ZOMBIES; i++) spawnZombie();
  },
  update({ state }, dt): void {
    state.spawnTimer += dt;
    if (state.spawnTimer >= RESPAWN_INTERVAL) {
      state.spawnTimer = 0;
      if (world.query(Position, isHuman).entities.length < MAX_HUMANS) {
        spawnHuman();
      }
    }
  },
  destroy(_ctx): void {
    const humanCount = world.query(Position, isHuman).entities.length;
    const zombieCount = world.query(Position, isZombie).entities.length;
    console.log(
      `[SpawnSystem] Final counts — Humans: ${humanCount}, Zombies: ${zombieCount}`,
    );
  },
});

// ZombieAISystem — each zombie steers toward the nearest human
world.addSystem({
  name: "ZombieAISystem",
  components: [Position, Velocity, isZombie],
  priority: 30,
  update({ query, world: w }): void {
    const humans = w.query(Position, isHuman);
    if (humans.entities.length === 0) return;

    for (const zombie of query.entities) {
      const zx = query.Position.x[zombie];
      const zy = query.Position.y[zombie];

      let nearestDist = Infinity;
      let nearestHuman = -1 as EntityId;
      for (const human of humans.entities) {
        const dx = humans.Position.x[human] - zx;
        const dy = humans.Position.y[human] - zy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestHuman = human;
        }
      }

      if (nearestHuman !== -1) {
        const dx = humans.Position.x[nearestHuman] - zx;
        const dy = humans.Position.y[nearestHuman] - zy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          query.Velocity.dx[zombie] = (dx / len) * ZOMBIE_SPEED;
          query.Velocity.dy[zombie] = (dy / len) * ZOMBIE_SPEED;
        }
      }
    }
  },
});

// HumanAISystem — flee nearest zombie within detection range, wander otherwise
world.addSystem({
  name: "HumanAISystem",
  components: [Position, Velocity, isHuman],
  priority: 20,
  update({ query, world: w }): void {
    const zombies = w.query(Position, isZombie);

    for (const human of query.entities) {
      const hx = query.Position.x[human];
      const hy = query.Position.y[human];

      let nearestDist = Infinity;
      let nearestZombie = -1 as EntityId;
      for (const zombie of zombies.entities) {
        const dx = zombies.Position.x[zombie] - hx;
        const dy = zombies.Position.y[zombie] - hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestZombie = zombie;
        }
      }

      if (nearestZombie !== -1 && nearestDist < DETECTION_RANGE) {
        const dx = hx - zombies.Position.x[nearestZombie];
        const dy = hy - zombies.Position.y[nearestZombie];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          query.Velocity.dx[human] = (dx / len) * HUMAN_SPEED;
          query.Velocity.dy[human] = (dy / len) * HUMAN_SPEED;
        }
      } else {
        const angle = Math.atan2(
          query.Velocity.dy[human],
          query.Velocity.dx[human],
        );
        const newAngle = angle + (Math.random() - 0.5) * 0.5;
        query.Velocity.dx[human] = Math.cos(newAngle) * HUMAN_SPEED;
        query.Velocity.dy[human] = Math.sin(newAngle) * HUMAN_SPEED;
      }
    }
  },
});

// MovementSystem — integrate velocity, clamp + bounce at walls
world.addSystem({
  name: "MovementSystem",
  components: [Position, Velocity],
  priority: 10,
  update({ query }, dt): void {
    const dt_s = dt / 1000;
    for (const e of query.entities) {
      let x = query.Position.x[e] + query.Velocity.dx[e] * dt_s;
      let y = query.Position.y[e] + query.Velocity.dy[e] * dt_s;

      if (x < ENTITY_RADIUS) {
        x = ENTITY_RADIUS;
        query.Velocity.dx[e] = Math.abs(query.Velocity.dx[e]);
      }
      if (x > W - ENTITY_RADIUS) {
        x = W - ENTITY_RADIUS;
        query.Velocity.dx[e] = -Math.abs(query.Velocity.dx[e]);
      }
      if (y < ENTITY_RADIUS) {
        y = ENTITY_RADIUS;
        query.Velocity.dy[e] = Math.abs(query.Velocity.dy[e]);
      }
      if (y > H - ENTITY_RADIUS) {
        y = H - ENTITY_RADIUS;
        query.Velocity.dy[e] = -Math.abs(query.Velocity.dy[e]);
      }

      query.Position.x[e] = x;
      query.Position.y[e] = y;
    }
  },
});

// InfectionSystem — zombies infect humans within INFECTION_RADIUS
world.addSystem({
  name: "InfectionSystem",
  components: [Position, isZombie],
  priority: 5,
  update({ query, world: w }): void {
    const humans = w.query(Position, isHuman);
    const toInfect: EntityId[] = [];

    for (const zombie of query.entities) {
      const zx = query.Position.x[zombie];
      const zy = query.Position.y[zombie];
      for (const human of humans.entities) {
        const dx = humans.Position.x[human] - zx;
        const dy = humans.Position.y[human] - zy;
        if (Math.sqrt(dx * dx + dy * dy) < INFECTION_RADIUS) {
          toInfect.push(human);
        }
      }
    }

    for (const human of toInfect) {
      if (w.hasComponent(human, isHuman)) {
        w.removeComponent(human, isHuman);
        w.setComponent(human, isZombie);
        w.setComponent(human, Velocity, randomVelocity(ZOMBIE_SPEED));
      }
    }
  },
});

// RenderSystem — draw all entities, update stats bar
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

world.addSystem({
  name: "RenderSystem",
  components: [Position, isHuman],
  priority: 1,
  update({ query, world: w }): void {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#3b82f6";
    for (const human of query.entities) {
      ctx.beginPath();
      ctx.arc(
        query.Position.x[human],
        query.Position.y[human],
        ENTITY_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const zombies = w.query(Position, isZombie);
    ctx.fillStyle = "#22c55e";
    for (const zombie of zombies.entities) {
      ctx.beginPath();
      ctx.arc(
        zombies.Position.x[zombie],
        zombies.Position.y[zombie],
        ENTITY_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    statsDisplay.textContent = `Humans: ${query.entities.length} | Zombies: ${zombies.entities.length} | FPS: ${fps}`;
  },
});

let last = performance.now();

const loop = (now: number): void => {
  const deltaTime = now - last;
  last = now;
  world.update(deltaTime);

  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
