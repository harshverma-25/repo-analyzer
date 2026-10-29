import type {
  AISummaryArtifact,
  StatisticsArtifact,
  TechnologyFinding,
  RouteFinding,
  DatabaseModelFinding,
  SecurityFinding,
} from '@repo-analyzer/shared';

export interface RepositoryAnalysisContext {
  repoName: string;
  commitSha: string;
  statistics: StatisticsArtifact;
  technologies: TechnologyFinding[];
  endpoints: RouteFinding[];
  databaseModels: DatabaseModelFinding[];
  securityFindings: SecurityFinding[];
}

export interface IAIProvider {
  name: string;
  isAvailable(): boolean;
  generateSummary(context: RepositoryAnalysisContext): Promise<AISummaryArtifact>;
  explainQuestion(
    question: string,
    context: RepositoryAnalysisContext
  ): Promise<{ answer: string; referencedFiles: string[] }>;
}
