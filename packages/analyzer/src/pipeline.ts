import type {
  StatisticsArtifact,
  TechnologyFinding,
  RouteFinding,
  DatabaseModelFinding,
  ArchitectureGraphArtifact,
  SecurityFinding,
  FolderTreeNode,
  ScanSummaryMetrics,
  FileStat,
  LanguageStat,
} from '@repo-analyzer/shared';
import path from 'path';
import ts from 'typescript';

import { filterRepoFile, MAX_ANALYZE_FILES_COUNT } from './ingestion/filter.js';
import { buildFolderTree } from './ingestion/folderTree.js';
import { countLinesOfCode, detectLanguageFromPath } from './statistics/lineCounter.js';
import { detectTechnologies } from './technologies/detector.js';
import { extractExpressRoutes } from './express/routeExtractor.js';
import { extractMongooseModels } from './database-models/mongooseExtractor.js';
import { runSecurityScan } from './security/securityScanner.js';
import { buildArchitectureGraph } from './graph/graphBuilder.js';

export interface RawRepoFile {
  path: string;
  content: string;
  sizeBytes?: number;
}

export interface AnalysisPipelineOutput {
  summaryMetrics: ScanSummaryMetrics;
  statistics: StatisticsArtifact;
  technologies: TechnologyFinding[];
  endpoints: RouteFinding[];
  databaseModels: DatabaseModelFinding[];
  architectureGraph: ArchitectureGraphArtifact;
  securityFindings: SecurityFinding[];
  folderTree: FolderTreeNode;
}

export function runDeterministicAnalysis(
  rawFiles: RawRepoFile[]
): AnalysisPipelineOutput {
  const analyzedFiles: { path: string; content: string; stat: FileStat }[] = [];
  const skippedReasons: Record<string, number> = {};
  const fileTreeItems: { path: string; sizeBytes?: number; language?: string; lineCount?: number }[] = [];

  let totalFilesDiscovered = rawFiles.length;
  let totalCodeLines = 0;
  let totalBlankLines = 0;
  let totalCommentLines = 0;
  let totalLinesOverall = 0;

  const langMap = new Map<string, { code: number; blank: number; comment: number; total: number; files: number }>();

  let filesToProcess = rawFiles;
  if (filesToProcess.length > MAX_ANALYZE_FILES_COUNT) {
    filesToProcess = filesToProcess.slice(0, MAX_ANALYZE_FILES_COUNT);
    skippedReasons['Exceeded max file scan limit (2,000 files)'] =
      (skippedReasons['Exceeded max file scan limit (2,000 files)'] || 0) + (rawFiles.length - MAX_ANALYZE_FILES_COUNT);
  }

  for (const file of filesToProcess) {
    const size = file.sizeBytes ?? Buffer.byteLength(file.content, 'utf8');
    const filter = filterRepoFile(file.path, size);

    if (!filter.accepted) {
      const reason = filter.reason || 'Skipped';
      skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
      continue;
    }

    const lineCount = countLinesOfCode(file.content, file.path);
    const ext = path.extname(file.path).toLowerCase();

    totalCodeLines += lineCount.codeLines;
    totalBlankLines += lineCount.blankLines;
    totalCommentLines += lineCount.commentLines;
    totalLinesOverall += lineCount.totalLines;

    const fileStat: FileStat = {
      path: file.path,
      extension: ext,
      language: lineCount.language,
      sizeBytes: size,
      codeLines: lineCount.codeLines,
      blankLines: lineCount.blankLines,
      commentLines: lineCount.commentLines,
      totalLines: lineCount.totalLines,
      analyzed: true,
    };

    analyzedFiles.push({
      path: file.path,
      content: file.content,
      stat: fileStat,
    });

    fileTreeItems.push({
      path: file.path,
      sizeBytes: size,
      language: lineCount.language,
      lineCount: lineCount.totalLines,
    });

    // Language aggregation
    const currLang = langMap.get(lineCount.language) || { code: 0, blank: 0, comment: 0, total: 0, files: 0 };
    currLang.code += lineCount.codeLines;
    currLang.blank += lineCount.blankLines;
    currLang.comment += lineCount.commentLines;
    currLang.total += lineCount.totalLines;
    currLang.files += 1;
    langMap.set(lineCount.language, currLang);
  }

  // Compile LanguageStats
  const languages: LanguageStat[] = [];
  for (const [lang, counts] of langMap.entries()) {
    languages.push({
      language: lang,
      files: counts.files,
      codeLines: counts.code,
      blankLines: counts.blank,
      commentLines: counts.comment,
      totalLines: counts.total,
      percentage: totalLinesOverall > 0 ? Math.round((counts.total / totalLinesOverall) * 1000) / 10 : 0,
    });
  }
  languages.sort((a, b) => b.totalLines - a.totalLines);

  // Compile largest files
  const largestFiles = [...analyzedFiles]
    .map((f) => f.stat)
    .sort((a, b) => b.totalLines - a.totalLines)
    .slice(0, 15);

  const statistics: StatisticsArtifact = {
    totalFiles: totalFilesDiscovered,
    analyzedFiles: analyzedFiles.length,
    skippedFiles: totalFilesDiscovered - analyzedFiles.length,
    totalLines: totalLinesOverall,
    codeLines: totalCodeLines,
    blankLines: totalBlankLines,
    commentLines: totalCommentLines,
    languages,
    largestFiles,
    skippedReasons,
  };

  // Folder Tree
  const folderTree = buildFolderTree(fileTreeItems);

  // Technologies
  const technologies = detectTechnologies(analyzedFiles);

  // Single-pass AST generation: parse each JS/TS file once and share AST across extractors
  const parsedSourceFiles: { path: string; content: string; ast?: ts.SourceFile }[] = analyzedFiles.map((f) => {
    if (/\.[jt]sx?$/.test(f.path)) {
      try {
        const ast = ts.createSourceFile(f.path, f.content, ts.ScriptTarget.Latest, true);
        return { path: f.path, content: f.content, ast };
      } catch {
        return { path: f.path, content: f.content };
      }
    }
    return { path: f.path, content: f.content };
  });

  // AST Express Route Extraction (reuses parsedSourceFiles)
  const endpoints = extractExpressRoutes(parsedSourceFiles);

  // AST Mongoose Models (reuses parsedSourceFiles)
  const databaseModels = extractMongooseModels(parsedSourceFiles);

  // Static Security Observations
  const securityFindings = runSecurityScan(analyzedFiles, endpoints);

  // Architecture Graph
  const architectureGraph = buildArchitectureGraph(endpoints, databaseModels);

  // Summary Metrics
  const summaryMetrics: ScanSummaryMetrics = {
    totalFiles: totalFilesDiscovered,
    analyzedFiles: analyzedFiles.length,
    skippedFiles: totalFilesDiscovered - analyzedFiles.length,
    totalLines: totalLinesOverall,
    codeLines: totalCodeLines,
    blankLines: totalBlankLines,
    commentLines: totalCommentLines,
    endpointCount: endpoints.length,
    modelCount: databaseModels.length,
    securityFindingsCount: securityFindings.length,
  };

  return {
    summaryMetrics,
    statistics,
    technologies,
    endpoints,
    databaseModels,
    architectureGraph,
    securityFindings,
    folderTree,
  };
}
