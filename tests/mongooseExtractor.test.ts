import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { extractMongooseModels } from '../packages/analyzer/src/database-models/mongooseExtractor.js';

test('Mongoose Extractor — discovers models, fields, options, refs and indexes', () => {
  const userContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/models/User.ts'),
    'utf8'
  );
  const postContent = fs.readFileSync(
    path.resolve(process.cwd(), 'fixtures/express-ts-nested/src/models/Post.ts'),
    'utf8'
  );

  const files = [
    { path: 'src/models/User.ts', content: userContent },
    { path: 'src/models/Post.ts', content: postContent },
  ];

  const models = extractMongooseModels(files);
  assert.equal(models.length, 2, 'Should discover both User and Post models');

  const userModel = models.find((m) => m.modelName === 'User');
  assert.ok(userModel, 'User model must be found');

  // Verify fields
  const emailField = userModel.fields.find((f) => f.name === 'email');
  assert.ok(emailField);
  assert.equal(emailField.type, 'String');
  assert.equal(emailField.options.required, true);
  assert.equal(emailField.options.unique, true);

  const postsField = userModel.fields.find((f) => f.name === 'posts');
  assert.ok(postsField);
  assert.equal(postsField.isReference, true);
  assert.equal(postsField.refTarget, 'Post');

  // Verify index
  assert.ok(userModel.indexes.length >= 1, 'Should find compound or single index');
  assert.equal(userModel.indexes[0].unique, true);

  // Verify Post model
  const postModel = models.find((m) => m.modelName === 'Post');
  assert.ok(postModel);
  const authorField = postModel.fields.find((f) => f.name === 'author');
  assert.ok(authorField);
  assert.equal(authorField.refTarget, 'User');
});
