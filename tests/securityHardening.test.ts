import test from 'node:test';
import assert from 'node:assert/strict';
import { safeFetch, GitHubClient } from '../packages/analyzer/src/github/client.js';
import { filterRepoFile } from '../packages/analyzer/src/ingestion/filter.js';

test('Security Hardening — safeFetch blocks SSRF to unapproved domains and internal IPs', async () => {
  // Reject AWS metadata IP
  await assert.rejects(
    async () => safeFetch('https://169.254.169.254/latest/meta-data'),
    /Access to unapproved host "169.254.169.254" is blocked for SSRF prevention/
  );

  // Reject Localhost
  await assert.rejects(
    async () => safeFetch('https://localhost:27017'),
    /Access to unapproved host "localhost" is blocked/
  );

  // Reject External Arbitrary Host
  await assert.rejects(
    async () => safeFetch('https://attacker-controlled.site/steal'),
    /Access to unapproved host "attacker-controlled.site" is blocked/
  );

  // Reject Insecure HTTP Protocol
  await assert.rejects(
    async () => safeFetch('http://api.github.com/repos/expressjs/express'),
    /Insecure protocol "http:" is rejected/
  );

  // Reject Non-Standard Ports
  await assert.rejects(
    async () => safeFetch('https://api.github.com:8443/repos/expressjs/express'),
    /Non-standard port "8443" is blocked for SSRF prevention/
  );

  // Reject Embedded Credentials
  await assert.rejects(
    async () => safeFetch('https://user:pass@api.github.com/repos/expressjs/express'),
    /Embedded credentials in URLs are blocked for security/
  );
});

test('Security Hardening — fetchRawFile rejects directory traversal attempts', async () => {
  const client = new GitHubClient();
  await assert.rejects(
    async () => client.fetchRawFile('owner', 'repo', 'sha', '../../etc/passwd'),
    /Path traversal sequence detected/
  );

  await assert.rejects(
    async () => client.fetchRawFile('owner', 'repo', 'sha', 'src/../../../secret.env'),
    /Path traversal sequence detected/
  );

  // Reject URL-encoded traversal
  await assert.rejects(
    async () => client.fetchRawFile('owner', 'repo', 'sha', 'src/%2e%2e/%2e%2e/secret.env'),
    /Path traversal sequence detected/
  );

  // Reject null-byte injection
  await assert.rejects(
    async () => client.fetchRawFile('owner', 'repo', 'sha', 'src/index.ts\0.png'),
    /Null byte detected in file path/
  );
});

test('Security Hardening — filterRepoFile excludes secret-bearing files and cryptographic certificates', () => {
  // Sensitive environment files
  assert.equal(filterRepoFile('.env').accepted, false);
  assert.equal(filterRepoFile('.env.local').accepted, false);
  assert.equal(filterRepoFile('.env.production').accepted, false);
  assert.equal(filterRepoFile('config/.env.test').accepted, false);
  assert.equal(filterRepoFile('.env.staging').accepted, false);

  // Private keys and credentials
  assert.equal(filterRepoFile('id_rsa').accepted, false);
  assert.equal(filterRepoFile('id_dsa').accepted, false);
  assert.equal(filterRepoFile('id_ecdsa').accepted, false);
  assert.equal(filterRepoFile('id_ed25519').accepted, false);
  assert.equal(filterRepoFile('credentials.json').accepted, false);
  assert.equal(filterRepoFile('certs/server.pem').accepted, false);
  assert.equal(filterRepoFile('keys/private.key').accepted, false);
  assert.equal(filterRepoFile('.npmrc').accepted, false);
  assert.equal(filterRepoFile('.pypirc').accepted, false);
  assert.equal(filterRepoFile('.netrc').accepted, false);
  assert.equal(filterRepoFile('certs/app.keystore').accepted, false);
  assert.equal(filterRepoFile('certs/app.jks').accepted, false);
  assert.equal(filterRepoFile('.ssh/authorized_keys').accepted, false);

  // Legitimate code files must be accepted
  assert.equal(filterRepoFile('src/server.ts').accepted, true);
  assert.equal(filterRepoFile('package.json').accepted, true);
});
