import type { SecurityFinding, RouteFinding } from '@repo-analyzer/shared';
import path from 'path';

// Redact any detected secret strings so they are never stored or displayed in cleartext
export function redactSecret(secret: string): string {
  if (!secret || secret.length <= 6) return '******';
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(4, secret.length - 5))}${suffix}`;
}

export function runSecurityScan(
  files: { path: string; content: string }[],
  routes: RouteFinding[]
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let findingCounter = 1;

  // 1. Check for committed secret files
  for (const file of files) {
    const filename = path.basename(file.path).toLowerCase();
    if (
      filename === '.env' ||
      filename === '.env.production' ||
      filename === '.env.local' ||
      filename.endsWith('.pem') ||
      filename.endsWith('.key') ||
      filename === 'id_rsa' ||
      filename === 'credentials.json'
    ) {
      findings.push({
        id: `sec-${findingCounter++}`,
        title: `Sensitive or Environment File Tracked in Repository (${filename})`,
        severity: 'high',
        category: 'secret_file_tracked',
        filePath: file.path,
        lineNumber: 1,
        explanation: `The file "${filename}" appears to be committed to version control. If it contains production secrets or private keys, it poses a severe exposure risk.`,
        evidenceSnippet: `Tracked file path: ${file.path}`,
        confidence: 'confirmed',
        recommendation: `Add "${filename}" to your .gitignore, rotate any exposed secrets immediately, and remove it from git history.`,
        limitations: 'Static observation based on recognized secret file names.',
      });
    }
  }

  // 2. Scan file content lines for patterns (specific patterns first, followed by generic fallback)
  const SECRET_PATTERNS = [
    { regex: /AKIA[0-9A-Z]{16}/, title: 'Hardcoded AWS Access Key ID' },
    { regex: /ghp_[a-zA-Z0-9]{36}/, title: 'Hardcoded GitHub Personal Access Token' },
    { regex: /sk_live_[0-9a-zA-Z]{24,}/, title: 'Hardcoded Stripe Live Secret Key' },
    { regex: /sk-[a-zA-Z0-9]{32,}/, title: 'Hardcoded OpenAI Secret Key' },
    { regex: /AIza[0-9A-Za-z_-]{20,}/, title: 'Hardcoded Google API Key' },
    { regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/, title: 'Hardcoded Slack Token' },
    { regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, title: 'Hardcoded Cryptographic Private Key' },
    { regex: /mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/, title: 'Hardcoded MongoDB URI with Plaintext Password' },
    { regex: /(?:api[_-]?key|secret|password|auth[_-]?token)\s*[:=]\s*['"]([a-zA-Z0-9_\-.~]{16,})['"]/i, title: 'Potential Hardcoded Secret or API Key' },
  ];

  for (const file of files) {
    if (!/\.[jt]sx?$/.test(file.path)) continue;

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check Hardcoded Secrets
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const secretValue = match[1] || match[0];
          // Filter common false positives like "your-api-key-here" or "process.env"
          if (!/process\.env|your_api_key|placeholder|<secret>|my_secret/i.test(secretValue)) {
            const redactedLine = line.replace(secretValue, redactSecret(secretValue));
            findings.push({
              id: `sec-${findingCounter++}`,
              title: pattern.title,
              severity: 'critical',
              category: 'hardcoded_credential',
              filePath: file.path,
              lineNumber: lineNum,
              explanation: `A potential credential or secret was discovered hardcoded in source code.`,
              evidenceSnippet: redactedLine.trim(),
              confidence: 'inferred',
              recommendation: 'Move credentials into environment variables and reference via process.env. Rotate any compromised keys immediately.',
              limitations: 'Static regex match. Tokens resembling cryptographic strings may be test keys or documentation fixtures.',
            });
            break;
          }
        }
      }

      // Check Dynamic Code Execution: eval() or new Function()
      if (/\beval\s*\(/.test(line)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: 'Use of eval() Dynamic Code Execution',
          severity: 'high',
          category: 'code_execution',
          filePath: file.path,
          lineNumber: lineNum,
          explanation: 'Dynamic code execution via eval() can lead to arbitrary remote code execution if user input is passed.',
          evidenceSnippet: line.trim(),
          confidence: 'confirmed',
          recommendation: 'Refactor code to use standard JSON parsing, object lookups, or safer parsing libraries rather than eval().',
          limitations: 'Static AST/text match. Exploitability depends on data flow to the eval call.',
        });
      }

      // Check Command Execution: exec( or execSync(
      if (/\b(?:child_process\.)?(?:exec|execSync)\s*\(/.test(line)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: 'Direct Shell Command Execution (child_process.exec)',
          severity: 'medium',
          category: 'command_injection',
          filePath: file.path,
          lineNumber: lineNum,
          explanation: 'Invoking system shell commands directly can permit command injection if untrusted parameters are concatenated.',
          evidenceSnippet: line.trim(),
          confidence: 'inferred',
          recommendation: 'Use execFile or spawn with explicit argument arrays instead of passing raw command strings to a shell.',
          limitations: 'Static check. If arguments are hardcoded constants, this is not exploitable.',
        });
      }

      // Check Permissive CORS: origin: '*' or Access-Control-Allow-Origin: *
      if (/origin\s*:\s*['"]\*['"]|res\.setHeader\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\)/.test(line)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: 'Wildcard Cross-Origin Resource Sharing (CORS: *)',
          severity: 'low',
          category: 'insecure_cors',
          filePath: file.path,
          lineNumber: lineNum,
          explanation: 'Access-Control-Allow-Origin is set to wildcard (*), permitting any external website to issue cross-origin requests to this service.',
          evidenceSnippet: line.trim(),
          confidence: 'confirmed',
          recommendation: 'Specify allowed origins explicitly or dynamically validate against a whitelist.',
          limitations: 'Intentional for public APIs, but hazardous for authenticated or private internal endpoints.',
        });
      }
    }
  }

  // 3. Scan Routes for Missing Authentication on Mutating Endpoints
  for (const route of routes) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method) && !route.authRequired) {
      // Exclude typical public endpoints like /login, /register, /signup, /auth
      const p = route.resolvedPath.toLowerCase();
      if (!p.includes('login') && !p.includes('register') && !p.includes('signup') && !p.includes('health') && !p.includes('webhook')) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Mutating Route (${route.method} ${route.resolvedPath}) Without Detected Authentication`,
          severity: 'medium',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The mutating route "${route.method} ${route.resolvedPath}" does not appear to execute an identifiable authentication or authorization middleware.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Verify whether this endpoint should be restricted to authenticated sessions and attach appropriate auth guards.',
          limitations: 'Heuristic check. Authentication may be applied globally via an earlier router middleware or upstream API gateway.',
        });
      }
    }
  }

  return findings;
}
