import type { AISummaryArtifact } from '@repo-analyzer/shared';
import type { IAIProvider, RepositoryAnalysisContext } from './types.js';

export class FallbackAIProvider implements IAIProvider {
  name = 'deterministic-fallback';

  isAvailable(): boolean {
    return true;
  }

  async generateSummary(context: RepositoryAnalysisContext): Promise<AISummaryArtifact> {
    const { repoName, statistics, technologies, endpoints, databaseModels, securityFindings } = context;

    const mainLangs = statistics.languages.slice(0, 3).map((l) => `${l.language} (${l.percentage}%)`).join(', ');
    const techNames = technologies.map((t) => t.name).join(', ') || 'Standard Node.js / JavaScript';

    const overview = `${repoName} is a codebase analyzed across ${statistics.totalFiles} files and ${statistics.codeLines.toLocaleString()} lines of source code. Its primary languages are ${mainLangs || 'JavaScript'}. Detected technologies include: ${techNames}.`;

    const keyFeatures: string[] = [];
    if (endpoints.length > 0) {
      keyFeatures.push(`Exposes ${endpoints.length} discovered REST API endpoints with HTTP routing.`);
    }
    if (databaseModels.length > 0) {
      keyFeatures.push(`Defines ${databaseModels.length} data persistence models (${databaseModels.map((m) => m.modelName).join(', ')}).`);
    }
    if (technologies.some((t) => t.name === 'Express.js')) {
      keyFeatures.push('Implements Express.js server routing and middleware architecture.');
    }
    if (keyFeatures.length === 0) {
      keyFeatures.push('Modular component structure with static dependency configuration.');
    }

    const architectureOverview = `The project structure is organized with ${statistics.analyzedFiles} analyzed source files. Route handlers map incoming HTTP requests through middleware chains towards controllers and data models. Persistence is configured for ${databaseModels.length > 0 ? databaseModels.map((m) => m.modelName).join(', ') : 'stateless or external storage'}.`;

    const moduleHighlights = [
      {
        name: 'API & Routing Layer',
        description: `Discovered ${endpoints.length} endpoints across the repository.`,
        keyFiles: endpoints.slice(0, 5).map((e) => e.filePath),
      },
      {
        name: 'Database Models Layer',
        description: `Discovered ${databaseModels.length} persistence schemas.`,
        keyFiles: databaseModels.slice(0, 5).map((m) => m.filePath),
      },
    ];

    const suggestedExplorationPaths = [
      {
        title: 'Inspect Core Entry Point and Router Mounts',
        description: 'Examine top-level routing files to see how prefixes and global middlewares are attached.',
        entryFile: endpoints[0]?.filePath || statistics.largestFiles[0]?.path || 'package.json',
      },
      {
        title: 'Review Data Schema Definitions',
        description: 'Inspect Mongoose schemas to understand document structures and relational references.',
        entryFile: databaseModels[0]?.filePath || 'src/models',
      },
    ];

    let securitySummary = `Static security analysis discovered ${securityFindings.length} observation(s).`;
    const criticalFindings = securityFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
    if (criticalFindings.length > 0) {
      securitySummary += ` Identified ${criticalFindings.length} high/critical priority item(s) requiring verification.`;
    } else {
      securitySummary += ' No immediate high-severity hardcoded credentials or dynamic code evaluations were observed.';
    }

    return {
      overview,
      keyFeatures,
      architectureOverview,
      moduleHighlights,
      suggestedExplorationPaths,
      securitySummary,
    };
  }

  async explainQuestion(
    question: string,
    context: RepositoryAnalysisContext
  ): Promise<{ answer: string; referencedFiles: string[] }> {
    const qLower = question.toLowerCase();
    const referencedFiles: string[] = [];

    let answer = `Analysis based on repository facts for "${context.repoName}":\n\n`;

    if (qLower.includes('endpoint') || qLower.includes('api') || qLower.includes('route')) {
      answer += `The project has ${context.endpoints.length} discovered endpoints. Key routes include:\n`;
      for (const ep of context.endpoints.slice(0, 5)) {
        answer += `- \`${ep.method} ${ep.resolvedPath}\` in \`${ep.filePath}:${ep.lineNumber}\`\n`;
        referencedFiles.push(ep.filePath);
      }
    } else if (qLower.includes('model') || qLower.includes('database') || qLower.includes('schema')) {
      answer += `The project defines ${context.databaseModels.length} database model(s):\n`;
      for (const m of context.databaseModels) {
        answer += `- Model \`${m.modelName}\` with ${m.fields.length} field(s) in \`${m.filePath}:${m.lineNumber}\`\n`;
        referencedFiles.push(m.filePath);
      }
    } else if (qLower.includes('security') || qLower.includes('vulnerability') || qLower.includes('auth')) {
      answer += `Static security review flagged ${context.securityFindings.length} item(s):\n`;
      for (const sec of context.securityFindings.slice(0, 4)) {
        answer += `- [${sec.severity.toUpperCase()}] ${sec.title} in \`${sec.filePath}:${sec.lineNumber}\`\n`;
        referencedFiles.push(sec.filePath);
      }
    } else {
      answer += `This repository contains ${context.statistics.totalFiles} files with ${context.statistics.codeLines.toLocaleString()} code lines. Primary technologies detected: ${context.technologies.map((t) => t.name).join(', ') || 'Node.js'}.`;
      if (context.statistics.largestFiles[0]) {
        referencedFiles.push(context.statistics.largestFiles[0].path);
      }
    }

    return {
      answer,
      referencedFiles: Array.from(new Set(referencedFiles)),
    };
  }
}
