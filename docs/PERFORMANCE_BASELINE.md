# Repo Analyzer — Performance Baseline Report

**Date:** 2026-10-31  
**Commit:** 988ff18  
**Environment:** Node.js v22.14.0, Windows 11, TypeScript 5.7, Next.js 15.2.1, Turborepo 2.4.4  

---

## 1. Executive Summary

A comprehensive performance baseline was established across all application layers:
1. **Frontend:** Next.js 15 client bundle sizes, route loading, dependencies.
2. **Backend API:** Express request handling, Mongoose database interactions, scan orchestration.
3. **GitHub Ingestion:** Tree traversal, candidate file selection, network retrieval latency.
4. **AST Analyzer:** TypeScript compiler AST generation, route & schema extraction.
5. **Database & Queue:** Query execution patterns, document instantiation overhead, timeout & cancellation semantics.

---

## 2. Frontend Performance Baseline

### 2.1 Next.js 15 Bundle Size & First Load JS (Production Build)

| Route | Size | First Load JS | Notes |
| :--- | :--- | :--- | :--- |
| `┌ ○ /` (Dashboard / Submission) | 204 B | 105 kB | Client component for URL input & scan triggers |
| `├ ○ /_not-found` (404 Page) | 994 B | 97.4 kB | Static route |
| `├ λ /report/[id]` (Scan Report) | 11.2 kB | 116 kB | Dynamic server-rendered + client tab interactivity |
| **Shared Base Bundle** | **96.4 kB** | **96.4 kB** | Next.js runtime, React, chunks/framework |

### 2.2 Frontend Dependencies Audit
- Unused heavy dependencies detected in `apps/web/package.json`:
  - `@tanstack/react-query`: Installed but not imported in any component.
  - `@xyflow/react`: Installed but the architecture viewer uses a lightweight pure CSS/Tailwind 4-tier layer viewer.
  - `mermaid`: Installed (along with `katex` transitive dependency) but not imported directly in the bundle.
- Removing these unused dependencies reduces node_modules footprint and prevents accidental tree-shaking failures.

---

## 3. GitHub Ingestion & Scan Execution Baseline

### 3.1 Real-Repository Analysis Benchmarks (Sequential Ingestion)
Testing 6 real repositories against GitHub API with a batch of up to 30 prioritized files:

| Repository | Category | Tree Size | Analyzed Files | Code Lines | Baseline Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `expressjs/body-parser` | Small JS Express Middleware | 29 | 16 | 4,364 | **9,809 ms** |
| `santiq/bulletproof-nodejs` | TS Express with 3-tier routing | 69 | 30 | 750 | **12,777 ms** |
| `expressjs/express` | Core Node.js Web Framework | 284 | 30 | 4,331 | **12,072 ms** |
| `madhums/node-express-mongoose-demo` | Mongoose Schemas & Express | 105 | 30 | 1,231 | **14,218 ms** |
| `pillarjs/router` | Complex Dynamic Routing | 56 | 30 | 6,540 | **13,429 ms** |
| `fastify/fastify` | Fastify Framework (Non-Express) | 427 | 30 | 6,852 | **14,736 ms** |
| **Average Scan Time** | | | | | **12,840 ms (~12.8s)** |

### 3.2 Ingestion Latency Breakdown
- **GitHub Commit & Tree Retrieval:** ~800ms - 1,200ms
- **File Ingestion:** **10,500ms - 12,000ms** (Sequential loop fetching 30 files individually over HTTPS with ~350ms roundtrip per file)
- **AST Parsing & Static Analysis:** ~450ms - 1,500ms
- **Bottleneck Identified:** The sequential ingestion loop is the single largest bottleneck in the pipeline, consuming >85% of total scan time.

---

## 4. AST & Static Analysis Baseline

### 4.1 Redundant AST Parsing
- In `packages/analyzer/src/pipeline.ts`:
  1. `extractExpressRoutes(analyzedFiles)` calls `ts.createSourceFile()` for every `.ts`/`.js` file.
  2. `extractMongooseModels(analyzedFiles)` immediately calls `ts.createSourceFile()` *again* for every `.ts`/`.js` file.
  3. `calculateStatistics(analyzedFiles)` processes raw string lines separately.
- **Impact:** 100% redundant AST allocation and lexical parsing for all source files in every scan. For 30 files, 60 AST trees are created instead of 30.

---

## 5. Backend & Database Baseline

### 5.1 Express Middleware
- No response compression middleware (`compression`) is configured in `apps/api/src/server.ts`. Large scan results (~50KB-200KB JSON payloads containing hundreds of endpoints and AST metadata) are served uncompressed over HTTP.

### 5.2 Mongoose Query Patterns
- `Scan.find()`, `Scan.findById()`, and `Project.find()` return full hydrated Mongoose documents with change-tracking overhead, getters/setters, and internal symbol maps, rather than lightweight plain JavaScript objects.
- Polling endpoint `GET /api/scans/:id` fetches the entire scan record (including large raw AST findings, security findings, and stats) instead of projecting only status fields (`status`, `stage`, `error`, `progress`).

### 5.3 Queue Timeout & Cancellation
- The scan timeout is implemented as `Promise.race([scanPromise, timeoutPromise])`.
- When a timeout fires, `scanPromise` continues executing in the background, consuming Node.js event-loop cycles, memory, and GitHub API rate-limit quota with no cancellation signal (`AbortSignal`) propagated.

---

## 6. Target Optimization Goals

1. **Ingestion Concurrency:** Implement a bounded concurrency pool (e.g., concurrency = 8) with `AbortSignal` support. Target: Reduce ingestion time by 60-75% (~12.8s -> ~3.5s).
2. **Single-Pass AST Reuse:** Parse `ts.SourceFile` once per file in `pipeline.ts` and share the parsed ASTs across route extraction and schema extraction. Target: 50% reduction in AST memory and parsing CPU time.
3. **Database Optimization:** Apply `.lean()` across all read-only API queries and `.select()` projection for status polling.
4. **Compression Middleware:** Enable Gzip/Brotli compression for all Express API endpoints.
5. **Real Cancellation:** Integrate `AbortController` in `ScanQueue` to terminate pending HTTP fetches and background processing when scans timeout or are cancelled.
6. **Frontend Cleanup:** Prune unused dependencies in `apps/web`.
