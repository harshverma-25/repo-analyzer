import ts from 'typescript';
import type { DatabaseModelFinding, ModelField, ModelIndex } from '@repo-analyzer/shared';

export function extractMongooseModels(
  sourceFiles: { path: string; content: string; ast?: ts.SourceFile }[]
): DatabaseModelFinding[] {
  const models: DatabaseModelFinding[] = [];

  for (const file of sourceFiles) {
    if (!/\.[jt]sx?$/.test(file.path)) continue;

    const sourceFile =
      file.ast ||
      ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true
      );

    // Track schemas discovered in this file
    const schemaMap = new Map<string, { fields: ModelField[]; indexes: ModelIndex[]; lineNumber: number }>();

    function visit(node: ts.Node) {
      // 1. Detect `new Schema({ ... })` or `new mongoose.Schema({ ... })`
      if (ts.isNewExpression(node)) {
        const expressionText = node.expression.getText(sourceFile);
        if (expressionText === 'Schema' || expressionText === 'mongoose.Schema') {
          if (node.arguments && node.arguments.length > 0) {
            const firstArg = node.arguments[0];
            if (ts.isObjectLiteralExpression(firstArg)) {
              const fields = parseSchemaFields(firstArg, sourceFile);
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

              // Check if assigned to a variable, e.g. const UserSchema = ...
              let varName = 'AnonymousSchema';
              if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
                varName = node.parent.name.text;
              }

              schemaMap.set(varName, {
                fields,
                indexes: [],
                lineNumber: lineAndChar.line + 1,
              });
            }
          }
        }
      }

      // 2. Detect `schema.index({ field: 1 }, { unique: true })`
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'index') {
          const callerName = expr.expression.getText(sourceFile);
          if (schemaMap.has(callerName) && node.arguments.length > 0) {
            const indexArg = node.arguments[0];
            if (ts.isObjectLiteralExpression(indexArg)) {
              const indexFields: Record<string, number> = {};
              for (const prop of indexArg.properties) {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                  const val = prop.initializer.getText(sourceFile);
                  indexFields[prop.name.text] = parseInt(val, 10) || 1;
                }
              }

              let unique = false;
              if (node.arguments.length > 1 && ts.isObjectLiteralExpression(node.arguments[1])) {
                for (const opt of (node.arguments[1] as ts.ObjectLiteralExpression).properties) {
                  if (ts.isPropertyAssignment(opt) && opt.name.getText(sourceFile) === 'unique') {
                    unique = opt.initializer.getText(sourceFile) === 'true';
                  }
                }
              }

              schemaMap.get(callerName)!.indexes.push({
                fields: indexFields,
                unique,
              });
            }
          }
        }
      }

      // 3. Detect `mongoose.model('User', UserSchema)` or `model('User', UserSchema)`
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        let isModelCall = false;

        if (ts.isPropertyAccessExpression(expr)) {
          if (expr.expression.getText(sourceFile) === 'mongoose' && expr.name.text === 'model') {
            isModelCall = true;
          }
        } else if (ts.isIdentifier(expr) && expr.text === 'model') {
          isModelCall = true;
        }

        if (isModelCall && node.arguments.length >= 1) {
          const nameArg = node.arguments[0];
          let modelName = '';
          if (ts.isStringLiteral(nameArg) || ts.isNoSubstitutionTemplateLiteral(nameArg)) {
            modelName = nameArg.text;
          }

          if (modelName) {
            let fields: ModelField[] = [];
            let indexes: ModelIndex[] = [];
            let lineNumber = 1;

            if (node.arguments.length >= 2) {
              const schemaArg = node.arguments[1];
              const schemaArgText = schemaArg.getText(sourceFile);

              if (schemaMap.has(schemaArgText)) {
                const s = schemaMap.get(schemaArgText)!;
                fields = s.fields;
                indexes = s.indexes;
                lineNumber = s.lineNumber;
              } else if (ts.isObjectLiteralExpression(schemaArg)) {
                fields = parseSchemaFields(schemaArg, sourceFile);
              }
            }

            const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

            // Extract relationships
            const relationships: DatabaseModelFinding['relationships'] = [];
            for (const field of fields) {
              if (field.isReference && field.refTarget) {
                relationships.push({
                  targetModel: field.refTarget,
                  foreignField: field.name,
                  type: 'references',
                });
              }
            }

            models.push({
              id: `model-${models.length + 1}`,
              modelName,
              filePath: file.path,
              lineNumber: lineNumber || lineAndChar.line + 1,
              fields,
              relationships,
              indexes,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return models;
}

function parseSchemaFields(
  objLiteral: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): ModelField[] {
  const fields: ModelField[] = [];

  for (const prop of objLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const fieldName = prop.name.getText(sourceFile).replace(/['"]/g, '');
    const init = prop.initializer;

    let type = 'Mixed';
    let isReference = false;
    let refTarget: string | undefined;
    let isEmbedded = false;
    const options: ModelField['options'] = {};

    if (ts.isIdentifier(init)) {
      type = init.text;
    } else if (ts.isArrayLiteralExpression(init)) {
      type = 'Array';
      isEmbedded = true;
      if (init.elements.length > 0) {
        const elem = init.elements[0];
        if (ts.isIdentifier(elem)) {
          type = `${elem.text}[]`;
        } else if (ts.isObjectLiteralExpression(elem)) {
          type = 'Subdocument[]';
          for (const optProp of elem.properties) {
            if (ts.isPropertyAssignment(optProp)) {
              const optName = optProp.name.getText(sourceFile).replace(/['"]/g, '');
              if (optName === 'ref') {
                isReference = true;
                refTarget = optProp.initializer.getText(sourceFile).replace(/['"]/g, '');
                options.ref = refTarget;
              }
            }
          }
        }
      }
    } else if (ts.isObjectLiteralExpression(init)) {
      for (const optProp of init.properties) {
        if (!ts.isPropertyAssignment(optProp)) continue;
        const optName = optProp.name.getText(sourceFile).replace(/['"]/g, '');
        const optVal = optProp.initializer;

        if (optName === 'type') {
          type = optVal.getText(sourceFile).replace(/['"]/g, '');
        } else if (optName === 'required') {
          options.required = optVal.getText(sourceFile) === 'true';
        } else if (optName === 'unique') {
          options.unique = optVal.getText(sourceFile) === 'true';
        } else if (optName === 'ref') {
          isReference = true;
          refTarget = optVal.getText(sourceFile).replace(/['"]/g, '');
          options.ref = refTarget;
        } else if (optName === 'default') {
          options.default = optVal.getText(sourceFile).replace(/['"]/g, '');
        } else if (optName === 'enum' && ts.isArrayLiteralExpression(optVal)) {
          options.enum = optVal.elements.map((e) => e.getText(sourceFile).replace(/['"]/g, ''));
        }
      }
    }

    fields.push({
      name: fieldName,
      type,
      options,
      isReference,
      refTarget,
      isEmbedded,
    });
  }

  return fields;
}
