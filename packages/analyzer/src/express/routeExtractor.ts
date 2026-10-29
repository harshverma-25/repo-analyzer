import ts from 'typescript';
import type { RouteFinding, HttpMethod, EndpointParam } from '@repo-analyzer/shared';

interface RawRouteCall {
  method: HttpMethod;
  rawPath: string;
  isDynamicPath: boolean;
  filePath: string;
  lineNumber: number;
  routerVarName: string;
  handlerName?: string;
  middlewareChain: string[];
  inferredStatusCodes: number[];
  authRequired: boolean;
  authMiddlewareDetected?: string;
}

interface RouterMount {
  parentVarName: string;
  mountPrefix: string;
  mountedVarOrModule: string;
  filePath: string;
  lineNumber: number;
}

const HTTP_METHODS: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  options: 'OPTIONS',
  head: 'HEAD',
  all: 'ALL',
};

const AUTH_MIDDLEWARE_NAMES = new Set([
  'auth',
  'protect',
  'requireauth',
  'authenticate',
  'verifytoken',
  'isauthenticated',
  'jwtauth',
  'checkauth',
  'ensureauth',
  'passport.authenticate',
]);

const NON_EXPRESS_CALLERS = new Set([
  'map',
  'mymap',
  'cache',
  'config',
  'params',
  'searchparams',
  'headers',
  'state',
  'store',
  'ref',
  'props',
  '_',
  'lodash',
  'document',
  'window',
  'sessionstorage',
  'localstorage',
  'event',
  'events',
  'url',
  'querystring',
]);

export function extractExpressRoutes(
  sourceFiles: { path: string; content: string }[]
): RouteFinding[] {
  const rawRoutes: RawRouteCall[] = [];
  const mounts: RouterMount[] = [];
  const fileRouterExportMap = new Map<string, string>(); // filePath -> exported router variable name

  for (const file of sourceFiles) {
    // Only analyze JS/TS files
    if (!/\.[jt]sx?$/.test(file.path)) continue;

    const sourceFile = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // 1. Detect Router Export (e.g. export default router; or module.exports = router;)
      if (ts.isExportAssignment(node)) {
        if (ts.isIdentifier(node.expression)) {
          fileRouterExportMap.set(file.path, node.expression.text);
        }
      }

      // 2. Detect Call Expressions (app.get, router.post, app.use, etc.)
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isPropertyAccessExpression(expr)) {
          const callerText = expr.expression.getText(sourceFile);
          const methodName = expr.name.getText(sourceFile).toLowerCase();

          // Check for router mounting: app.use('/api', apiRouter)
          if (methodName === 'use' && node.arguments.length >= 2) {
            const firstArg = node.arguments[0];
            const secondArg = node.arguments[1];

            let mountPath = '';
            if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
              mountPath = firstArg.text;
            }

            if (mountPath) {
              const mountedTarget = secondArg.getText(sourceFile);
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              mounts.push({
                parentVarName: callerText,
                mountPrefix: mountPath,
                mountedVarOrModule: mountedTarget,
                filePath: file.path,
                lineNumber: lineAndChar.line + 1,
              });
            }
          }

          // Check for HTTP Methods: app.get('/users', ...), router.post('/login', ...)
          // Express routes require at least a path and at least one handler callback (arguments.length >= 2)
          const isNonExpressCaller = NON_EXPRESS_CALLERS.has(callerText.toLowerCase());
          if (HTTP_METHODS[methodName] && node.arguments.length >= 2 && !isNonExpressCaller) {
            const firstArg = node.arguments[0];
            let rawPath = '';
            let isDynamic = false;

            if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
              rawPath = firstArg.text;
            } else {
              rawPath = firstArg.getText(sourceFile);
              isDynamic = true;
            }

            // Extract handlers and middleware from subsequent arguments
            const middlewareChain: string[] = [];
            let handlerName: string | undefined;
            const handlerArgs = node.arguments.slice(1);

            for (let i = 0; i < handlerArgs.length; i++) {
              const arg = handlerArgs[i];
              if (ts.isArrayLiteralExpression(arg)) {
                for (const elem of arg.elements) {
                  middlewareChain.push(elem.getText(sourceFile));
                }
              } else {
                const text = arg.getText(sourceFile);
                if (i === handlerArgs.length - 1 && !isKnownAuth(text)) {
                  handlerName = text.length > 50 ? 'anonymousHandler' : text;
                } else {
                  middlewareChain.push(text.length > 50 ? 'middleware' : text);
                }
              }
            }

            // Search for status codes in handler body if available
            const inferredStatusCodes: number[] = [];
            for (const arg of handlerArgs) {
              arg.forEachChild((child) => {
                if (ts.isCallExpression(child)) {
                  const childExpr = child.expression;
                  if (ts.isPropertyAccessExpression(childExpr)) {
                    const callName = childExpr.name.getText(sourceFile);
                    if (callName === 'status' && child.arguments.length > 0) {
                      const statusArg = child.arguments[0];
                      if (ts.isNumericLiteral(statusArg)) {
                        inferredStatusCodes.push(parseInt(statusArg.text, 10));
                      }
                    }
                  }
                }
              });
            }
            if (inferredStatusCodes.length === 0) {
              // Default inference based on method
              inferredStatusCodes.push(HTTP_METHODS[methodName] === 'POST' ? 201 : 200);
            }

            // Detect auth middleware
            let authRequired = false;
            let authMiddlewareDetected: string | undefined;

            for (const mw of middlewareChain) {
              if (isKnownAuth(mw)) {
                authRequired = true;
                authMiddlewareDetected = mw;
                break;
              }
            }

            const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

            rawRoutes.push({
              method: HTTP_METHODS[methodName],
              rawPath,
              isDynamicPath: isDynamic,
              filePath: file.path,
              lineNumber: lineAndChar.line + 1,
              routerVarName: callerText,
              handlerName,
              middlewareChain,
              inferredStatusCodes: Array.from(new Set(inferredStatusCodes)),
              authRequired,
              authMiddlewareDetected,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  // 3. Resolve Router Mount Prefixes
  // Multi-pass prefix resolution to support nested router chains:
  // e.g. app.use('/api', apiRouter), apiRouter.use('/v1', userRouter) => /api/v1
  const parentMap = new Map<string, { parent: string; prefix: string }>();

  for (const mount of mounts) {
    let cleanPrefix = mount.mountPrefix.trim();
    if (!cleanPrefix.startsWith('/')) cleanPrefix = '/' + cleanPrefix;
    if (cleanPrefix.endsWith('/') && cleanPrefix.length > 1) {
      cleanPrefix = cleanPrefix.slice(0, -1);
    }

    parentMap.set(mount.mountedVarOrModule, {
      parent: mount.parentVarName,
      prefix: cleanPrefix,
    });
  }

  function getFullPrefix(varName: string, depth = 0): string {
    if (depth > 10 || !parentMap.has(varName)) return '';
    const info = parentMap.get(varName)!;
    const parentPrefix = getFullPrefix(info.parent, depth + 1);
    return `${parentPrefix}${info.prefix}`.replace(/\/+/g, '/');
  }

  const prefixMap = new Map<string, string>();
  for (const [target] of parentMap.entries()) {
    prefixMap.set(target, getFullPrefix(target));
  }

  // 4. Combine into final RouteFindings
  return rawRoutes.map((route, idx) => {
    let routerPrefix = '';

    // Check by file and var, or var directly
    if (prefixMap.has(`${route.filePath}:${route.routerVarName}`)) {
      routerPrefix = prefixMap.get(`${route.filePath}:${route.routerVarName}`)!;
    } else if (prefixMap.has(route.routerVarName)) {
      routerPrefix = prefixMap.get(route.routerVarName)!;
    }

    let resolvedPath = route.rawPath;
    if (!route.isDynamicPath) {
      if (!resolvedPath.startsWith('/')) resolvedPath = '/' + resolvedPath;
      if (routerPrefix) {
        resolvedPath = `${routerPrefix}${resolvedPath}`.replace(/\/+/g, '/');
      }
    }

    // Extract path params (:id, :userId)
    const parameters: EndpointParam[] = [];
    const paramMatches = resolvedPath.match(/:([a-zA-Z0-9_]+)/g);
    if (paramMatches) {
      for (const m of paramMatches) {
        parameters.push({
          name: m.slice(1),
          in: 'path',
          required: true,
          type: 'string',
        });
      }
    }

    const diagnostics: string[] = [];
    if (route.isDynamicPath) {
      diagnostics.push(`Dynamic route expression "${route.rawPath}" could not be resolved statically.`);
    }

    return {
      id: `route-${idx + 1}`,
      method: route.method,
      resolvedPath,
      rawPath: route.rawPath,
      filePath: route.filePath,
      lineNumber: route.lineNumber,
      routerPrefix: routerPrefix || undefined,
      handlerName: route.handlerName,
      middlewareChain: route.middlewareChain,
      parameters,
      inferredStatusCodes: route.inferredStatusCodes,
      authRequired: route.authRequired,
      authMiddlewareDetected: route.authMiddlewareDetected,
      confidence: route.isDynamicPath ? 'unresolved' : routerPrefix ? 'confirmed' : 'inferred',
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  });
}

function isKnownAuth(name: string): boolean {
  const lower = name.toLowerCase().replace(/[^a-z0-9.]/g, '');
  for (const authName of AUTH_MIDDLEWARE_NAMES) {
    if (lower.includes(authName)) return true;
  }
  return false;
}
