# Repo Analyzer — Remediation Log

This document records all source-level remediations applied to the Repo Analyzer codebase to resolve the issues verified in the Second Source-Level Audit.

---

## Remediation Index

| ID | Component | File Modified | Change Summary |
|---|---|---|---|
| **REM-01** | Shared Schema | `packages/shared/src/index.ts` | Branch path traversal, null-byte, and metacharacter validation |
| **REM-02** | Shared Utils | `packages/shared/src/index.ts` | Strict 24-character hexadecimal ObjectId validator (`isValidObjectId`) |
| **REM-03** | Analyzer Client | `packages/analyzer/src/github/client.ts` | Path traversal & null-byte rejection in `resolveCommitSha`, `getGitTree`, `fetchRawFile` |
| **REM-04** | API Server | `apps/api/src/server.ts` | Configure `app.set('trust proxy', 1)` for accurate rate limiting |
| **REM-05** | Infrastructure | `docker-compose.yml` | Bind MongoDB port strictly to `127.0.0.1:27017:27017` |
| **REM-06** | AI Provider | `packages/ai/src/providers/geminiProvider.ts` | Bounded FIFO cache eviction (`MAX_CACHE_SIZE = 200`) |
| **REM-07** | AI Prompting | `packages/ai/src/providers/geminiProvider.ts` | JSON encapsulation and string escaping against prompt injection |
| **REM-08** | AI Config | `packages/ai/src/providers/geminiProvider.ts` | Explicit `apiKey` parameter honoring empty string override |
| **REM-09** | Security Scanner | `packages/analyzer/src/security/securityScanner.ts` | Line length ceiling (`MAX_SCAN_LINE_LENGTH = 2000`) for ReDoS prevention |
| **REM-10** | Security Scanner | `packages/analyzer/src/security/securityScanner.ts` | Secret redaction helper masking credential tokens in findings |
| **REM-11** | Express AST | `packages/analyzer/src/express/routeExtractor.ts` | Multi-arg router mount extraction (`app.use('/prefix', mw, router)`) |
| **REM-12** | Express AST | `packages/analyzer/src/express/routeExtractor.ts` | Router-level middleware tracking and inherited auth propagation |
| **REM-13** | Express AST | `packages/analyzer/src/express/routeExtractor.ts` | Multi-depth chained route extraction (`app.route().get().post()`) |
| **REM-14** | Scan Queue | `apps/api/src/jobs/scanQueue.ts` | Active AbortController tracking & public `cancelScan(scanId)` |
| **REM-15** | Scan Queue | `apps/api/src/jobs/scanQueue.ts` | Partial-scan skipped reasons reporting for repositories >150 files |
| **REM-16** | Controllers | `apps/api/src/controllers/projectController.ts` & `scanController.ts` | Replaced loose Mongoose validation with strict `isValidObjectId` & cancel scans on project delete |
| **REM-17** | Web UI | `apps/web/src/app/page.tsx` | Added explicit `id`, `name`, and `aria-label` accessibility attributes |

---

## Detailed Remediation Entries

### REM-01 & REM-02: Shared Schema & ObjectId Hardening
- **File:** `packages/shared/src/index.ts`
- **Rationale:** Eliminate input injection via Git ref specifications and prevent loose 12-byte string acceptance in MongoDB operations.
- **Code Change:**
```typescript
export const CreateScanRequestSchema = z.object({
  repoUrl: z.string().url().max(500),
  branch: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Branch or revision contains invalid characters')
    .refine((b) => !b.includes('..'), 'Path traversal sequence is not allowed in branch name')
    .refine((b) => !b.includes('\0'), 'Null bytes are not allowed')
    .refine((b) => !b.startsWith('/') && !b.endsWith('/'), 'Branch name cannot start or end with a slash')
    .refine((b) => !b.endsWith('.lock'), 'Branch name cannot end with .lock')
    .optional(),
});

export function isValidObjectId(id: string): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}
```

### REM-03: GitHub Client Traversal Prevention
- **File:** `packages/analyzer/src/github/client.ts`
- **Rationale:** Ensure client-level defense in depth so that even internal programmatic calls cannot inject path traversal into GitHub API paths.
- **Code Change:**
```typescript
if (sanitizedRevision.includes('..') || sanitizedRevision.includes('/') || sanitizedRevision.includes('\\') || sanitizedRevision.includes('\0')) {
  throw new Error('Path traversal sequence detected in revision name');
}
```

### REM-04: Express Trust Proxy Configuration
- **File:** `apps/api/src/server.ts`
- **Rationale:** When deployed behind reverse proxies or load balancers, `express-rate-limit` requires `trust proxy` to properly track client IPs via `X-Forwarded-For`.
- **Code Change:**
```typescript
// Enable reverse proxy support for accurate client IP rate limiting
app.set('trust proxy', 1);
```

### REM-05: Docker Compose MongoDB Port Isolation
- **File:** `docker-compose.yml`
- **Rationale:** Never expose raw database ports to `0.0.0.0` on developer machines or production host interfaces.
- **Code Change:**
```yaml
ports:
  - '127.0.0.1:27017:27017'
```

### REM-06, REM-07 & REM-08: Gemini Provider Memory & Injection Hardening
- **File:** `packages/ai/src/providers/geminiProvider.ts`
- **Rationale:** Limit cache growth to 200 items per cache, prevent prompt injection breakout, and honor explicit empty API keys.
- **Code Change:**
```typescript
private static readonly MAX_CACHE_SIZE = 200;

private setCache<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= GeminiProvider.MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, value);
}

// Prompt sanitization
User Question: ${JSON.stringify(sanitizedQuestion)}
```

### REM-09 & REM-10: Security Scanner ReDoS & Redaction Protection
- **File:** `packages/analyzer/src/security/securityScanner.ts`
- **Rationale:** Prevent event loop blocking on minified single-line bundles (>2,000 chars) and mask captured secrets before storage.
- **Code Change:**
```typescript
export function redactSecret(secret: string): string {
  if (!secret || secret.length <= 6) return '******';
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(4, secret.length - 5))}${suffix}`;
}

const MAX_SCAN_LINE_LENGTH = 2000;
if (line.length > MAX_SCAN_LINE_LENGTH) continue;
```

### REM-11, REM-12 & REM-13: Express Route Extractor Enhancements
- **File:** `packages/analyzer/src/express/routeExtractor.ts`
- **Rationale:** Correctly resolve nested routers mounted with intermediate middlewares, inherit `router.use(authMiddleware)` onto all member routes, and support multi-link `app.route('/path').get(...).post(...)` chains.
- **Code Change:**
```typescript
function getChainedRouteInfo(
  expr: ts.PropertyAccessExpression,
  sourceFile: ts.SourceFile
): { callerText: string; routePath: string } | null {
  let current: ts.Expression = expr.expression;
  while (ts.isCallExpression(current)) {
    const innerExpr = current.expression;
    if (ts.isPropertyAccessExpression(innerExpr)) {
      const callName = innerExpr.name.getText(sourceFile).toLowerCase();
      if (callName === 'route') {
        const routeArgs = current.arguments;
        if (routeArgs.length > 0 && (ts.isStringLiteral(routeArgs[0]) || ts.isNoSubstitutionTemplateLiteral(routeArgs[0]))) {
          return { callerText: innerExpr.expression.getText(sourceFile), routePath: (routeArgs[0] as ts.StringLiteral).text };
        }
        return null;
      } else if (HTTP_METHODS[callName]) {
        current = innerExpr.expression;
        continue;
      }
    }
    break;
  }
  return null;
}
```

### REM-14 & REM-15: Scan Queue Cancellation and Partial Scan Reporting
- **File:** `apps/api/src/jobs/scanQueue.ts`
- **Rationale:** Cancel active background scans when their parent project is deleted, prevent orphan artifacts, and report when repositories exceed the 150 candidate file batch limit.
- **Code Change:**
```typescript
cancelScan(scanId: string): boolean {
  const initialQueueLength = this.queue.length;
  this.queue = this.queue.filter((job) => job.scanId !== scanId);
  let cancelled = this.queue.length < initialQueueLength;

  if (this.activeAbortControllers.has(scanId)) {
    const controller = this.activeAbortControllers.get(scanId);
    controller?.abort(new Error('Scan cancelled by project deletion or user request'));
    this.activeAbortControllers.delete(scanId);
    cancelled = true;
  }
  return cancelled;
}
```

### REM-16: Controller Strict ObjectId & Cascade Deletion
- **Files:** `apps/api/src/controllers/projectController.ts`, `apps/api/src/controllers/scanController.ts`
- **Rationale:** Strict 24-character hexadecimal ObjectId validation and cascade scan cancellation.

### REM-17: Frontend Accessible Form Controls
- **File:** `apps/web/src/app/page.tsx`
- **Rationale:** Unique descriptive IDs and aria-labels for screen readers and UI testing automation.
