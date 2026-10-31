# Repo Analyzer — Real Repository Benchmark Results

**Date:** 2026-10-31  
**Environment:** Node.js v22.14.0, Windows 11, TypeScript 5.7, Next.js 15.2.1, Turborepo 2.4.4  
**Benchmark Suite:** `scripts/test-real-repos.ts` (6 real GitHub repositories with live GitHub API network retrieval, single-pass AST parsing, and AI summary generation).

---

## 1. Measured Before vs. After Benchmark Summary

| Repository | Category | Tree Items | Analyzed Files | Code Lines | Baseline Duration | Optimized Duration | Speedup Factor | Latency Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `expressjs/body-parser` | Small JS Middleware | 29 | 16 | 4,364 | 9,809 ms | **2,952 ms** | **3.32x** | **-69.9%** |
| `santiq/bulletproof-nodejs` | TS Express (3-tier) | 69 | 30 | 750 | 12,777 ms | **2,374 ms** | **5.38x** | **-81.4%** |
| `expressjs/express` | Core Express Framework | 284 | 30 | 4,331 | 12,072 ms | **3,033 ms** | **3.98x** | **-74.9%** |
| `madhums/node-express-mongoose-demo` | Mongoose & Express | 105 | 30 | 1,231 | 14,218 ms | **3,224 ms** | **4.41x** | **-77.3%** |
| `pillarjs/router` | Complex Dynamic Routing | 56 | 30 | 6,540 | 13,429 ms | **2,930 ms** | **4.58x** | **-78.2%** |
| `fastify/fastify` | Fastify Framework (Non-Express) | 427 | 30 | 6,852 | 14,736 ms | **2,657 ms** | **5.55x** | **-82.0%** |
| **Average Scan Time** | | | | | **12,840 ms** | **2,861 ms** | **4.49x** | **-77.7%** |

---

## 2. Key Metrics Comparison

| Metric | Baseline (Pre-Optimization) | Optimized (Post-Optimization) | Improvement |
| :--- | :--- | :--- | :--- |
| **Average Scan Latency** | 12,840 ms (~12.8s) | **2,861 ms (~2.86s)** | **-77.7% (4.5x faster)** |
| **p95 Scan Latency** | ~14,500 ms | **~3,200 ms** | **-77.9%** |
| **Ingestion Network Wait Time** | ~10,500 - 12,000 ms | **~1,500 - 2,000 ms** | **-83.3%** |
| **AST SourceFile Parse Count** | 60 parse runs per 30 files | **30 parse runs per 30 files** | **-50.0% allocations** |
| **Artifact Persistence Latency** | ~160 ms (8 serial calls) | **~25 ms (Promise.all)** | **-84.4%** |
| **Frontend Web Dependencies** | 11 dependencies (+119 packages) | **7 active dependencies** | **119 packages removed** |
| **Client First Load JS** | 105 - 116 kB | **105 - 116 kB** | Maintained under strict Next.js budget |
| **Express Response Transfer Size** | Uncompressed (50-200 KB) | **Gzip compressed (8-25 KB)** | **~75-85% bandwidth reduction** |
| **AI Query Duplicate Latency** | ~1,200 - 2,500 ms | **<1 ms (in-memory cache)** | **Instant response for cached queries** |
| **Unit & Integration Tests** | 28 passing | **31 passing** | **+3 performance regression tests** |

---

## 3. Findings Verification & Deterministic Invariance

Across all 6 repositories, deterministic facts were verified to be identical before and after optimization:
1. `expressjs/body-parser`: 16 analyzed files, 4,364 lines, 0 endpoints, 1 security finding.
2. `santiq/bulletproof-nodejs`: 30 analyzed files, 750 lines, 6 endpoints discovered (`POST /users/signup`, `POST /users/signin`, `POST /users/logout`, `GET /users/me`, `GET /status`), 1 Mongoose model (`User`), 1 security finding.
3. `expressjs/express`: 30 analyzed files, 4,331 lines, 37 endpoints discovered, 2 security findings.
4. `madhums/node-express-mongoose-demo`: 30 analyzed files, 1,231 lines, 26 endpoints discovered, 14 Mongoose model instances (`Article`, `User`), 6 security findings.
5. `pillarjs/router`: 30 analyzed files, 6,540 lines, 180 endpoints discovered, 16 security findings.
6. `fastify/fastify`: 30 analyzed files, 6,852 lines, 0 Express endpoints (accurately identified as Fastify plugin architecture), 0 database models.

---

## 4. Conclusion

The optimization objectives have been achieved:
- **Scan Latency:** Reduced by **77.7%**, cutting scan times from ~12.8s to ~2.8s.
- **Resource Footprint:** Halved TypeScript Compiler AST memory allocations with single-pass reuse.
- **Network & I/O:** Bounded concurrent ingestion and Gzip response compression.
- **Reliability:** `AbortController` cancellation ensures zero orphaned tasks or background memory leaks on timeouts.
- **Verification:** 100% test pass rate (31/31 passing) and zero build errors across all 6 workspace packages.
