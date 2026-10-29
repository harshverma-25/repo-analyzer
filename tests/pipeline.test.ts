import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runDeterministicAnalysis } from '../packages/analyzer/src/pipeline.js';

test('Pipeline — end-to-end deterministic analysis generates all expected artifacts', () => {
  const pkgContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/package.json'), 'utf8');
  const appContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/app.ts'), 'utf8');
  const apiRouterContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/routes/apiRouter.ts'), 'utf8');
  const userRouterContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/routes/userRouter.ts'), 'utf8');
  const userModelContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/models/User.ts'), 'utf8');
  const postModelContent = fs.readFileSync(path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/models/Post.ts'), 'utf8');

  const rawFiles = [
    { path: 'package.json', content: pkgContent },
    { path: 'src/app.ts', content: appContent },
    { path: 'src/routes/apiRouter.ts', content: apiRouterContent },
    { path: 'src/routes/userRouter.ts', content: userRouterContent },
    { path: 'src/models/User.ts', content: userModelContent },
    { path: 'src/models/Post.ts', content: postModelContent },
  ];

  const result = runDeterministicAnalysis(rawFiles);

  // Statistics
  assert.equal(result.summaryMetrics.totalFiles, 6);
  assert.equal(result.summaryMetrics.analyzedFiles, 6);
  assert.ok(result.summaryMetrics.codeLines > 20);

  // Technologies
  assert.ok(result.technologies.some((t) => t.name === 'Express.js'));
  assert.ok(result.technologies.some((t) => t.name === 'Mongoose'));
  assert.ok(result.technologies.some((t) => t.name === 'TypeScript'));

  // Endpoints
  assert.ok(result.endpoints.length >= 2);
  const userRoute = result.endpoints.find((e) => e.resolvedPath === '/api/v1/users/:id');
  assert.ok(userRoute, 'Should resolve full path /api/v1/users/:id');

  // Database Models
  assert.equal(result.databaseModels.length, 2);
  assert.ok(result.databaseModels.some((m) => m.modelName === 'User'));
  assert.ok(result.databaseModels.some((m) => m.modelName === 'Post'));

  // Architecture Graph
  assert.ok(result.architectureGraph.nodes.length > 0);
  assert.ok(result.architectureGraph.edges.length > 0);
  assert.ok(result.architectureGraph.mermaidDiagram?.includes('API_Endpoints'));

  // Folder Tree
  assert.equal(result.folderTree.type, 'directory');
  assert.ok(result.folderTree.children && result.folderTree.children.length > 0);
});
