# Simkit ECS Benchmarks

This directory contains a comprehensive benchmark suite for the Simkit Entity Component System (ECS) library. The benchmarks measure performance across different usage patterns to help identify strengths and optimization opportunities.

## Running Benchmarks

```bash
# Run all benchmarks (console output + auto-exports to benchmark-results.json)
npm run bench

# Run with interactive UI
npm run bench:ui

# Run specific benchmark file
npm run bench -- packed-iteration
```

**Automatic Result Tracking:**

Every time you run `npm run bench`, two files are generated:

1. **benchmark-results.json** (project root, git-ignored)
   - Raw Vitest output for CI/automation
   - Overwritten on each run

2. **benchmarks/results.json** (committed to repo)
   - Clean JSON table with ranked results
   - Includes: ops/sec, mean, p99, rme, samples
   - Commit this file to track performance over time

**Tracking Regressions:**

Use `git diff` to detect performance changes:

```bash
# See performance changes in your current work
git diff benchmarks/results.json

# Compare with main branch
git diff main benchmarks/results.json
```

## Benchmark Suite Overview

The suite consists of 5 standard ECS benchmarks designed to test different aspects of the system:

### 1. Packed Iteration (5 queries)

**File:** `packed-iteration.bench.ts`

**What it tests:** Core query overhead with densely packed, homogeneous data

**Dataset:** 1,000 entities, each with components (A, B, C, D, E)

**Operations:**

- Query all entities with A, double the value
- Query all entities with B, double the value
- Query all entities with C, double the value
- Query all entities with D, double the value
- Query all entities with E, double the value

**Why it matters:** This benchmark represents the ideal case for an ECS - all entities have the same components, making the data cache-friendly and query overhead minimal. Good performance here indicates efficient struct-of-arrays (SoA) storage and query mechanisms.

**Expected performance:** Fastest (~10k+ ops/sec) - homogeneous, cache-friendly

---

### 2. Simple Iteration

**File:** `simple-iteration.bench.ts`

**What it tests:** Multiple independent systems with heterogeneous entity compositions

**Dataset:**

- 1,000 entities with (A, B)
- 1,000 entities with (A, B, C)
- 1,000 entities with (A, B, C, D)
- 1,000 entities with (A, B, C, E)

**Operations:** Three systems swapping values:

1. Query (A, B), swap values
2. Query (C, D), swap values
3. Query (C, E), swap values

**Why it matters:** Real-world ECS applications have entities with different component combinations. This benchmark tests how well the system handles filtering and iterating over heterogeneous entity groups.

**Expected performance:** Moderate (~5-8k ops/sec) - some query filtering overhead

---

### 3. Fragmented Iteration

**File:** `fragmented-iteration.bench.ts`

**What it tests:** Performance with many component types and sparse component distribution

**Dataset:** 26 component types (A through Z), each with 100 entities + Data component (2,600 total entities)

**Operations:**

1. Query all entities with Data component, double the value
2. Query all entities with Z component, double the value

**Why it matters:** This represents the worst-case scenario for an ECS - many component types with sparse distribution. Tests memory efficiency and query performance when component storage is fragmented.

**Expected performance:** Slower (~2-5k ops/sec) - sparse, many component types

---

### 4. Entity Cycle

**File:** `entity-cycle.bench.ts`

**What it tests:** Entity creation and destruction performance, ID recycling

**Dataset:** 1,000 entities with component A

**Operations:**

1. Query all A entities, for each create 1 new entity with component B (1,000 new entities)
2. Query all B entities, destroy each one

**Why it matters:** Many simulations and games frequently create and destroy entities (projectiles, particles, temporary effects). This benchmark measures allocation overhead and the efficiency of entity ID recycling.

**Expected performance:** Variable (~3-7k ops/sec) - allocation/deallocation overhead

---

### 5. Add/Remove

**File:** `add-remove.bench.ts`

**What it tests:** Component addition and removal performance on existing entities

**Dataset:** 1,000 entities with component A

**Operations:**

1. Query all A entities, add component B to each
2. Query all (A, B) entities, remove component B from each

**Why it matters:** Entities often change behavior by adding/removing components (power-ups, status effects, state changes). This benchmark measures component mutation overhead.

**Expected performance:** Moderate (~4-8k ops/sec) - component mutation overhead

---

## Understanding Benchmark Output

Vitest bench provides detailed statistics for each benchmark:

```text
✓ benchmarks/packed-iteration.bench.ts
  ✓ Packed Iteration (5 queries)
    name                                            hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · query and double 5 components across 1000...  12.34  80.91  100.23   81.05   81.50   95.67   98.12  100.23  ±0.95%      123
```

**Metrics explained:**

- **hz** (Hertz): Operations per second - higher is better
- **min/max**: Fastest and slowest execution time in milliseconds
- **mean**: Average execution time
- **p75/p99/p995/p999**: Percentile timings (e.g., p99 = 99% of runs were faster than this)
- **rme**: Relative margin of error (percentage) - lower indicates more consistent results
- **samples**: Number of iterations performed

**What to look for:**

- **High hz**: Good throughput
- **Low rme**: Consistent, reproducible results
- **Low percentiles**: Predictable performance without spikes

**Tip:** For a cleaner view of results, check `benchmarks/RESULTS.md` which includes a ranked summary table and detailed breakdowns of each benchmark.

## Benchmark Methodology

Each benchmark follows this pattern:

1. **Setup Phase**: Create a fresh `World` and populate it with entities and components
2. **Benchmark Operation**: Perform the core ECS operations being measured
3. **Measurement**: Vitest automatically runs the entire function multiple times to gather statistics

**Note:** Setup is included in the timing to measure total operational cost including allocation. This provides realistic end-to-end performance metrics.

## Performance Expectations

Based on typical ECS benchmarks and simkit's struct-of-arrays architecture:

| Benchmark            | Expected Performance | Key Factors                      |
| -------------------- | -------------------- | -------------------------------- |
| Packed Iteration     | ~10k+ ops/sec        | Cache-friendly, homogeneous data |
| Simple Iteration     | ~5-8k ops/sec        | Query filtering overhead         |
| Fragmented Iteration | ~2-5k ops/sec        | Sparse storage, many components  |
| Entity Cycle         | ~3-7k ops/sec        | Allocation/deallocation overhead |
| Add/Remove           | ~4-8k ops/sec        | Component mutation overhead      |

**Note:** Actual results will vary based on hardware, Node.js version, and V8 optimizations.

## Tracking Performance Over Time

### Git-Based Workflow

The `benchmarks/results.json` file is committed to the repo, making it easy to track performance changes:

```bash
# Run benchmarks and see current results
npm run bench
cat benchmarks/results.json

# Commit the results
git add benchmarks/results.json
git commit -m "Update benchmark results"

# Later, after making changes...
npm run bench

# See what changed
git diff benchmarks/results.json
```

**Example diff showing a regression:**

```diff
 {
   "rank": 1,
   "name": "add and remove component B from 1000 entities",
-  "ops/sec": 7017.29,
+  "ops/sec": 6471.07,
-  "mean (ms)": 0.1425,
+  "mean (ms)": 0.1545,
 }
```

### Comparing Across Branches

```bash
# Compare your branch with main
git diff main benchmarks/results.json

# See performance at a specific commit
git show abc123:benchmarks/results.json

# View performance history over time
git log -p benchmarks/results.json
```

### Vitest's Built-in Comparison

For detailed statistical comparison:

```bash
# Save baseline
npm run bench
cp benchmark-results.json baseline.json

# Make changes...
npm run bench

# Compare (shows detailed statistical differences)
npm run bench -- --compare=baseline.json
```

## CI Integration

These benchmarks can be integrated into CI pipelines to detect performance regressions:

```bash
# In CI, run benchmarks (results auto-saved to benchmark-results.json)
npm run bench

# Use tools like CodSpeed or custom scripts to compare against main branch
# The benchmark-results.json file contains all timing data in JSON format
```

## Troubleshooting

**Inconsistent results (high rme):**

- Close other applications to reduce system noise
- Run benchmarks multiple times and average results
- Ensure Node.js isn't being throttled (check CPU temperature/power settings)

**Unexpectedly slow performance:**

- Check Node.js version (newer versions often have better V8 optimizations)
- Verify benchmarks are running in production mode, not debug mode
- Look for memory pressure (GC pauses) in longer benchmarks

**TypeScript errors:**

- Ensure `npm run build` succeeds before running benchmarks
- Check that globals are enabled in vitest.config.ts

## Contributing

When adding new benchmarks:

1. Follow the naming convention: `[benchmark-name].bench.ts`
2. Use descriptive names in `describe()` and `bench()` blocks
3. Include comments explaining what's being tested
4. Add documentation to this README
5. Verify the benchmark runs successfully with `npm run bench -- [name]`
