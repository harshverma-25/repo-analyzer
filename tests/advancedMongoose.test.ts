import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMongooseModels } from '../packages/analyzer/src/database-models/mongooseExtractor.js';

test('Mongoose Extractor — parses complex validation constraints, enums, and compound indexes', () => {
  const code = `
    import mongoose, { Schema } from 'mongoose';

    const OrderSchema = new Schema({
      orderNumber: { type: String, required: true, unique: true },
      status: {
        type: String,
        enum: ['pending', 'paid', 'shipped', 'cancelled'],
        default: 'pending'
      },
      amount: { type: Number, required: true },
      customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }
    });

    OrderSchema.index({ customer: 1, createdAt: -1 });

    export const Order = mongoose.model('Order', OrderSchema);
  `;

  const models = extractMongooseModels([{ path: 'src/models/Order.ts', content: code }]);
  assert.equal(models.length, 1);

  const order = models[0];
  assert.equal(order.modelName, 'Order');

  const statusField = order.fields.find((f) => f.name === 'status');
  assert.ok(statusField);
  assert.deepEqual(statusField.options.enum, ['pending', 'paid', 'shipped', 'cancelled']);
  assert.equal(statusField.options.default, 'pending');

  const customerField = order.fields.find((f) => f.name === 'customer');
  assert.ok(customerField);
  assert.equal(customerField.isReference, true);
  assert.equal(customerField.refTarget, 'Customer');

  // Verify compound index
  assert.ok(order.indexes.length >= 1);
  assert.equal(order.indexes[0].fields['customer'], 1);
  assert.equal(order.indexes[0].fields['createdAt'], -1);
});
