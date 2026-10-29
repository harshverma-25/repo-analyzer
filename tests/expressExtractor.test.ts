import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { extractExpressRoutes } from '../packages/analyzer/src/express/routeExtractor.js';

test('Express Extractor — extracts basic routes and status codes', () => {
  const content = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-basic/server.js'),
    'utf8'
  );

  const routes = extractExpressRoutes([{ path: 'server.js', content }]);
  assert.equal(routes.length, 2);

  const getRoute = routes.find((r) => r.method === 'GET');
  assert.ok(getRoute);
  assert.equal(getRoute.resolvedPath, '/health');
  assert.ok(getRoute.inferredStatusCodes.includes(200));

  const postRoute = routes.find((r) => r.method === 'POST');
  assert.ok(postRoute);
  assert.equal(postRoute.resolvedPath, '/users');
  assert.ok(postRoute.inferredStatusCodes.includes(201));
});

test('Express Extractor — resolves nested router mount prefixes and auth middleware', () => {
  const appContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/app.ts'),
    'utf8'
  );
  const apiRouterContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/routes/apiRouter.ts'),
    'utf8'
  );
  const userRouterContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/routes/userRouter.ts'),
    'utf8'
  );

  const files = [
    { path: 'src/app.ts', content: appContent },
    { path: 'src/routes/apiRouter.ts', content: apiRouterContent },
    { path: 'src/routes/userRouter.ts', content: userRouterContent },
  ];

  const routes = extractExpressRoutes(files);
  assert.ok(routes.length >= 2, `Expected at least 2 routes, found ${routes.length}`);

  // Check resolved prefix /api/v1/users/:id
  const userDetailRoute = routes.find((r) => r.rawPath === '/users/:id');
  assert.ok(userDetailRoute, 'Should discover /users/:id route');
  assert.equal(userDetailRoute.resolvedPath, '/api/v1/users/:id');
  assert.equal(userDetailRoute.authRequired, true);
  assert.equal(userDetailRoute.parameters.length, 1);
  assert.equal(userDetailRoute.parameters[0].name, 'id');
  assert.equal(userDetailRoute.confidence, 'confirmed');

  // Check dynamic route is flagged
  const dynamicRoute = routes.find((r) => r.rawPath === 'dynamicSegment');
  assert.ok(dynamicRoute, 'Should find dynamic route call');
  assert.equal(dynamicRoute.confidence, 'unresolved');
  assert.ok(dynamicRoute.diagnostics && dynamicRoute.diagnostics.length > 0);
});
