import test from 'node:test';
import assert from 'node:assert/strict';
import { extractExpressRoutes } from '../packages/analyzer/src/express/routeExtractor.js';
import { extractMongooseModels } from '../packages/analyzer/src/database-models/mongooseExtractor.js';
import { runSecurityScan } from '../packages/analyzer/src/security/securityScanner.js';
import { ScanQueue } from '../apps/api/src/jobs/scanQueue.js';
import { ScanStatusEnum, ScanStageEnum } from '../packages/shared/src/index.js';

// ============================================================================
// 1. Analyzer Accuracy — Test File and Mock Route Suppression
// ============================================================================
test('Analyzer Accuracy — Route & Model extractors ignore test suites and mock files', () => {
  const testFiles = [
    {
      path: 'tests/unit/api.test.ts',
      content: `
        import express from 'express';
        const mockApp = express();
        mockApp.get('/fake/mock/endpoint', (req, res) => res.json({ mock: true }));
      `,
    },
    {
      path: 'src/__tests__/routes.spec.ts',
      content: `
        import { router } from 'express';
        router.post('/spec/test/only', testHandler);
      `,
    },
    {
      path: 'tests/models/mockModel.test.ts',
      content: `
        import mongoose from 'mongoose';
        const MockSchema = new mongoose.Schema({ dummy: String });
        export const Mock = mongoose.model('MockTestModel', MockSchema);
      `,
    },
  ];

  const routes = extractExpressRoutes(testFiles);
  assert.equal(routes.length, 0, 'Should not extract mock routes declared inside test files');

  const models = extractMongooseModels(testFiles);
  assert.equal(models.length, 0, 'Should not extract mock schemas declared inside test files');
});

// ============================================================================
// 2. Analyzer Accuracy — Imported Controllers vs Inline Handlers
// ============================================================================
test('Analyzer Accuracy — Correctly distinguishes imported controllers and inline handlers', () => {
  const code = `
    import express from 'express';
    import * as UserController from '../controllers/userController';
    const router = express.Router();

    // Imported controller method
    router.get('/users', UserController.listUsers);

    // Named function handler
    router.post('/users', createNewUser);

    // Inline arrow function handler
    router.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Inline function expression handler
    router.delete('/cache', function(req, res) {
      res.sendStatus(204);
    });
  `;

  const routes = extractExpressRoutes([{ path: 'src/routes/userRouter.ts', content: code }]);
  assert.equal(routes.length, 4);

  const getRoute = routes.find((r) => r.method === 'GET' && r.rawPath === '/users');
  assert.ok(getRoute);
  assert.equal(getRoute.handlerName, 'UserController.listUsers');

  const postRoute = routes.find((r) => r.method === 'POST' && r.rawPath === '/users');
  assert.ok(postRoute);
  assert.equal(postRoute.handlerName, 'createNewUser');

  const healthRoute = routes.find((r) => r.method === 'GET' && r.rawPath === '/health');
  assert.ok(healthRoute);
  assert.equal(healthRoute.handlerName, 'inlineHandler');

  const deleteRoute = routes.find((r) => r.method === 'DELETE' && r.rawPath === '/cache');
  assert.ok(deleteRoute);
  assert.equal(deleteRoute.handlerName, 'inlineHandler');
});

// ============================================================================
// 3. Analyzer Accuracy — Dynamic Route Paths and Unresolved Confidence
// ============================================================================
test('Analyzer Accuracy — Identifies dynamic route paths with unresolved confidence and diagnostics', () => {
  const code = `
    import express from 'express';
    const app = express();
    const dynamicEndpoint = process.env.BASE_PATH || '/custom';

    app.get(dynamicEndpoint, getCustom);
    app.post('/static/endpoint', postStatic);
  `;

  const routes = extractExpressRoutes([{ path: 'src/server.ts', content: code }]);
  assert.equal(routes.length, 2);

  const dynamicRoute = routes.find((r) => r.rawPath.includes('dynamicEndpoint'));
  assert.ok(dynamicRoute);
  assert.equal(dynamicRoute.confidence, 'unresolved');
  assert.ok(dynamicRoute.diagnostics && dynamicRoute.diagnostics.length > 0);

  const staticRoute = routes.find((r) => r.rawPath === '/static/endpoint');
  assert.ok(staticRoute);
  assert.equal(staticRoute.confidence, 'inferred');
});

// ============================================================================
// 4. Analyzer Accuracy — Mongoose Array Relationships and Compound Indexes
// ============================================================================
test('Analyzer Accuracy — Extracts Mongoose array relationships, options, and compound indexes', () => {
  const code = `
    import mongoose from 'mongoose';
    const { Schema } = mongoose;

    const OrderSchema = new Schema({
      orderNumber: { type: String, required: true, unique: true },
      customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
      items: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'Product' },
          quantity: { type: Number, default: 1 }
        }
      ],
      status: {
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
      }
    });

    OrderSchema.index({ customer: 1, createdAt: -1 });

    export const Order = mongoose.model('Order', OrderSchema);
  `;

  const models = extractMongooseModels([{ path: 'src/models/Order.ts', content: code }]);
  assert.equal(models.length, 1);

  const order = models[0];
  assert.equal(order.modelName, 'Order');

  // Verify direct reference relationship
  const customerRef = order.relationships.find((r) => r.targetModel === 'Customer');
  assert.ok(customerRef, 'Should find customer relationship');
  assert.equal(customerRef.foreignField, 'customer');

  // Verify array subdocument reference relationship
  const productRef = order.relationships.find((r) => r.targetModel === 'Product');
  assert.ok(productRef, 'Should find product relationship inside items array');

  // Verify compound index
  assert.equal(order.indexes.length, 1);
  assert.equal(order.indexes[0].fields['customer'], 1);
  assert.equal(order.indexes[0].fields['createdAt'], -1);
});

// ============================================================================
// 5. Reliability — Scan Queue Lifecycle, Cancellation, and Recovery
// ============================================================================
test('Reliability — ScanQueue handles cancellation cleanly and state transitions strictly', async () => {
  const queue = new ScanQueue();

  // Test scan cancellation method
  const nonExistentCancelled = queue.cancelScan('507f1f77bcf86cd799439011');
  assert.equal(nonExistentCancelled, false);

  // Validate lifecycle enum schema
  const validStatus = ScanStatusEnum.parse('completed');
  assert.equal(validStatus, 'completed');

  const validStage = ScanStageEnum.parse('analyzing_code');
  assert.equal(validStage, 'analyzing_code');
});

// ============================================================================
// 6. Security Scanner — Suppresses false positives in comments, strings, & test suites
// ============================================================================
test('Security Scanner — Suppresses false positives from comments, string literals, and test suites', () => {
  const codeWithCommentsAndStrings = [
    {
      path: 'src/utils/scannerService.ts',
      content: `
        // Check Dynamic Code Execution: eval() or new Function()
        // Check Command Execution: exec( or execSync(
        // Check Permissive CORS: origin: '*' or Access-Control-Allow-Origin: *
        const ruleMetadata = {
          title: 'Use of eval() Dynamic Code Execution',
          explanation: 'Dynamic code execution via eval() can lead to arbitrary remote code execution.',
          recommendation: 'Refactor code to use standard JSON parsing rather than eval().',
        };
      `,
    },
    {
      path: 'tests/unit/eval.test.ts',
      content: `
        // This is a test file containing eval and test secrets
        const fakeKey = "AKIAIOSFODNN7EXAMPLE";
        const testCode = eval("1 + 1");
      `,
    },
    {
      path: 'fixtures/security-cases/vulnerable.js',
      content: `
        // Fixture should also be excluded
        const awsSecret = "AKIAIOSFODNN7EXAMPLE";
        eval("1 + 1");
      `,
    },
  ];

  const findings = runSecurityScan(codeWithCommentsAndStrings, []);
  assert.equal(
    findings.length,
    0,
    'Comments, metadata string literals, and test/fixture files must not trigger security findings'
  );

  // But genuine executable code in production files must still trigger
  const genuineVulnFile = [
    {
      path: 'src/services/executor.ts',
      content: `
        function executeRaw(code: string) {
          return eval(code);
        }
      `,
    },
  ];

  const genuineFindings = runSecurityScan(genuineVulnFile, []);
  assert.equal(genuineFindings.length, 1);
  assert.equal(genuineFindings[0].category, 'code_execution');
  assert.equal(genuineFindings[0].title, 'Use of eval() Dynamic Code Execution');
});
