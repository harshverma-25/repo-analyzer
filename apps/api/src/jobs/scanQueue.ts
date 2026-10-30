import mongoose from 'mongoose';
import { Project, Scan, ScanArtifact } from '@repo-analyzer/database';
import {
  parseAndValidateGitHubUrl,
  GitHubClient,
  runDeterministicAnalysis,
  filterRepoFile,
  type RawRepoFile,
} from '@repo-analyzer/analyzer';
import { getAIProvider } from '@repo-analyzer/ai';

interface ScanJob {
  scanId: string;
  projectId: string;
  repoUrl: string;
  branch?: string;
}

class ScanQueue {
  private queue: ScanJob[] = [];
  private maxConcurrency = 2;
  private activeJobs = 0;

  /**
   * Reconciles any scans left hanging in 'running' or 'queued' from a prior server process.
   */
  async reconcileInterruptedScans() {
    try {
      const result = await Scan.updateMany(
        { status: { $in: ['queued', 'running'] } },
        {
          status: 'failed',
          stage: 'failed',
          errorMessage: 'Scan interrupted by an unexpected server reboot or termination.',
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`[ScanQueue] Reconciled ${result.modifiedCount} interrupted scan(s) from previous process.`);
      }
    } catch (err) {
      console.warn('[ScanQueue] Failed to reconcile interrupted scans:', err);
    }
  }

  enqueue(job: ScanJob) {
    this.queue.push(job);
    this.processNext();
  }

  private async processNext() {
    if (this.activeJobs >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobs++;
    this.executeScan(job)
      .catch((err) => {
        console.error(`[ScanQueue] Unhandled job failure for scan ${job.scanId}:`, err);
      })
      .finally(() => {
        this.activeJobs--;
        this.processNext();
      });
  }

  private async executeScan(job: ScanJob) {
    const { scanId, projectId, repoUrl, branch } = job;
    console.log(`[ScanQueue] Starting execution of scan ${scanId} for ${repoUrl}`);

    const client = new GitHubClient();
    const aiProvider = getAIProvider();

    try {
      // 1. Stage: validating
      await this.updateProgress(scanId, 'validating', 10);
      const parsedUrl = parseAndValidateGitHubUrl(repoUrl);

      // 2. Stage: resolving_revision
      await this.updateProgress(scanId, 'resolving_revision', 20);
      const commitSha = await client.resolveCommitSha(parsedUrl.owner, parsedUrl.repo, branch);

      await Scan.findByIdAndUpdate(scanId, {
        commitSha,
        status: 'running',
        startedAt: new Date(),
      });

      // 3. Stage: fetching_tree
      await this.updateProgress(scanId, 'fetching_tree', 35);
      const treeResult = await client.getGitTree(parsedUrl.owner, parsedUrl.repo, commitSha);

      // 4. Fetching files for analysis (strictly pre-filtered to exclude vendor code & secrets)
      await this.updateProgress(scanId, 'analyzing_code', 50);

      // Select relevant code files, pre-filtering against exclusions & secrets
      const candidateFiles = treeResult.items.filter((item) => {
        if (item.type !== 'blob') return false;
        // Verify filter rules (rejecting .git, node_modules, .env, lockfiles, etc.)
        const filter = filterRepoFile(item.path, item.size);
        if (!filter.accepted) return false;

        const p = item.path.toLowerCase();
        return (
          p.endsWith('.js') ||
          p.endsWith('.ts') ||
          p.endsWith('.jsx') ||
          p.endsWith('.tsx') ||
          p.endsWith('.json') ||
          p.endsWith('.yaml') ||
          p.endsWith('.yml') ||
          p.endsWith('.md') ||
          p === 'dockerfile'
        );
      });

      // Always prioritize manifests and configuration files first
      candidateFiles.sort((a, b) => {
        const aLower = a.path.toLowerCase();
        const bLower = b.path.toLowerCase();
        const aIsManifest = aLower === 'package.json' || aLower === 'tsconfig.json';
        const bIsManifest = bLower === 'package.json' || bLower === 'tsconfig.json';
        if (aIsManifest && !bIsManifest) return -1;
        if (!aIsManifest && bIsManifest) return 1;
        return 0;
      });

      // Limit fetched files to bounded batch (150 top files) to avoid exceeding rate limits
      const fetchBatch = candidateFiles.slice(0, 150);
      const rawFiles: RawRepoFile[] = [];

      for (let i = 0; i < fetchBatch.length; i++) {
        const item = fetchBatch[i];
        try {
          const content = await client.fetchRawFile(parsedUrl.owner, parsedUrl.repo, commitSha, item.path);
          rawFiles.push({
            path: item.path,
            content,
            sizeBytes: item.size || Buffer.byteLength(content),
          });
        } catch {
          // Individual file fetch errors (e.g. deleted or binary) are skipped safely
        }
      }

      // 5. Run Deterministic Static Analysis
      await this.updateProgress(scanId, 'analyzing_code', 70);
      const analysisOutput = runDeterministicAnalysis(rawFiles);

      // If tree was truncated by GitHub, record warning diagnostic
      if (treeResult.truncated) {
        analysisOutput.statistics.skippedReasons['GitHub API truncated tree (exceeded 100,000 repository entries)'] = 1;
      }

      // 6. Generate AI Insights (Gemini or Fallback)
      await this.updateProgress(scanId, 'generating_ai_insights', 85);
      const aiSummary = await aiProvider.generateSummary({
        repoName: parsedUrl.displayName,
        commitSha,
        statistics: analysisOutput.statistics,
        technologies: analysisOutput.technologies,
        endpoints: analysisOutput.endpoints,
        databaseModels: analysisOutput.databaseModels,
        securityFindings: analysisOutput.securityFindings,
      });

      // 7. Persist Artifacts in Database
      const sId = new mongoose.Types.ObjectId(scanId);
      const artifactsToSave = [
        { scanId: sId, artifactType: 'statistics', data: analysisOutput.statistics },
        { scanId: sId, artifactType: 'technologies', data: analysisOutput.technologies },
        { scanId: sId, artifactType: 'endpoints', data: analysisOutput.endpoints },
        { scanId: sId, artifactType: 'database_models', data: analysisOutput.databaseModels },
        { scanId: sId, artifactType: 'architecture_graph', data: analysisOutput.architectureGraph },
        { scanId: sId, artifactType: 'security_findings', data: analysisOutput.securityFindings },
        { scanId: sId, artifactType: 'folder_tree', data: analysisOutput.folderTree },
        { scanId: sId, artifactType: 'ai_summary', data: aiSummary },
      ];

      // Upsert artifacts
      for (const artifact of artifactsToSave) {
        await ScanArtifact.findOneAndUpdate(
          { scanId: artifact.scanId, artifactType: artifact.artifactType },
          { data: artifact.data },
          { upsert: true }
        );
      }

      // Mark Scan completed
      await Scan.findByIdAndUpdate(scanId, {
        status: 'completed',
        stage: 'completed',
        progressPercentage: 100,
        completedAt: new Date(),
        summaryMetrics: analysisOutput.summaryMetrics,
      });

      console.log(`[ScanQueue] Scan ${scanId} completed successfully!`);
    } catch (error: any) {
      console.error(`[ScanQueue] Scan ${scanId} failed:`, error);
      await Scan.findByIdAndUpdate(scanId, {
        status: 'failed',
        stage: 'failed',
        errorMessage: error.message || 'An error occurred during repository analysis.',
      });
    }
  }

  private async updateProgress(scanId: string, stage: string, progressPercentage: number) {
    await Scan.findByIdAndUpdate(scanId, {
      stage,
      progressPercentage,
    });
  }
}

export const scanQueue = new ScanQueue();
