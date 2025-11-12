# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simkit is a TypeScript Entity Component System (ECS) library for building simulations and games. It uses a data-oriented architecture with Structure of Arrays (SoA) component storage for performance.

## Development Commands

### Building
```bash
npm run build          # TypeScript compilation + Vite build
```

### Testing
```bash
npm test              # Run all tests in watch mode
npm test -- --run     # Run tests once without watch mode
npm test -- --coverage # Run tests with coverage report
```

### Linting & Formatting
```bash
npm run lint          # Check linting
npm run lint:fix      # Auto-fix linting issues
npm run format        # Check formatting
npm run format:fix    # Auto-fix formatting
```

### Demo
```bash
npm run demo          # Start Vite dev server for demo app
```

## Architecture

### Core ECS Pattern

The library implements a classic ECS architecture:

- **World** (`src/core/World.ts`): Central coordinator that manages entities, components, and systems
- **EntityManager** (`src/core/EntityManager.ts`): Handles entity ID generation (sequential integers)
- **ComponentManager** (`src/core/ComponentManager.ts`): Manages component storage using Structure of Arrays
- **SystemManager** (`src/core/SystemManager.ts`): Executes systems each frame

### Component Storage (SoA Pattern)

Components are stored using Structure of Arrays rather than Array of Structures for cache efficiency:

```typescript
// Instead of: entities[id] = { x: 10, y: 20 }
// We use: Position.x[entityId] = 10; Position.y[entityId] = 20
```

The `ComponentManager` creates parallel arrays for each property of each component type. Array indices correspond to entity IDs. This layout improves CPU cache performance when iterating over component data.

### Type System

- **ComponentBlueprint**: Defines component schemas at compile time (`Record<string, Record<string, unknown>>`)
- **ComponentRef**: Type-safe references to components (contains `_name` property for runtime lookup)
- **EntityId**: Branded number type to prevent mixing entity IDs with regular numbers
- **QueryResult**: Contains matching entities and their component storage arrays

### Query System

Queries return entities with specific component combinations:

```typescript
const { entities, storages } = world.query(Position, Velocity);
// entities: EntityId[]
// storages: { Position: { x: [], y: [] }, Velocity: { dx: [], dy: [] } }
```

Access component data by indexing storage arrays with entity IDs:
```typescript
for (const e of entities) {
  const x = storages.Position.x[e];
  const y = storages.Position.y[e];
}
```

### Systems

Systems extend the abstract `System` class and implement `update(deltaTime: number)`. Optional lifecycle hooks: `init()` and `destroy()`. Systems query for entities and directly mutate component storage arrays.

### Module System

The project uses ESM with `.js` extensions in imports (TypeScript's `verbatimModuleSyntax`). All imports must include `.js` extension even when importing `.ts` files.

## Testing Patterns

- Tests use Vitest with global test functions (`describe`, `test`, `expect`)
- Tests access private fields using `@ts-expect-error` comments when necessary for verification
- Test files located in `src/core/__tests__/`
- Component storage is tested by directly inspecting the internal storage arrays

## TypeScript Configuration

- Strict mode enabled with additional safety checks
- `moduleResolution: "bundler"` for modern bundler compatibility
- `verbatimModuleSyntax: true` requires explicit `.js` extensions in imports
- `noEmit: true` - compilation handled by build tools
