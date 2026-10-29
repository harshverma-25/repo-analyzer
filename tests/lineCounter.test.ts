import test from 'node:test';
import assert from 'node:assert/strict';
import { countLinesOfCode } from '../packages/analyzer/src/statistics/lineCounter.js';

test('Line Counter — accurately counts TypeScript code, comments, and blank lines', () => {
  const tsContent = `
// This is a single line comment
import express from 'express';

/*
 * Multi-line block comment
 */
const app = express();

app.get('/', (req, res) => {
  res.send('hello');
});
  `.trim();

  const result = countLinesOfCode(tsContent, 'server.ts');
  assert.equal(result.language, 'TypeScript');
  assert.ok(result.codeLines >= 5, `Expected codeLines >= 5, got ${result.codeLines}`);
  assert.ok(result.commentLines >= 4, `Expected commentLines >= 4, got ${result.commentLines}`);
  assert.ok(result.blankLines >= 2, `Expected blankLines >= 2, got ${result.blankLines}`);
  assert.equal(result.totalLines, tsContent.split(/\r?\n/).length);
});

test('Line Counter — accurately handles Python hash comments and docstrings', () => {
  const pyContent = `
# Python comment
import os

def hello():
    """Docstring comment"""
    print("hello")
  `.trim();

  const result = countLinesOfCode(pyContent, 'main.py');
  assert.equal(result.language, 'Python');
  assert.ok(result.commentLines >= 1);
  assert.ok(result.codeLines >= 2);
});
