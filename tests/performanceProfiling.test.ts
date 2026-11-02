import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeterministicAnalysis, type RawRepoFile } from '../packages/analyzer/src/pipeline.js';
import { GeminiProvider } from '../packages/ai/src/providers/geminiProvider.js';

function generateSyntheticFiles(count: number): RawRepoFile[] {
  const files: RawRepoFile[] = [];

  // Core configuration files
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: 'synthetic-benchmark-repo',
      dependencies: { express: '^4.19.2', mongoose: '^8.3.1', cors: '^2.8.5' },
    }),
  });

  for (let i = 1; i < count; i++) {
    const fileType = i % 4;
    let path = '';
    let content = '';

    if (fileType === 0) {
      path = `src/routes/router_${i}.ts`;
      content = `
        import express from 'express';
        const router = express.Router();
        router.get('/endpoint_${i}', (req, res) => res.json({ id: ${i} }));
        router.post('/endpoint_${i}', requireAuth, (req, res) => res.status(201).json({ created: true }));
        export default router;
      `;
    } else if (fileType === 1) {
      path = `src/models/Model_${i}.ts`;
      content = `
        import mongoose from 'mongoose';
        const Schema_${i} = new mongoose.Schema({
          name: { type: String, required: true },
          count: { type: Number, default: 0 },
          parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Model_${Math.max(1, i - 1)}' }
        });
        Schema_${i}.index({ name: 1 });
        export const Model_${i} = mongoose.model('Model_${i}', Schema_${i});
      `;
    } else if (fileType === 2) {
      path = `src/services/service_${i}.ts`;
      content = `
        // Service business logic module ${i}
        export class Service_${i} {
          async execute(param: string): Promise<string> {
            /* multi-line comment block
               with multiple lines of documentation */
            return param.toUpperCase();
          }
        }
      `;
    } else {
      path = `src/utils/helper_${i}.js`;
      content = `
        function helper_${i}(a, b) {
          // Add numbers
          return a + b;
        }
        module.exports = { helper_${i} };
      `;
    }

    files.push({ path, content });
  }

  return files;
}

test('Performance Profiling — Small Repository (50 files) benchmark', () => {
  const files = generateSyntheticFiles(50);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = runDeterministicAnalysis(files);

  const durationMs = performance.now() - startTime;
  const memDeltaMb = (process.memoryUsage().heapUsed - startMem) / (1024 * 1024);

  assert.equal(result.summaryMetrics.analyzedFiles, 50);
  assert.ok(result.endpoints.length > 0);
  assert.ok(result.databaseModels.length > 0);
  assert.ok(durationMs < 500, `Small repo should process in <500ms, took ${durationMs.toFixed(1)}ms`);

  console.log(`[Benchmark: Small Repo (50 files)] Time: ${durationMs.toFixed(2)}ms, Heap Delta: ${memDeltaMb.toFixed(2)}MB, Endpoints: ${result.endpoints.length}, Models: ${result.databaseModels.length}`);
});

test('Performance Profiling — Medium Repository (500 files) benchmark', () => {
  const files = generateSyntheticFiles(500);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = runDeterministicAnalysis(files);

  const durationMs = performance.now() - startTime;
  const memDeltaMb = (process.memoryUsage().heapUsed - startMem) / (1024 * 1024);

  assert.equal(result.summaryMetrics.analyzedFiles, 500);
  assert.ok(result.endpoints.length >= 100);
  assert.ok(result.databaseModels.length >= 100);
  assert.ok(durationMs < 2000, `Medium repo should process in <2000ms, took ${durationMs.toFixed(1)}ms`);

  console.log(`[Benchmark: Medium Repo (500 files)] Time: ${durationMs.toFixed(2)}ms, Heap Delta: ${memDeltaMb.toFixed(2)}MB, Endpoints: ${result.endpoints.length}, Models: ${result.databaseModels.length}`);
});

test('Performance Profiling — Large Repository (2,000 files) ceiling benchmark', () => {
  const files = generateSyntheticFiles(2000);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = runDeterministicAnalysis(files);

  const durationMs = performance.now() - startTime;
  const memDeltaMb = (process.memoryUsage().heapUsed - startMem) / (1024 * 1024);

  assert.equal(result.summaryMetrics.analyzedFiles, 2000);
  assert.ok(durationMs < 8000, `Large repo should process in <8000ms, took ${durationMs.toFixed(1)}ms`);

  console.log(`[Benchmark: Large Repo (2,000 files)] Time: ${durationMs.toFixed(2)}ms, Heap Delta: ${memDeltaMb.toFixed(2)}MB, Total Lines: ${result.summaryMetrics.totalLines}`);
});

test('Performance Profiling — Gemini Provider Cache Hit Rate and Latency', async () => {
  const provider = new GeminiProvider('');

  const context = {
    repoName: 'benchmark/cache-test',
    commitSha: 'fedcba9876543210fedcba9876543210fedcba98',
    statistics: {
      totalFiles: 10,
      analyzedFiles: 10,
      skippedFiles: 0,
      totalLines: 500,
      codeLines: 400,
      blankLines: 50,
      commentLines: 50,
      languages: [],
      largestFiles: [],
      skippedReasons: {},
    },
    technologies: [],
    endpoints: [],
    databaseModels: [],
    securityFindings: [],
  };

  // Initial miss
  const startMiss = performance.now();
  await provider.generateSummary(context);
  const missLatency = performance.now() - startMiss;

  // Cache hit
  const startHit = performance.now();
  const cachedSummary = await provider.generateSummary(context);
  const hitLatency = performance.now() - startHit;

  assert.ok(cachedSummary.overview.length > 0);
  assert.ok(hitLatency < 5, `Cache hit latency should be <5ms, was ${hitLatency.toFixed(2)}ms`);

  console.log(`[Benchmark: AI Cache] Miss: ${missLatency.toFixed(2)}ms, Hit: ${hitLatency.toFixed(2)}ms, Speedup: ${(missLatency / Math.max(0.01, hitLatency)).toFixed(1)}x`);
});
