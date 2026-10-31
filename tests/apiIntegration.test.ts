import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateScanRequestSchema, AIExplainRequestSchema } from '../packages/shared/src/index.js';
import { FallbackAIProvider } from '../packages/ai/src/providers/fallbackProvider.js';

test('API Integration — validates input payloads strictly using Zod', () => {
  // Valid public GitHub URL
  const valid = CreateScanRequestSchema.safeParse({
    repoUrl: 'https://github.com/expressjs/express',
    branch: 'master',
  });
  assert.equal(valid.success, true);

  // Invalid non-GitHub host
  const invalidHost = CreateScanRequestSchema.safeParse({
    repoUrl: 'https://gitlab.com/expressjs/express',
  });
  assert.equal(invalidHost.success, false);

  // SSRF attempt
  const ssrf = CreateScanRequestSchema.safeParse({
    repoUrl: 'http://169.254.169.254/secret',
  });
  assert.equal(ssrf.success, false);

  // Valid AI Explain payload
  const validAi = AIExplainRequestSchema.safeParse({
    question: 'How does authentication work?',
  });
  assert.equal(validAi.success, true);

  // Empty question
  const invalidAi = AIExplainRequestSchema.safeParse({
    question: '',
  });
  assert.equal(invalidAi.success, false);

  // Oversized question (> 500 characters)
  const oversizedAi = AIExplainRequestSchema.safeParse({
    question: 'A'.repeat(501),
  });
  assert.equal(oversizedAi.success, false);

  // Oversized branch name (> 100 characters)
  const oversizedBranch = CreateScanRequestSchema.safeParse({
    repoUrl: 'https://github.com/expressjs/express',
    branch: 'x'.repeat(101),
  });
  assert.equal(oversizedBranch.success, false);
});

test('API Integration — FallbackAIProvider reliably produces complete grounded summaries without live API keys', async () => {
  const fallback = new FallbackAIProvider();
  assert.equal(fallback.isAvailable(), true);

  const context = {
    repoName: 'expressjs/express',
    commitSha: 'e4d3a2b1c09876543210fedcba0123456789abcd',
    statistics: {
      totalFiles: 20,
      analyzedFiles: 20,
      skippedFiles: 0,
      totalLines: 1200,
      codeLines: 950,
      blankLines: 150,
      commentLines: 100,
      languages: [{ language: 'JavaScript', files: 20, codeLines: 950, blankLines: 150, commentLines: 100, totalLines: 1200, percentage: 100 }],
      largestFiles: [],
      skippedReasons: {},
    },
    technologies: [
      { name: 'Express.js', category: 'framework' as const, confidence: 'confirmed' as const, evidence: 'express in package.json' },
    ],
    endpoints: [
      {
        id: 'r-1',
        method: 'GET' as const,
        resolvedPath: '/api/v1/health',
        rawPath: '/health',
        filePath: 'src/server.js',
        lineNumber: 10,
        middlewareChain: [],
        parameters: [],
        inferredStatusCodes: [200],
        authRequired: false,
        confidence: 'confirmed' as const,
      },
    ],
    databaseModels: [],
    securityFindings: [],
  };

  const summary = await fallback.generateSummary(context);
  assert.ok(summary.overview.includes('expressjs/express'));
  assert.ok(summary.keyFeatures.length > 0);
  assert.ok(summary.architectureOverview.length > 10);
  assert.ok(summary.suggestedExplorationPaths.length > 0);

  const qAnswer = await fallback.explainQuestion('How do API endpoints work?', context);
  assert.ok(qAnswer.answer.includes('/api/v1/health'));
  assert.ok(qAnswer.referencedFiles.includes('src/server.js'));
});
