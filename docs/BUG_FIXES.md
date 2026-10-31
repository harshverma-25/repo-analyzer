# REPO ANALYZER — BUG FIXES & CODE IMPROVEMENTS LOG

**Date:** October 31, 2026  
**Auditor:** Senior Full-Stack & Systems Engineer  
**Scope:** Complete Monorepo Bug Fixes, Defensive Hardening, API Resiliency  

---

## Summary of Remediated Defects

| Defect ID | Component | Severity | Description | Fix Applied |
| :--- | :--- | :--- | :--- | :--- |
| **FIX-01** | `apps/api` | Critical | `ERR_MODULE_NOT_FOUND: Cannot find package 'mongoose'` when running in isolated pnpm monorepo | Added `"mongoose": "^8.12.1"` directly to `apps/api/package.json` dependencies and updated lockfile. |
| **FIX-02** | `packages/ai` | Critical | Gemini API key exposed in URL query string in `callGeminiApi` | Migrated API key transmission to `x-goog-api-key` HTTP header, removing `?key=...` from request URLs. |
| **FIX-03** | `apps/api` | High | Express API missing security headers and leaking `X-Powered-By` | Integrated `helmet` with CORS/CORP configuration and invoked `app.disable('x-powered-by')`. |
| **FIX-04** | `packages/analyzer` | High | SSRF check omitted non-standard ports and embedded URL credentials | Added validation asserting standard HTTPS port 443 and rejecting embedded basic auth credentials. |
| **FIX-05** | `packages/shared` | High | `AIExplainRequestSchema` lacked maximum character length boundary | Enforced a 500-character max limit and added control character stripping before prompt generation. |
| **FIX-06** | `packages/analyzer` | High | Decoded path traversal sequences swallowed by internal try-catch in `fetchRawFile` | Separated `decodeURIComponent` from path traversal assertion, ensuring encoded `%2e%2e` is caught. |
| **FIX-07** | `apps/api` | Medium | Unhandled MongoDB duplicate key error (E11000) during concurrent first scan on new repository | Added try/catch fallback on `Project.create` for error code 11000 to recover the existing record. |
| **FIX-08** | `apps/api` | Medium | In-process `ScanQueue` lacked execution timeout, risking permanent slot starvation on stuck tasks | Implemented a 5-minute `Promise.race` timeout guard that marks scans `failed` and frees worker slots. |
| **FIX-09** | `apps/web` | Medium | Scan progress polling aborted permanently on single transient network error | Added exponential backoff retry mechanism (up to 5 retries) before showing a permanent error. |
| **FIX-10** | `apps/api` | Medium | Excessively large JSON body limit (10MB) exposed server to memory exhaustion | Reduced JSON and urlencoded request body limits to 1MB and added a 30-second request timeout middleware. |
| **FIX-11** | `packages/analyzer` | Low | Unescaped double quotes in Mermaid flowchart node labels caused syntax breaks | Escaped quotation marks to `&quot;` in Mermaid label generation. |
| **FIX-12** | `root` | Low | Turborepo `--parallel` deprecation warning on `pnpm dev` | Updated root `package.json` dev script to `turbo run dev`. |
| **FIX-13** | `apps/api` | Low | General read endpoints (`/projects`, `/scans/:scanId`) were unmetered | Added a general 300 requests / 15 min rate limiter across `/api/v1`. |

---

## Verification Summary

All fixes were verified via:
1. `pnpm test` — 28/28 passing unit and integration tests.
2. `pnpm build` — 6/6 workspace packages compiled without errors or warnings.
3. Server startup & health check verification (`/api/v1/health` returning 200 OK).
