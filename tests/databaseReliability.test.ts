import test from 'node:test';
import assert from 'node:assert/strict';
import { ScanStatusEnum, ScanStageEnum } from '../packages/shared/src/index.js';

test('Database Reliability — ScanStatusEnum and ScanStageEnum strictly validate valid lifecycle stages', () => {
  // Valid statuses
  assert.equal(ScanStatusEnum.safeParse('queued').success, true);
  assert.equal(ScanStatusEnum.safeParse('running').success, true);
  assert.equal(ScanStatusEnum.safeParse('completed').success, true);
  assert.equal(ScanStatusEnum.safeParse('failed').success, true);
  assert.equal(ScanStatusEnum.safeParse('cancelled').success, true);

  // Invalid status
  assert.equal(ScanStatusEnum.safeParse('zombie_state').success, false);
  assert.equal(ScanStatusEnum.safeParse('').success, false);

  // Valid stages
  const validStages = [
    'queued',
    'validating',
    'resolving_revision',
    'fetching_tree',
    'analyzing_code',
    'generating_ai_insights',
    'completed',
    'failed',
  ];

  for (const stage of validStages) {
    assert.equal(ScanStageEnum.safeParse(stage).success, true);
  }

  // Invalid stage
  assert.equal(ScanStageEnum.safeParse('hacking_system').success, false);
  assert.equal(ScanStageEnum.safeParse(123).success, false);
});
