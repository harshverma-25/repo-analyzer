import test from 'node:test';
import assert from 'node:assert/strict';
import { runSecurityScan, redactSecret } from '../packages/analyzer/src/security/securityScanner.js';
import { buildArchitectureGraph } from '../packages/analyzer/src/graph/graphBuilder.js';

test('Security Scanner — detects OpenAI, Slack, Google API keys, and Mongo URI credentials', () => {
  const vulnerableFiles = [
    {
      path: 'src/config.ts',
      content: `
        const openAiKey = "sk-testOpenAiDummySecretKeyForUnitTestingPurposesOnly1234";
        const slackToken = "xoxp-test-slack-token-sample-for-unit-testing-purposes-12345";
        const googleKey = "AIzaSyTestGoogleApiKeyForUnitTestingOnly1234";
        const mongoUrl = "mongodb+srv://admin:superSecretPassword123@cluster0.example.mongodb.net/app";
      `,
    },
  ];

  const findings = runSecurityScan(vulnerableFiles, []);
  assert.ok(findings.length >= 3, `Expected at least 3 findings, got ${findings.length}`);

  const titles = findings.map((f) => f.title);
  assert.ok(titles.some((t) => t.includes('OpenAI')));
  assert.ok(titles.some((t) => t.includes('Slack')));
  assert.ok(titles.some((t) => t.includes('Google') || t.includes('API Key')));
  assert.ok(titles.some((t) => t.includes('MongoDB') || t.includes('Credential')));

  // Ensure secrets are never exposed in cleartext in evidence snippets
  for (const finding of findings) {
    assert.equal(finding.evidenceSnippet.includes('superSecretPassword123'), false);
    assert.equal(finding.evidenceSnippet.includes('unit-testing-purposes-12345'), false);
  }
});

test('Architecture Graph — escapes quotation marks in Mermaid diagram labels', () => {
  const routes = [
    {
      id: 'r-1',
      method: 'GET' as const,
      resolvedPath: '/api/v1/test"quoted"',
      rawPath: '/test"quoted"',
      filePath: 'src/routes.ts',
      lineNumber: 5,
      middlewareChain: [],
      parameters: [],
      inferredStatusCodes: [200],
      authRequired: false,
      confidence: 'confirmed' as const,
    },
  ];

  const models = [
    {
      id: 'm-1',
      modelName: 'User"Special',
      filePath: 'src/models/User.ts',
      lineNumber: 10,
      fields: [],
      relationships: [],
      indexes: [],
    },
  ];

  const graph = buildArchitectureGraph(routes, models);
  assert.ok(graph.mermaidDiagram);
  // Verify that raw unescaped double quotes inside labels are escaped to &quot;
  assert.equal(graph.mermaidDiagram.includes('"[GET] /api/v1/test"quoted""'), false);
  assert.ok(graph.mermaidDiagram.includes('&quot;'));
});
