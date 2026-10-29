import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runSecurityScan, redactSecret } from '../packages/analyzer/src/security/securityScanner.js';

test('Security Scanner — redacts sensitive secret strings', () => {
  const secret = 'AKIAIOSFODNN7EXAMPLE';
  const masked = redactSecret(secret);
  assert.ok(!masked.includes('IOSFODNN7'), 'Secret body must not be in the masked string');
  assert.ok(masked.includes('***'), 'Must contain mask asterisks');
  assert.equal(masked.startsWith('AKI'), true);
});

test('Security Scanner — detects security observation patterns on vulnerable fixture', () => {
  const vulnContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/security-cases/vulnerable.js'),
    'utf8'
  );

  const findings = runSecurityScan(
    [{ path: 'vulnerable.js', content: vulnContent }],
    []
  );

  assert.ok(findings.length >= 3, `Expected at least 3 findings, got ${findings.length}`);

  // Check AWS secret finding
  const secretFinding = findings.find((f) => f.category === 'hardcoded_credential');
  assert.ok(secretFinding, 'Should detect hardcoded secret');
  assert.ok(!secretFinding.evidenceSnippet.includes('AKIAIOSFODNN7EXAMPLE'), 'Evidence must be redacted');
  assert.ok(secretFinding.evidenceSnippet.includes('***'));

  // Check eval finding
  const evalFinding = findings.find((f) => f.category === 'code_execution');
  assert.ok(evalFinding, 'Should detect eval()');
  assert.equal(evalFinding.severity, 'high');

  // Check command execution finding
  const execFinding = findings.find((f) => f.category === 'command_injection');
  assert.ok(execFinding, 'Should detect child_process.exec');

  // Check CORS finding
  const corsFinding = findings.find((f) => f.category === 'insecure_cors');
  assert.ok(corsFinding, 'Should detect wildcard CORS');
});
