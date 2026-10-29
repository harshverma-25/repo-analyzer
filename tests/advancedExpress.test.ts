import test from 'node:test';
import assert from 'node:assert/strict';
import { extractExpressRoutes } from '../packages/analyzer/src/express/routeExtractor.js';

test('Express Extractor — suppresses false positives on map.get, cache.get, and config.get', () => {
  const code = `
    const userMap = new Map();
    const result = userMap.get('user_123');

    const cache = new MemoryCache();
    const cachedItem = cache.get('session_key');

    const port = config.get('PORT');
    const header = headers.get('authorization');
  `;

  const routes = extractExpressRoutes([{ path: 'src/utils/service.ts', content: code }]);
  assert.equal(routes.length, 0, 'Should not extract non-Express object get() calls as API endpoints');
});

test('Express Extractor — discovers multiple HTTP methods and parameterized routes', () => {
  const code = `
    import { Router } from 'express';
    export const router = Router();

    router.get('/items', listItems);
    router.post('/items', createItem);
    router.put('/items/:itemId', updateItem);
    router.delete('/items/:itemId', deleteItem);
    router.patch('/items/:itemId/status', patchItemStatus);
  `;

  const routes = extractExpressRoutes([{ path: 'src/routes/itemRouter.ts', content: code }]);
  assert.equal(routes.length, 5);

  const methods = routes.map((r) => r.method).sort();
  assert.deepEqual(methods, ['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);

  const putRoute = routes.find((r) => r.method === 'PUT');
  assert.ok(putRoute);
  assert.equal(putRoute.resolvedPath, '/items/:itemId');
  assert.equal(putRoute.parameters.length, 1);
  assert.equal(putRoute.parameters[0].name, 'itemId');
  assert.equal(putRoute.handlerName, 'updateItem');
});
