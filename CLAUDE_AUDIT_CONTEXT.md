# CLAUDE AUDIT CONTEXT & REPOSITORY SPECIFICATION

> **Target Audience:** Claude (Anthropic AI) & Technical Audit Teams  
> **Repository:** Repo Analyzer (`harshverma-25/repo-analyzer`)  
> **Documentation Type:** Complete Architecture, Codebase & Security Specification  
> **Monorepo Version:** `1.0.0` | **Date of Compilation:** November 2026  
> **Status Classification Standard:** `IMPLEMENTED` | `PARTIALLY IMPLEMENTED` | `NOT IMPLEMENTED` | `NEEDS VERIFICATION`

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Complete Folder Structure & Directory Map](#2-complete-folder-structure--directory-map)
3. [Complete System Architecture](#3-complete-system-architecture)
   - 3.1 Architectural Principles
   - 3.2 Mermaid Architecture Diagrams (7 System Views)
4. [Complete Feature Inventory](#4-complete-feature-inventory)
   - 4.1 Repository Analysis & Ingestion
   - 4.2 API Discovery & AST Route Extraction
   - 4.3 Database Model Extraction (Mongoose)
   - 4.4 Architecture & Graph Generation
   - 4.5 Static Security Scanner
   - 4.6 Artificial Intelligence & Grounded Synthesis (Gemini + Fallback)
   - 4.7 Web Application & User Experience
5. [Complete API Documentation](#5-complete-api-documentation)
6. [Database Documentation & Schema Architecture](#6-database-documentation--schema-architecture)
7. [Environment Variables & Configuration](#7-environment-variables--configuration)
8. [Security Architecture & Threat Model](#8-security-architecture--threat-model)
9. [Complete Data Flow & Scan Lifecycle](#9-complete-data-flow--scan-lifecycle)
10. [Testing Documentation & Verification Results](#10-testing-documentation--verification-results)
11. [Performance, Scalability & Resource Boundaries](#11-performance-scalability--resource-boundaries)
12. [Known Limitations & Technical Debt](#12-known-limitations--technical-debt)
13. [Instructions for Claude — Independent Project Audit](#13-instructions-for-claude--independent-project-audit)

---

## 1. PROJECT OVERVIEW

### 1.1 Problem Statement
Modern software engineering teams frequently inherit legacy codebases, perform technical due diligence on third-party dependencies, or onboard developers onto complex repositories. Traditional approaches rely on:
- Manual code inspection (time-consuming, prone to missing nested router mounts or subtle schema relations).
- Running untrusted code locally (poses serious security and supply-chain execution risks from malicious `npm postinstall` scripts, arbitrary code evaluation, and hostile dependencies).
- Generic AI chat prompts (leads to hallucinated endpoints, fabricated schema models, and inaccurate architecture narratives).

**Repo Analyzer** solves this problem by performing **100% passive, zero-execution static analysis** on public GitHub repositories. It ingests source code via the GitHub REST API and raw CDN, parses abstract syntax trees (AST) with the official TypeScript compiler, extracts verified Express.js routes and Mongoose database schemas, audits for common static security vulnerabilities, generates interactive architecture graphs, and conditions Google Gemini AI prompts exclusively on deterministic AST facts.

### 1.2 Target Users
- **Senior Software Architects & Tech Leads**: Visualizing system boundaries, controller chains, and database relational models.
- **Application Security (AppSec) Engineers**: Auditing third-party libraries and internal codebases for hardcoded credentials, dynamic code execution (`eval`), and unauthenticated mutating routes without running untrusted code.
- **Due Diligence Engineers & Technical Auditors**: Rapidly inspecting open-source packages and candidate repositories during architectural reviews.
- **Developers Onboarding onto New Teams**: Exploring route inventories, folder hierarchies, technology stacks, and suggested code exploration paths.

### 1.3 Main Use Cases
1. **Automated Architectural Mapping**: Turn an Express.js codebase into a clean, interactive React Flow diagram and Mermaid flowchart.
2. **REST API Endpoint Cataloging**: Automatically extract HTTP methods, resolved URL paths (including deeply nested mount prefixes), path parameters, middleware chains, controller handlers, and inferred response status codes.
3. **Mongoose Schema & Relation Discovery**: Discover models, field types, validation constraints (`required`, `unique`, `enum`), foreign key cross-references (`ref`), embedded subdocuments, and single/compound indexes.
4. **Pre-Deployment Security Hygiene Review**: Detect committed `.env` files, private keys (`id_rsa`, `.pem`), plain API keys (AWS, Stripe, OpenAI, Slack, Google), `child_process.exec` calls, and wildcard CORS.
5. **Grounded AI Exploration**: Ask natural-language architecture questions (e.g., *"How does authentication work?"*) with answers strictly anchored to discovered files and lines, with zero hallucination.

### 1.4 Technology Stack
| Layer | Technologies | Rationale / Source Evidence |
|---|---|---|
| **Runtime & Core** | Node.js >= 20.0.0, TypeScript 5.7.3 (ESM) | Modern ECMAScript modules, strict type safety across monorepo |
| **Monorepo Tooling** | pnpm 11.2.2 (workspaces), Turborepo 2.4.4 | Fast workspace linking, intelligent caching of builds and tests |
| **Backend API** | Express.js 4.21.2, Helmet 8.3.0, CORS 2.8.5, compression 1.8.2 | REST endpoints, HTTP security headers, payload compression |
| **Rate Limiting** | express-rate-limit 8.7.1 | Multi-tier windowed IP rate limiting (General, Create Scan, AI Query) |
| **Validation** | Zod 3.24.2 | Runtime schema validation for requests, AI outputs, and env vars |
| **Database & ODM** | MongoDB 7.0, Mongoose 8.12.1 | Document persistence, compound indexing, `.lean()` execution |
| **Static Code Parsing** | TypeScript Compiler API (`typescript` 5.7.3) | AST creation via `ts.createSourceFile` without evaluating code |
| **Frontend Framework** | Next.js 15.1.0 (App Router), React 19.0.0 | Server-side rendering, client interactive dashboards, routing |
| **Graph Visualization** | `@xyflow/react` 12.12.0 (React Flow) | Pan, zoom, minimap, interactive architecture nodes |
| **Styling & UI Icons** | Tailwind CSS 3.4.17, Lucide React 0.468.0 | Curated dark/light theme tokens, responsive UI layout |
| **AI Integration** | Google Gemini API (`gemini-2.5-flash`), Native Fetch | Structured JSON prompt synthesis with fallback to offline provider |
| **Testing** | Node.js built-in test runner (`tsx --test`) | Zero external test runner overhead, fast sub-second execution |
| **Containers** | Multi-stage Dockerfile (Alpine Node 22), Docker Compose | Production-grade deployment with non-root security context |

### 1.5 Current Implementation Status
- **Overall Status:** `IMPLEMENTED` & **Production Hardened**.
- **Automated Tests:** 31 automated test cases passing across 15 test suites in ~1.6 seconds.
- **Monorepo Build:** 100% clean build across all 4 packages and 2 applications with zero TypeScript errors.

---

## 2. COMPLETE FOLDER STRUCTURE & DIRECTORY MAP

```
repo-analyzer/
├── .env.example                     # Environment template with descriptive comments (no secrets)
├── .npmrc                           # pnpm configuration settings
├── Dockerfile                       # Multi-stage production container build (builder -> runner)
├── docker-compose.yml               # Local container orchestration for MongoDB and API server
├── package.json                     # Root monorepo workspace definition & scripts
├── pnpm-lock.yaml                   # Pinned dependency lockfile
├── pnpm-workspace.yaml              # Workspace directory mappings ('apps/*', 'packages/*')
├── turbo.json                       # Turborepo task pipeline configuration (build, test, dev, lint)
├── apps/
│   ├── api/                         # Backend Express.js REST API Server
│   │   ├── package.json             # API server dependencies & build scripts
│   │   ├── tsconfig.json            # TypeScript configuration (NodeNext ESM)
│   │   └── src/
│   │       ├── server.ts            # Express server initialization, middleware stack, shutdown hooks
│   │       ├── config/
│   │       │   └── index.ts         # Zod-validated environment configuration loader
│   │       ├── controllers/
│   │       │   ├── projectController.ts  # Handlers for project listing, scan history, cascade deletion
│   │       │   └── scanController.ts     # Handlers for scan enqueue, status polling, report, AI explain
│   │       ├── jobs/
│   │       │   └── scanQueue.ts     # In-memory async job queue with concurrency limits & crash recovery
│   │       ├── middleware/
│   │       │   └── errorHandler.ts  # Centralized error handler with Zod formatting & sanitize 500s
│   │       └── routes/
│   │           └── index.ts         # Express router, rate-limit middleware mounts, health endpoint
│   └── web/                         # Frontend Next.js 15 Web Application
│       ├── package.json             # Web app dependencies (Next 15, React 19, Tailwind, xyflow)
│       ├── tsconfig.json            # Web app TypeScript configuration
│       ├── next.config.mjs          # Next.js configuration
│       ├── tailwind.config.ts       # Tailwind CSS theme configuration (custom colors, dark mode)
│       ├── postcss.config.mjs       # PostCSS configuration
│       ├── vercel.json              # Vercel deployment configuration
│       └── src/
│           ├── app/
│           │   ├── layout.tsx       # Root layout with ThemeProvider, Navbar, and footer
│           │   ├── page.tsx         # Landing page (hero, input form, live validation, sample badges)
│           │   ├── globals.css      # CSS reset, theme variables, glassmorphism utilities
│           │   ├── projects/
│           │   │   └── page.tsx     # Project catalog & scan history management view
│           │   └── scans/
│           │       └── [scanId]/
│           │           ├── page.tsx         # Real-time scan progress polling dashboard
│           │           └── report/
│           │               └── page.tsx     # Full interactive multi-tab scan report dashboard
│           ├── components/
│           │   ├── ai-insights-view.tsx    # Gemini grounded summary & interactive Q&A assistant
│           │   ├── api-explorer.tsx        # Windowed searchable REST endpoint table with parameters
│           │   ├── architecture-graph.tsx  # React Flow interactive diagram & Mermaid code viewer
│           │   ├── folder-tree-view.tsx    # Collapsible hierarchical folder tree explorer
│           │   ├── hero-preview.tsx        # Landing page interactive feature preview component
│           │   ├── models-explorer.tsx     # Mongoose schema, field types, and relations viewer
│           │   ├── navbar.tsx              # Global navigation bar with theme toggle & health badge
│           │   ├── security-audit.tsx      # Filterable security findings table with severity badges
│           │   ├── statistics-view.tsx     # Code metrics, language distribution bars, largest files
│           │   ├── technologies-view.tsx   # Categorized technology badges with evidence pills
│           │   └── theme-provider.tsx      # Dark / Light / System theme context with localStorage sync
│           └── lib/
│               ├── api.ts                  # Typed client for backend REST API endpoints
│               └── utils.ts                # Tailwind class merger (clsx + twMerge) & date formatters
├── packages/
│   ├── shared/                      # Monorepo Shared Types, Contracts & Zod Schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts             # Contracts: ScanMetadata, RouteFinding, DatabaseModel, SecurityFinding, etc.
│   ├── database/                    # MongoDB Connection & Mongoose Data Layer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── connection.ts        # Mongoose connection manager with state check & sanitized logging
│   │       ├── index.ts             # Re-exports models & cascading project deletion helper
│   │       └── models/
│   │           ├── AIConversation.ts # Schema for persisted scan Q&A conversations
│   │           ├── Project.ts        # Schema for canonical repository definitions
│   │           ├── Scan.ts           # Schema for scan lifecycle, status, commit SHA & summary metrics
│   │           └── ScanArtifact.ts   # Schema for split artifact storage (avoids 16MB BSON limits)
│   ├── analyzer/                    # Core Deterministic Static Analysis Engine
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts             # Analyzer public API exports
│   │       ├── pipeline.ts          # Orchestrator: single-pass AST parsing & artifact compilation
│   │       ├── github/
│   │       │   ├── client.ts        # GitHubClient with safeFetch (SSRF defense, redirects, raw CDN)
│   │       │   └── urlValidator.ts  # GitHub URL parser, domain enforce, path traversal rejection
│   │       ├── ingestion/
│   │       │   ├── filter.ts        # Ingestion filter (rejects vendor, lockfiles, secrets, files >500KB)
│   │       │   └── folderTree.ts    # Reconstructs nested folder tree from flat file lists
│   │       ├── express/
│   │       │   └── routeExtractor.ts # AST extractor for Express routes, router mounts, middleware, params
│   │       ├── database-models/
│   │       │   └── mongooseExtractor.ts # AST extractor for Mongoose schemas, field options, indexes, refs
│   │       ├── statistics/
│   │       │   └── lineCounter.ts   # Language-aware line counter (code, comment, blank) for 30+ langs
│   │       ├── technologies/
│   │       │   └── detector.ts      # Technology detector matching package.json and config files
│   │       ├── security/
│   │       │   └── securityScanner.ts # Static security scanner with hoisted regex & token redaction
│   │       └── graph/
│   │           └── graphBuilder.ts  # Builds React Flow nodes/edges & Mermaid diagram syntax
│   └── ai/                          # Google Gemini & Fallback Synthesis Engine
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts             # Provider factory (getAIProvider returns Gemini or Fallback)
│           ├── schemas/
│           │   └── aiSchemas.ts     # Strict Zod schemas for AI summary and Q&A responses
│           └── providers/
│               ├── types.ts         # IAIProvider interface & RepositoryAnalysisContext
│               ├── geminiProvider.ts # Google Gemini REST client with structured prompt & in-memory cache
│               └── fallbackProvider.ts # Offline deterministic synthesis provider (guarantees 100% uptime)
├── fixtures/                        # Static test fixtures used by automated test suite
│   ├── express-basic/               # Minimal Express JavaScript test application
│   ├── express-ts-nested/           # Complex TypeScript multi-layer Express + Mongoose fixture
│   └── security-cases/              # Vulnerable code fixtures (eval, exec, hardcoded keys, CORS *)
├── tests/                           # Automated Test Suite (31 unit & integration tests)
│   ├── advancedExpress.test.ts      # Tests non-Express caller suppression (`map.get`, `cache.get`)
│   ├── advancedMongoose.test.ts     # Tests complex Mongoose constraints, enums, compound indexes
│   ├── advancedStatistics.test.ts   # Tests empty files, HTML comments, SQL comments
│   ├── apiIntegration.test.ts       # Tests API Zod validation schemas & Fallback provider
│   ├── databaseReliability.test.ts  # Tests ScanStatusEnum & ScanStageEnum validity
│   ├── expressExtractor.test.ts     # Tests route extraction, status codes, router prefix chaining
│   ├── extendedSecurity.test.ts     # Tests security findings categories on complex fixtures
│   ├── geminiProvider.test.ts       # Tests Gemini provider, fallback activation, prompt structure
│   ├── lineCounter.test.ts          # Tests line counter across TS, Python, Ruby, Shell
│   ├── mongooseExtractor.test.ts    # Tests Mongoose model discovery, refs, and embedded subdocs
│   ├── performanceOptimizations.test.ts # Tests single-pass AST reuse, AbortSignal, Gemini caching
│   ├── pipeline.test.ts             # End-to-end integration test of analysis pipeline
│   ├── securityHardening.test.ts    # SSRF blocking, path traversal rejection, secret file filtering
│   ├── securityScanner.test.ts      # Secret string redaction & pattern matching
│   └── urlValidator.test.ts         # GitHub URL validation, domain checking, malformed path rejection
├── scripts/
│   └── test-real-repos.ts           # Real-world benchmark script testing 6 public repositories
└── docs/                            # In-depth architectural & operational documentation
    ├── ANALYZER_LIMITATIONS.md      # Detailed scope & boundary constraints
    ├── API_SPEC.md                  # REST API contract specification
    ├── ARCHITECTURE.md              # High-level architecture documentation
    ├── BENCHMARK_RESULTS.md         # Real-world repository benchmark statistics
    ├── DATABASE.md                  # Database schema design & indexing guidelines
    ├── PERFORMANCE_OPTIMIZATION.md  # Detailed performance optimization report
    ├── PRD.md                       # Product Requirements Document
    ├── PRODUCTION_READINESS.md      # Production readiness verification checklist
    ├── REAL_WORLD_TESTING.md        # Real-world testing reports across 6 public repositories
    ├── RELEASE_CHECKLIST.md         # Pre-release QA checklist
    └── SECURITY.md                  # Security policy, threat model, and mitigation mechanisms
```

---

## 3. COMPLETE SYSTEM ARCHITECTURE

### 3.1 Architectural Principles
1. **Zero-Code-Execution Guarantee**: Repository code is never executed, required, imported, or installed via package managers. Static analysis is performed purely via the TypeScript compiler's text-to-AST parser (`ts.createSourceFile`).
2. **SSRF-Safe Network Boundary**: All external HTTP requests pass through `safeFetch`, which enforces HTTPS, restricts destinations to an approved GitHub domain whitelist, blocks internal IP ranges and non-standard ports, strips credentials, and inspects redirects manually.
3. **Artifact-Decomposed Persistence**: Scan results are split between lightweight execution metadata (`scans` collection) and granular payloads (`scan_artifacts` collection), preventing MongoDB's 16MB BSON document limit from ever being reached.
4. **Resilient Asynchronous Queue**: Scans run in a bounded background worker pool (concurrency capped at 2 by default) with an `AbortController` 5-minute timeout guard and automated recovery of interrupted scans on server reboot.
5. **Grounded AI with Offline Guarantee**: AI insights are strictly conditioned on verified AST facts. If no `GEMINI_API_KEY` is configured, or if the API call fails or times out, the system automatically falls back to an offline deterministic provider with zero degradation of service.

---

### 3.2 Mermaid Architecture Diagrams

#### Diagram 1: Overall System Architecture
```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (apps/web)"]
        UI["Next.js 15 App Router<br/>(React 19 / Tailwind CSS)"]
        Theme["Theme Provider<br/>(Dark / Light / System)"]
        GraphUI["Interactive Graph<br/>(@xyflow/react)"]
    end

    subgraph APILayer ["API Server (apps/api)"]
        Server["Express.js Server<br/>(Port: 4000)"]
        HelmetMW["Helmet Security Headers"]
        CorsMW["CORS Origin Validation"]
        RateLimitMW["Multi-Tier Rate Limiting"]
        CompressMW["Response Compression"]
        Router["REST Router (/api/v1)"]
        ScanCtrl["Scan Controller"]
        ProjCtrl["Project Controller"]
        ScanQ["In-Memory ScanQueue<br/>(Concurrency: 2)"]
    end

    subgraph DataLayer ["Data & Persistence (@repo-analyzer/database)"]
        Mongo[(MongoDB 7.0)]
        ColProjects["projects"]
        ColScans["scans"]
        ColArtifacts["scan_artifacts"]
        ColAI["ai_conversations"]
    end

    subgraph EngineLayer ["Deterministic Engine (@repo-analyzer/analyzer)"]
        GHClient["GitHub Client (safeFetch)"]
        IngestFilter["Ingestion Filter"]
        ASTParser["Single-Pass AST Parser"]
        ExpressExt["Express Route Extractor"]
        MongoExt["Mongoose Schema Extractor"]
        SecScanner["Security Scanner & Redaction"]
        LineCount["Language Line Counter"]
        TechDetect["Technology Detector"]
        GraphGen["Architecture Graph Generator"]
    end

    subgraph AILayer ["AI Layer (@repo-analyzer/ai)"]
        AIFactory["Provider Factory"]
        GeminiProv["Google Gemini Provider<br/>(gemini-2.5-flash)"]
        FallbackProv["Deterministic Fallback Provider"]
    end

    subgraph ExternalServices ["External Services"]
        GitHubAPI["GitHub REST API & raw.githubusercontent.com"]
        GoogleAI["Google Gemini API"]
    end

    UI -->|HTTPS REST| Server
    Server --> HelmetMW --> CorsMW --> RateLimitMW --> CompressMW --> Router
    Router --> ScanCtrl & ProjCtrl
    ScanCtrl -->|Enqueue Job| ScanQ
    ScanCtrl & ProjCtrl --> Mongo
    Mongo --- ColProjects & ColScans & ColArtifacts & ColAI

    ScanQ -->|Orchestrates Pipeline| EngineLayer
    GHClient -->|SSRF-Safe Fetch| GitHubAPI
    EngineLayer --> IngestFilter --> ASTParser
    ASTParser --> ExpressExt & MongoExt
    EngineLayer --> SecScanner & LineCount & TechDetect & GraphGen
    EngineLayer -->|Static Facts Context| AIFactory
    AIFactory --> GeminiProv & FallbackProv
    GeminiProv -->|Grounded Prompts| GoogleAI
    ScanQ -->|Persists Artifacts Concurrently| ColArtifacts
    ScanQ -->|Updates Lifecycle| ColScans
```

#### Diagram 2: Repository Analysis Workflow
```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / Auditor
    participant Web as Next.js Web Client
    participant API as Express API Server
    participant Queue as Scan Queue Worker
    participant GitHub as GitHub REST API / Raw CDN
    participant Pipeline as Deterministic Analyzer
    participant AI as Gemini / Fallback Provider
    participant DB as MongoDB Database

    User->>Web: Submits Repository URL (e.g. https://github.com/owner/repo)
    Web->>Web: Client-side URL Syntax Validation
    Web->>API: POST /api/v1/scans { repoUrl, branch }
    API->>API: Zod URL Parse & GitHub Hostname Verification
    API->>DB: Find or Upsert Project Record
    API->>DB: Check for Active Scan (queued/running)
    API->>DB: Create Scan Record (status: 'queued')
    API->>Queue: Enqueue ScanJob { scanId, projectId, repoUrl }
    API-->>Web: Return 202 Accepted { scanId, status: 'queued' }
    Web->>Web: Redirect to /scans/:scanId (Progress Polling)

    Queue->>Queue: Acquire Concurrency Slot (Max 2)
    Queue->>DB: Update Stage: 'validating' (10%)
    Queue->>DB: Update Stage: 'resolving_revision' (20%)
    Queue->>GitHub: Resolve Commit SHA (HEAD or Branch)
    GitHub-->>Queue: Return 40-char Git Commit SHA
    Queue->>DB: Update Scan commitSha & Status 'running'
    Queue->>DB: Update Stage: 'fetching_tree' (35%)
    Queue->>GitHub: GET /git/trees/:sha?recursive=1
    GitHub-->>Queue: Return Git Tree (blob list)

    Queue->>Pipeline: Filter Tree (exclude vendor, lockfiles, secrets, >500KB)
    Queue->>DB: Update Stage: 'analyzing_code' (50%)
    Queue->>GitHub: Bounded Concurrent Fetch (8 workers, top 150 code files)
    GitHub-->>Queue: Return Raw File Contents

    Queue->>Pipeline: Execute runDeterministicAnalysis(rawFiles)
    Pipeline->>Pipeline: Single-Pass AST Parse (ts.createSourceFile)
    Pipeline->>Pipeline: Extract Express Routes, Routers, Middlewares
    Pipeline->>Pipeline: Extract Mongoose Models, Fields, Refs, Indexes
    Pipeline->>Pipeline: Detect Technologies & Count Lines of Code
    Pipeline->>Pipeline: Execute Security Scanner & Redact Secrets
    Pipeline->>Pipeline: Generate Architecture Graph & Mermaid Syntax

    Queue->>DB: Update Stage: 'generating_ai_insights' (85%)
    Queue->>AI: generateSummary(staticFactsContext)
    alt Gemini Configured & Online
        AI->>AI: Call Gemini API (15s timeout, Zod validation)
    else Key Missing or Error
        AI->>AI: Generate Deterministic Grounded Narrative
    end
    AI-->>Queue: Return AISummaryArtifact

    Queue->>DB: Persist 8 Artifacts Concurrently in scan_artifacts
    Queue->>DB: Update Scan: status='completed', stage='completed' (100%)
    Queue->>Queue: Release Concurrency Slot

    Web->>API: Poll GET /api/v1/scans/:scanId
    API->>DB: Query Status & Progress (.lean() + .select())
    API-->>Web: Return { status: 'completed', progressPercentage: 100 }
    Web->>Web: Redirect to /scans/:scanId/report
    Web->>API: GET /api/v1/scans/:scanId/report
    API->>DB: Query Full Artifact Map
    API-->>Web: Return FullScanReport JSON (Compressed)
    Web->>User: Render Interactive Multi-Tab Dashboard
```

#### Diagram 3: Frontend-to-Backend Request Flow
```mermaid
flowchart LR
    subgraph Frontend ["Next.js Frontend (Port: 3000)"]
        Page["Page / Component"]
        ApiClient["api.ts (fetchJson)"]
    end

    subgraph SecurityShield ["API Gateway & Security Middleware"]
        Cors["CORS Check (Allowed Origins)"]
        Helmet["Helmet Security Headers"]
        RateLimit["Rate Limiter (General / Scan / AI)"]
        Timeout["30-Second Request Timeout"]
        BodyLimit["1MB Request Body Limit"]
        ZodValidator["Zod Payload Validator"]
    end

    subgraph Controllers ["Controllers & Handlers"]
        ScanController["Scan Controller"]
        ProjectController["Project Controller"]
    end

    subgraph Storage ["Database Layer"]
        MongooseLean["Mongoose (.lean() Queries)"]
        MongoDB[(MongoDB)]
    end

    Page --> ApiClient
    ApiClient -->|HTTP Request| Cors
    Cors --> Helmet --> RateLimit --> Timeout --> BodyLimit --> ZodValidator
    ZodValidator -->|Validated Request| ScanController & ProjectController
    ScanController & ProjectController --> MongooseLean --> MongoDB
```

#### Diagram 4: Static Analysis Pipeline
```mermaid
flowchart TD
    RawFiles["Input: Raw Repository Files [{ path, content, size }]"] --> Filter["Ingestion Filter (filterRepoFile)"]
    Filter -->|Exclude: vendor, lockfiles, secrets, >500KB| Skipped["Record Skipped Reason & Metric"]
    Filter -->|Accepted Source Files| LineCounter["Line Counter (countLinesOfCode)"]

    LineCounter --> LangStats["Compile LanguageStats & Metrics"]
    LineCounter --> TreeBuilder["Build FolderTree Structure"]

    Filter -->|Accepted Manifests & Configs| TechDetector["Technology Detector (detectTechnologies)"]
    TechDetector --> TechFindings["Identify Frameworks, Runtimes, ORMs, Tools"]

    Filter -->|Accepted JS / TS Files| SinglePassAST["Single-Pass AST Parser<br/>(ts.createSourceFile once per file)"]

    SinglePassAST --> RouteExtractor["Express Route Extractor<br/>(extractExpressRoutes)"]
    SinglePassAST --> ModelExtractor["Mongoose Model Extractor<br/>(extractMongooseModels)"]

    RouteExtractor --> RouteFindings["RouteFindings:<br/>- Method & Resolved Path<br/>- Router Mount Chains<br/>- Middleware Chains & Auth<br/>- Path Parameters<br/>- Status Codes"]
    ModelExtractor --> ModelFindings["DatabaseModelFindings:<br/>- Model & Collection Names<br/>- Field Types & Options<br/>- Relational References (ref)<br/>- Single & Compound Indexes"]

    RouteFindings & ModelFindings --> GraphBuilder["Architecture Graph Builder (buildArchitectureGraph)"]
    GraphBuilder --> GraphArtifact["ArchitectureGraphArtifact:<br/>- React Flow Nodes & Edges<br/>- Sanitized Mermaid Diagram"]

    RawFiles & RouteFindings --> SecurityScanner["Security Scanner (runSecurityScan)"]
    SecurityScanner --> SecretRedact["Secret Redaction (redactSecret)"]
    SecretRedact --> SecFindings["SecurityFindings:<br/>- Tracked Sensitive Files<br/>- Hardcoded Credentials<br/>- Dynamic eval() & child_process<br/>- Wildcard CORS<br/>- Unauthenticated Mutating Routes"]

    LangStats & TreeBuilder & TechFindings & RouteFindings & ModelFindings & GraphArtifact & SecFindings --> Aggregator["Compile AnalysisPipelineOutput"]
```

#### Diagram 5: Gemini AI Processing Flow
```mermaid
flowchart TD
    Start["Trigger: Static Analysis Complete"] --> ContextBuild["Construct RepositoryAnalysisContext:<br/>- Repo Name & Commit SHA<br/>- Discovered Endpoints (Top 15)<br/>- Discovered Models (Top 10)<br/>- Top Languages & Metrics<br/>- Security Observations (Top 5)"]

    ContextBuild --> CacheCheck{"Check In-Memory Cache<br/>(Key: commitSha:model)"}
    CacheCheck -->|Cache Hit| ReturnCached["Return Cached AISummaryArtifact (<1ms)"]

    CacheCheck -->|Cache Miss| KeyCheck{"Is GEMINI_API_KEY Configured?"}
    KeyCheck -->|No| Fallback["Invoke FallbackAIProvider<br/>(Deterministic Grounded Synthesis)"]

    KeyCheck -->|Yes| PromptBuild["Build Strict Grounded Prompt:<br/>- Declare Code as Passive Untrusted Data<br/>- Command Zero Fabrication<br/>- Demand Strict JSON Output"]

    PromptBuild --> GeminiCall["POST https://generativelanguage.googleapis.com/...<br/>(Header: x-goog-api-key, Timeout: 15s)"]
    GeminiCall --> HTTPCheck{"HTTP 200 OK?"}

    HTTPCheck -->|No / Timeout / Error| FallbackWarn["Log Warning -> Default to FallbackAIProvider"]
    FallbackWarn --> Fallback

    HTTPCheck -->|Yes| ParseJSON["Parse Raw JSON Response"]
    ParseJSON --> ZodValidate{"Validate against AISummaryResponseSchema"}

    ZodValidate -->|Validation Failure| Fallback
    ZodValidate -->|Validation Success| SaveCache["Store in summaryCache"]
    SaveCache --> ReturnAI["Return Validated AISummaryArtifact"]
    Fallback --> ReturnAI
```

#### Diagram 6: Database Relationships
```mermaid
erDiagram
    Project ||--o{ Scan : "has many"
    Scan ||--o{ ScanArtifact : "has many"
    Scan ||--o{ AIConversation : "has many"

    Project {
        ObjectId _id PK
        string owner "Indexed (compound unique with repo)"
        string repo "Indexed (compound unique with repo)"
        string canonicalUrl "Indexed"
        string displayName
        string defaultBranch
        Date createdAt "Indexed (-1)"
        Date updatedAt
    }

    Scan {
        ObjectId _id PK
        ObjectId projectId FK "Indexed (compound with commitSha, status)"
        string commitSha "Indexed (40-char git commit)"
        string requestedRevision "Branch or tag"
        string status "Indexed (queued | running | completed | failed | cancelled)"
        string stage "queued | validating | ... | completed | failed"
        number progressPercentage "0 to 100"
        string analyzerVersion "Default: 1.0.0"
        Date startedAt
        Date completedAt
        string errorMessage
        SummaryMetrics summaryMetrics "Embedded subdocument"
        Date createdAt "Indexed (-1)"
        Date updatedAt
    }

    ScanArtifact {
        ObjectId _id PK
        ObjectId scanId FK "Compound unique index with artifactType"
        string artifactType "statistics | technologies | endpoints | models | graph | security | tree | ai"
        Mixed data "Payload corresponding to contract"
        Date createdAt
    }

    AIConversation {
        ObjectId _id PK
        ObjectId scanId FK "Compound index with createdAt"
        string question "Sanitized user query"
        string answer "Grounded AI explanation"
        string[] referencedFiles "List of actual source file paths"
        Date createdAt "Indexed (-1)"
    }
```

#### Diagram 7: Background Scan Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Queued: User enqueues scan via POST /api/v1/scans
    Queued --> Validating: Worker slot allocated (10%)
    Validating --> ResolvingRevision: GitHub URL validated (20%)
    ResolvingRevision --> Running: Commit SHA resolved -> mark scan running
    Running --> FetchingTree: Git tree enumerated (35%)
    FetchingTree --> AnalyzingCode: Tree filtered & files downloaded (50%)
    AnalyzingCode --> GeneratingAIInsights: AST & Security analysis finished (70%)
    GeneratingAIInsights --> PersistingArtifacts: Summary generated (85%)
    PersistingArtifacts --> Completed: Artifacts saved concurrently (100%)
    Completed --> [*]

    Validating --> Failed: Malformed URL or non-GitHub domain
    ResolvingRevision --> Failed: Private repo or nonexistent branch
    FetchingTree --> Failed: GitHub rate limit or network abort
    AnalyzingCode --> Failed: 5-minute timeout guard expired
    GeneratingAIInsights --> Failed: Unrecoverable queue error
    Running --> Failed: Interrupted by server reboot (Reconciliation)
    Failed --> [*]
```

---

## 4. COMPLETE FEATURE INVENTORY

### 4.1 Repository Analysis & Ingestion
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **GitHub URL Validation** | Enforces `https:` protocol, restricts domain to `github.com` or `www.github.com`, parses `/:owner/:repo`, strips `.git`, rejects directory traversal (`..`) and null bytes. | `IMPLEMENTED` | [urlValidator.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/urlValidator.ts#L8-L70) |
| **SSRF-Safe Fetch (`safeFetch`)** | Rejects non-HTTPS schemes, enforces allowed host whitelist (`api.github.com`, `raw.githubusercontent.com`, `github.com`, `codeload.github.com`), enforces port 443, rejects embedded URL credentials, inspects HTTP redirects up to 3 hops, strips `Authorization` headers across domains, applies 10s request timeout. | `IMPLEMENTED` | [client.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L37-L107) |
| **Commit Resolution** | Queries `/repos/:owner/:repo/commits/:ref` to resolve user branch/tag or `HEAD` into an exact 40-character SHA hash for deterministic audit trails. | `IMPLEMENTED` | [client.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L157-L175) |
| **Git Tree Retrieval** | Enumerates full repository blob hierarchy via `/git/trees/:sha?recursive=1`. Warns if repository exceeds GitHub's 100,000 item limit (`truncated: true`). | `IMPLEMENTED` | [client.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L176-L195) |
| **File Filtering Engine** | Excludes vendor directories (`node_modules`, `dist`, `build`, `.next`, `vendor`, `.venv`), binary extensions (`.png`, `.exe`, `.zip`, `.pdf`, `.db`), lockfiles (`pnpm-lock.yaml`, `package-lock.json`), secret files (`.env*`, `.pem`, `id_rsa`, `credentials.json`), minified files, and files >500 KB. Caps scan at 2,000 files. | `IMPLEMENTED` | [filter.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/ingestion/filter.ts#L8-L132) |
| **Bounded Parallel Ingestion** | Fetches file contents from `raw.githubusercontent.com` using a configurable worker pool (default 8 concurrent workers) with `AbortSignal` propagation. Prioritizes manifests (`package.json`, `tsconfig.json`) first. | `IMPLEMENTED` | [scanQueue.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/jobs/scanQueue.ts#L169-L208) |
| **Language Line Counter** | Differentiates code, single-line comment, block comment, and blank lines across 30+ extensions (TypeScript, JS, Python, Go, Rust, Java, C/C++, C#, Ruby, PHP, SQL, HTML, CSS, YAML, Markdown). Computes percentage distribution. | `IMPLEMENTED` | [lineCounter.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/statistics/lineCounter.ts#L18-L132) |
| **Technology Detection** | Catalog matches package manifests and config files across frameworks (Express, Next.js, React, Vue, Fastify, NestJS, Koa), ORMs/Databases (Mongoose, Prisma, TypeORM, Sequelize, MongoDB, PostgreSQL, Redis), build tools (TypeScript, Tailwind, Docker, Vite, Webpack, Turbo), validation, and testing tools. | `IMPLEMENTED` | [detector.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/technologies/detector.ts#L10-L136) |
| **Hierarchical Folder Tree** | Reconstructs a nested directory tree with file sizes, detected languages, and line counts from flat path lists. Sorts folders first, then files alphabetically. | `IMPLEMENTED` | [folderTree.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/ingestion/folderTree.ts#L3-L64) |

### 4.2 API Discovery & AST Route Extraction
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Express Route Detection** | Traverses TypeScript AST to detect call expressions on `app.METHOD(path, ...)` and `router.METHOD(path, ...)`. Supports `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`, `ALL`. Suppresses non-Express callers (`map.get`, `cache.get`, `config.get`, `params.get`, `lodash`). | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L103-L219) |
| **Nested Router Prefix Chaining** | Tracks `app.use('/prefix', router)` and nested `apiRouter.use('/v1', userRouter)` across files via a multi-pass parent map, resolving combined paths (e.g. `/api/v1/users`). | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L228-L276) |
| **Middleware & Handler Extraction** | Traverses argument arrays and callbacks, identifies middleware chains, extracts handler function names, or flags anonymous handlers. | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L148-L166) |
| **Auth Middleware Detection** | Evaluates middleware names against security signatures (`auth`, `protect`, `requireauth`, `authenticate`, `verifytoken`, `jwtauth`, `passport.authenticate`). | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L37-L49), [L192-L201](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L192-L201) |
| **Path Parameter Extraction** | Detects parameterized URL patterns (`:id`, `:userId`) and records required route parameters with string typing. | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L278-L289) |
| **Status Code Inference** | Inspects handler AST children for `res.status(CODE)` calls; defaults to 201 for POST and 200 for other methods if unspecified. | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L168-L190) |
| **Dynamic Route Handling** | Flags dynamic route expressions (e.g. `app.get(config.prefix + '/test')`) with `unresolved` confidence and attaches diagnostic warnings. | `IMPLEMENTED` | [routeExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/express/routeExtractor.ts#L291-L312) |
| **Body Schema Inference** | Documented contract field `requestBodySchema` present in `RouteFinding`. | `PARTIALLY IMPLEMENTED` | [index.ts](file:///h:/Project/Repo-Analyzer/packages/shared/src/index.ts#L167) |

### 4.3 Database Analysis (Mongoose)
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Mongoose Schema Discovery** | Detects `new Schema({ ... })` and `new mongoose.Schema({ ... })`, recording line numbers and variable bindings. | `IMPLEMENTED` | [mongooseExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/database-models/mongooseExtractor.ts#L25-L49) |
| **Model Registration Discovery** | Discovers `mongoose.model('Name', schema)` and standalone `model('Name', schema)` declarations, binding schemas to model names. | `IMPLEMENTED` | [mongooseExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/database-models/mongooseExtractor.ts#L85-L150) |
| **Field Types & Options** | Extracts primitive types (`String`, `Number`, `Boolean`, `Date`), array wrappers (`Array`, `Subdocument[]`), and options: `required`, `unique`, `default`, `enum`. | `IMPLEMENTED` | [mongooseExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/database-models/mongooseExtractor.ts#L160-L235) |
| **Relational Reference Extraction** | Detects `ref: 'TargetModel'` on fields and embedded subdocuments, mapping `references` relationships. | `IMPLEMENTED` | [mongooseExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/database-models/mongooseExtractor.ts#L127-L136) |
| **Index Declaration Extraction** | Traverses `schema.index({ field: 1 }, { unique: true })` calls, parsing compound index directions and uniqueness constraints. | `IMPLEMENTED` | [mongooseExtractor.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/database-models/mongooseExtractor.ts#L51-L83) |
| **Prisma & TypeORM Schema Extraction** | Detects Prisma and TypeORM as technologies; does NOT parse `schema.prisma` or TypeORM entities into `DatabaseModelFinding` records. | `NOT IMPLEMENTED` | [detector.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/technologies/detector.ts#L23-L25) |

### 4.4 Architecture & Graph Generation
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Architecture Node & Edge Graph** | Synthesizes directed nodes (`route`, `router`, `controller`, `middleware`, `model`, `database`) and relationship edges (`calls`, `uses`, `queries`, `references`). Connects controllers to models by naming heuristics. | `IMPLEMENTED` | [graphBuilder.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/graph/graphBuilder.ts#L9-L131) |
| **Interactive React Flow UI** | Custom node component with method badges, file paths, type-colored borders, zoom controls, minimap, fullscreen toggle, search filter, and node type selectors. | `IMPLEMENTED` | [architecture-graph.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/components/architecture-graph.tsx#L38-L84), [L365-L397](file:///h:/Project/Repo-Analyzer/apps/web/src/components/architecture-graph.tsx#L365-L397) |
| **Mermaid Diagram Generation** | Generates valid `flowchart TD` text diagrams with escaped label quotes (`&quot;`), grouping API endpoints and Mongoose models into distinct subgraphs. | `IMPLEMENTED` | [graphBuilder.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/graph/graphBuilder.ts#L133-L161) |
| **Safe Mermaid Rendering** | Displays Mermaid syntax in a styled `<pre>` code block with one-click clipboard copying. Avoids dynamic client-side `mermaid.js` DOM injection to eliminate XSS vectors. | `IMPLEMENTED` | [architecture-graph.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/components/architecture-graph.tsx#L399-L410) |

### 4.5 Security Architecture & Static Scanning
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Secret Detection Patterns** | Pre-compiled regex patterns hoisted to module scope: AWS Access Keys (`AKIA...`), GitHub PATs (`ghp_...`), Stripe Live Keys (`sk_live_...`), OpenAI Keys (`sk-...`), Google API Keys (`AIza...`), Slack Tokens (`xoxb-...`), Private Keys (`BEGIN PRIVATE KEY`), MongoDB URIs with passwords, generic API keys. Filters placeholders (`process.env`, `your_api_key`). | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L13-L23), [L60-L94](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L60-L94) |
| **Secret Masking & Redaction** | `redactSecret` preserves first 3 and last 2 characters while masking middle tokens with asterisks (e.g. `AKIA************1A`). Cleartext secrets are never stored or transmitted. | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L5-L10) |
| **Tracked Secret File Detection** | Flags committed `.env`, `.env.production`, `.pem`, `.key`, `id_rsa`, `credentials.json` as high-severity observations. | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L32-L58) |
| **Dynamic Execution Detection** | Detects calls to `eval()` (high severity) and `child_process.exec`/`execSync` (medium severity). | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L96-L128) |
| **Insecure CORS Detection** | Detects wildcard origins (`origin: '*'`, `Access-Control-Allow-Origin: *`). | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L130-L146) |
| **Unauthenticated Mutating Routes** | Flags `POST`, `PUT`, `DELETE`, `PATCH` endpoints lacking detected auth middleware (excluding public `/login`, `/register`, `/auth`, `/health`, `/webhook`). | `IMPLEMENTED` | [securityScanner.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L149-L170) |
| **Path Traversal Protection** | Validates file paths in `fetchRawFile`: blocks null bytes (`\0`), normalizes backslashes, checks `..` before and after URL decoding, rejects directory traversal. | `IMPLEMENTED` | [client.ts](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L202-L226) |
| **HTTP Security Headers** | Express server mounts Helmet (`crossOriginResourcePolicy: 'cross-origin'`) and disables `x-powered-by`. | `IMPLEMENTED` | [server.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/server.ts#L13-L19) |
| **Multi-Tier Rate Limiting** | General API: 300 req/15min. Scan Creation: 15 req/15min. AI Queries: 30 req/15min. Standard headers enabled. | `IMPLEMENTED` | [routes/index.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/routes/index.ts#L24-L69) |
| **DoS Request Limits & Timeouts** | Express body parser limited to 1MB. Global 30-second request timeout returns HTTP 408. Scan execution capped at 5 minutes via `AbortController`. | `IMPLEMENTED` | [server.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/server.ts#L37-L53), [scanQueue.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/jobs/scanQueue.ts#L78-L82) |
| **Prompt Injection Protection** | AI prompt treats all repository code as passive untrusted data, forbids executing code instructions, bounds question input to 500 characters, strips control characters, validates responses via Zod. | `IMPLEMENTED` | [geminiProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L56-L88), [L101-L140](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L101-L140) |
| **User Authentication / RBAC** | No user login, JWT sessions, or role-based access control is implemented. API endpoints and scans are currently unauthenticated. | `NOT IMPLEMENTED` | [routes/index.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/routes/index.ts) |

### 4.6 Artificial Intelligence & Grounded Synthesis
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Google Gemini Integration** | Connects to `generativelanguage.googleapis.com` (model `gemini-2.5-flash`), passes API key in `x-goog-api-key` header, uses `temperature: 0.2` and `responseMimeType: 'application/json'`. | `IMPLEMENTED` | [geminiProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L143-L181) |
| **Structured Output Validation** | Zod schema `AISummaryResponseSchema` enforces string lengths, array minimums, and structured fields (`overview`, `keyFeatures`, `architectureOverview`, `moduleHighlights`, `suggestedExplorationPaths`, `securitySummary`). | `IMPLEMENTED` | [aiSchemas.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/schemas/aiSchemas.ts#L3-L24) |
| **Deterministic Fallback Provider** | `FallbackAIProvider` executes offline when `GEMINI_API_KEY` is omitted or API fails. Synthesizes coherent, grounded narratives based purely on discovered metrics and routes. | `IMPLEMENTED` | [fallbackProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/fallbackProvider.ts#L4-L77) |
| **Interactive Q&A Exploration** | Users ask questions about routes, models, or security; answers are synthesized from discovered facts and cite actual file paths and line numbers. | `IMPLEMENTED` | [geminiProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L48-L98), [fallbackProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/fallbackProvider.ts#L79-L117) |
| **In-Memory Response Caching** | Caches generated summaries by `commitSha:model` and answers by `commitSha:question`, preventing redundant token costs and latency. | `IMPLEMENTED` | [geminiProvider.ts](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L11-L12), [L29-L34](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L29-L34) |
| **Conversation Persistence** | User questions, AI answers, and referenced file paths are stored in MongoDB `ai_conversations` collection. | `IMPLEMENTED` | [scanController.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/controllers/scanController.ts#L324-L330) |

### 4.7 Web Application & User Experience
| Feature | Implementation Details | Status | Source References |
|---|---|:---:|---|
| **Landing Page** | Responsive input form with live URL regex validation, sample repository buttons (`expressjs/express`, `bulletproof-nodejs`, `node-express-mongoose-demo`), hero preview cards. | `IMPLEMENTED` | [page.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/app/page.tsx#L22-L130) |
| **Scan Creation & Enqueue** | Submits scan to backend, handles existing active scans gracefully, redirects to progress page. | `IMPLEMENTED` | [page.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/app/page.tsx#L45-L64) |
| **Scan Progress Polling** | Polls `/api/v1/scans/:scanId` every 1.5s with exponential backoff on error; displays stage checklist, progress percentage bar, and auto-redirects on completion. | `IMPLEMENTED` | [scans/[scanId]/page.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/app/scans/%5BscanId%5D/page.tsx#L58-L97) |
| **Full Report Dashboard** | Multi-tab dashboard: Overview, Statistics, Technologies, API Endpoints, Data Models, Architecture Graph, File Tree, Security Audit, AI Assistant. | `IMPLEMENTED` | [report/page.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/app/scans/%5BscanId%5D/report/page.tsx#L42-L519) |
| **Windowed API Explorer** | Progressive pagination rendering 50 endpoints per view with a "Show more" button to ensure smooth 60fps scrolling on large repositories. | `IMPLEMENTED` | [api-explorer.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/components/api-explorer.tsx#L70-L100) |
| **Project & History Catalog** | Displays previously analyzed repositories with scan count badges, creation timestamps, direct report links, and cascading project deletion. | `IMPLEMENTED` | [projects/page.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/app/projects/page.tsx#L35-L150) |
| **Theme System** | Seamless Dark / Light / System theme provider with CSS variable switching and `localStorage` persistence. | `IMPLEMENTED` | [theme-provider.tsx](file:///h:/Project/Repo-Analyzer/apps/web/src/components/theme-provider.tsx#L16-L88) |

---

## 5. COMPLETE API DOCUMENTATION

All endpoints are mounted under the base path `/api/v1`.

### 5.1 System Health
```http
GET /api/v1/health
```
- **Purpose**: System diagnostics, database connection status, and AI provider availability check.
- **Authentication**: None.
- **Rate Limit**: 300 req / 15 min (General Limiter).
- **Controller**: Inline handler in `apps/api/src/routes/index.ts`.
- **Response Format**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-11-02T13:15:30.000Z",
    "database": "connected",
    "aiProvider": "google-gemini",
    "geminiConfigured": true
  },
  "error": null
}
```

---

### 5.2 Create / Enqueue Scan
```http
POST /api/v1/scans
```
- **Purpose**: Validates repository URL and enqueues a background analysis job.
- **Authentication**: None.
- **Rate Limit**: 15 req / 15 min (Scan Create Limiter).
- **Request Body (JSON)**:
```json
{
  "repoUrl": "https://github.com/expressjs/express",
  "branch": "master"
}
```
- **Validation**: `CreateScanRequestSchema` (Zod): URL must be valid, hostname must be `github.com`, path must be `/:owner/:repo`, branch max 100 characters.
- **Controller**: `createScan` in `apps/api/src/controllers/scanController.ts`.
- **Response (202 Accepted)**:
```json
{
  "success": true,
  "data": {
    "scanId": "6724da1c8f12a34b5c678901",
    "status": "queued",
    "stage": "queued",
    "progressPercentage": 0,
    "message": "Scan has been successfully enqueued."
  },
  "error": null
}
```
- **Response (200 OK — Active Scan Exists)**:
```json
{
  "success": true,
  "data": {
    "scanId": "6724da1c8f12a34b5c678901",
    "status": "running",
    "stage": "analyzing_code",
    "progressPercentage": 50,
    "message": "An analysis scan is already in progress for this repository."
  },
  "error": null
}
```
- **Error Responses**:
  - `400 Bad Request`: `{ "success": false, "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Must be a valid public GitHub repository URL..." } }`
  - `429 Too Many Requests`: Rate limit exceeded.

---

### 5.3 Get Scan Status
```http
GET /api/v1/scans/:scanId
```
- **Purpose**: Lightweight progress polling endpoint for scan progress page.
- **Authentication**: None.
- **Rate Limit**: 300 req / 15 min.
- **Optimizations**: Uses `.lean()` and `.select('_id status stage progressPercentage commitSha errorMessage startedAt completedAt summaryMetrics')`.
- **Controller**: `getScanStatus` in `apps/api/src/controllers/scanController.ts`.
- **Response Format**:
```json
{
  "success": true,
  "data": {
    "scanId": "6724da1c8f12a34b5c678901",
    "status": "completed",
    "stage": "completed",
    "progressPercentage": 100,
    "commitSha": "e4d3a2b1c09876543210fedcba0123456789abcd",
    "errorMessage": null,
    "startedAt": "2026-11-02T13:16:00.000Z",
    "completedAt": "2026-11-02T13:16:08.500Z",
    "summaryMetrics": {
      "totalFiles": 48,
      "analyzedFiles": 32,
      "skippedFiles": 16,
      "totalLines": 5420,
      "codeLines": 4100,
      "blankLines": 680,
      "commentLines": 640,
      "endpointCount": 18,
      "modelCount": 4,
      "securityFindingsCount": 2
    }
  },
  "error": null
}
```

---

### 5.4 Get Full Scan Report
```http
GET /api/v1/scans/:scanId/report
```
- **Purpose**: Retrieves the complete aggregated report containing all artifacts for dashboard rendering.
- **Authentication**: None.
- **Rate Limit**: 300 req / 15 min.
- **Controller**: `getScanReport` in `apps/api/src/controllers/scanController.ts`.
- **Response Format**: Returns `FullScanReport` object containing:
  - `scan`: Scan metadata.
  - `project`: Project metadata.
  - `statistics`: Line counts, language breakdown, largest files.
  - `technologies`: Array of detected frameworks, runtimes, and tools.
  - `endpoints`: Discovered Express.js routes.
  - `databaseModels`: Discovered Mongoose schemas.
  - `architectureGraph`: React Flow nodes and edges, Mermaid syntax.
  - `securityFindings`: Redacted static vulnerability findings.
  - `folderTree`: Reconstructed directory hierarchy.
  - `aiSummary`: Grounded Gemini/fallback summary.

---

### 5.5 Get Granular Scan Artifacts
The API exposes individual artifact sub-resources for modular fetching:
- `GET /api/v1/scans/:scanId/stats` &rarr; `statistics` artifact.
- `GET /api/v1/scans/:scanId/technologies` &rarr; `technologies` artifact.
- `GET /api/v1/scans/:scanId/endpoints` &rarr; `endpoints` artifact.
- `GET /api/v1/scans/:scanId/architecture` &rarr; `architecture_graph` artifact.
- `GET /api/v1/scans/:scanId/folder-tree` &rarr; `folder_tree` artifact.
- `GET /api/v1/scans/:scanId/models` &rarr; `database_models` artifact.
- `GET /api/v1/scans/:scanId/security` &rarr; `security_findings` artifact.
- **Controller**: `getScanArtifactByType(type)` closure in `apps/api/src/controllers/scanController.ts`.

---

### 5.6 Grounded AI Q&A Exploration
```http
POST /api/v1/scans/:scanId/ai/explain
```
- **Purpose**: Submit a natural language question about the repository; receives an answer strictly grounded in static facts with referenced file paths.
- **Authentication**: None.
- **Rate Limit**: 30 req / 15 min (AI Query Limiter).
- **Request Body (JSON)**:
```json
{
  "question": "How are database models configured and what relationships exist?"
}
```
- **Validation**: `AIExplainRequestSchema`: string, min 3 chars, max 500 chars.
- **Controller**: `explainScanAI` in `apps/api/src/controllers/scanController.ts`.
- **Response Format**:
```json
{
  "success": true,
  "data": {
    "answer": "The repository defines 2 Mongoose models: User and Post. The Post model in src/models/Post.ts references the User model via the 'author' field (Schema.Types.ObjectId, ref: 'User'). Indexes are declared on email (unique) and createdAt.",
    "referencedFiles": [
      "src/models/User.ts",
      "src/models/Post.ts"
    ]
  },
  "error": null
}
```

---

### 5.7 Project Catalog & History Endpoints
- `GET /api/v1/projects` &rarr; Lists up to 50 most recently analyzed projects.
- `GET /api/v1/projects/:projectId` &rarr; Retrieves project details by MongoDB ObjectId.
- `GET /api/v1/projects/:projectId/scans` &rarr; Retrieves historical scan runs for a project.
- `DELETE /api/v1/projects/:projectId` &rarr; Executes cascading deletion of the project, all associated scans, all scan artifacts, and AI conversations.
- **Controller**: `projectController.ts`.

---

## 6. DATABASE DOCUMENTATION & SCHEMA ARCHITECTURE

### 6.1 Database Collections

#### 1. `projects` Collection
Defined in [Project.ts](file:///h:/Project/Repo-Analyzer/packages/database/src/models/Project.ts).
- `owner` (`String`, required, lowercase, trim)
- `repo` (`String`, required, lowercase, trim)
- `canonicalUrl` (`String`, required, trim)
- `displayName` (`String`, required, trim, e.g. "expressjs/express")
- `defaultBranch` (`String`, trim, default: 'main')
- `createdAt` (`Date`, managed by timestamps)
- `updatedAt` (`Date`, managed by timestamps)
- **Indexes**:
  - `{ owner: 1, repo: 1 }` (**Unique compound index**)
  - `{ canonicalUrl: 1 }` (Index)
  - `{ createdAt: -1 }` (Index)

#### 2. `scans` Collection
Defined in [Scan.ts](file:///h:/Project/Repo-Analyzer/packages/database/src/models/Scan.ts).
- `projectId` (`ObjectId`, ref: `'Project'`, required)
- `commitSha` (`String`, required, trim)
- `requestedRevision` (`String`, trim)
- `status` (`String`, enum: `['queued', 'running', 'completed', 'failed', 'cancelled']`, default: `'queued'`)
- `stage` (`String`, enum: `['queued', 'validating', 'resolving_revision', 'fetching_tree', 'analyzing_code', 'generating_ai_insights', 'completed', 'failed']`, default: `'queued'`)
- `progressPercentage` (`Number`, min: 0, max: 100, default: 0)
- `analyzerVersion` (`String`, default: `'1.0.0'`)
- `startedAt` (`Date`)
- `completedAt` (`Date`)
- `errorMessage` (`String`)
- `summaryMetrics` (`Subdocument`, non-indexed metrics: `totalFiles`, `analyzedFiles`, `skippedFiles`, `totalLines`, `codeLines`, `endpointCount`, `modelCount`, `securityFindingsCount`)
- `createdAt` (`Date`, managed by timestamps)
- `updatedAt` (`Date`, managed by timestamps)
- **Indexes**:
  - `{ projectId: 1, commitSha: 1 }` (Compound index)
  - `{ projectId: 1, status: 1 }` (Compound index for deduplicating active scans)
  - `{ createdAt: -1 }` (Index)

#### 3. `scan_artifacts` Collection
Defined in [ScanArtifact.ts](file:///h:/Project/Repo-Analyzer/packages/database/src/models/ScanArtifact.ts).
- `scanId` (`ObjectId`, ref: `'Scan'`, required)
- `artifactType` (`String`, enum: `['statistics', 'technologies', 'endpoints', 'database_models', 'architecture_graph', 'security_findings', 'folder_tree', 'ai_summary']`, required)
- `data` (`Schema.Types.Mixed`, required)
- `createdAt` (`Date`, managed by timestamps)
- **Indexes**:
  - `{ scanId: 1, artifactType: 1 }` (**Unique compound index**)

#### 4. `ai_conversations` Collection
Defined in [AIConversation.ts](file:///h:/Project/Repo-Analyzer/packages/database/src/models/AIConversation.ts).
- `scanId` (`ObjectId`, ref: `'Scan'`, required)
- `question` (`String`, required, trim)
- `answer` (`String`, required)
- `referencedFiles` (`[String]`, default: `[]`)
- `createdAt` (`Date`, managed by timestamps)
- **Indexes**:
  - `{ scanId: 1, createdAt: -1 }` (Compound index)

### 6.2 Database Performance & Scalability Review
- **16MB BSON Document Limit Avoidance**: By storing granular payloads in `scan_artifacts` rather than embedding them inside the `scans` document, scan documents remain extremely small (<2 KB), and individual artifacts can scale independently.
- **Missing Index Checks**: All foreign keys (`projectId`, `scanId`) and query filters (`owner + repo`, `projectId + status`, `createdAt`) have explicit indexes.
- **N+1 Query Elimination**: All scan artifact lookups query `ScanArtifact.find({ scanId: scan._id })` in a single query rather than making separate queries per artifact type.
- **Lean Execution**: All read queries across `projectController` and `scanController` apply `.lean()` to avoid Mongoose document instantiation overhead.
- **Unbounded Growth**: While cascading deletion handles manual project cleanups, there is currently no automatic TTL (Time-To-Live) index on historical scans or artifacts. For high-volume production, a TTL index or retention worker should be introduced.

---

## 7. ENVIRONMENT VARIABLES AND CONFIGURATION

> [!IMPORTANT]
> **No actual secrets, real API keys, or live credentials are documented.** All entries below are placeholders and variable specifications derived from `.env.example` and [config/index.ts](file:///h:/Project/Repo-Analyzer/apps/api/src/config/index.ts).

| Variable Name | Purpose | Required? | Consumed By | Example / Default | Security Considerations |
|---|---|:---:|---|---|---|
| `PORT` | HTTP port on which the Express API server listens | Optional | `apps/api` | `4000` | Standard non-privileged port. Must be between 1 and 65535. |
| `NODE_ENV` | Application environment mode | Optional | All | `production` (`development` \| `test` \| `production`) | Production mode suppresses stack traces and enforces config validation. |
| `CORS_ORIGIN` | Allowed Cross-Origin Resource Sharing domain(s) | Optional | `apps/api` | `http://localhost:3000` | In production, must be set to the frontend domain. Never set to `*` in production. |
| `MONGODB_URI` | MongoDB connection connection string | **Required** | `apps/api`, `packages/database` | `mongodb://localhost:27017/repo-analyzer` | Contains database user credentials. Server logs automatically redact passwords. |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Optional | `apps/api`, `packages/analyzer` | `ghp_placeholderTokenForRateLimits` | Increases GitHub API rate limits from 60 req/hr to 5,000 req/hr. Stored only in backend memory. |
| `GEMINI_API_KEY` | Google Gemini API Secret Key | Optional | `apps/api`, `packages/ai` | `AIzaSyPlaceholderGeminiKey` | If omitted, system defaults to deterministic fallback provider without error. |
| `GEMINI_MODEL` | Gemini Model identifier | Optional | `apps/api`, `packages/ai` | `gemini-2.5-flash` | Defaults to fast, low-latency flash model. |
| `MAX_CONCURRENT_SCANS` | Maximum concurrent background scans | Optional | `apps/api` | `2` (Bounded between 1 and 10) | Prevents worker CPU and memory starvation on the host server. |
| `FILE_INGESTION_CONCURRENCY` | Worker concurrency for raw file downloads | Optional | `apps/api`, `packages/analyzer` | `8` (Bounded between 1 and 20) | High-throughput concurrent file fetching without exceeding socket limits. |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API for client requests | **Required (Web)** | `apps/web` | `http://localhost:4000` | Exposed to browser bundle. Points to public Express API endpoint. |

---

## 8. SECURITY ARCHITECTURE & THREAT MODEL

### 8.1 Implemented Defenses
1. **SSRF Defense (`safeFetch`)**:
   - Strictly validates destination hostname against a hardcoded whitelist (`api.github.com`, `raw.githubusercontent.com`, `github.com`, `codeload.github.com`).
   - Blocks private IP ranges (e.g. `169.254.169.254`, `127.0.0.1`, `localhost`).
   - Enforces default HTTPS port 443; rejects non-standard ports (e.g. `:8443`, `:27017`).
   - Blocks URLs containing embedded credentials (`https://user:pass@...`).
   - Manual redirect handling: stops after 3 hops and strips `Authorization` headers across domains.
   - Evidence: [client.ts:L37-L107](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L37-L107), verified in [securityHardening.test.ts:L6-L42](file:///h:/Project/Repo-Analyzer/tests/securityHardening.test.ts#L6-L42).
2. **Directory & Path Traversal Prevention**:
   - `fetchRawFile` rejects null-byte characters (`\0`).
   - Rejects directory traversal sequences (`..`) in both raw and URL-decoded forms.
   - Encodes individual path segments before constructing raw CDN URLs.
   - Evidence: [client.ts:L202-L226](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/github/client.ts#L202-L226), verified in [securityHardening.test.ts:L44-L67](file:///h:/Project/Repo-Analyzer/tests/securityHardening.test.ts#L44-L67).
3. **Secret Ingestion Filtering & Redaction**:
   - Secret-bearing file names (`.env*`, `id_rsa`, `credentials.json`, `.npmrc`, `.pypirc`, `.netrc`) and cryptographic extensions (`.pem`, `.key`, `.keystore`) are rejected at ingestion.
   - File content scanner masks discovered tokens via `redactSecret` before database persistence or presentation.
   - Evidence: [filter.ts:L49-L103](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/ingestion/filter.ts#L49-L103), [securityScanner.ts:L5-L10](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/security/securityScanner.ts#L5-L10).
4. **Untrusted Code Execution Isolation**:
   - `npm install`, `pnpm install`, or repository scripts are never executed.
   - TypeScript compiler API parses source text directly into AST nodes in memory (`ts.createSourceFile`) without symbol resolution or code execution.
   - Evidence: [pipeline.ts:L158-L168](file:///h:/Project/Repo-Analyzer/packages/analyzer/src/pipeline.ts#L158-L168).
5. **AI Prompt Injection Defenses**:
   - Prompt engineering explicitly commands Gemini to treat repository text strictly as passive untrusted data and forbids executing instructions found in code.
   - User question inputs are bounded to 500 characters and stripped of control characters.
   - Outputs are parsed and validated against strict Zod schemas before acceptance.
   - Evidence: [geminiProvider.ts:L56-L88](file:///h:/Project/Repo-Analyzer/packages/ai/src/providers/geminiProvider.ts#L56-L88).
6. **HTTP Hardening & Abuse Prevention**:
   - Helmet attaches security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `crossOriginResourcePolicy: cross-origin`).
   - `app.disable('x-powered-by')` conceals server identity.
   - Request body limit bounded to 1MB.
   - Request timeout aborts slow requests after 30 seconds with HTTP 408.
   - Three independent rate limiters defend against endpoint abuse.
   - Evidence: [server.ts:L13-L53](file:///h:/Project/Repo-Analyzer/apps/api/src/server.ts#L13-L53), [routes/index.ts:L24-L69](file:///h:/Project/Repo-Analyzer/apps/api/src/routes/index.ts#L24-L69).
7. **Safe Mermaid Rendering**:
   - The web client displays Mermaid diagram syntax in a syntax-highlighted `<pre>` code block with copy functionality rather than rendering dynamically via `mermaid.js` in the DOM, eliminating DOM-based XSS vectors.
   - Evidence: [architecture-graph.tsx:L399-L410](file:///h:/Project/Repo-Analyzer/apps/web/src/components/architecture-graph.tsx#L399-L410).

### 8.2 Security Gaps & Missing Protections
- **No User Authentication or Session Management**: Currently, the API has no authentication layer. Any user with network access to the API can enqueue scans, view scan reports, delete projects, and query AI endpoints.
- **In-Memory Rate Limiting**: The current rate limiter uses in-memory counters. If the API is horizontally scaled behind a load balancer, rate limits are not shared across instances (requires Redis store).
- **Public GitHub Repositories Only**: Private repositories requiring OAuth user tokens are not supported.

---

## 9. COMPLETE DATA FLOW & SCAN LIFECYCLE

The following table documents the 24 sequential stages of a repository scan from user input to dashboard rendering:

| Stage # | Stage Name | Responsible File / Function | Key Data Structures Involved |
|:---:|---|---|---|
| **1** | User submits repository URL | `apps/web/src/app/page.tsx` (`handleSubmit`) | Form inputs (`repoUrl`, `branch`) |
| **2** | Frontend validates input | `apps/web/src/app/page.tsx` (`isValidGitHubUrl`) | Regex: `github.com/:owner/:repo` |
| **3** | Backend receives request | `apps/api/src/server.ts` & `routes/index.ts` | HTTP POST `/api/v1/scans` payload |
| **4** | Server validates URL & payload | `packages/analyzer/src/github/urlValidator.ts` | `CreateScanRequestSchema`, `ParsedGitHubUrl` |
| **5** | Project lookup / creation | `apps/api/src/controllers/scanController.ts` | `Project` Mongoose model |
| **6** | Active scan check & deduplication | `apps/api/src/controllers/scanController.ts` | `Scan.findOne({ status: { $in: ['queued', 'running'] } })` |
| **7** | Scan record creation | `apps/api/src/controllers/scanController.ts` | `Scan` document (`status: 'queued'`) |
| **8** | Enqueue in background runner | `apps/api/src/jobs/scanQueue.ts` (`enqueue`) | `ScanJob` interface |
| **9** | Client receives 202 Accepted | `apps/api/src/controllers/scanController.ts` | Returns `{ scanId, status: 'queued' }` |
| **10** | Worker starts & updates progress | `scanQueue.ts` (`performScanPipeline`) | Stage: `'validating'` (10%) |
| **11** | Revision resolution via GitHub API | `packages/analyzer/src/github/client.ts` (`resolveCommitSha`) | Git commit SHA (40 chars), Stage: `'resolving_revision'` (20%) |
| **12** | Git tree retrieval | `client.ts` (`getGitTree`) | `GitHubTreeResult`, `GitTreeItem[]`, Stage: `'fetching_tree'` (35%) |
| **13** | Ingestion file filtering | `packages/analyzer/src/ingestion/filter.ts` (`filterRepoFile`) | `FileFilterResult` (rejects vendor, lockfiles, secrets) |
| **14** | Bounded parallel file download | `scanQueue.ts` (concurrency pool of 8 workers) | `RawRepoFile[]` (manifests prioritized first) |
| **15** | Single-pass AST parsing | `packages/analyzer/src/pipeline.ts` | `ts.createSourceFile`, Stage: `'analyzing_code'` (70%) |
| **16** | Express route extraction | `packages/analyzer/src/express/routeExtractor.ts` | `RouteFinding[]`, router prefix map |
| **17** | Mongoose schema extraction | `packages/analyzer/src/database-models/mongooseExtractor.ts` | `DatabaseModelFinding[]`, field options, indexes |
| **18** | Language line counting & metrics | `packages/analyzer/src/statistics/lineCounter.ts` | `StatisticsArtifact`, `LanguageStat[]` |
| **19** | Technology detection | `packages/analyzer/src/technologies/detector.ts` | `TechnologyFinding[]` catalog match |
| **20** | Static security audit & redaction | `packages/analyzer/src/security/securityScanner.ts` | `SecurityFinding[]`, `redactSecret` |
| **21** | Architecture graph generation | `packages/analyzer/src/graph/graphBuilder.ts` | `ArchitectureGraphArtifact` (nodes, edges, Mermaid) |
| **22** | Grounded AI synthesis | `packages/ai/src/providers/geminiProvider.ts` / `fallbackProvider.ts` | `AISummaryArtifact`, Stage: `'generating_ai_insights'` (85%) |
| **23** | Concurrent artifact persistence | `scanQueue.ts` (`Promise.all(ScanArtifact.findOneAndUpdate)`) | 8 rows saved in `scan_artifacts` collection |
| **24** | Scan completion & dashboard rendering | `scanQueue.ts` -> `apps/web/src/app/scans/[scanId]/report/page.tsx` | Scan marked completed (100%), client fetches `FullScanReport` |

---

## 10. TESTING DOCUMENTATION & VERIFICATION RESULTS

### 10.1 Test Framework & Execution
- **Framework:** Node.js native test runner (`node:test` + `node:assert/strict`) executed via `tsx`.
- **Command to Run Tests:** `pnpm test` (or `npm test`).
- **Test File Pattern:** `tests/**/*.test.ts`.

### 10.2 Automated Test Inventory (31 Test Cases Across 15 Suites)
1. **`tests/advancedExpress.test.ts`**:
   - Suppresses false positives on non-Express callers (`map.get`, `cache.get`, `config.get`, `params.get`).
   - Discovers multiple HTTP methods (`PUT`, `DELETE`, `PATCH`) and parameterized routes.
2. **`tests/advancedMongoose.test.ts`**:
   - Parses complex schema validation constraints, embedded enums, and compound indexes.
3. **`tests/advancedStatistics.test.ts`**:
   - Handles empty files without NaN errors.
   - Accurately parses HTML comment blocks (`<!-- -->`).
   - Accurately parses SQL comments (`--` and `/* */`).
4. **`tests/apiIntegration.test.ts`**:
   - Validates input payloads strictly using Zod (`CreateScanRequestSchema`, `AIExplainRequestSchema`).
   - Verifies `FallbackAIProvider` reliably produces complete grounded summaries without live API keys.
5. **`tests/databaseReliability.test.ts`**:
   - Asserts `ScanStatusEnum` and `ScanStageEnum` validate valid lifecycle transitions.
6. **`tests/expressExtractor.test.ts`**:
   - Extracts routes, response status codes, and HTTP methods on basic fixtures.
   - Resolves multi-level nested router mount prefixes and auth middleware.
7. **`tests/extendedSecurity.test.ts`**:
   - Verifies security scanner detects multiple vulnerability categories on complex fixtures.
8. **`tests/geminiProvider.test.ts`**:
   - Verifies `FallbackAIProvider` generates valid structured schemas conforming to Zod.
   - Verifies `GeminiProvider` gracefully defaults to fallback when no API key is configured.
   - Verifies `GeminiProvider` prompt builder strictly grounds facts without leaking raw credentials.
9. **`tests/lineCounter.test.ts`**:
   - Counts TypeScript code, comments, and blank lines accurately.
   - Accurately handles Python hash comments (`#`) and docstrings (`"""`).
10. **`tests/mongooseExtractor.test.ts`**:
    - Discovers models, fields, options, foreign references, and indexes on fixture.
11. **`tests/performanceOptimizations.test.ts`**:
    - Verifies single-pass AST reuse across Route and Mongoose extractors.
    - Verifies `AbortSignal` cancellation propagation in `GitHubClient`.
    - Verifies in-memory caching of Gemini summaries and questions.
12. **`tests/pipeline.test.ts`**:
    - End-to-end integration test of the analysis pipeline producing all 8 artifacts.
13. **`tests/securityHardening.test.ts`**:
    - Verifies `safeFetch` blocks SSRF to unapproved domains, localhost, metadata IPs, non-standard ports, and non-HTTPS protocols.
    - Verifies `fetchRawFile` rejects directory traversal (`..`, `%2e%2e`, null bytes).
    - Verifies `filterRepoFile` excludes sensitive files (`.env`, `id_rsa`, `.pem`, `credentials.json`).
14. **`tests/securityScanner.test.ts`**:
    - Verifies sensitive string redaction (`redactSecret`).
    - Verifies detection of hardcoded keys (AWS, Stripe, OpenAI, Slack, Mongo URIs).
15. **`tests/urlValidator.test.ts`**:
    - Accepts valid public GitHub URLs.
    - Rejects non-GitHub hostnames, GitLab, internal IPs, and malformed paths.

### 10.3 Monorepo Operational Commands
| Action | Command | Description |
|---|---|---|
| **Development** | `pnpm dev` | Starts Turborepo dev servers for API (port 4000) and Web (port 3000) |
| **Production Build** | `pnpm build` | Compiles all TypeScript packages and creates Next.js production build |
| **Run Tests** | `pnpm test` | Runs the 31 automated tests via `tsx --test` |
| **Code Formatting** | `pnpm format` | Runs Prettier across all `.ts`, `.tsx`, `.json`, `.md` files |
| **Linting** | `pnpm lint` | Runs Turborepo workspace linting |
| **Docker Compose** | `docker compose up --build` | Boots local MongoDB 7.0 container and API server |

---

## 11. PERFORMANCE, SCALABILITY & RESOURCE BOUNDARIES

### 11.1 Benchmark Results (Real-World Repositories)
The analyzer was benchmarked against 6 public repositories of varying scale (documented in `docs/REAL_WORLD_TESTING.md`):
- `expressjs/body-parser`: Ingested & analyzed in **1.9s** (0 endpoints, 1 middleware finding).
- `santiq/bulletproof-nodejs`: Ingested & analyzed in **3.2s** (14 nested Express endpoints, 3 Mongoose models).
- `expressjs/express`: Ingested & analyzed in **4.1s** (182 framework routes, zero memory bloat).
- `madhums/node-express-mongoose-demo`: Ingested & analyzed in **2.8s** (3 Mongoose models: User, Article, Comment).
- `pillarjs/router`: Ingested & analyzed in **2.1s** (flags dynamic routes as unresolved without crashes).
- `fastify/fastify`: Ingested & analyzed in **3.8s** (correctly reports 0 Express endpoints).

### 11.2 Key Bottlenecks & Mitigations
1. **GitHub API Rate Limits**: Unauthenticated GitHub API calls are limited to 60 req/hr per IP. Setting `GITHUB_TOKEN` increases this to 5,000 req/hr.
2. **File Download Latency**: Replaced sequential downloads with a bounded concurrent worker pool (default 8 workers), reducing download time by 84%.
3. **AST Parser Memory**: Single-pass AST parsing (`ts.createSourceFile` executed once per file and shared between `extractExpressRoutes` and `extractMongooseModels`) reduced compiler memory allocations by 50%.
4. **Status Polling Query Load**: Status polling applies `.select()` projection and `.lean()` execution, returning small payloads (<500 bytes) without document instantiation overhead.
5. **Frontend Virtualization**: The API Explorer uses windowed pagination (50 items per view) with progressive loading to prevent DOM freezing on repositories with 100+ endpoints.

---

## 12. KNOWN LIMITATIONS AND TECHNICAL DEBT

1. **Express-Centric Route Discovery**: The AST route extractor is tailored to Express.js. Other backend frameworks (Fastify, NestJS, Koa, Django, Spring Boot, Go Gin) are detected as technologies, but their routes are not parsed into `RouteFinding` entities.
2. **Mongoose-Centric Database Discovery**: The database model extractor targets Mongoose (`new Schema`, `mongoose.model`). Repositories using Prisma (`schema.prisma`), TypeORM, or Sequelize are identified in technology detection, but individual entity fields and indexes are not extracted.
3. **Dynamic Route Registration**: Dynamic route loops (e.g. `routes.forEach(r => app[r.method](...))`) cannot be resolved statically and are flagged as `unresolved`.
4. **In-Memory Scan Queue**: The scan queue currently resides in the Express server's memory. While interrupted scans are reconciled on restart, horizontal multi-server scaling requires migrating the queue to Redis (e.g. BullMQ).
5. **No User Authentication / Multi-Tenancy**: The application does not feature user accounts, OAuth authentication, or multi-tenant authorization boundaries.
6. **No Automatic Database Retention (TTL)**: MongoDB documents persist indefinitely unless deleted via `DELETE /api/v1/projects/:projectId`. A production deployment should introduce an automated TTL index on historical scans.

---

## 13. INSTRUCTIONS FOR CLAUDE — INDEPENDENT PROJECT AUDIT

> [!IMPORTANT]
> **Instructions for Claude:**  
> You must perform an independent, evidence-based audit of the actual repository code. Do not take this context document as infallible ground truth; inspect the code directly to verify assertions.

### 13.1 Audit Dimensions
Your independent audit must systematically inspect and evaluate the following 20 dimensions:

1. **Security Vulnerabilities**: SSRF, path traversal, command injection, prototype pollution, regex denial of service (ReDoS).
2. **Authentication & Authorization**: Assessment of the current unauthenticated state and exposure risks for public deployments.
3. **API Correctness**: Verify all Express route handlers against their declared schemas, error handling, and status codes.
4. **Backend Bugs & Edge Cases**: Potential unhandled promise rejections, missing null checks, uncaught exceptions in async pipelines.
5. **Frontend Bugs & React Lifecycle**: Next.js 15 App Router compatibility, React 19 hook safety, memory leaks in intervals or event listeners.
6. **Feature Completeness**: Verify actual implementation status against claims (distinguish implemented vs proposed).
7. **Database Integrity & Cascades**: Verify Mongoose schemas, compound indexes, cascading deletion correctness, and transaction safety.
8. **Race Conditions**: Ingestion concurrency, queue worker race conditions, duplicate scan initialization edge cases.
9. **Performance Bottlenecks**: High-CPU AST traversal, redundant network roundtrips, large JSON payload serialization.
10. **Memory Leaks**: Long-lived closures, un-cleared timeouts in scan queue, growing in-memory cache maps.
11. **Error Handling**: Graceful degradation when GitHub API or Gemini API fails, network timeouts, or invalid payloads are submitted.
12. **Data Validation**: Strictness and coverage of Zod schemas across inputs, outputs, and configuration.
13. **AI Hallucination & Grounding**: Validate whether prompts strictly constrain Gemini to verified static facts.
14. **Prompt Injection Resilience**: Test whether adversarial repository content (comments, READMEs) could hijack LLM output.
15. **GitHub API Abuse & Rate Limits**: Token leakage prevention, rate limit header handling, tree truncation diagnostics.
16. **SSRF & File Access Security**: Verify `safeFetch` hostname checks, redirect hop limits, port restrictions, path sanitization.
17. **Scalability**: Evaluate barriers to horizontal scaling (in-process queue, in-memory rate limiting, in-memory AI caches).
18. **Accessibility (a11y)**: Screen reader attributes, keyboard navigability, semantic HTML, color contrast in dark/light modes.
19. **Responsive UI**: Mobile layout responsiveness, touch handling, drawer navigation on small viewports.
20. **Production Readiness**: Docker container security (non-root user), health checks, logging sanitation, error masking.

---

### 13.2 Issue Reporting Standard
For every issue, defect, or vulnerability discovered during your independent audit, report it strictly using the following structured format:

```markdown
### [ISSUE-ID]: Issue Title Descriptive Summary

- **Severity:** [Critical | High | Medium | Low | Informational]
- **Affected File & Line:** `path/to/file.ts#L12-L34`
- **Category:** [Security | Correctness | Performance | Scalability | Architecture | Frontend]
- **Exact Root Cause:** Detailed technical explanation of what in the code causes this issue.
- **Reproduction Scenario:** Step-by-step procedure or payload to trigger the issue.
- **Potential Impact:** Concrete risk or failure mode in a production environment.
- **Recommended Fix:** Precise code diff or architectural change required.
- **Verification Method:** How to write a unit, integration, or security test to verify the fix.
- **Fix Status:** [UNFIXED | IN_PROGRESS | RESOLVED]
```

**Audit Rules of Engagement:**
- **Evidence-Based Only**: Never claim a vulnerability exists without citing the exact file, line number, and executable data flow.
- **No Speculative Reporting**: Clearly distinguish theoretical architectural limitations from confirmed exploitable defects.
- **Preserve Existing Documentation**: Do not overwrite or modify existing codebase files during your audit unless explicitly instructed.
