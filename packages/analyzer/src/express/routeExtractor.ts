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
  middlewares?: string[];
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

function getChainedRouteInfo(
  expr: ts.PropertyAccessExpression,
  sourceFile: ts.SourceFile
): { callerText: string; routePath: string } | null {
  let current: ts.Expression = expr.expression;
  while (ts.isCallExpression(current)) {
    const innerExpr = current.expression;
    if (ts.isPropertyAccessExpression(innerExpr)) {
      const callName = innerExpr.name.getText(sourceFile).toLowerCase();
      if (callName === 'route') {
        const routeArgs = current.arguments;
        if (
          routeArgs.length > 0 &&
          (ts.isStringLiteral(routeArgs[0]) || ts.isNoSubstitutionTemplateLiteral(routeArgs[0]))
        ) {
          return {
            callerText: innerExpr.expression.getText(sourceFile),
            routePath: (routeArgs[0] as ts.StringLiteral).text,
          };
        }
        return null;
      } else if (HTTP_METHODS[callName]) {
        // Continue unwinding up the method chain
        current = innerExpr.expression;
        continue;
      }
    }
    break;
  }
  return null;
}

export function extractExpressRoutes(
  sourceFiles: { path: string; content: string; ast?: ts.SourceFile }[]
): RouteFinding[] {
  const rawRoutes: RawRouteCall[] = [];
  const mounts: RouterMount[] = [];
  const fileRouterExportMap = new Map<string, string>(); // filePath -> exported router variable name
  const routerMiddlewaresMap = new Map<string, string[]>(); // routerVarName -> array of middleware names

  for (const file of sourceFiles) {
    // Only analyze JS/TS files, excluding test directories and test specs
    if (!/\.[jt]sx?$/.test(file.path)) continue;
    if (/(?:^|\/)(?:__tests__|tests|test)\/|\.(?:test|spec)\.[jt]sx?$/i.test(file.path)) continue;

    const sourceFile =
      file.ast ||
      ts.createSourceFile(
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

      // 2. Detect Call Expressions (app.get, router.post, app.use, app.route, etc.)
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        let callerText = '';
        let methodName = '';
        let chainedRoutePath: string | null = null;
        let isChainedRoute = false;

        if (ts.isPropertyAccessExpression(expr)) {
          // Check for chained app.route('/path').get(...).post(...)
          const chainedInfo = getChainedRouteInfo(expr, sourceFile);
          if (chainedInfo) {
            callerText = chainedInfo.callerText;
            methodName = expr.name.getText(sourceFile).toLowerCase();
            chainedRoutePath = chainedInfo.routePath;
            isChainedRoute = true;
          } else {
            callerText = expr.expression.getText(sourceFile);
            methodName = expr.name.getText(sourceFile).toLowerCase();
          }

          // Check for router mounting: app.use('/api', apiRouter) or app.use('/api', authMw, apiRouter)
          // or router-level middleware: router.use(authMiddleware)
          if (methodName === 'use' && node.arguments.length >= 1) {
            const firstArg = node.arguments[0];
            const isMountPath = ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg);

            if (isMountPath && node.arguments.length >= 2) {
              const mountPath = (firstArg as ts.StringLiteral).text;
              const restArgs = node.arguments.slice(1);
              const targetArg = restArgs[restArgs.length - 1];
              const mountedTarget = targetArg.getText(sourceFile);

              // Middle arguments (if any) are mount-level middlewares
              const mountMws: string[] = [];
              for (const mwArg of restArgs.slice(0, -1)) {
                if (ts.isArrayLiteralExpression(mwArg)) {
                  for (const elem of mwArg.elements) {
                    mountMws.push(elem.getText(sourceFile));
                  }
                } else {
                  mountMws.push(mwArg.getText(sourceFile));
                }
              }

              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              mounts.push({
                parentVarName: callerText,
                mountPrefix: mountPath,
                mountedVarOrModule: mountedTarget,
                filePath: file.path,
                lineNumber: lineAndChar.line + 1,
                middlewares: mountMws,
              });
            } else if (!isMountPath) {
              // Router-level middleware: router.use(authMiddleware)
              const mws: string[] = [];
              for (const arg of node.arguments) {
                if (ts.isArrayLiteralExpression(arg)) {
                  for (const elem of arg.elements) {
                    mws.push(elem.getText(sourceFile));
                  }
                } else {
                  mws.push(arg.getText(sourceFile));
                }
              }
              const existing = routerMiddlewaresMap.get(callerText) || [];
              routerMiddlewaresMap.set(callerText, [...existing, ...mws]);
              const fileKey = `${file.path}:${callerText}`;
              const fileExisting = routerMiddlewaresMap.get(fileKey) || [];
              routerMiddlewaresMap.set(fileKey, [...fileExisting, ...mws]);
            }
          }

          // Check for HTTP Methods: app.get('/users', ...), router.post('/login', ...) or chained route calls
          const isNonExpressCaller = NON_EXPRESS_CALLERS.has(callerText.toLowerCase());
          const hasSufficientArgs = isChainedRoute ? node.arguments.length >= 1 : node.arguments.length >= 2;

          if (HTTP_METHODS[methodName] && hasSufficientArgs && !isNonExpressCaller) {
            let rawPath = '';
            let isDynamic = false;
            let handlerArgs: ts.Expression[] = [];

            if (isChainedRoute && chainedRoutePath !== null) {
              rawPath = chainedRoutePath;
              handlerArgs = [...node.arguments];
            } else {
              const firstArg = node.arguments[0];
              if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
                rawPath = firstArg.text;
              } else {
                rawPath = firstArg.getText(sourceFile);
                isDynamic = true;
              }
              handlerArgs = node.arguments.slice(1);
            }

            // Extract handlers and middleware from subsequent arguments
            const middlewareChain: string[] = [];
            let handlerName: string | undefined;

            for (let i = 0; i < handlerArgs.length; i++) {
              const arg = handlerArgs[i];
              if (ts.isArrayLiteralExpression(arg)) {
                for (const elem of arg.elements) {
                  middlewareChain.push(elem.getText(sourceFile));
                }
              } else {
                const text = arg.getText(sourceFile);
                if (i === handlerArgs.length - 1 && !isKnownAuth(text)) {
                  if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
                    handlerName = 'inlineHandler';
                  } else {
                    handlerName = text.length > 50 ? 'anonymousHandler' : text;
                  }
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

  // 3. Resolve Router Mount Prefixes & Inherited Mount Middlewares
  // Multi-pass prefix resolution to support nested router chains:
  // e.g. app.use('/api', apiRouter), apiRouter.use('/v1', userRouter) => /api/v1
  const parentMap = new Map<string, { parent: string; prefix: string; middlewares: string[] }>();

  for (const mount of mounts) {
    let cleanPrefix = mount.mountPrefix.trim();
    if (!cleanPrefix.startsWith('/')) cleanPrefix = '/' + cleanPrefix;
    if (cleanPrefix.endsWith('/') && cleanPrefix.length > 1) {
      cleanPrefix = cleanPrefix.slice(0, -1);
    }

    parentMap.set(mount.mountedVarOrModule, {
      parent: mount.parentVarName,
      prefix: cleanPrefix,
      middlewares: mount.middlewares || [],
    });
  }

  function getFullPrefix(varName: string, depth = 0): string {
    if (depth > 10 || !parentMap.has(varName)) return '';
    const info = parentMap.get(varName)!;
    const parentPrefix = getFullPrefix(info.parent, depth + 1);
    return `${parentPrefix}${info.prefix}`.replace(/\/+/g, '/');
  }

  function getMountMiddlewares(varName: string, depth = 0): string[] {
    if (depth > 10 || !parentMap.has(varName)) return [];
    const info = parentMap.get(varName)!;
    const parentMws = getMountMiddlewares(info.parent, depth + 1);
    return [...parentMws, ...info.middlewares];
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

    // Inherit router-level and mount-level middlewares
    const inheritedMiddlewares = [
      ...getMountMiddlewares(route.routerVarName),
      ...(routerMiddlewaresMap.get(`${route.filePath}:${route.routerVarName}`) || routerMiddlewaresMap.get(route.routerVarName) || []),
    ];

    const fullMiddlewareChain = Array.from(new Set([...inheritedMiddlewares, ...route.middlewareChain]));

    let authRequired = route.authRequired;
    let authMiddlewareDetected = route.authMiddlewareDetected;

    if (!authRequired) {
      for (const mw of fullMiddlewareChain) {
        if (isKnownAuth(mw)) {
          authRequired = true;
          authMiddlewareDetected = mw;
          break;
        }
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
      middlewareChain: fullMiddlewareChain,
      parameters,
      inferredStatusCodes: route.inferredStatusCodes,
      authRequired,
      authMiddlewareDetected,
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
