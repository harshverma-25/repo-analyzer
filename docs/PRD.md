# Product Requirements Document (PRD) — Repo Analyzer

## 1. Executive Summary
Repo Analyzer is a static analysis and AI-augmented comprehension platform for public GitHub repositories. By coupling deterministic AST extraction (routes, Mongoose models, architecture links, metrics) with Google Gemini synthesis, Repo Analyzer empowers software engineers to immediately understand unfamiliar codebases with verifiable evidence and zero hallucination.

## 2. Problem Statement
When developers onboard to a new project or evaluate an open-source library, they face significant friction:
- Understanding how API routes map to controllers, services, and database models.
- Determining dependencies, active technologies, and accurate line-of-code distributions.
- Auditing security hygiene (hardcoded secrets, dynamic `eval()`, command injection).
- Generic AI chat tools frequently hallucinate endpoints or architectural patterns because they lack grounded static facts.

## 3. Product Goals & Non-Goals
### Goals
- **Deterministic Facts First**: Compute line counts, technologies, Express routes, and Mongoose schemas statically with file and line evidence.
- **AI-Powered Synthesis**: Use Google Gemini to summarize architecture, explain endpoints, and suggest exploration paths strictly grounded in deterministic findings.
- **Resilience**: The application must be 100% usable even if Gemini API keys are omitted or quotas are exhausted.
- **Non-blocking Execution**: Long-running scans return `202 Accepted` immediately with continuous polling for status updates.
- **Interactive Visuals**: Provide high-density, interactive React Flow architecture graphs and Mermaid request-flow diagrams.

### Non-Goals
- Executing untrusted repository code or running dynamic integration tests on user repos.
- Modifying or committing changes to analyzed repositories.
- Serving as an exploit-verification or pen-testing tool.

## 4. User Personas
- **Software Engineers / Onboarders**: Needing to understand a complex Express/Node.js codebase quickly.
- **Tech Leads & Architects**: Reviewing system structure, route hierarchy, and database relationships.
- **Security Reviewers**: Quickly identifying red flags like unauthenticated routes or dynamic code execution.

## 5. Core Feature Specifications
### 5.1 Repository Ingestion
- Input: Valid public GitHub URL (e.g. `https://github.com/expressjs/express`).
- Validation: Strict regex, rejection of internal/private IP SSRF, non-GitHub hosts, and invalid schemas.
- Tree resolution: GitHub API Git tree recursion, filtering binaries, vendor folders, build artifacts, and secret files.

### 5.2 Deterministic Static Analysis
- **Lines of Code**: Code, blank, and comment lines across file extensions.
- **Technology Detection**: Package manifest inspection, framework detection, and confidence scoring.
- **Deep Express.js Route Discovery**: TypeScript AST parsing of `app.get/post/...`, `router.get/post/...`, nested `app.use()` and `router.use()` prefix mounts, middleware chains, handlers, and parameter inferences.
- **Mongoose Model Discovery**: Extraction of schemas, field types, constraints, foreign refs, embedded schemas, and indexes.
- **Static Security Review**: Pattern-based AST matching for hardcoded credentials (redacted), dynamic code execution, command execution, path traversal, and permissive CORS.
- **Graph Generator**: Assembles nodes and edges connecting Routes -> Controllers -> Services -> Models -> DB.

### 5.3 AI Summarization (Google Gemini)
- Project overview and tech stack breakdown.
- Architecture summary and request lifecycle description.
- Deep explanations for selected endpoints and data models.
- Suggested exploration paths.

### 5.4 Dashboard & User Interface
- Modern, high-contrast, developer-tool dark theme.
- Interactive API Explorer with search, HTTP method filters, and parameter drawer.
- React Flow interactive node graph with pan/zoom/filter.
- Database Model explorer with schema visualizer.
- File tree explorer with language tagging.
- Security tab with severity badges, confidence indicators, and limitation disclaimers.
