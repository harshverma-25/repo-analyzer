import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateGitHubUrl } from '../packages/analyzer/src/github/urlValidator.js';

test('URL Validator — accepts valid public GitHub URLs', () => {
  const result1 = parseAndValidateGitHubUrl('https://github.com/expressjs/express');
  assert.equal(result1.owner, 'expressjs');
  assert.equal(result1.repo, 'express');
  assert.equal(result1.canonicalUrl, 'https://github.com/expressjs/express');
  assert.equal(result1.displayName, 'expressjs/express');

  const result2 = parseAndValidateGitHubUrl('https://github.com/facebook/react.git');
  assert.equal(result2.owner, 'facebook');
  assert.equal(result2.repo, 'react');
});

test('URL Validator — rejects non-GitHub hostnames and SSRF attempts', () => {
  assert.throws(() => parseAndValidateGitHubUrl('https://gitlab.com/owner/repo'), /Only public repositories on github.com/);
  assert.throws(() => parseAndValidateGitHubUrl('http://169.254.169.254/latest/meta-data'), /Only public repositories on github.com/);
  assert.throws(() => parseAndValidateGitHubUrl('http://localhost:27017/db'), /Only public repositories on github.com/);
});

test('URL Validator — rejects invalid schemes and malformed paths', () => {
  assert.throws(() => parseAndValidateGitHubUrl('ftp://github.com/owner/repo'), /Only HTTP\/HTTPS URLs are supported/);
  assert.throws(() => parseAndValidateGitHubUrl('https://github.com/only-owner'), /URL must include both owner and repository name/);
  assert.throws(() => parseAndValidateGitHubUrl(''), /A repository URL is required/);
  assert.throws(() => parseAndValidateGitHubUrl('not-a-valid-url'), /Invalid URL format/);
});
