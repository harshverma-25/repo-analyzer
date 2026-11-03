import ts from 'typescript';
import path from 'path';
import type { RouteFinding, HttpMethod, EndpointParam } from '@repo-analyzer/shared';

interface RawRouteCall {
  id: string;
  method: HttpMethod;
  rawPath: string;
  isDynamicPath: boolean;
  filePath: string;
  lineNumber: number;
  pos: number;
  routerEntityId: string;
  routerVarName: string;
  handlerName?: string;
  routeMiddlewares: string[];
  inferredStatusCodes: number[];
  authRequired: boolean;
  authMiddlewareDetected?: string;
}

interface RouterMount {
  parentEntityId: string;
  parentVarName: string;
  mountPrefix: string;
  mountedEntityId: string;
  mountedVarOrModule: string;
  filePath: string;
  pos: number;
  lineNumber: number;
  middlewares: string[];
}

interface MiddlewareRegistration {
  entityId: string;
  pos: number;
  lineNumber: number;
  middlewares: string[];
}

interface FileContext {
  filePath: string;
  normalizedPath: string;
  sourceFile: ts.SourceFile;
  expressModuleNames: Set<string>;
  routerFactoryNames: Set<string>;
  localAppVars: Set<string>;
  localRouterVars: Set<string>;
  importedRouterMap: Map<string, string>; // local import identifier -> target router entity ID
  defaultExportRouterId?: string;
  namedExports: Map<string, string>; // exportName -> router entity ID
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
  'token',
  'isauthenticated',
  'jwtauth',
  'checkauth',
  'ensureauth',
  'passport',
  'jwt',
  'apikey',
  'bearer',
  'authorize',
  'authorized',
  'guard',
  'session',
  'clerk',
  'oauth',
  'cognito',
  'supertokens',
]);

function isTestOrFixturePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /(?:^|\/)(?:__tests__|tests|test|fixtures|fixture|mocks|mock|examples|example|cypress|playwright|e2e|stories|spec)\/|\.(?:test|spec|cy|stories)\.[jt]sx?$/i.test(normalized);
}

function resolveImportPath(
  fromFilePath: string,
  specifier: string,
  fileLookup: Map<string, string>
): string | undefined {
  if (!specifier.startsWith('.')) return undefined; // external dependency
  const fromDir = path.posix.dirname(fromFilePath);
  const rawTarget = path.posix.normalize(path.posix.join(fromDir, specifier));

  // 1. Direct exact match
  if (fileLookup.has(rawTarget)) {
    return fileLookup.get(rawTarget);
  }

  // 2. Strip existing extension if present
  const ext = path.posix.extname(rawTarget);
  const baseWithoutExt = ext ? rawTarget.slice(0, -ext.length) : rawTarget;
  if (fileLookup.has(baseWithoutExt)) {
    return fileLookup.get(baseWithoutExt);
  }

  // 3. Match against common extensions
  for (const candidateExt of ['.ts', '.js', '.tsx', '.jsx', '/index.ts', '/index.js']) {
    const candidate = baseWithoutExt + candidateExt;
    if (fileLookup.has(candidate)) {
      return fileLookup.get(candidate);
    }
  }

  return undefined;
}

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
  // Build lookup index of all project files to resolve relative import specifiers
  const fileLookup = new Map<string, string>();
  for (const file of sourceFiles) {
    const norm = file.path.replace(/\\/g, '/');
    fileLookup.set(norm, norm);
    const ext = path.posix.extname(norm);
    if (ext) {
      fileLookup.set(norm.slice(0, -ext.length), norm);
    }
    if (norm.endsWith('/index.ts') || norm.endsWith('/index.js')) {
      fileLookup.set(norm.slice(0, norm.lastIndexOf('/index.')), norm);
    }
  }

  const contexts = new Map<string, FileContext>();

  // ==========================================================================
  // PASS 1: Identify Express constructs, routers, apps, and exports in each file
  // ==========================================================================
  for (const file of sourceFiles) {
    if (!/\.[jt]sx?$/.test(file.path)) continue;
    if (isTestOrFixturePath(file.path)) continue;

    const normalizedPath = file.path.replace(/\\/g, '/');
    const sourceFile =
      file.ast ||
      ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true
      );

    const ctx: FileContext = {
      filePath: file.path,
      normalizedPath,
      sourceFile,
      expressModuleNames: new Set<string>(),
      routerFactoryNames: new Set<string>(),
      localAppVars: new Set<string>(),
      localRouterVars: new Set<string>(),
      importedRouterMap: new Map<string, string>(),
      namedExports: new Map<string, string>(),
    };

    function inspectFileSymbols(node: ts.Node) {
      // 1. Detect Express Imports:
      // import express from 'express'; import { Router } from 'express';
      if (ts.isImportDeclaration(node)) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const mod = node.moduleSpecifier.text;
          if (mod === 'express') {
            if (node.importClause) {
              if (node.importClause.name) {
                ctx.expressModuleNames.add(node.importClause.name.text);
              }
              if (node.importClause.namedBindings) {
                if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                  ctx.expressModuleNames.add(node.importClause.namedBindings.name.text);
                } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                  for (const elem of node.importClause.namedBindings.elements) {
                    const imported = elem.propertyName ? elem.propertyName.text : elem.name.text;
                    const local = elem.name.text;
                    if (imported === 'Router') {
                      ctx.routerFactoryNames.add(local);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 2. Detect CommonJS require: const express = require('express'); const { Router } = require('express');
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const init = node.initializer;
        if (
          ts.isCallExpression(init) &&
          ts.isIdentifier(init.expression) &&
          init.expression.text === 'require' &&
          init.arguments.length > 0 &&
          ts.isStringLiteral(init.arguments[0])
        ) {
          const reqMod = init.arguments[0].text;
          if (reqMod === 'express') {
            if (ts.isIdentifier(node.name)) {
              ctx.expressModuleNames.add(node.name.text);
            } else if (ts.isObjectBindingPattern(node.name)) {
              for (const elem of node.name.elements) {
                if (ts.isBindingElement(elem) && ts.isIdentifier(elem.name)) {
                  const prop = elem.propertyName && ts.isIdentifier(elem.propertyName)
                    ? elem.propertyName.text
                    : elem.name.text;
                  if (prop === 'Router') {
                    ctx.routerFactoryNames.add(elem.name.text);
                  }
                }
              }
            }
          }
        }

        // 3. Detect App/Router Initializations:
        // const app = express();
        // const router = express.Router(); const router = Router();
        if (ts.isIdentifier(node.name)) {
          const varName = node.name.text;

          // app = express() or require('express')()
          if (ts.isCallExpression(init)) {
            let isExpressCall = false;
            if (ts.isIdentifier(init.expression)) {
              if (ctx.expressModuleNames.has(init.expression.text)) {
                isExpressCall = true;
              }
            } else if (
              ts.isCallExpression(init.expression) &&
              ts.isIdentifier(init.expression.expression) &&
              init.expression.expression.text === 'require' &&
              init.expression.arguments.length > 0 &&
              ts.isStringLiteral(init.expression.arguments[0]) &&
              init.expression.arguments[0].text === 'express'
            ) {
              isExpressCall = true;
            }

            if (isExpressCall) {
              ctx.localAppVars.add(varName);
            }

            // router = Router() or express.Router() or require('express').Router()
            let isRouterCall = false;
            if (ts.isIdentifier(init.expression)) {
              if (ctx.routerFactoryNames.has(init.expression.text)) {
                isRouterCall = true;
              }
            } else if (ts.isPropertyAccessExpression(init.expression)) {
              const methodName = init.expression.name.text;
              if (methodName === 'Router') {
                if (ts.isIdentifier(init.expression.expression)) {
                  if (ctx.expressModuleNames.has(init.expression.expression.text)) {
                    isRouterCall = true;
                  }
                } else if (
                  ts.isCallExpression(init.expression.expression) &&
                  ts.isIdentifier(init.expression.expression.expression) &&
                  init.expression.expression.expression.text === 'require' &&
                  init.expression.expression.arguments.length > 0 &&
                  ts.isStringLiteral(init.expression.expression.arguments[0]) &&
                  init.expression.expression.arguments[0].text === 'express'
                ) {
                  isRouterCall = true;
                }
              }
            }

            if (isRouterCall) {
              ctx.localRouterVars.add(varName);
            }
          }
        }
      }

      // 4. Detect Exports:
      // export default router;
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        if (ts.isIdentifier(node.expression)) {
          ctx.defaultExportRouterId = `${ctx.filePath}#${node.expression.text}`;
        }
      }

      // module.exports = router;
      if (ts.isBinaryExpression(node)) {
        const leftText = node.left.getText(sourceFile);
        if ((leftText === 'module.exports' || leftText === 'exports') && ts.isIdentifier(node.right)) {
          ctx.defaultExportRouterId = `${ctx.filePath}#${node.right.text}`;
        } else if (leftText.startsWith('module.exports.') || leftText.startsWith('exports.')) {
          const exportProp = leftText.split('.')[1];
          if (exportProp && ts.isIdentifier(node.right)) {
            ctx.namedExports.set(exportProp, `${ctx.filePath}#${node.right.text}`);
          }
        }
      }

      // export { router }; export { router as userRouter };
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const elem of node.exportClause.elements) {
          const localName = elem.propertyName ? elem.propertyName.text : elem.name.text;
          const exportName = elem.name.text;
          if (exportName === 'default') {
            ctx.defaultExportRouterId = `${ctx.filePath}#${localName}`;
          } else {
            ctx.namedExports.set(exportName, `${ctx.filePath}#${localName}`);
          }
        }
      }

      // export const userRouter = Router();
      if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer && ts.isCallExpression(decl.initializer)) {
            const varName = decl.name.text;
            let isRouter = false;
            const initExpr = decl.initializer.expression;
            if (ts.isIdentifier(initExpr) && ctx.routerFactoryNames.has(initExpr.text)) {
              isRouter = true;
            } else if (ts.isPropertyAccessExpression(initExpr) && initExpr.name.text === 'Router') {
              if (ts.isIdentifier(initExpr.expression) && ctx.expressModuleNames.has(initExpr.expression.text)) {
                isRouter = true;
              }
            }
            if (isRouter) {
              ctx.localRouterVars.add(varName);
              ctx.namedExports.set(varName, `${ctx.filePath}#${varName}`);
            }
          }
        }
      }

      ts.forEachChild(node, inspectFileSymbols);
    }

    inspectFileSymbols(sourceFile);
    contexts.set(normalizedPath, ctx);
  }

  // ==========================================================================
  // PASS 2: Connect Imported Router Identifiers to Target Router Entities
  // ==========================================================================
  for (const [, ctx] of contexts) {
    function inspectImports(node: ts.Node) {
      // ES Import: import userRouter from './routes/userRouter.js';
      // import { userRouter as users } from './routes/userRouter.js';
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const targetResolved = resolveImportPath(ctx.normalizedPath, specifier, fileLookup);
        if (targetResolved && contexts.has(targetResolved)) {
          const targetCtx = contexts.get(targetResolved)!;

          if (node.importClause) {
            // Default import: import userRouter from './userRouter.js';
            if (node.importClause.name && targetCtx.defaultExportRouterId) {
              const localName = node.importClause.name.text;
              ctx.importedRouterMap.set(localName, targetCtx.defaultExportRouterId);
              ctx.localRouterVars.add(localName);
            }

            // Named imports: import { userRouter } from './userRouter.js';
            if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                const targetExportName = elem.propertyName ? elem.propertyName.text : elem.name.text;
                const localName = elem.name.text;
                if (targetCtx.namedExports.has(targetExportName)) {
                  const targetRouterId = targetCtx.namedExports.get(targetExportName)!;
                  ctx.importedRouterMap.set(localName, targetRouterId);
                  ctx.localRouterVars.add(localName);
                } else if (targetExportName === 'default' && targetCtx.defaultExportRouterId) {
                  ctx.importedRouterMap.set(localName, targetCtx.defaultExportRouterId);
                  ctx.localRouterVars.add(localName);
                }
              }
            }
          }
        }
      }

      // CommonJS Require: const userRouter = require('./routes/userRouter');
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const init = node.initializer;
        if (
          ts.isCallExpression(init) &&
          ts.isIdentifier(init.expression) &&
          init.expression.text === 'require' &&
          init.arguments.length > 0 &&
          ts.isStringLiteral(init.arguments[0])
        ) {
          const specifier = init.arguments[0].text;
          const targetResolved = resolveImportPath(ctx.normalizedPath, specifier, fileLookup);
          if (targetResolved && contexts.has(targetResolved)) {
            const targetCtx = contexts.get(targetResolved)!;

            if (ts.isIdentifier(node.name) && targetCtx.defaultExportRouterId) {
              const localName = node.name.text;
              ctx.importedRouterMap.set(localName, targetCtx.defaultExportRouterId);
              ctx.localRouterVars.add(localName);
            } else if (ts.isObjectBindingPattern(node.name)) {
              for (const elem of node.name.elements) {
                if (ts.isBindingElement(elem) && ts.isIdentifier(elem.name)) {
                  const targetExportName = elem.propertyName && ts.isIdentifier(elem.propertyName)
                    ? elem.propertyName.text
                    : elem.name.text;
                  const localName = elem.name.text;
                  if (targetCtx.namedExports.has(targetExportName)) {
                    const targetRouterId = targetCtx.namedExports.get(targetExportName)!;
                    ctx.importedRouterMap.set(localName, targetRouterId);
                    ctx.localRouterVars.add(localName);
                  }
                }
              }
            }
          }
        }
      }

      ts.forEachChild(node, inspectImports);
    }

    inspectImports(ctx.sourceFile);
  }

  // ==========================================================================
  // PASS 3: Extract Routes, Mounts, and Middleware Registrations
  // ==========================================================================
  const rawRoutes: RawRouteCall[] = [];
  const mounts: RouterMount[] = [];
  const middlewareRegistrations: MiddlewareRegistration[] = [];

  for (const [, ctx] of contexts) {
    const { sourceFile, filePath } = ctx;

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        let callerText = '';
        let methodName = '';
        let chainedRoutePath: string | null = null;
        let isChainedRoute = false;

        if (ts.isPropertyAccessExpression(expr)) {
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

          // POSITIVE EXPRESS IDENTIFICATION:
          // The caller MUST be a verified Express App or Express Router
          const isExpressApp = ctx.localAppVars.has(callerText);
          const isExpressRouter = ctx.localRouterVars.has(callerText);

          if (isExpressApp || isExpressRouter) {
            const entityId = ctx.importedRouterMap.has(callerText)
              ? ctx.importedRouterMap.get(callerText)!
              : `${filePath}#${callerText}`;

            // Handle router mounting & middleware: app.use('/api', mw, router) or router.use(auth)
            if (methodName === 'use' && node.arguments.length >= 1) {
              const firstArg = node.arguments[0];
              const isMountPath = ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg);

              if (isMountPath && node.arguments.length >= 2) {
                const mountPath = (firstArg as ts.StringLiteral).text;
                const restArgs = node.arguments.slice(1);
                const targetArg = restArgs[restArgs.length - 1];
                const mountedTarget = targetArg.getText(sourceFile);

                // Middle arguments are mount-level middlewares
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

                const mountedEntityId = ctx.importedRouterMap.has(mountedTarget)
                  ? ctx.importedRouterMap.get(mountedTarget)!
                  : ctx.localRouterVars.has(mountedTarget)
                    ? `${filePath}#${mountedTarget}`
                    : mountedTarget;

                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                mounts.push({
                  parentEntityId: entityId,
                  parentVarName: callerText,
                  mountPrefix: mountPath,
                  mountedEntityId,
                  mountedVarOrModule: mountedTarget,
                  filePath,
                  pos: node.pos,
                  lineNumber: lineAndChar.line + 1,
                  middlewares: mountMws,
                });
              } else if (!isMountPath) {
                // Router or App level middleware registration: router.use(authMiddleware)
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
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                middlewareRegistrations.push({
                  entityId,
                  pos: node.pos,
                  lineNumber: lineAndChar.line + 1,
                  middlewares: mws,
                });
              }
            }

            // Handle HTTP Route Registration: app.get('/users', ...), router.post('/login', ...)
            const hasSufficientArgs = isChainedRoute ? node.arguments.length >= 1 : node.arguments.length >= 2;

            if (HTTP_METHODS[methodName] && hasSufficientArgs) {
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

              // Extract route handlers and route-level middlewares
              const routeMiddlewares: string[] = [];
              let handlerName: string | undefined;

              for (let i = 0; i < handlerArgs.length; i++) {
                const arg = handlerArgs[i];
                if (ts.isArrayLiteralExpression(arg)) {
                  for (const elem of arg.elements) {
                    routeMiddlewares.push(elem.getText(sourceFile));
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
                    routeMiddlewares.push(text.length > 50 ? 'middleware' : text);
                  }
                }
              }

              // Infer status codes from handler AST
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
                inferredStatusCodes.push(HTTP_METHODS[methodName] === 'POST' ? 201 : 200);
              }

              // Direct route auth check
              let authRequired = false;
              let authMiddlewareDetected: string | undefined;

              for (const mw of routeMiddlewares) {
                if (isKnownAuth(mw)) {
                  authRequired = true;
                  authMiddlewareDetected = mw;
                  break;
                }
              }

              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

              rawRoutes.push({
                id: `route-${rawRoutes.length + 1}`,
                method: HTTP_METHODS[methodName],
                rawPath,
                isDynamicPath: isDynamic,
                filePath,
                lineNumber: lineAndChar.line + 1,
                pos: node.pos,
                routerEntityId: entityId,
                routerVarName: callerText,
                handlerName,
                routeMiddlewares,
                inferredStatusCodes: Array.from(new Set(inferredStatusCodes)),
                authRequired,
                authMiddlewareDetected,
              });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  // ==========================================================================
  // PASS 4: Resolve Mount Chains, Middlewares Order, and Final Route Findings
  // ==========================================================================
  function resolveMountChain(
    targetEntityId: string,
    targetVarName: string,
    visited = new Set<string>()
  ): { fullPrefix: string; mountMiddlewares: string[]; appMiddlewares: string[]; isMounted: boolean } {
    if (visited.has(targetEntityId) || visited.size > 15) {
      return { fullPrefix: '', mountMiddlewares: [], appMiddlewares: [], isMounted: false };
    }
    visited.add(targetEntityId);

    // Look up mount by entity ID or by local var name
    let mount = mounts.find((m) => m.mountedEntityId === targetEntityId);
    if (!mount) {
      mount = mounts.find(
        (m) => m.mountedVarOrModule === targetVarName || m.mountedEntityId.endsWith(`#${targetVarName}`)
      );
    }

    if (!mount) {
      return { fullPrefix: '', mountMiddlewares: [], appMiddlewares: [], isMounted: false };
    }

    let cleanPrefix = mount.mountPrefix.trim();
    if (!cleanPrefix.startsWith('/')) cleanPrefix = '/' + cleanPrefix;
    if (cleanPrefix.endsWith('/') && cleanPrefix.length > 1) {
      cleanPrefix = cleanPrefix.slice(0, -1);
    }

    const parentResult = resolveMountChain(mount.parentEntityId, mount.parentVarName, visited);
    const combinedPrefix = `${parentResult.fullPrefix}${cleanPrefix}`.replace(/\/+/g, '/');
    const combinedMountMws = [...parentResult.mountMiddlewares, ...mount.middlewares];

    // If the top parent is an app, pull app-level middlewares registered before this mount
    const parentAppMws: string[] = [];
    for (const reg of middlewareRegistrations) {
      if (reg.entityId === mount.parentEntityId && reg.pos < mount.pos) {
        parentAppMws.push(...reg.middlewares);
      }
    }

    return {
      fullPrefix: combinedPrefix,
      mountMiddlewares: combinedMountMws,
      appMiddlewares: [...parentResult.appMiddlewares, ...parentAppMws],
      isMounted: true,
    };
  }

  return rawRoutes.map((route, idx) => {
    // 1. Resolve router mount prefix and inherited mount/app middlewares
    const mountInfo = resolveMountChain(route.routerEntityId, route.routerVarName);

    let resolvedPath = route.rawPath;
    if (!route.isDynamicPath) {
      let p = resolvedPath.trim();
      if (!p.startsWith('/')) p = '/' + p;
      if (mountInfo.fullPrefix) {
        if (p === '/' || p === '') {
          resolvedPath = mountInfo.fullPrefix;
        } else {
          resolvedPath = `${mountInfo.fullPrefix}${p}`.replace(/\/+/g, '/');
        }
      } else {
        resolvedPath = p;
      }
    }

    // 2. Resolve router-level middlewares strictly respecting declaration order
    // Only middlewares registered on THIS router BEFORE this route's statement position apply!
    const routerMwsBeforeRoute: string[] = [];
    for (const reg of middlewareRegistrations) {
      if (reg.entityId === route.routerEntityId && reg.pos < route.pos) {
        routerMwsBeforeRoute.push(...reg.middlewares);
      }
    }

    // Combine all middlewares in strict execution order:
    // Application-level -> Mount-level -> Router-level (prior to route) -> Route-level
    const fullMiddlewareChain = Array.from(
      new Set([
        ...mountInfo.appMiddlewares,
        ...mountInfo.mountMiddlewares,
        ...routerMwsBeforeRoute,
        ...route.routeMiddlewares,
      ])
    );

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

    // Extract path parameters (:id, :userId)
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
      routerPrefix: mountInfo.fullPrefix || undefined,
      handlerName: route.handlerName,
      middlewareChain: fullMiddlewareChain,
      parameters,
      inferredStatusCodes: route.inferredStatusCodes,
      authRequired,
      authMiddlewareDetected,
      confidence: route.isDynamicPath ? 'unresolved' : mountInfo.isMounted ? 'confirmed' : 'inferred',
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
