# Database Schema & Storage Design — Repo Analyzer

## 1. Overview
Repo Analyzer utilizes **MongoDB** via **Mongoose** for persistence. The database schema is designed to prevent BSON document size bloat (MongoDB's 16MB document limit) by splitting scan metadata from granular scan artifacts (file trees, endpoint inventories, security findings, and architecture graph nodes).

---

## 2. Collections & Schemas

### 2.1 `projects`
Tracks unique GitHub repositories analyzed on the platform.

```typescript
interface IProject {
  _id: ObjectId;
  owner: string;            // e.g. "expressjs"
  repo: string;             // e.g. "express"
  canonicalUrl: string;     // "https://github.com/expressjs/express"
  displayName: string;      // "expressjs/express"
  defaultBranch?: string;   // e.g. "main" or "master"
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ owner: 1, repo: 1 }` (unique)
- `{ canonicalUrl: 1 }`

---

### 2.2 `scans`
Represents an execution run of the analysis pipeline for a project at a specific commit revision.

```typescript
interface IScan {
  _id: ObjectId;
  projectId: ObjectId;      // Reference to projects collection
  commitSha: string;        // 40-character resolved Git commit hash
  requestedRevision?: string; // Branch or tag provided by user (default: HEAD)
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage: 'queued' | 'validating' | 'resolving_revision' | 'fetching_tree' | 'analyzing_code' | 'generating_ai_insights' | 'completed' | 'failed';
  progressPercentage: number; // 0 to 100
  analyzerVersion: string;  // e.g. "1.0.0"
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  summaryMetrics?: {
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
    totalLines: number;
    codeLines: number;
    endpointCount: number;
    modelCount: number;
    securityFindingsCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ projectId: 1, commitSha: 1 }`
- `{ status: 1 }`
- `{ createdAt: -1 }`

---

### 2.3 `scan_artifacts`
Stores granular, potentially large report sections separated by artifact type.

```typescript
interface IScanArtifact {
  _id: ObjectId;
  scanId: ObjectId;         // Reference to scans collection
  artifactType:
    | 'statistics'
    | 'technologies'
    | 'endpoints'
    | 'database_models'
    | 'architecture_graph'
    | 'security_findings'
    | 'folder_tree'
    | 'ai_summary';
  data: any;                // Structured payload corresponding to the artifact type
  createdAt: Date;
}
```
**Indexes**:
- `{ scanId: 1, artifactType: 1 }` (unique compound index)

---

### 2.4 `ai_conversations` (Optional / Extended)
Stores Q&A exploration queries grounded in specific scan artifacts.

```typescript
interface IAIConversation {
  _id: ObjectId;
  scanId: ObjectId;
  question: string;
  answer: string;
  referencedFiles: string[];
  createdAt: Date;
}
```
**Indexes**:
- `{ scanId: 1, createdAt: -1 }`

---

## 3. Retention & Cascading Deletion
When a project is deleted via `DELETE /api/v1/projects/:projectId`:
1. All child `scans` associated with the project are queried.
2. All `scan_artifacts` matching those scan IDs are deleted in bulk.
3. The scans and the parent project are deleted atomically.
