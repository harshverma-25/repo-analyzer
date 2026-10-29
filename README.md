# Repo Analyzer

> Deterministic static analysis meets Google Gemini AI for deep GitHub repository understanding.

Repo Analyzer is a high-performance developer tool that ingests public GitHub repositories and performs deep static analysis — discovering API endpoints, Mongoose models, architecture graphs, line statistics, technology dependencies, and static security observations — augmented with grounded Google Gemini explanations.

---

## 🌟 Key Features

- **AST-Based Express.js API Discovery**: Traverses Abstract Syntax Trees (using TypeScript Compiler API) to resolve routes, nested `app.use()` and `router.use()` mount prefixes, middleware arrays, handler chains, parameter schemas, and status codes.
- **Mongoose Model Discovery**: Identifies Mongoose schemas, field types, validation constraints (`required`, `unique`, `enum`, `default`), foreign references (`ref`), embedded subschemas, and indexes.
- **Language-Aware Line Counting**: Accurately computes source code, blank, and comment lines across 30+ programming languages rather than relying on crude byte percentages.
- **Technology & Dependency Detection**: Analyzes package manifests, imports, and framework signatures with confidence scoring and evidence tracking.
- **Static Security Review**: Scans for hardcoded credentials (with automated redaction), dynamic `eval()` / `Function()`, command execution, SQL/NoSQL injection patterns, insecure path handling, and overly permissive CORS.
- **Interactive Architecture & Diagrams**: Interactive React Flow graph visualizing Route -> Controller -> Service -> Model -> Database relationships alongside validated Mermaid diagrams.
- **Google Gemini Grounded Insights**: Uses Gemini (via `@google/genai`) to generate high-level summaries, endpoint explanations, and architecture overviews strictly grounded in static facts.
- **Graceful Degraded Mode**: Completely functional without an AI API key — deterministic analysis is always 100% available.
- **Asynchronous Scan Pipeline**: Non-blocking `202 Accepted` queue with bounded concurrency, real-time stage tracking, and MongoDB persistence.

---

## 🏗️ Monorepo Architecture

```
repo-analyzer/
├── apps/
│   ├── web/               # Next.js App Router (TypeScript, Tailwind, React Flow, Mermaid)
│   └── api/               # Express.js REST API (/api/v1, Zod, Async Worker)
├── packages/
│   ├── shared/            # Shared contracts, Zod schemas, TypeScript types
│   ├── database/          # Mongoose schemas & MongoDB client
│   ├── analyzer/          # AST analysis, line counter, Express & Mongoose extractors, security scanner
│   └── ai/                # Google Gemini provider abstraction & structured prompt pipelines
├── docs/                  # In-depth architectural & operational documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API_SPEC.md
│   ├── SECURITY.md
│   └── ANALYZER_LIMITATIONS.md
├── fixtures/              # Test repositories (basic Express, nested routers, Mongoose models)
├── docker-compose.yml     # Local MongoDB & environment setup
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20+ (tested on Node v22/v26)
- **pnpm**: v9+ (or v11)
- **MongoDB**: v6+ (local or Atlas cluster)
- **Google Gemini API Key** (optional, for AI summaries)

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
MONGODB_URI=mongodb://localhost:27017/repo-analyzer
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start Local MongoDB (Optional Docker)
```bash
docker-compose up -d mongo
```

### 4. Run Development Servers
```bash
# Start backend API (http://localhost:4000) & frontend (http://localhost:3000)
pnpm dev
```

### 5. Run Automated Tests
```bash
pnpm test
```

---

## 🛡️ Static Security & Responsible Disclosure
Repo Analyzer's static security scanner is an observational inspection tool, **not** an exploit validator. It reports suspicious AST patterns and potential secret leakage with automatic token redaction. Please see [docs/SECURITY.md](docs/SECURITY.md) for our threat model.

## 📄 License
MIT
