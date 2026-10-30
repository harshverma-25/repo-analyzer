# Repo Analyzer

> Deterministic AST static analysis meets Google Gemini AI for deep GitHub repository understanding.

Repo Analyzer is a high-performance developer tool that ingests public GitHub repositories and performs deep static analysis — discovering API endpoints, Mongoose models, architecture graphs, language-aware line statistics, technology dependencies, and static security observations — augmented with grounded Google Gemini explanations.

---

## 🌟 Key Features

- **AST-Based Express.js API Discovery**: Traverses Abstract Syntax Trees (using TypeScript Compiler API) to resolve routes, nested `app.use()` and `router.use()` mount prefixes, middleware arrays, handler chains, parameter schemas, and status codes.
- **Mongoose Model Discovery**: Identifies Mongoose schemas, field types, validation constraints (`required`, `unique`, `enum`, `default`), foreign references (`ref`), embedded subschemas, and compound indexes.
- **Language-Aware Line Counting**: Accurately computes source code, blank, and comment lines across 30+ programming languages rather than relying on crude byte percentages.
- **Technology & Dependency Detection**: Analyzes package manifests, imports, and framework signatures with confidence scoring and evidence tracking.
- **Static Security Review**: Scans for hardcoded credentials (with automated redaction), dynamic `eval()` / `Function()`, command execution, SQL/NoSQL injection patterns, insecure path handling, and unauthenticated mutating routes.
- **Interactive Architecture & Diagrams**: Interactive React Flow graph visualizing Route -> Controller -> Service -> Model -> Database relationships alongside validated Mermaid diagrams.
- **Google Gemini Grounded Insights**: Uses Gemini (via `@google/genai`) to generate high-level summaries, endpoint explanations, and architecture overviews strictly grounded in static facts.
- **Graceful Degraded Mode**: Completely functional without an AI API key — deterministic analysis is always 100% available via `FallbackAIProvider`.
- **Asynchronous Scan Pipeline**: Non-blocking `202 Accepted` queue with bounded concurrency, real-time stage tracking, and MongoDB persistence.

---

## 🏗️ Monorepo Architecture

```
repo-analyzer/
├── apps/
│   ├── web/               # Next.js 15 App Router (TypeScript, Tailwind, React Flow, Mermaid)
│   └── api/               # Express.js REST API (/api/v1, Zod, In-Process Worker)
├── packages/
│   ├── shared/            # Shared contracts, Zod schemas, TypeScript types
│   ├── database/          # Mongoose schemas & MongoDB client
│   ├── analyzer/          # AST analysis, line counter, Express & Mongoose extractors, security scanner
│   └── ai/                # Google Gemini provider abstraction & structured prompt pipelines
├── docs/                  # In-depth architectural & operational documentation
│   ├── REAL_WORLD_TESTING.md    # Empirical results across 6 real GitHub repos
│   ├── RELEASE_CHECKLIST.md     # Production release verification checklist
│   ├── IMPLEMENTATION_AUDIT.md  # Independent audit & verification report
│   ├── PRODUCTION_READINESS.md  # Production hardening & security remediation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API_SPEC.md
│   ├── SECURITY.md
│   └── ANALYZER_LIMITATIONS.md
├── Dockerfile             # Multi-stage production container for API service
├── docker-compose.yml     # Local MongoDB & staging stack
└── .env.example
```

---

## 🧪 Verification & Real-World Validation

### Automated Test Suite
- **25 automated tests** passing with 100% success rate (`pnpm test` in ~2.3 seconds).
- Zero warnings, zero skipped tests, strict Zod validation.

### Real-World GitHub Repositories Tested
Empirically validated against 6 public repositories representing distinct architectural archetypes:

| Category | Repository | Commit SHA | Analyzed Files | Code Lines | Tech Detected | Endpoints | Models | Security Findings | Scan Duration |
|:---|:---|:---:|:---:|:---:|:---|:---:|:---:|:---:|:---:|
| **1. Small JS Middleware** | `expressjs/body-parser` | `151a0d9e` | 16 | 4,364 | Node.js, Supertest | 0 | 0 | 1 | 5.6s |
| **2. TS Nested Routers** | `santiq/bulletproof-nodejs` | `7ce1b469` | 30 | 750 | Node.js, Express.js, Mongoose, TS, Jest | 6 | 1 | 1 | 13.4s |
| **3. Large Core Backend** | `expressjs/express` | `1c6f1b0f` | 30 | 4,331 | Node.js, Express.js, Supertest | 37 | 0 | 2 | 6.5s |
| **4. Mongoose Models** | `madhums/node-express-mongoose-demo` | `8a134ab5` | 30 | 1,231 | Node.js, Express.js, Mongoose, Supertest | 26 | 14 | 6 | 15.7s |
| **5. Dynamic Routes** | `pillarjs/router` | `098ea782` | 30 | 6,540 | Node.js, TypeScript, Supertest | 180 | 0 | 16 | 16.0s |
| **6. Alternative Framework** | `fastify/fastify` | `5df959f3` | 30 | 6,852 | Node.js, Fastify, TypeScript, Joi | 0 | 0 | 0 | 7.0s |

*For complete benchmark tables and code comparisons, see [docs/REAL_WORLD_TESTING.md](docs/REAL_WORLD_TESTING.md).*

---

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js**: v20+ (tested on Node v22/v24)
- **pnpm**: v9+
- **MongoDB**: v6+ (local or MongoDB Atlas)
- **Google Gemini API Key** (optional, for live AI summaries)

### 1. Clone & Install
```bash
git clone https://github.com/harshverma-25/repo-analyzer.git
cd repo-analyzer
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` to configure your MongoDB connection string and (optional) Gemini API Key:
```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/repo-analyzer
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start Local MongoDB (Optional Docker)
```bash
docker-compose up -d mongodb
```

### 4. Run Development Servers
```bash
# Starts Express API (http://localhost:4000) and Next.js Web (http://localhost:3000)
pnpm dev
```

### 5. Run Automated Tests & Builds
```bash
# Run unit & integration test suite
pnpm test

# Run production build across all monorepo packages
pnpm build
```

---

## 🚢 Production Deployment

### Frontend (Vercel)
1. Import repository to Vercel with **Root Directory** set to `apps/web`.
2. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your deployed Express API domain (e.g. `https://api.repoanalyzer.com`).
3. Deploy. The project includes `apps/web/vercel.json` for zero-config build.

### Backend & Background Worker (Container / Persistent Host)
*Deployable to Render, Railway, Fly.io, AWS ECS, or Kubernetes using the root `Dockerfile`.*
```bash
# Build multi-stage production container
docker build -t repo-analyzer-api .

# Run container with production environment
docker run -d -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e CORS_ORIGIN=https://repoanalyzer.vercel.app \
  -e MONGODB_URI="mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/repo-analyzer" \
  -e GITHUB_TOKEN="ghp_xxx" \
  -e GEMINI_API_KEY="AIzaSyxxx" \
  repo-analyzer-api
```
Health Check Endpoint: `GET /api/v1/health`

### Database (MongoDB Atlas)
- Compatible with free-tier M0 and production clusters (M10+).
- Requires network access whitelist and ReadWrite user privileges.
- Auto-indexes on canonical repository URL and scan IDs are initialized on startup.

---

## 🛡️ Security & Responsible Disclosure
Repo Analyzer's static security scanner is an observational inspection tool, **not** an exploit validator. It reports suspicious AST patterns and potential secret leakage with automatic token redaction. Please see [docs/SECURITY.md](docs/SECURITY.md) for our threat model.

## 📄 License
MIT
