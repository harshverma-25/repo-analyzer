import { z } from 'zod';

// ==========================================
// 1. Core Scan & Project Types
// ==========================================

export const ScanStatusEnum = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type ScanStatus = z.infer<typeof ScanStatusEnum>;

export const ScanStageEnum = z.enum([
  'queued',
  'validating',
  'resolving_revision',
  'fetching_tree',
  'analyzing_code',
  'generating_ai_insights',
  'completed',
  'failed',
]);
export type ScanStage = z.infer<typeof ScanStageEnum>;

export interface ProjectMetadata {
  id: string;
  owner: string;
  repo: string;
  canonicalUrl: string;
  displayName: string;
  defaultBranch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanSummaryMetrics {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  totalLines: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  endpointCount: number;
  modelCount: number;
  securityFindingsCount: number;
}

export interface ScanMetadata {
  id: string;
  projectId: string;
  commitSha: string;
  requestedRevision?: string;
  status: ScanStatus;
  stage: ScanStage;
  progressPercentage: number;
  analyzerVersion: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  summaryMetrics?: ScanSummaryMetrics;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. Statistics Contracts
// ==========================================

export interface LanguageStat {
  language: string;
  files: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  totalLines: number;
  percentage: number;
}

export interface FileStat {
  path: string;
  extension: string;
  language: string;
  sizeBytes: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  totalLines: number;
  analyzed: boolean;
  skipReason?: string;
}

export interface StatisticsArtifact {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  totalLines: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  languages: LanguageStat[];
  largestFiles: FileStat[];
  skippedReasons: Record<string, number>;
}

// ==========================================
// 3. Technology Detection Contracts
// ==========================================

export const TechConfidenceEnum = z.enum(['confirmed', 'inferred']);
export type TechConfidence = z.infer<typeof TechConfidenceEnum>;

export interface TechnologyFinding {
  name: string;
  category:
    | 'framework'
    | 'runtime'
    | 'database'
    | 'orm'
    | 'build_tool'
    | 'testing'
    | 'utility'
    | 'styling'
    | 'other';
  version?: string;
  confidence: TechConfidence;
  evidence: string;
}

// ==========================================
// 4. Express.js Endpoint Contracts
// ==========================================

export const HttpMethodEnum = z.enum([
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
  'ALL',
]);
export type HttpMethod = z.infer<typeof HttpMethodEnum>;

export interface EndpointParam {
  name: string;
  type?: string;
  required: boolean;
  in: 'path' | 'query' | 'body' | 'header';
}

export interface RouteFinding {
  id: string;
  method: HttpMethod;
  resolvedPath: string;
  rawPath: string;
  filePath: string;
  lineNumber: number;
  routerPrefix?: string;
  handlerName?: string;
  middlewareChain: string[];
  parameters: EndpointParam[];
  requestBodySchema?: string;
  inferredStatusCodes: number[];
  authRequired: boolean;
  authMiddlewareDetected?: string;
  controllerReference?: string;
  serviceReference?: string;
  confidence: 'confirmed' | 'inferred' | 'unresolved';
  diagnostics?: string[];
}

// ==========================================
// 5. Database Model Contracts (Mongoose)
// ==========================================

export interface ModelFieldOption {
  required?: boolean;
  unique?: boolean;
  default?: string | number | boolean;
  enum?: string[];
  ref?: string;
}

export interface ModelField {
  name: string;
  type: string;
  options: ModelFieldOption;
  isReference: boolean;
  refTarget?: string;
  isEmbedded: boolean;
}

export interface ModelIndex {
  fields: Record<string, number>;
  unique?: boolean;
}

export interface DatabaseModelFinding {
  id: string;
  modelName: string;
  collectionName?: string;
  filePath: string;
  lineNumber: number;
  fields: ModelField[];
  relationships: {
    targetModel: string;
    foreignField: string;
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'references';
  }[];
  indexes: ModelIndex[];
}

// ==========================================
// 6. Static Security Observations
// ==========================================

export const SecuritySeverityEnum = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);
export type SecuritySeverity = z.infer<typeof SecuritySeverityEnum>;

export interface SecurityFinding {
  id: string;
  title: string;
  severity: SecuritySeverity;
  category:
    | 'hardcoded_credential'
    | 'code_execution'
    | 'command_injection'
    | 'sql_nosql_injection'
    | 'path_traversal'
    | 'missing_authentication'
    | 'insecure_cors'
    | 'secret_file_tracked'
    | 'other';
  filePath: string;
  lineNumber: number;
  explanation: string;
  evidenceSnippet: string; // Redacted of any actual secret tokens!
  confidence: 'confirmed' | 'inferred';
  recommendation: string;
  limitations: string;
}

// ==========================================
// 7. Architecture & Dependency Graph Contracts
// ==========================================

export type GraphNodeType =
  | 'route'
  | 'router'
  | 'controller'
  | 'service'
  | 'model'
  | 'database'
  | 'middleware'
  | 'external';

export interface ArchitectureNode {
  id: string;
  label: string;
  type: GraphNodeType;
  filePath?: string;
  metadata?: Record<string, any>;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationshipType?: 'calls' | 'mounts' | 'uses' | 'queries' | 'defines' | 'references';
}

export interface ArchitectureGraphArtifact {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  mermaidDiagram?: string;
}

// ==========================================
// 8. Folder Tree
// ==========================================

export interface FolderTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sizeBytes?: number;
  language?: string;
  lineCount?: number;
  children?: FolderTreeNode[];
}

// ==========================================
// 9. AI Grounded Summary Contracts
// ==========================================

export interface AISummaryArtifact {
  overview: string;
  keyFeatures: string[];
  architectureOverview: string;
  moduleHighlights: {
    name: string;
    description: string;
    keyFiles: string[];
  }[];
  suggestedExplorationPaths: {
    title: string;
    description: string;
    entryFile: string;
  }[];
  securitySummary: string;
}

// ==========================================
// 10. Complete Aggregated Report Contract
// ==========================================

export interface FullScanReport {
  scan: ScanMetadata;
  project: ProjectMetadata;
  statistics: StatisticsArtifact;
  technologies: TechnologyFinding[];
  endpoints: RouteFinding[];
  databaseModels: DatabaseModelFinding[];
  architectureGraph: ArchitectureGraphArtifact;
  securityFindings: SecurityFinding[];
  folderTree: FolderTreeNode;
  aiSummary: AISummaryArtifact;
}

// ==========================================
// 11. API Request & Response Schemas
// ==========================================

export const CreateScanRequestSchema = z.object({
  repoUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return (
            parsed.hostname.toLowerCase() === 'github.com' &&
            /^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/.test(parsed.pathname)
          );
        } catch {
          return false;
        }
      },
      {
        message:
          'Must be a valid public GitHub repository URL (e.g. https://github.com/expressjs/express)',
      }
    ),
  branch: z.string().trim().max(100, 'Branch name cannot exceed 100 characters').optional(),
});
export type CreateScanRequest = z.infer<typeof CreateScanRequestSchema>;

export const AIExplainRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, 'Question must be at least 3 characters')
    .max(500, 'Question cannot exceed 500 characters'),
});
export type AIExplainRequest = z.infer<typeof AIExplainRequestSchema>;

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any[];
  } | null;
}
