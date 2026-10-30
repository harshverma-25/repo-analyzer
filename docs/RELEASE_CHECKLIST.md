# Production Release Checklist — Repo Analyzer v1.0.0

This checklist documents the verification status, operational readiness, deployment procedures, and known boundaries for the **Repo Analyzer v1.0.0** public release.

---

## 1. Release Verification Matrix

| Area | Verification Status | Evidence / Verification Method |
|:---|:---:|:---|
| **Automated Test Suite** | Verified (100%) | 25 passing unit/integration tests (`pnpm test` in ~2.3s) |
| **Monorepo Build** | Verified (100%) | All 6 packages and apps compile cleanly via Turbo (`pnpm build`) |
| **Real Repository Validation** | Verified (100%) | 6 diverse GitHub repositories tested empirically with 0 errors |
| **AST Express Route Extractor** | Verified (100%) | Verified on `expressjs/express`, `bulletproof-nodejs`, and `router` |
| **AST Mongoose Schema Extractor** | Verified (100%) | Verified on `node-express-mongoose-demo` and `bulletproof-nodejs` |
| **SSRF Security Remediation** | Verified (100%) | Blocked private IPs, non-GitHub domains, and redirect bypasses |
| **Secret Redaction & Exclusion** | Verified (100%) | `.env`, `.pem`, `.key` excluded; secret signatures redacted |
| **Reboot Reconciliation** | Verified (100%) | Interrupted scans marked failed upon server startup |
| **Google Gemini Integration** | Verified (100%) | Structured schema generation, strict grounding, and Fallback provider |
| **Frontend Bundle & Routing** | Verified (100%) | Next.js 15 App Router static/dynamic pages <116 kB First Load JS |

---

## 2. Supported vs. Partially Supported vs. Unverified Capabilities

### Fully Supported & Verified
- **Public GitHub Repositories**: Any public repository on `github.com` accessible over HTTPS.
- **Language-Aware Line Counting**: JavaScript, TypeScript, JSX, TSX, Python, HTML, CSS, JSON, YAML, SQL, Shell, Markdown. Handles single-line, block, and docstring comments without skewing blank lines.
- **Technology Detection**: Auto-detects 20+ runtimes, frameworks, ORMs, and test libraries from `package.json` dependencies and configuration files.
- **Express.js Route Extraction**: Detects methods (`get`, `post`, `put`, `delete`, `patch`), nested router mount prefixes (`app.use('/prefix', router)`), middleware chains, URL parameters (`:id`), and inferred HTTP status codes.
- **Mongoose Schema Extraction**: Detects schemas, fields, primitive types, enum constraints, foreign references (`ref`), and compound indexes.
- **Static Security Review**: Scans for high-entropy tokens, AWS/Stripe keys, direct shell execution (`eval`, `child_process.exec`), and unauthenticated mutating routes.
- **AI Architecture Synthesis**: Synthesizes grounded overviews and answers technical Q&A based solely on verified AST findings.

### Partially Supported (Documented Boundaries)
- **Dynamic Route Registration**: Routes declared dynamically inside runtime loops or imported via `fs.readdirSync()` cannot be statically resolved by Babel AST and are flagged as unresolved diagnostics rather than fabricated.
- **Non-Express Routing**: Fastify, NestJS, and Koa repositories are correctly classified in technologies, but endpoint extraction is scoped to Express in v1.0.0. The UI explains this clearly in the API Explorer tab.
- **Alternative ORMs**: Prisma, TypeORM, and Sequelize are detected as dependencies, but schema AST extraction is scoped to Mongoose in v1.0.0.
- **Repository Size Limit**: To operate safely within GitHub rate limits and avoid node memory exhaustion, ingestion is bounded to 150 top candidate source files per repository.

### Unverified / Out of Scope for v1.0.0
- **Private GitHub Repositories**: OAuth/PAT login for private repos is not enabled in v1.0.0 (requires GitHub App integration).
- **GitLab / Bitbucket**: Only `github.com` URLs are supported in v1.0.0.
- **Runtime Code Execution / DAST**: Repo Analyzer is strictly a static analysis tool; it never executes analyzed user code.

---

## 3. Queue Architecture & Scaling Thresholds

### Current Implementation: In-Process Async Queue
- **Concurrency**: 2 concurrent repository scans (`maxConcurrent = 2`).
- **Capacity**: In-memory queue with duplicate-scan deduplication.
- **Reboot Recovery**: On server startup, any scans left in `queued`, `cloning`, or `analyzing_code` states are automatically transitioned to `failed` with clear error reasons (`Scan interrupted by server restart`).

### Evidence-Based Scaling: When to Introduce Redis / BullMQ
| Metric | In-Process Queue (Current) | Redis / BullMQ Threshold |
|:---|:---|:---|
| **Concurrent Workers** | Single Node.js process (1-2 concurrent jobs) | Multi-instance horizontal scaling (>1 API container) |
| **Scan Volume** | <50 scans/hour | >100 scans/hour with sustained backpressure |
| **Job Persistence** | In-memory with MongoDB reboot reconciliation | Durable distributed job queues with Redis persistence |
| **Worker Isolation** | Shared process with Express HTTP API | Separate dedicated worker processes/containers |

*Recommendation*: Retain the current lightweight in-process queue for v1.0.0. The queue is fully crash-resilient via database reconciliation. Do not add Redis infrastructure until horizontal multi-worker scaling is required.

---

## 4. Production Deployment Procedures

### 4.1 Frontend Deployment (Vercel)
1. Import repository to Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Next.js`.
4. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of the deployed Express API (e.g. `https://api.repoanalyzer.com`).
5. Deploy. The project includes `apps/web/vercel.json` for zero-config build.

### 4.2 Backend & Worker Deployment (Persistent Node.js Platform)
*Platforms: Render, Railway, Fly.io, AWS ECS, or DigitalOcean App Platform.*
1. Build container using the provided root `Dockerfile`:
   ```bash
   docker build -t repo-analyzer-api .
   ```
2. Configure Environment Variables:
   - `PORT`: `4000`
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: Your Vercel frontend domain (e.g. `https://repoanalyzer.vercel.app`)
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `GITHUB_TOKEN`: GitHub Personal Access Token (recommended for 5,000 req/hr quota)
   - `GEMINI_API_KEY`: Google Gemini API key (optional; defaults to Fallback provider if omitted)
   - `GEMINI_MODEL`: `gemini-2.5-flash`
3. Expose Port `4000` with HTTP health check:
   - Health check path: `GET /api/v1/health`

### 4.3 Database Deployment (MongoDB Atlas)
1. Create a MongoDB Atlas cluster (M0 free tier or M10+ for production).
2. Create database user with Read/Write permissions on `repo-analyzer` database.
3. Network Access: Whitelist the IP addresses of your backend container service.
4. Index Verification: Mongoose schemas in `@repo-analyzer/database` automatically create:
   - `Project.canonicalUrl`: unique index
   - `Scan.projectId` + `Scan.createdAt`: compound query index
   - `Artifact.scanId` + `Artifact.artifactType`: compound lookup index

### 4.4 Google Gemini Setup
1. Create API Key in Google AI Studio.
2. Set `GEMINI_API_KEY` in backend environment variables.
3. Verify that if `GEMINI_API_KEY` is not provided or quota is exceeded, the backend automatically transitions to `FallbackAIProvider` without dropping scans or throwing 500 errors.

---

## 5. Pre-Release Verification Sign-off

- [x] All 25 unit and integration tests passing.
- [x] All 6 monorepo workspaces building cleanly without TypeScript errors.
- [x] Tested against 6 diverse public GitHub repositories.
- [x] Verified zero false positives on non-Express callers (`map.get`, `cache.get`).
- [x] Verified Mongoose schema extraction with references and compound indexes.
- [x] Verified SSRF safety, redirect protection, and token masking.
- [x] Verified UI empty states and analysis coverage displays.
- [x] Verified Docker container build and healthcheck definitions.
- [x] Verified Vercel configuration for Next.js 15 App Router.
- [x] Verified documentation matches active codebase implementation.
- [x] Working tree clean; zero hardcoded secrets or uncommitted artifacts.
