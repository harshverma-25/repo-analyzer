import { GitHubClient } from '../packages/analyzer/src/github/client.js';
import { filterRepoFile } from '../packages/analyzer/src/ingestion/filter.js';
import { runDeterministicAnalysis, type RawRepoFile } from '../packages/analyzer/src/pipeline.js';

interface RepoTestCase {
  category: string;
  owner: string;
  repo: string;
  branch?: string;
  notes: string;
}

const REPOS_TO_TEST: RepoTestCase[] = [
  {
    category: '1. Small JavaScript Express Repo',
    owner: 'expressjs',
    repo: 'body-parser',
    notes: 'Classic JS Express middleware library with strict modular parsing and zero application endpoints',
  },
  {
    category: '2. TypeScript Express Repo with Nested Routers',
    owner: 'santiq',
    repo: 'bulletproof-nodejs',
    notes: 'Production-ready TypeScript Express 3-tier architecture with nested /api/routes and auth middlewares',
  },
  {
    category: '3. Larger Node.js Backend Repository',
    owner: 'expressjs',
    repo: 'express',
    notes: 'Core Node.js web application framework with extensive router implementations and middleware chains',
  },
  {
    category: '4. Repository using Mongoose Models',
    owner: 'madhums',
    repo: 'node-express-mongoose-demo',
    notes: 'Classic production demo with Mongoose Schemas (User, Article, Comment), refs, and indexes',
  },
  {
    category: '5. Repository with Complex or Dynamically Constructed Routes',
    owner: 'pillarjs',
    repo: 'router',
    notes: 'Low-level router implementation with dynamic regex dispatch, subrouting, and unresolved static routes',
  },
  {
    category: '6. Alternative Backend Framework (Fastify)',
    owner: 'fastify',
    repo: 'fastify',
    notes: 'Fastify core framework: uses plugin architecture and schema-based routing; returns 0 Express endpoints',
  },
];

async function runRealRepoTests() {
  const client = new GitHubClient();
  const results: any[] = [];

  console.log('=== Starting Real Repository Validation Tests ===\n');

  for (const t of REPOS_TO_TEST) {
    console.log(`[Test] Ingesting "${t.owner}/${t.repo}" (${t.category})...`);
    const startTime = Date.now();

    try {
      // 1. Resolve repo & commit
      const details = await client.getRepoDetails(t.owner, t.repo);
      const commitSha = await client.resolveCommitSha(t.owner, t.repo, t.branch || details.defaultBranch);
      console.log(`  -> Resolved Commit: ${commitSha.substring(0, 8)} on branch ${details.defaultBranch}`);

      // 2. Fetch Git Tree
      const tree = await client.getGitTree(t.owner, t.repo, commitSha);
      console.log(`  -> Tree entries: ${tree.items.length} (Truncated: ${tree.truncated})`);

      // 3. Filter candidate files
      const candidateFiles = tree.items.filter((item) => {
        if (item.type !== 'blob') return false;
        const filter = filterRepoFile(item.path, item.size);
        if (!filter.accepted) return false;

        const p = item.path.toLowerCase();
        return (
          p.endsWith('.js') ||
          p.endsWith('.ts') ||
          p.endsWith('.json') ||
          p.endsWith('.md')
        );
      });

      // Prioritize manifests and configs first, then code
      candidateFiles.sort((a, b) => {
        const aLower = a.path.toLowerCase();
        const bLower = b.path.toLowerCase();
        const aIsManifest = aLower === 'package.json' || aLower === 'tsconfig.json';
        const bIsManifest = bLower === 'package.json' || bLower === 'tsconfig.json';
        if (aIsManifest && !bIsManifest) return -1;
        if (!aIsManifest && bIsManifest) return 1;
        return 0;
      });

      // Sample up to 30 code files
      const sample = candidateFiles.slice(0, 30);
      console.log(`  -> Fetching sample batch of ${sample.length} files...`);

      const rawFiles: RawRepoFile[] = [];
      for (const item of sample) {
        try {
          const content = await client.fetchRawFile(t.owner, t.repo, commitSha, item.path);
          rawFiles.push({
            path: item.path,
            content,
            sizeBytes: item.size || Buffer.byteLength(content),
          });
        } catch {
          // Skip if missing
        }
      }

      // 4. Run Deterministic Analysis
      const analysis = runDeterministicAnalysis(rawFiles);

      // 5. Test AI Summary generation
      const { FallbackAIProvider } = await import('../packages/ai/src/providers/fallbackProvider.js');
      const aiProvider = new FallbackAIProvider();
      const aiSummary = await aiProvider.generateSummary({
        repoName: `${t.owner}/${t.repo}`,
        commitSha,
        statistics: analysis.statistics,
        technologies: analysis.technologies,
        endpoints: analysis.endpoints,
        databaseModels: analysis.databaseModels,
        securityFindings: analysis.securityFindings,
      });

      const durationMs = Date.now() - startTime;

      console.log(`  -> Analysis completed in ${durationMs}ms`);
      console.log(`     * Analyzed Files: ${analysis.statistics.analyzedFiles}`);
      console.log(`     * Source Code Lines: ${analysis.statistics.codeLines.toLocaleString()}`);
      console.log(`     * Detected Tech: ${analysis.technologies.map((tech) => tech.name).join(', ') || 'None'}`);
      console.log(`     * Endpoints Discovered: ${analysis.endpoints.length}`);
      console.log(`     * Database Models: ${analysis.databaseModels.map((m) => m.modelName).join(', ') || 'None'}`);
      console.log(`     * Security Findings: ${analysis.securityFindings.length}`);
      console.log(`     * Skipped / Diagnostics: ${JSON.stringify(analysis.statistics.skippedReasons)}`);

      results.push({
        repo: `${t.owner}/${t.repo}`,
        category: t.category,
        commitSha,
        totalTreeItems: tree.items.length,
        analyzedFiles: analysis.statistics.analyzedFiles,
        codeLines: analysis.statistics.codeLines,
        technologies: analysis.technologies.map((tech) => tech.name),
        endpointCount: analysis.endpoints.length,
        endpointsSample: analysis.endpoints.slice(0, 5).map((e) => `${e.method} ${e.resolvedPath}`),
        modelCount: analysis.databaseModels.length,
        modelsSample: analysis.databaseModels.map((m) => m.modelName),
        securityCount: analysis.securityFindings.length,
        securitySample: analysis.securityFindings.slice(0, 3).map((s) => `[${s.severity}] ${s.title}`),
        skippedReasons: analysis.statistics.skippedReasons,
        aiOverviewSample: aiSummary.overview.substring(0, 160) + '...',
        aiKeyFeaturesCount: aiSummary.keyFeatures.length,
        durationMs,
        notes: t.notes,
      });
    } catch (err: any) {
      console.error(`  -> Failed: ${err.message}`);
      results.push({
        repo: `${t.owner}/${t.repo}`,
        category: t.category,
        error: err.message,
      });
    }

    console.log('');
  }

  return results;
}

runRealRepoTests()
  .then((results) => {
    console.log('=== Real Repository Test Results Summary ===');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(console.error);
