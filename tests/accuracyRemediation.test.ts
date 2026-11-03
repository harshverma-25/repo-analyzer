import test from 'node:test';
import assert from 'node:assert/strict';
import { runSecurityScan } from '../packages/analyzer/src/security/securityScanner.js';
import { extractExpressRoutes } from '../packages/analyzer/src/express/routeExtractor.js';
import type { RouteFinding } from '@repo-analyzer/shared';

// ============================================================================
// PART 1: Security Scanner Method-Name Collisions & AST Callee Accuracy (10 tests)
// ============================================================================

test('Security Scanner — detects global eval() call', () => {
  const code = `
    const userInput = "alert(1)";
    eval(userInput);
  `;
  const findings = runSecurityScan([{ path: 'src/evalTest.ts', content: code }], []);
  const evalFinding = findings.find((f) => f.category === 'code_execution');
  assert.ok(evalFinding, 'Should detect global eval');
  assert.equal(evalFinding.severity, 'high');
});

test('Security Scanner — detects new Function() dynamic execution', () => {
  const code = `
    const dynamicFn = new Function('a', 'b', 'return a + b');
  `;
  const findings = runSecurityScan([{ path: 'src/functionTest.ts', content: code }], []);
  const fnFinding = findings.find((f) => f.category === 'code_execution');
  assert.ok(fnFinding, 'Should detect new Function');
});

test('Security Scanner — suppresses false positive on redis.eval()', () => {
  const code = `
    import { createClient } from 'redis';
    const redis = createClient();
    const result = await redis.eval('return redis.call("get", "key")', { keys: [] });
  `;
  const findings = runSecurityScan([{ path: 'src/redisService.ts', content: code }], []);
  const evalFinding = findings.find((f) => f.category === 'code_execution');
  assert.equal(evalFinding, undefined, 'redis.eval() must not be detected as JavaScript dynamic evaluation');
});

test('Security Scanner — suppresses false positive on query.exec()', () => {
  const code = `
    import mongoose from 'mongoose';
    const user = await mongoose.model('User').findOne({ email: 'test@example.com' }).exec();
  `;
  const findings = runSecurityScan([{ path: 'src/userService.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.equal(execFinding, undefined, 'query.exec() must not be detected as shell command execution');
});

test('Security Scanner — suppresses false positive on regex pattern.exec()', () => {
  const code = `
    const pattern = /^[a-z]+$/;
    const match = pattern.exec('hello');
  `;
  const findings = runSecurityScan([{ path: 'src/validator.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.equal(execFinding, undefined, 'pattern.exec() must not be detected as command execution');
});

test('Security Scanner — detects named child_process.exec import call', () => {
  const code = `
    import { exec } from 'child_process';
    exec('ls -la ' + dir);
  `;
  const findings = runSecurityScan([{ path: 'src/shell.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.ok(execFinding, 'Should detect named child_process.exec');
  assert.equal(execFinding.severity, 'medium');
});

test('Security Scanner — detects aliased exec import from node:child_process', () => {
  const code = `
    import { exec as runCommand } from 'node:child_process';
    runCommand('cat ' + filename);
  `;
  const findings = runSecurityScan([{ path: 'src/runner.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.ok(execFinding, 'Should detect aliased exec call');
});

test('Security Scanner — detects namespace child_process import call', () => {
  const code = `
    import * as cp from 'child_process';
    cp.exec('ping ' + host);
  `;
  const findings = runSecurityScan([{ path: 'src/ping.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.ok(execFinding, 'Should detect cp.exec');
});

test('Security Scanner — detects CommonJS require of node:child_process', () => {
  const code = `
    const cp = require('node:child_process');
    cp.execSync('whoami');
  `;
  const findings = runSecurityScan([{ path: 'src/admin.js', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.ok(execFinding, 'Should detect cp.execSync from node:child_process');
});

test('Security Scanner — suppresses false positive on unrelated object methods named exec', () => {
  const code = `
    class JobRunner {
      exec() { return true; }
    }
    const runner = new JobRunner();
    runner.exec();
    const mongooseQuery = { exec: () => {} };
    mongooseQuery.exec();
  `;
  const findings = runSecurityScan([{ path: 'src/jobs.ts', content: code }], []);
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.equal(execFinding, undefined, 'Custom exec methods must not trigger command injection finding');
});

// ============================================================================
// PART 2: Express Extraction Accuracy & Cross-File Resolution (15 tests)
// ============================================================================

test('Express Extractor — extracts Express app.get()', () => {
  const code = `
    import express from 'express';
    const app = express();
    app.get('/health', (req, res) => res.json({ ok: true }));
  `;
  const routes = extractExpressRoutes([{ path: 'src/server.ts', content: code }]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].method, 'GET');
  assert.equal(routes[0].resolvedPath, '/health');
});

test('Express Extractor — extracts Express router.post()', () => {
  const code = `
    import { Router } from 'express';
    const router = Router();
    router.post('/login', handleLogin);
  `;
  const routes = extractExpressRoutes([{ path: 'src/auth.ts', content: code }]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].method, 'POST');
  assert.equal(routes[0].resolvedPath, '/login');
});

test('Express Extractor — ignores axios.get()', () => {
  const code = `
    import axios from 'axios';
    const response = await axios.get('/api/users');
  `;
  const routes = extractExpressRoutes([{ path: 'src/client.ts', content: code }]);
  assert.equal(routes.length, 0, 'axios.get should not be extracted as an Express route');
});

test('Express Extractor — ignores api.post() client calls', () => {
  const code = `
    import { api } from './apiClient';
    api.post('/users', { name: 'Alice' });
  `;
  const routes = extractExpressRoutes([{ path: 'src/services/apiService.ts', content: code }]);
  assert.equal(routes.length, 0, 'api.post client calls must not be extracted');
});

test('Express Extractor — ignores client.put() and http.delete() calls', () => {
  const code = `
    const client = new HttpClient();
    client.put('/profile', { bio: 'hello' });
    http.delete('/items/1');
  `;
  const routes = extractExpressRoutes([{ path: 'src/utils/http.ts', content: code }]);
  assert.equal(routes.length, 0, 'client.put and http.delete must not be extracted');
});

test('Express Extractor — supports router.route().get() chained calls', () => {
  const code = `
    import { Router } from 'express';
    const router = Router();
    router.route('/items')
      .get(listItems)
      .post(createItem);
  `;
  const routes = extractExpressRoutes([{ path: 'src/routes.ts', content: code }]);
  assert.equal(routes.length, 2);
  assert.ok(routes.some((r) => r.method === 'GET' && r.resolvedPath === '/items'));
  assert.ok(routes.some((r) => r.method === 'POST' && r.resolvedPath === '/items'));
});

test('Express Extractor — resolves default-exported router across files with prefix and auth', () => {
  const appCode = `
    import express from 'express';
    import userRouter from './routes/userRouter.js';
    const app = express();
    app.use('/api/users', authenticate, userRouter);
  `;
  const routerCode = `
    import express from 'express';
    const router = express.Router();
    router.get('/', getUsers);
    router.get('/:id', getUser);
    export default router;
  `;
  const routes = extractExpressRoutes([
    { path: 'src/app.ts', content: appCode },
    { path: 'src/routes/userRouter.ts', content: routerCode },
  ]);
  assert.equal(routes.length, 2);
  const rootRoute = routes.find((r) => r.rawPath === '/');
  assert.ok(rootRoute);
  assert.equal(rootRoute.resolvedPath, '/api/users');
  assert.equal(rootRoute.authRequired, true);
  assert.ok(rootRoute.middlewareChain.includes('authenticate'));
  assert.equal(rootRoute.confidence, 'confirmed');

  const idRoute = routes.find((r) => r.rawPath === '/:id');
  assert.ok(idRoute);
  assert.equal(idRoute.resolvedPath, '/api/users/:id');
  assert.equal(idRoute.authRequired, true);
});

test('Express Extractor — resolves named-exported router across files', () => {
  const appCode = `
    import express from 'express';
    import { productRouter } from './routes/productRouter.js';
    const app = express();
    app.use('/products', productRouter);
  `;
  const routerCode = `
    import { Router } from 'express';
    export const productRouter = Router();
    productRouter.get('/all', getAllProducts);
  `;
  const routes = extractExpressRoutes([
    { path: 'src/server.ts', content: appCode },
    { path: 'src/routes/productRouter.ts', content: routerCode },
  ]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].resolvedPath, '/products/all');
  assert.equal(routes[0].confidence, 'confirmed');
});

test('Express Extractor — resolves aliased named router import across files', () => {
  const appCode = `
    import express from 'express';
    import { ordersRouter as orders } from './routes/ordersRouter.js';
    const app = express();
    app.use('/v2/orders', orders);
  `;
  const routerCode = `
    import { Router } from 'express';
    export const ordersRouter = Router();
    ordersRouter.post('/checkout', checkoutHandler);
  `;
  const routes = extractExpressRoutes([
    { path: 'src/app.ts', content: appCode },
    { path: 'src/routes/ordersRouter.ts', content: routerCode },
  ]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].resolvedPath, '/v2/orders/checkout');
  assert.equal(routes[0].confidence, 'confirmed');
});

test('Express Extractor — computes nested cross-file mount prefixes correctly', () => {
  const appCode = `
    import express from 'express';
    import apiRouter from './routes/api.js';
    const app = express();
    app.use('/api', apiRouter);
  `;
  const apiCode = `
    import { Router } from 'express';
    import userRouter from './users.js';
    const router = Router();
    router.use('/v1', userRouter);
    export default router;
  `;
  const userCode = `
    import { Router } from 'express';
    const router = Router();
    router.get('/profile', getProfile);
    export default router;
  `;
  const routes = extractExpressRoutes([
    { path: 'src/app.ts', content: appCode },
    { path: 'src/routes/api.ts', content: apiCode },
    { path: 'src/routes/users.ts', content: userCode },
  ]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].resolvedPath, '/api/v1/profile');
  assert.equal(routes[0].confidence, 'confirmed');
});

test('Express Extractor — mount-level authentication is inherited by mounted routes', () => {
  const appCode = `
    import express from 'express';
    import adminRouter from './routes/admin.js';
    const app = express();
    app.use('/admin', verifyAdminToken, adminRouter);
  `;
  const adminCode = `
    import { Router } from 'express';
    const router = Router();
    router.get('/stats', getStats);
    export default router;
  `;
  const routes = extractExpressRoutes([
    { path: 'src/server.ts', content: appCode },
    { path: 'src/routes/admin.ts', content: adminCode },
  ]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].resolvedPath, '/admin/stats');
  assert.equal(routes[0].authRequired, true);
  assert.ok(routes[0].middlewareChain.includes('verifyAdminToken'));
});

test('Express Extractor — router-level authentication is inherited across files', () => {
  const appCode = `
    import express from 'express';
    import secureRouter from './routes/secure.js';
    const app = express();
    app.use('/secure', secureRouter);
  `;
  const secureCode = `
    import { Router } from 'express';
    const router = Router();
    router.use(requireAuth);
    router.delete('/account', deleteAccount);
    export default router;
  `;
  const routes = extractExpressRoutes([
    { path: 'src/server.ts', content: appCode },
    { path: 'src/routes/secure.ts', content: secureCode },
  ]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].authRequired, true);
  assert.ok(routes[0].middlewareChain.includes('requireAuth'));
});

test('Express Extractor — middleware declared after an earlier route does not retroactively protect it', () => {
  const code = `
    import { Router } from 'express';
    const router = Router();

    // Line 6: public route before auth middleware
    router.get('/public', publicHandler);

    // Line 9: auth middleware registered here
    router.use(authenticate);

    // Line 12: private route after auth middleware
    router.get('/private', privateHandler);
  `;
  const routes = extractExpressRoutes([{ path: 'src/router.ts', content: code }]);
  assert.equal(routes.length, 2);

  const publicRoute = routes.find((r) => r.resolvedPath === '/public');
  assert.ok(publicRoute);
  assert.equal(
    publicRoute.authRequired,
    false,
    'Public route defined before router.use(authenticate) must not inherit auth'
  );
  assert.ok(!publicRoute.middlewareChain.includes('authenticate'));

  const privateRoute = routes.find((r) => r.resolvedPath === '/private');
  assert.ok(privateRoute);
  assert.equal(
    privateRoute.authRequired,
    true,
    'Private route defined after router.use(authenticate) must inherit auth'
  );
  assert.ok(privateRoute.middlewareChain.includes('authenticate'));
});

test('Express Extractor — does not mix identically named routers in separate files', () => {
  const appCode = `
    import express from 'express';
    import usersRouter from './routes/users.js';
    import postsRouter from './routes/posts.js';
    const app = express();
    app.use('/users', usersRouter);
    app.use('/posts', postsRouter);
  `;
  const usersCode = `
    import { Router } from 'express';
    const router = Router();
    router.get('/list', listUsers);
    export default router;
  `;
  const postsCode = `
    import { Router } from 'express';
    const router = Router();
    router.get('/list', listPosts);
    export default router;
  `;
  const routes = extractExpressRoutes([
    { path: 'src/app.ts', content: appCode },
    { path: 'src/routes/users.ts', content: usersCode },
    { path: 'src/routes/posts.ts', content: postsCode },
  ]);
  assert.equal(routes.length, 2);
  const userRoute = routes.find((r) => r.filePath.includes('users.ts'));
  assert.ok(userRoute);
  assert.equal(userRoute.resolvedPath, '/users/list');

  const postRoute = routes.find((r) => r.filePath.includes('posts.ts'));
  assert.ok(postRoute);
  assert.equal(postRoute.resolvedPath, '/posts/list');
});

test('Express Extractor — dynamic or unresolved mounts do not produce falsely confirmed results', () => {
  const code = `
    import express from 'express';
    const app = express();
    const dynamicMountPath = process.env.MOUNT_POINT || '/dynamic';
    app.use(dynamicMountPath, unknownRouter);
    app.get('/static', (req, res) => res.send('ok'));
  `;
  const routes = extractExpressRoutes([{ path: 'src/app.ts', content: code }]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].resolvedPath, '/static');
  assert.equal(routes[0].confidence, 'inferred');
});

// ============================================================================
// PART 3: Public Endpoint Assessment Accuracy (6 tests)
// ============================================================================

test('Public Auth Assessment — login is not treated as ordinary unauthenticated business endpoint', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r1',
      method: 'POST',
      resolvedPath: '/login',
      rawPath: '/login',
      filePath: 'src/auth.ts',
      lineNumber: 10,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const loginFinding = findings.find((f) => f.category === 'missing_authentication');
  assert.ok(loginFinding);
  assert.ok(loginFinding.title.includes('Requires Abuse Protection'), 'Must receive public login assessment');
  assert.ok(!loginFinding.title.includes('Without Detected Authentication'), 'Must not use ordinary missing auth message');
});

test('Public Auth Assessment — OAuth entry points receive differentiated assessment', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r2',
      method: 'POST',
      resolvedPath: '/auth/google',
      rawPath: '/auth/google',
      filePath: 'src/oauth.ts',
      lineNumber: 15,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const oauthFinding = findings.find((f) => f.title.includes('OAuth Endpoint'));
  assert.ok(oauthFinding, 'OAuth endpoint must receive specific OAuth assessment');
  assert.ok(oauthFinding.title.includes('Requires State & Token Validation'));
});

test('Public Auth Assessment — guest authentication receives differentiated assessment', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r3',
      method: 'POST',
      resolvedPath: '/auth/guest',
      rawPath: '/auth/guest',
      filePath: 'src/guest.ts',
      lineNumber: 20,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const guestFinding = findings.find((f) => f.title.includes('Guest Authentication'));
  assert.ok(guestFinding, 'Guest auth must receive specific guest assessment');
  assert.ok(guestFinding.title.includes('Requires Abuse Prevention'));
});

test('Public Auth Assessment — refresh and logout are assessed and not silently marked safe', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r4',
      method: 'POST',
      resolvedPath: '/refresh',
      rawPath: '/refresh',
      filePath: 'src/token.ts',
      lineNumber: 25,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
    {
      id: 'r5',
      method: 'POST',
      resolvedPath: '/logout',
      rawPath: '/logout',
      filePath: 'src/token.ts',
      lineNumber: 35,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const refreshFinding = findings.find((f) => f.title.includes('Token Refresh Endpoint'));
  assert.ok(refreshFinding, 'Refresh must not be silently marked safe');

  const logoutFinding = findings.find((f) => f.title.includes('Session Invalidation Endpoint'));
  assert.ok(logoutFinding, 'Logout must not be silently marked safe');
});

test('Public Auth Assessment — webhooks without signature verification are flagged', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r6',
      method: 'POST',
      resolvedPath: '/webhook',
      rawPath: '/webhook',
      filePath: 'src/stripe.ts',
      lineNumber: 40,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const webhookFinding = findings.find((f) => f.title.includes('Webhook Endpoint'));
  assert.ok(webhookFinding, 'Webhook without signature verification must be flagged');
  assert.ok(webhookFinding.title.includes('Requires Signature Verification'));
});

test('Public Auth Assessment — ordinary mutating business route remains flagged as missing authentication', () => {
  const routes: RouteFinding[] = [
    {
      id: 'r7',
      method: 'POST',
      resolvedPath: '/api/v1/orders',
      rawPath: '/api/v1/orders',
      filePath: 'src/orders.ts',
      lineNumber: 50,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [201],
      authRequired: false,
      confidence: 'inferred',
    },
  ];
  const findings = runSecurityScan([], routes);
  const businessFinding = findings.find(
    (f) => f.title.includes('Mutating Route') && f.title.includes('Without Detected Authentication')
  );
  assert.ok(businessFinding, 'Ordinary mutating route without auth must be flagged');
  assert.equal(businessFinding.severity, 'medium');
});

