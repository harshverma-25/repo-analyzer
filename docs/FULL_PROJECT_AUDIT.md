# REPO ANALYZER — COMPLETE TECHNICAL BASELINE AUDIT

**Project:** Repo Analyzer  
**Repository:** [https://github.com/harshverma-25/repo-analyzer](https://github.com/harshverma-25/repo-analyzer)  
**Date:** October 31, 2026  
**Auditor:** Principal Software & Security Architect  
**Architecture:** pnpm Monorepo + Turborepo (`apps/web`, `apps/api`, `packages/shared`, `packages/database`, `packages/analyzer`, `packages/ai`)  
**Baseline Test Status:** 25 passing automated tests  

---

## 1. Executive Summary

A comprehensive architectural, code quality, performance, and security inspection was conducted across all applications and shared packages in the Repo Analyzer monorepo.

Repo Analyzer provides deterministic AST extraction, line metric aggregation, tech stack identification, security observation detection, and grounded AI architectural summarization for GitHub repositories.

The core implementation is robust, with AST extractors, strong Zod typing, and clean separation between deterministic analysis and AI synthesis. However, the technical audit revealed high-priority security hardening opportunities, missing dependency declarations, missing HTTP security headers, potential unhandled race conditions in database upserts, and missing automated tests for edge cases.

---

## 2. Audit Findings by Severity

### Summary Table

| Severity | Count | Primary Impact Areas |
| :--- | :---: | :--- |
| **Critical** | 2 | Dependency Isolation (Monorepo), Google Gemini API Key Exposure in URL |
| **High** | 4 | Missing HTTP Security Headers (Helmet), SSRF Non-Standard Port Defense, AI Prompt Character Limiting, Secret File Pattern List |
| **Medium** | 5 | In-Memory Job Timeout & Leaked Concurrency Slots, Race Conditions on Simultaneous Project Creation, Frontend Polling Network Resilience, Excessive JSON Body Limit, Next.js Dependency Advisory |
| **Low** | 3 | Turborepo Deprecation Warning (`--parallel`), Mermaid Label Escaping, General Read Rate Limiter Missing |
| **Informational** | 2 | Architecture Graph Large-Node Layout Density, Docker Build Layer Caching |

---

### Finding Details

#### [CRIT-01] Missing Direct Dependency Declaration for Mongoose in `apps/api`
- **Severity:** Critical
- **Affected Files:** `apps/api/package.json`
- **Impact:** Under `pnpm`'s isolated virtual store structure, direct imports of `mongoose` in `scanController.ts`, `projectController.ts`, and `scanQueue.ts` fail at runtime with `ERR_MODULE_NOT_FOUND` when packages are not hoisted.
- **Proposed Fix:** Declare `"mongoose": "^8.12.1"` directly in `apps/api/package.json` dependencies and ensure lockfile consistency.

#### [CRIT-02] Gemini API Key Passed as Query Parameter in Outbound HTTP Requests
- **Severity:** Critical
- **Affected Files:** `packages/ai/src/providers/geminiProvider.ts`
- **Impact:** `callGeminiApi` constructs the endpoint URL as `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent?key=${this.apiKey}`. Query parameter keys are logged in cleartext by intermediary proxies, corporate firewalls, server access logs, and error stack traces.
- **Proposed Fix:** Migrate to passing the API key via Google's official `x-goog-api-key` HTTP header and strip the `key` parameter from the URL.

#### [HIGH-01] Missing HTTP Security Headers & Helmet Protection in Express API
- **Severity:** High
- **Affected Files:** `apps/api/src/server.ts`, `apps/api/package.json`
- **Impact:** The Express server lacked `helmet`, exposing default `X-Powered-By: Express` headers and omitting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and cross-origin resource isolation headers.
- **Proposed Fix:** Integrate `helmet` with appropriate CORS and CORP configuration and disable the `x-powered-by` header.

#### [HIGH-02] SSRF Defense Missing Port & Credential Constraints in `safeFetch`
- **Severity:** High
- **Affected Files:** `packages/analyzer/src/github/client.ts`
- **Impact:** `safeFetch` validated hostnames against `ALLOWED_REDIRECT_HOSTS`, but did not assert standard HTTPS port 443 or block embedded basic auth credentials (`https://user:pass@host`), potentially allowing connection attempts to unexpected service ports or credential leakage.
- **Proposed Fix:** Enforce `parsed.port === '' || parsed.port === '443'`, reject embedded credentials (`parsed.username || parsed.password`), and sanitize path traversal sequences including encoded `%2e%2e` and null bytes.

#### [HIGH-03] Unbounded User Question Input in AI Explanation Endpoint
- **Severity:** High
- **Affected Files:** `packages/shared/src/index.ts`, `packages/ai/src/providers/geminiProvider.ts`
- **Impact:** `AIExplainRequestSchema` enforced a minimum length of 3 characters but lacked a `.max()` constraint, allowing clients to send multi-megabyte payloads, driving up token costs, risking memory exhaustion, and opening prompt injection windows.
- **Proposed Fix:** Enforce a strict 500-character maximum on user questions in `AIExplainRequestSchema` and strip control/non-printable characters before prompt assembly.

#### [HIGH-04] Incomplete Sensitive Secret Filenames and Patterns
- **Severity:** High
- **Affected Files:** `packages/analyzer/src/ingestion/filter.ts`, `packages/analyzer/src/security/securityScanner.ts`
- **Impact:** Additional key formats (SSH DSA/ECDSA keys, `.npmrc`, `.pypirc`, `.htpasswd`, `.docker/config.json`, keystores) and credential patterns (OpenAI `sk-proj-`, Slack tokens, Mongo URIs with plaintext passwords) were missing from pre-filtering and detection.
- **Proposed Fix:** Expand `SENSITIVE_SECRET_FILENAMES`, `SENSITIVE_SECRET_EXTENSIONS`, and `SECRET_PATTERNS` with comprehensive cryptographic and credential regexes, ensuring evidence lines are strictly redacted.

#### [MED-01] In-Process Scan Queue Lacks Global Job Execution Timeout
- **Severity:** Medium
- **Affected Files:** `apps/api/src/jobs/scanQueue.ts`
- **Impact:** If an asynchronous step hangs due to slow network connections or an unhandled stream, an active concurrency slot (`activeJobs`) could remain occupied permanently, causing head-of-line blocking for subsequent scans.
- **Proposed Fix:** Implement a 5-minute abort controller timeout on overall scan execution, guaranteeing that hanging jobs are marked `failed` and concurrency slots are released.

#### [MED-02] Concurrent Project Creation Race Condition (Mongo E11000)
- **Severity:** Medium
- **Affected Files:** `apps/api/src/controllers/scanController.ts`
- **Impact:** When two simultaneous scan requests arrive for a new repository, both may pass the initial `Project.findOne` check and attempt `Project.create`, triggering a duplicate key error on the unique `{ owner: 1, repo: 1 }` index.
- **Proposed Fix:** Catch MongoDB error code `11000` during project creation and gracefully fall back to querying the newly created project record.

#### [MED-03] Frontend Polling Aborts Permanently on Single Transient Network Glitch
- **Severity:** Medium
- **Affected Files:** `apps/web/src/app/scans/[scanId]/page.tsx`
- **Impact:** In `ScanProgressPage`, if a network blip causes a fetch error in the `catch` block, polling terminates immediately, leaving the user with an error screen even if the backend scan succeeds.
- **Proposed Fix:** Implement exponential backoff retry logic (up to 5 retries) before showing a permanent network error.

#### [MED-04] Overly Permissive JSON Request Body Limit
- **Severity:** Medium
- **Affected Files:** `apps/api/src/server.ts`
- **Impact:** `express.json({ limit: '10mb' })` allowed large request bodies for endpoints that only accept JSON URLs and short questions, exposing the server to memory pressure.
- **Proposed Fix:** Reduce JSON body limit to `1mb` and add a 30-second request timeout middleware.

#### [MED-05] Deprecated Next.js 15.1.0 Security Advisory Warnings
- **Severity:** Medium
- **Affected Files:** `apps/web/package.json`
- **Impact:** `pnpm audit` reports advisories related to image optimizer cache headers in Next.js 15.1.0.
- **Proposed Fix:** Review update path and document vulnerability context without breaking React 19 compatibility.

#### [LOW-01] Turborepo Deprecation Warning (`--parallel`)
- **Severity:** Low
- **Affected Files:** `package.json`, `turbo.json`
- **Impact:** `pnpm dev` emitted a warning: `WARNING --parallel is deprecated and will be removed in a future major version.`
- **Proposed Fix:** Configure task persistence in `turbo.json` and remove deprecated `--parallel` flag.

#### [LOW-02] Unescaped Quotes in Generated Mermaid Flowchart Labels
- **Severity:** Low
- **Affected Files:** `packages/analyzer/src/graph/graphBuilder.ts`
- **Impact:** If route paths or model names contain unescaped quotation marks or special brackets, the generated Mermaid syntax can become malformed.
- **Proposed Fix:** Sanitize and escape double quotes in Mermaid node labels.

#### [LOW-03] General Rate Limiting Missing on Read Endpoints
- **Severity:** Low
- **Affected Files:** `apps/api/src/routes/index.ts`
- **Impact:** While `POST /scans` and `POST /scans/:scanId/ai/explain` have dedicated rate limiters, read endpoints (`/projects`, `/scans/:scanId`) were unmetered.
- **Proposed Fix:** Add a general rate limiter (300 requests / 15 minutes) across `/api/v1` to mitigate scraping and enumeration.

#### [INFO-01] Architecture Graph Layout Density
- **Severity:** Informational
- **Affected Files:** `apps/web/src/app/scans/[scanId]/report/page.tsx`
- **Impact:** Repositories with >50 routes generate large React Flow graphs. Node clamping and Mermaid fallback already mitigate this.

#### [INFO-02] Docker Multi-Stage Build Optimization
- **Severity:** Informational
- **Affected Files:** `Dockerfile`
- **Impact:** Ensure `.env` is never copied into image layers and leverage BuildKit cache mounts.

---

## 3. Remediation Roadmap

1. **Security Hardening (Phase 2):**
   - Migrate Gemini API key to `x-goog-api-key` header.
   - Harden `safeFetch` with port validation, credential blocking, and encoded traversal defense.
   - Install and configure `helmet` in `apps/api`.
   - Add global API rate limiter and 30s request timeout.
   - Enforce 500-char max on `AIExplainRequestSchema`.
   - Expand sensitive file filter and credential regexes.

2. **Backend & Queue Reliability (Phases 3 & 7):**
   - Add 5-minute timeout on scan execution in `scanQueue.ts`.
   - Gracefully handle E11000 duplicate project creation race conditions.
   - Add `.env` path resolution robustness.

3. **Analyzer & Graph Hardening (Phase 4):**
   - Escape double quotes in Mermaid graph builder.
   - Ensure null-byte safety in file paths.

4. **Frontend UX & Resilience (Phase 8):**
   - Add retry resilience to scan progress polling.

5. **Testing & QA Expansion (Phase 10):**
   - Expand automated test suite covering all security defenses, traversal attacks, port restrictions, secret redactions, and error handlers.

6. **Documentation & Verification (Phases 11 & 12):**
   - Author `docs/SECURITY_AUDIT.md`, `docs/PERFORMANCE_AUDIT.md`, `docs/BUG_FIXES.md`, and update `docs/PRODUCTION_READINESS.md` and `README.md`.
   - Verify `pnpm test` and `pnpm build`.

7. **Git Commit & Push (Phase 13):**
   - Commit changes and push to `origin/main`.
