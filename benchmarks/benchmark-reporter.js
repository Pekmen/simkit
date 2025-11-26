#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const jsonPath = join(projectRoot, "benchmark-results.json");
const summaryPath = join(__dirname, "results.json");

try {
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const timestamp = new Date().toISOString();

  // Collect all benchmarks for summary table
  const results = [];
  for (const file of data.files) {
    for (const group of file.groups) {
      for (const bench of group.benchmarks) {
        results.push({
          name: bench.name,
          "ops/sec": parseFloat(bench.hz.toFixed(2)),
          "mean (ms)": parseFloat(bench.mean.toFixed(4)),
          "p99 (ms)": parseFloat(bench.p99.toFixed(4)),
          rme: `±${bench.rme.toFixed(2)}%`,
          samples: bench.sampleCount,
        });
      }
    }
  }

  // Sort by ops/sec (fastest first)
  results.sort((a, b) => b["ops/sec"] - a["ops/sec"]);

  // Add rank
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  const summary = {
    timestamp,
    results,
  };

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✓ Results saved to ${summaryPath}`);
} catch (err) {
  console.error("Error generating benchmark report:", err.message);
  process.exit(1);
}
