# REST API Specification — Repo Analyzer

Base path: `/api/v1`

All responses follow a standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
Errors return:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Detailed error message",
    "details": []
  }
}
```

---

## 1. System & Health

### `GET /api/v1/health`
Checks server vitality and database connection.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "timestamp": "2026-10-29T12:00:00.000Z",
      "database": "connected",
      "geminiConfigured": true
    }
  }
  ```

---

## 2. Scans

### `POST /api/v1/scans`
Initiates an asynchronous repository scan.
- **Request Body**:
  ```json
  {
    "repoUrl": "https://github.com/expressjs/express",
    "branch": "master" // Optional
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "success": true,
    "data": {
      "scanId": "653a9...b12",
      "status": "queued",
      "stage": "queued",
      "progressPercentage": 0,
      "message": "Scan has been enqueued"
    }
  }
  ```

### `GET /api/v1/scans/:scanId`
Returns status, stage, and completion progress.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "scanId": "653a9...b12",
      "status": "running",
      "stage": "analyzing_code",
      "progressPercentage": 60,
      "commitSha": "e4d3a2...",
      "startedAt": "2026-10-29T12:01:00.000Z"
    }
  }
  ```

### `GET /api/v1/scans/:scanId/report`
Retrieves the complete aggregated report for a finished scan.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "scan": { ... },
      "project": { ... },
      "statistics": { ... },
      "technologies": [ ... ],
      "endpoints": [ ... ],
      "databaseModels": [ ... ],
      "architectureGraph": { "nodes": [], "edges": [] },
      "securityFindings": [ ... ],
      "aiSummary": { ... }
    }
  }
  ```

### Specific Artifact Endpoints:
- `GET /api/v1/scans/:scanId/stats`
- `GET /api/v1/scans/:scanId/endpoints`
- `GET /api/v1/scans/:scanId/endpoints/:endpointId`
- `GET /api/v1/scans/:scanId/architecture`
- `GET /api/v1/scans/:scanId/folder-tree`
- `GET /api/v1/scans/:scanId/models`
- `GET /api/v1/scans/:scanId/security`

### `POST /api/v1/scans/:scanId/ai/explain`
Submits an ad-hoc question about the repository to Gemini grounded in the scan facts.
- **Request Body**:
  ```json
  {
    "question": "How does the authentication middleware protect user endpoints?"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "answer": "...",
      "referencedFiles": ["src/middleware/auth.ts"]
    }
  }
  ```

---

## 3. Projects

### `GET /api/v1/projects`
Lists all previously analyzed projects.

### `GET /api/v1/projects/:projectId`
Fetches a single project by ID.

### `GET /api/v1/projects/:projectId/scans`
Lists scan history for a project.

### `DELETE /api/v1/projects/:projectId`
Cascades deletion of project, scans, and associated scan artifacts.
