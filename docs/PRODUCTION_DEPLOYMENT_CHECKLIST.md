# Repo Analyzer — Production Deployment Checklist

This document provides a pre-flight verification checklist and deployment guide for rolling Repo Analyzer into staging and production environments.

---

## 1. Pre-Deployment Verification Checklist

- [x] All 56 automated unit, security, and benchmark tests pass (`pnpm test`).
- [x] Monorepo packages compile cleanly via Turborepo (`pnpm build`).
- [x] Next.js 15.1 frontend builds without type errors or broken dynamic routes.
- [x] Database indexes `{ projectId: 1, status: 1 }` and `{ scanId: 1, type: 1 }` verified.
- [x] MongoDB port mapped strictly to `127.0.0.1:27017` in Docker Compose.
- [x] Reverse proxy configuration includes `app.set('trust proxy', 1)`.
- [x] 30-second request timeout and 5-minute scan pipeline timeout enabled.
- [x] AI providers enforce bounded FIFO caches (`MAX_CACHE_SIZE = 200`).
- [x] Secret masking (`redactSecret`) verified on all detected credentials.
- [x] Server restart recovery handler (`reconcileInterruptedScans`) tested.

---

## 2. Environment Variables Matrix

### Backend API (`apps/api/.env`)

| Variable | Required | Default Value | Description |
|---|:---:|---|---|
| `PORT` | No | `4000` | Port for the Express API server to listen on. |
| `NODE_ENV` | Yes | `production` | Environment mode (`production`, `development`, `test`). |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/repo-analyzer` | MongoDB connection URI with authentication credentials. |
| `CORS_ORIGIN` | Yes | `https://repo-analyzer.example.com` | Comma-separated list of allowed frontend origins (never `*` in prod). |
| `GITHUB_TOKEN` | Optional | `""` | GitHub Personal Access Token to raise API rate limit from 60 to 5,000 req/hr. |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini API key for grounded AI repo summaries. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model target for summary and Q&A inference. |
| `MAX_CONCURRENT_SCANS` | No | `2` | Maximum concurrent background scan workers per process. |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests per 15-minute window per IP. |

### Frontend Web (`apps/web/.env.production`)

| Variable | Required | Default Value | Description |
|---|:---:|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.repo-analyzer.example.com/api/v1` | Public REST API base URL accessible from user browsers. |

---

## 3. Reverse Proxy & Network Configuration

When deploying behind Nginx or AWS Application Load Balancer:

1. **Proxy Headers:**
   Ensure the following headers are forwarded to the API:
   ```nginx
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header Host $host;
   ```
2. **Payload Size Limit:**
   Keep proxy request body limit aligned with Express (`client_max_body_size 1M;`).
3. **SSL/TLS:**
   Terminate TLS 1.3 at the proxy level. Enforce HTTPS redirection.

---

## 4. Post-Deployment Smoke Test

Execute these commands against the live production deployment:

1. **API Health Check:**
   ```bash
   curl -f https://api.repo-analyzer.example.com/api/v1/health
   # Expected: {"success":true,"data":{"status":"ok","timestamp":"..."},"error":null}
   ```
2. **List Projects:**
   ```bash
   curl -f https://api.repo-analyzer.example.com/api/v1/projects
   # Expected: {"success":true,"data":[],"error":null}
   ```
3. **Trigger Public Test Scan:**
   ```bash
   curl -X POST https://api.repo-analyzer.example.com/api/v1/scans \
     -H "Content-Type: application/json" \
     -d '{"repoUrl": "https://github.com/expressjs/express"}'
   # Expected: {"success":true,"data":{"scanId":"...","status":"queued"},"error":null}
   ```

---

## 5. Rollback and Disaster Recovery

1. **Container Rollback:**
   If a new deployment exhibits elevated error rates, roll back Docker image tags to the previous stable release commit.
2. **Interrupted Scan Recovery:**
   Upon restarting the API container, `reconcileInterruptedScans()` will automatically transition any orphaned scans to `failed` status without database corruption.
3. **Database Backup:**
   Schedule daily `mongodump` snapshots of the `repo-analyzer` database.
