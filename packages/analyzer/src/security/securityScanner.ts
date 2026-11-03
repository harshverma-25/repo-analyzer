import type { SecurityFinding, RouteFinding } from '@repo-analyzer/shared';
import path from 'path';
import ts from 'typescript';

// Redact any detected secret strings so they are never stored or displayed in cleartext
export function redactSecret(secret: string): string {
  if (!secret || secret.length <= 6) return '******';
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(4, secret.length - 5))}${suffix}`;
}

// Pre-compiled regex patterns hoisted to module scope for zero-allocation reuse across scans
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

const DUMMY_SECRET_INDICATORS =
  /process\.env|your_api_key|placeholder|<secret>|my_secret|changeme|change_me|replace_me/i;

function isTestOrFixturePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /(?:^|\/)(?:__tests__|tests|test|fixtures|fixture|mocks|mock|examples|example|cypress|playwright|e2e|stories|spec)\/|\.(?:test|spec|cy|stories)\.[jt]sx?$/i.test(normalized);
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('<!--') ||
    trimmed.startsWith('#')
  );
}

function checkBindingForName(nameNode: ts.BindingName, targetName: string): boolean {
  if (ts.isIdentifier(nameNode)) {
    return nameNode.text === targetName;
  }
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const elem of nameNode.elements) {
      if (ts.isBindingElement(elem) && checkBindingForName(elem.name, targetName)) {
        return true;
      }
    }
  }
  return false;
}

// Check if a global name (eval, Function) is shadowed by a local or file-level declaration
function isGlobalShadowed(node: ts.Identifier): boolean {
  const targetName = node.text;
  let curr: ts.Node | undefined = node.parent;

  while (curr) {
    if (
      ts.isFunctionDeclaration(curr) ||
      ts.isFunctionExpression(curr) ||
      ts.isArrowFunction(curr) ||
      ts.isMethodDeclaration(curr)
    ) {
      for (const param of curr.parameters) {
        if (checkBindingForName(param.name, targetName)) {
          return true;
        }
      }
    } else if (ts.isCatchClause(curr)) {
      if (curr.variableDeclaration && checkBindingForName(curr.variableDeclaration.name, targetName)) {
        return true;
      }
    } else if (ts.isBlock(curr) || ts.isSourceFile(curr) || ts.isModuleBlock(curr)) {
      const statements: readonly ts.Statement[] = (curr as any).statements || [];
      for (const stmt of statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (checkBindingForName(decl.name, targetName)) {
              return true;
            }
          }
        } else if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.name.text === targetName) {
          return true;
        } else if (ts.isClassDeclaration(stmt) && stmt.name && stmt.name.text === targetName) {
          return true;
        }
      }
    }
    curr = curr.parent;
  }

  return false;
}

// Check if a module-level variable (child_process, exec) is shadowed by an inner function scope
function isModuleVarShadowedByInnerScope(node: ts.Identifier): boolean {
  const targetName = node.text;
  let curr: ts.Node | undefined = node.parent;

  while (curr && !ts.isSourceFile(curr)) {
    if (
      ts.isFunctionDeclaration(curr) ||
      ts.isFunctionExpression(curr) ||
      ts.isArrowFunction(curr) ||
      ts.isMethodDeclaration(curr)
    ) {
      for (const param of curr.parameters) {
        if (checkBindingForName(param.name, targetName)) {
          return true;
        }
      }
    } else if (ts.isCatchClause(curr)) {
      if (curr.variableDeclaration && checkBindingForName(curr.variableDeclaration.name, targetName)) {
        return true;
      }
    } else if (ts.isBlock(curr)) {
      const statements: readonly ts.Statement[] = curr.statements || [];
      for (const stmt of statements) {
        if (stmt.pos >= node.pos) continue;
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (checkBindingForName(decl.name, targetName)) {
              return true;
            }
          }
        }
      }
    }
    curr = curr.parent;
  }

  return false;
}

export function runSecurityScan(
  files: { path: string; content: string; ast?: ts.SourceFile }[],
  routes: RouteFinding[]
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let findingCounter = 1;

  // 1. Check for committed secret files (excluding test/fixture directories)
  for (const file of files) {
    if (isTestOrFixturePath(file.path)) continue;

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

  // 2. Scan file content for secrets and wildcard CORS
  for (const file of files) {
    if (!/\.[jt]sx?$/.test(file.path)) continue;
    if (isTestOrFixturePath(file.path)) continue;

    const lines = file.content.split(/\r?\n/);
    let inBlockComment = false;
    let inTemplateLiteral = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // Track multi-line block comments
      if (inBlockComment) {
        if (line.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }
      if (trimmed.startsWith('/*') && !line.includes('*/')) {
        inBlockComment = true;
        continue;
      }

      // Track multi-line template literals
      if (inTemplateLiteral) {
        if (/(?<!\\)`/.test(line)) {
          inTemplateLiteral = false;
        }
        continue;
      }
      const backticks = (line.match(/(?<!\\)`/g) || []).length;
      if (backticks % 2 === 1) {
        inTemplateLiteral = true;
      }

      // Cap scanned line length to prevent ReDoS or event loop stalls on minified files
      const MAX_SCAN_LINE_LENGTH = 2000;
      const lineToScan = line.length > MAX_SCAN_LINE_LENGTH ? line.slice(0, MAX_SCAN_LINE_LENGTH) : line;

      // Check Hardcoded Secrets (skip comment lines that contain documentation hints)
      const isComment = isCommentLine(line);
      const isDocComment = isComment && /example|format|pattern|regex|reference|https?:\/\/|todo|fixme/i.test(line);

      if (!isDocComment) {
        for (const pattern of SECRET_PATTERNS) {
          const match = lineToScan.match(pattern.regex);
          if (match) {
            const secretValue = match[1] || match[0];
            // Filter common false positives like placeholders, dummy keys, or process.env
            if (!DUMMY_SECRET_INDICATORS.test(secretValue)) {
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
      }

      // Check Permissive CORS: origin: '*' or Access-Control-Allow-Origin: *
      const isDocOrMetaProperty = /^(?:title|explanation|description|message|summary|recommendation)\s*:/i.test(trimmed);
      if (!isDocOrMetaProperty && !isComment) {
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

    // 2b. AST-Based Dynamic Evaluation & Command Execution Analysis
    // Avoids method-name collisions (redis.eval, query.exec, pattern.exec)
    let sourceFile: ts.SourceFile | undefined = file.ast;
    if (!sourceFile) {
      try {
        sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true);
      } catch {
        sourceFile = undefined;
      }
    }

    if (sourceFile) {
      const childProcessModules = new Set<string>();
      const execFunctions = new Set<string>();
      const evalAliases = new Set<string>();

      // First pass: Discover imports, requires, and direct aliases
      function inspectImportsAndAliases(node: ts.Node) {
        // ES Imports
        if (ts.isImportDeclaration(node)) {
          const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
          if (specifier === 'child_process' || specifier === 'node:child_process') {
            if (node.importClause) {
              if (node.importClause.name) {
                childProcessModules.add(node.importClause.name.text);
              }
              if (node.importClause.namedBindings) {
                if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                  childProcessModules.add(node.importClause.namedBindings.name.text);
                } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                  for (const elem of node.importClause.namedBindings.elements) {
                    const imported = elem.propertyName ? elem.propertyName.text : elem.name.text;
                    const local = elem.name.text;
                    if (imported === 'exec' || imported === 'execSync') {
                      execFunctions.add(local);
                    }
                  }
                }
              }
            }
          }
        }

        // CommonJS requires & variable aliases
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const init = node.initializer;

          // Check if require('child_process') or require('node:child_process')
          if (
            ts.isCallExpression(init) &&
            ts.isIdentifier(init.expression) &&
            init.expression.text === 'require' &&
            init.arguments.length > 0 &&
            ts.isStringLiteral(init.arguments[0])
          ) {
            const reqMod = init.arguments[0].text;
            if (reqMod === 'child_process' || reqMod === 'node:child_process') {
              if (ts.isIdentifier(node.name)) {
                childProcessModules.add(node.name.text);
              } else if (ts.isObjectBindingPattern(node.name)) {
                for (const elem of node.name.elements) {
                  if (ts.isBindingElement(elem)) {
                    const prop = elem.propertyName && ts.isIdentifier(elem.propertyName)
                      ? elem.propertyName.text
                      : ts.isIdentifier(elem.name)
                        ? elem.name.text
                        : '';
                    const local = ts.isIdentifier(elem.name) ? elem.name.text : '';
                    if (prop === 'exec' || prop === 'execSync') {
                      execFunctions.add(local);
                    }
                  }
                }
              }
            }
          }

          // Check for eval alias: const evaluator = eval;
          if (
            ts.isIdentifier(node.name) &&
            ts.isIdentifier(init) &&
            init.text === 'eval' &&
            !isGlobalShadowed(init)
          ) {
            evalAliases.add(node.name.text);
          }
        }

        ts.forEachChild(node, inspectImportsAndAliases);
      }

      inspectImportsAndAliases(sourceFile);

      // Second pass: Detect actual calls
      function inspectCalls(node: ts.Node) {
        if (!sourceFile) return;

        // Check new Function(...)
        if (ts.isNewExpression(node)) {
          if (
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'Function' &&
            !isGlobalShadowed(node.expression)
          ) {
            const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            const lineText = lines[lineNum - 1] || '';
            findings.push({
              id: `sec-${findingCounter++}`,
              title: 'Use of eval() Dynamic Code Execution',
              severity: 'high',
              category: 'code_execution',
              filePath: file.path,
              lineNumber: lineNum,
              explanation: 'Dynamic code execution via new Function() can lead to arbitrary remote code execution if user input is passed.',
              evidenceSnippet: lineText.trim(),
              confidence: 'confirmed',
              recommendation: 'Refactor code to use standard JSON parsing, object lookups, or safer parsing libraries rather than new Function().',
              limitations: 'Static AST match. Exploitability depends on data flow to the Function constructor.',
            });
          }
        }

        // Check Call Expressions
        if (ts.isCallExpression(node)) {
          const expr = node.expression;

          // 1. Direct call: eval(...), Function(...), or aliased eval(...)
          if (ts.isIdentifier(expr)) {
            const calleeName = expr.text;

            // Global eval()
            if (calleeName === 'eval' && !isGlobalShadowed(expr)) {
              const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              const lineText = lines[lineNum - 1] || '';
              findings.push({
                id: `sec-${findingCounter++}`,
                title: 'Use of eval() Dynamic Code Execution',
                severity: 'high',
                category: 'code_execution',
                filePath: file.path,
                lineNumber: lineNum,
                explanation: 'Dynamic code execution via eval() can lead to arbitrary remote code execution if user input is passed.',
                evidenceSnippet: lineText.trim(),
                confidence: 'confirmed',
                recommendation: 'Refactor code to use standard JSON parsing, object lookups, or safer parsing libraries rather than eval().',
                limitations: 'Static AST match. Exploitability depends on data flow to the eval call.',
              });
            } else if (calleeName === 'Function' && !isGlobalShadowed(expr)) {
              const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              const lineText = lines[lineNum - 1] || '';
              findings.push({
                id: `sec-${findingCounter++}`,
                title: 'Use of eval() Dynamic Code Execution',
                severity: 'high',
                category: 'code_execution',
                filePath: file.path,
                lineNumber: lineNum,
                explanation: 'Dynamic code execution via Function() can lead to arbitrary remote code execution if user input is passed.',
                evidenceSnippet: lineText.trim(),
                confidence: 'confirmed',
                recommendation: 'Refactor code to use standard JSON parsing, object lookups, or safer parsing libraries rather than Function().',
                limitations: 'Static AST match. Exploitability depends on data flow to the Function call.',
              });
            } else if (evalAliases.has(calleeName) && !isModuleVarShadowedByInnerScope(expr)) {
              const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              const lineText = lines[lineNum - 1] || '';
              findings.push({
                id: `sec-${findingCounter++}`,
                title: 'Use of eval() Dynamic Code Execution',
                severity: 'high',
                category: 'code_execution',
                filePath: file.path,
                lineNumber: lineNum,
                explanation: `Dynamic code execution via aliased eval "${calleeName}()" can lead to arbitrary remote code execution if user input is passed.`,
                evidenceSnippet: lineText.trim(),
                confidence: 'confirmed',
                recommendation: 'Refactor code to use standard JSON parsing, object lookups, or safer parsing libraries rather than eval().',
                limitations: 'Static AST match. Exploitability depends on data flow to the eval alias.',
              });
            } else if (execFunctions.has(calleeName) && !isModuleVarShadowedByInnerScope(expr)) {
              // Direct imported exec(...) or execSync(...) from child_process
              const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              const lineText = lines[lineNum - 1] || '';
              findings.push({
                id: `sec-${findingCounter++}`,
                title: 'Direct Shell Command Execution (child_process.exec)',
                severity: 'medium',
                category: 'command_injection',
                filePath: file.path,
                lineNumber: lineNum,
                explanation: 'Invoking system shell commands directly can permit command injection if untrusted parameters are concatenated.',
                evidenceSnippet: lineText.trim(),
                confidence: 'inferred',
                recommendation: 'Use execFile or spawn with explicit argument arrays instead of passing raw command strings to a shell.',
                limitations: 'Static check. If arguments are hardcoded constants, this is not exploitable.',
              });
            }
          } else if (ts.isPropertyAccessExpression(expr)) {
            // 2. Property access call: childProcess.exec(...), cp.execSync(...), etc.
            const methodName = expr.name.text;
            if (methodName === 'exec' || methodName === 'execSync') {
              let isChildProcess = false;

              if (ts.isIdentifier(expr.expression)) {
                if (
                  childProcessModules.has(expr.expression.text) &&
                  !isModuleVarShadowedByInnerScope(expr.expression)
                ) {
                  isChildProcess = true;
                }
              } else if (
                ts.isCallExpression(expr.expression) &&
                ts.isIdentifier(expr.expression.expression) &&
                expr.expression.expression.text === 'require' &&
                expr.expression.arguments.length > 0 &&
                ts.isStringLiteral(expr.expression.arguments[0])
              ) {
                const reqMod = expr.expression.arguments[0].text;
                if (reqMod === 'child_process' || reqMod === 'node:child_process') {
                  isChildProcess = true;
                }
              }

              if (isChildProcess) {
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const lineText = lines[lineNum - 1] || '';
                findings.push({
                  id: `sec-${findingCounter++}`,
                  title: 'Direct Shell Command Execution (child_process.exec)',
                  severity: 'medium',
                  category: 'command_injection',
                  filePath: file.path,
                  lineNumber: lineNum,
                  explanation: 'Invoking system shell commands directly can permit command injection if untrusted parameters are concatenated.',
                  evidenceSnippet: lineText.trim(),
                  confidence: 'inferred',
                  recommendation: 'Use execFile or spawn with explicit argument arrays instead of passing raw command strings to a shell.',
                  limitations: 'Static check. If arguments are hardcoded constants, this is not exploitable.',
                });
              }
            }
          }
        }

        ts.forEachChild(node, inspectCalls);
      }

      inspectCalls(sourceFile);
    }
  }

  // 3. Scan Routes for Authentication & Authorization Controls
  for (const route of routes) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method) && !route.authRequired) {
      const p = route.resolvedPath.toLowerCase();

      // Ignore operational health checks
      if (/\b(?:health|healthz|ping|live|ready|status)\b/i.test(p)) {
        continue;
      }

      // Differentiated assessment for public authentication and webhook flows
      if (/\b(?:login|signin)\b/i.test(p) || /\bauth\/(?:local|credentials|password)\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Public Authentication Endpoint (${route.method} ${route.resolvedPath}) Requires Abuse Protection & Rate Limiting`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" is a public authentication login flow. While unauthenticated access is expected, public login endpoints require rate limiting, brute-force protection, and account lockout to mitigate credential stuffing.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Implement rate limiting (e.g. express-rate-limit), captcha on repeated failures, and IP-based abuse prevention.',
          limitations: 'Static analysis cannot verify external reverse-proxy rate limiting (e.g. Cloudflare, AWS WAF, nginx) or inline handler defenses.',
        });
      } else if (/\b(?:register|signup|create-account|join)\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Public Registration Endpoint (${route.method} ${route.resolvedPath}) Requires Abuse Prevention & Input Validation`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" is a public registration flow. Public registration endpoints require rate limiting, spam prevention, and strict input validation to prevent mass account creation.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Implement rate limiting, email verification, captcha or bot detection, and strict payload schema validation.',
          limitations: 'Static analysis cannot verify gateway rate limiting or inline handler validation.',
        });
      } else if (
        /\b(?:oauth|google|github|facebook|apple|twitter|sso|saml|callback)\b/i.test(p) ||
        /\bauth\/(?:google|github|facebook|apple|twitter|oauth)\b/i.test(p)
      ) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Public OAuth Endpoint (${route.method} ${route.resolvedPath}) Requires State & Token Validation`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" is a public OAuth authentication flow. Public OAuth endpoints require state parameter / nonce validation and redirect URI verification to prevent CSRF and token interception.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Ensure strict state token verification, provider token validation, and redirect URI whitelist enforcement.',
          limitations: 'Static check. State verification is often handled within passport strategies or OAuth client SDKs.',
        });
      } else if (/\b(?:guest|anonymous)\b/i.test(p) || /\bauth\/guest\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Public Guest Authentication Endpoint (${route.method} ${route.resolvedPath}) Requires Abuse Prevention`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" provides anonymous/guest access. Without rate limiting and session restrictions, guest endpoints can be abused for resource exhaustion or automated account spam.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Attach rate limiters and ensure guest sessions have restricted privileges and short expiration times.',
          limitations: 'Static check. Rate limiting may be applied at the gateway level.',
        });
      } else if (/\b(?:refresh|refresh-token)\b/i.test(p) || /\btoken\/refresh\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Token Refresh Endpoint (${route.method} ${route.resolvedPath}) Requires Token Validation & Rotation`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" handles token refresh operations. Refresh endpoints require validation of refresh token reuse, token rotation, and secure httpOnly cookie handling.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Ensure refresh tokens are rotated on each use, stored securely with revocation tracking, and sent via httpOnly secure cookies.',
          limitations: 'Static check. Token rotation logic is typically implemented inside the route handler body.',
        });
      } else if (/\b(?:logout|signout)\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Session Invalidation Endpoint (${route.method} ${route.resolvedPath}) Requires Session & Token Revocation`,
          severity: 'low',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The endpoint "${route.method} ${route.resolvedPath}" handles user logout. Ensure server-side session invalidation or token blocklisting is executed rather than relying solely on client-side state deletion.`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Invalidate server session state, revoke active refresh tokens, and clear auth cookies with proper security flags.',
          limitations: 'Static check. Revocation is handled in handler business logic.',
        });
      } else if (/\b(?:webhook|webhooks)\b/i.test(p)) {
        findings.push({
          id: `sec-${findingCounter++}`,
          title: `Webhook Endpoint (${route.method} ${route.resolvedPath}) Requires Signature Verification`,
          severity: 'medium',
          category: 'missing_authentication',
          filePath: route.filePath,
          lineNumber: route.lineNumber,
          explanation: `The mutating webhook route "${route.method} ${route.resolvedPath}" does not appear to execute an identifiable webhook signature verification middleware (e.g. Stripe, GitHub, or HMAC signature validation).`,
          evidenceSnippet: `${route.method} ${route.resolvedPath}`,
          confidence: 'inferred',
          recommendation: 'Ensure cryptographic webhook signature validation and replay protection (timestamp checking) are enforced before processing payload events.',
          limitations: 'Heuristic check. Signature verification might be performed inline via req.rawBody or inside third-party SDK handlers.',
        });
      } else {
        // Standard unauthenticated mutating business endpoint
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
