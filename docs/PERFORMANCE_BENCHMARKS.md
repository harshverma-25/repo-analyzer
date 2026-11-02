# Repo Analyzer — Performance Benchmarks & Capacity Profile

This document details empirical benchmarks and system profiling results for the Repo Analyzer engine across varied repository scales and pipeline stages.

---

## 1. End-to-End Analysis Benchmarks

Benchmarked via `tests/performanceProfiling.test.ts` on Node.js 22 runtime:

| Repository Scale | Total Files | Endpoints | Models | Parse & Analysis Time | Heap Memory Delta | Throughput |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Small Repository** | 50 | 24 | 13 | **55.27 ms** | +3.68 MB | ~905 files/sec |
| **Medium Repository** | 500 | 248 | 125 | **90.72 ms** | +5.41 MB | ~5,510 files/sec |
| **Large Repository** | 2,000 | 998 | 500 | **220.52 ms** | +16.19 MB | **~9,070 files/sec** |

### Observations:
- Ingestion and static analysis scale sub-linearly with file count.
- Analyzing a 2,000-file repository takes only **~220 ms**, consuming less than 20 MB of additional heap.
- The single-pass AST architecture allows AST nodes to be traversed concurrently without re-parsing files.

---

## 2. In-Memory AI Cache Profiling

Evaluated on `GeminiProvider` using cached repository summaries:

| Metric | Cache Miss (Cold) | Cache Hit (Warm) | Improvement |
|---|:---:|:---:|:---:|
| **Latency** | 4.75 ms (Heuristic fallback) / ~850 ms (Live API) | **0.05 ms** | **104.6x faster** |
| **Memory per Cached Scan** | ~12 kB (Summary JSON) | ~12 kB | Minimal |
| **Max Cache Allocation** | Unbounded (Historical) | **200 items maximum** | Bounded at <3 MB |

---

## 3. AST Reuse Performance Comparison

| Processing Strategy | 20 TypeScript Files Execution Time | Reduction |
|---|:---:|:---:|
| **Multi-Pass (Legacy):** Separate `ts.createSourceFile()` per extractor | 32.4 ms | Baseline |
| **Single-Pass (Current):** Shared `file.ast` across all extractors | **12.8 ms** | **~60% faster** |

---

## 4. Frontend Bundle Metrics (Production Build)

Next.js 15.1 production trace output (`turbo run build`):

```text
Route (app)                              Size     First Load JS
┌ ○ /                                    6.34 kB         112 kB
├ ○ /_not-found                          980 B           106 kB
├ ○ /projects                            3.67 kB         113 kB
├ ƒ /scans/[scanId]                      3.62 kB         109 kB
└ ƒ /scans/[scanId]/report               74.5 kB         184 kB
+ First Load JS shared by all            105 kB
  ├ chunks/1a3b18f5-d81a67ba78b436a6.js  52.9 kB
  ├ chunks/299-0f44b9743d1e9dd5.js       50.5 kB
  └ other shared chunks (total)          1.99 kB
```

- **Shared Core JS:** 105 kB (React 19, Lucide icons, Tailwind utilities).
- **Report Route JS:** 74.5 kB (React Flow visualizer, Mermaid viewer, syntax highlighters).
- **Core Landing Page:** 6.34 kB (ultra-fast initial load).

---

## 5. Recommended Production Capacity

For deployment handling up to 50 concurrent repository scans:

- **Compute:** 2 vCPU minimum, 4 vCPU recommended.
- **Memory:** 2 GB RAM minimum, 4 GB RAM recommended.
- **Node.js Concurrency:** `MAX_CONCURRENT_SCANS=2` per API instance (handles burst queuing without event loop starvation).
- **MongoDB:** MongoDB 6.0+ with WiredTiger storage engine and wired indexes on `{ projectId: 1, status: 1 }`.
