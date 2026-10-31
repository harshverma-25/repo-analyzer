import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { extractExpressRoutes } from '../packages/analyzer/src/express/routeExtractor.js';
import { extractMongooseModels } from '../packages/analyzer/src/database-models/mongooseExtractor.js';
import { runDeterministicAnalysis } from '../packages/analyzer/src/pipeline.js';
import { GitHubClient } from '../packages/analyzer/src/github/client.js';
import { GeminiProvider } from '../packages/ai/src/providers/geminiProvider.js';

test('Performance Optimization — AST Reuse in Route and Mongoose Extractors', () => {
  const code = `
    import express from 'express';
    import mongoose from 'mongoose';
    const app = express();
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true },
      email: { type: String, unique: true }
    });
    UserSchema.index({ email: 1 }, { unique: true });
    export const User = mongoose.model('User', UserSchema);

    app.get('/api/users', (req, res) => res.json([]));
    app.post('/api/users', (req, res) => res.status(201).json({ id: 1 }));
  `;

  const ast = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

  // Call with pre-parsed ast
  const routesWithAst = extractExpressRoutes([{ path: 'test.ts', content: code, ast }]);
  const modelsWithAst = extractMongooseModels([{ path: 'test.ts', content: code, ast }]);

  // Call without pre-parsed ast
  const routesFresh = extractExpressRoutes([{ path: 'test.ts', content: code }]);
  const modelsFresh = extractMongooseModels([{ path: 'test.ts', content: code }]);

  assert.equal(routesWithAst.length, 2);
  assert.equal(routesFresh.length, 2);
  assert.equal(routesWithAst[0].resolvedPath, routesFresh[0].resolvedPath);

  assert.equal(modelsWithAst.length, 1);
  assert.equal(modelsFresh.length, 1);
  assert.equal(modelsWithAst[0].modelName, modelsFresh[0].modelName);
});

test('Performance Optimization — AbortSignal Cancellation in GitHubClient', async () => {
  const client = new GitHubClient();
  const controller = new AbortController();
  controller.abort(new Error('Pre-aborted signal test'));

  await assert.rejects(
    async () => {
      await client.fetchRawFile('expressjs', 'express', 'master', 'package.json', {
        signal: controller.signal,
      });
    },
    /abort/i
  );
});

test('Performance Optimization — Gemini Provider Commit & Question Cache', async () => {
  const provider = new GeminiProvider('fake-test-key-for-cache-verification');

  // Verify caching mechanism on fallback or simulated query
  const mockContext: any = {
    repoName: 'test/repo',
    commitSha: 'commit-sha-cache-test-12345',
    statistics: { totalFiles: 5, codeLines: 100, languages: [], largestFiles: [] },
    technologies: [],
    endpoints: [],
    databaseModels: [],
    securityFindings: [],
  };

  // We can populate cache directly or test explain cache
  (provider as any).explainCache.set('commit-sha-cache-test-12345:what does this do?', {
    answer: 'Cached answer',
    referencedFiles: ['index.ts'],
  });

  const res = await provider.explainQuestion('what does this do?', mockContext);
  assert.equal(res.answer, 'Cached answer');
  assert.deepEqual(res.referencedFiles, ['index.ts']);
});
