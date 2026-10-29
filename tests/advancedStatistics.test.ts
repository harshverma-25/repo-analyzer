import test from 'node:test';
import assert from 'node:assert/strict';
import { countLinesOfCode } from '../packages/analyzer/src/statistics/lineCounter.js';

test('Statistics — handles completely empty files accurately', () => {
  const result = countLinesOfCode('', 'empty.ts');
  assert.equal(result.totalLines, 0);
  assert.equal(result.codeLines, 0);
  assert.equal(result.blankLines, 0);
  assert.equal(result.commentLines, 0);
  assert.equal(result.language, 'TypeScript');
});

test('Statistics — accurately parses HTML comments', () => {
  const html = `
<!DOCTYPE html>
<!-- 
  Multi-line HTML comment
-->
<html>
  <body>Hello</body>
</html>
  `.trim();

  const result = countLinesOfCode(html, 'index.html');
  assert.equal(result.language, 'HTML');
  assert.ok(result.commentLines >= 3);
  assert.ok(result.codeLines >= 3);
});

test('Statistics — accurately parses SQL comments and queries', () => {
  const sql = `
-- Get active users
/*
 * Complex analytical query
 */
SELECT id, email, created_at
FROM users
WHERE is_active = true;
  `.trim();

  const result = countLinesOfCode(sql, 'query.sql');
  assert.equal(result.language, 'SQL');
  assert.ok(result.commentLines >= 4);
  assert.ok(result.codeLines >= 3);
});
