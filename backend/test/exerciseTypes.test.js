const test = require('node:test');
const assert = require('node:assert/strict');
const { EXERCISE_TYPES, isValidExerciseType, normalizeMetrics } = require('../src/exerciseTypes');

test('exercise types: all nine tests are supported and unknown ones are rejected', () => {
  assert.equal(EXERCISE_TYPES.length, 9);
  ['arm_raise', 'sit_to_stand', 'seated_reach', 'elbow_flexion', 'hand_to_mouth', 'knee_extension', 'marching', 'trunk_lean', 'balance_hold']
    .forEach((type) => assert.ok(isValidExerciseType(type), `${type} should be valid`));
  assert.equal(isValidExerciseType('unsupported_exercise'), false);
  assert.equal(isValidExerciseType(undefined), false);
});

test('normalizeMetrics: original tests keep their existing mapping', () => {
  const arm = normalizeMetrics('arm_raise', { rangeOfMotion: 80, symmetry: 70 }, 75);
  assert.equal(arm.movement, 80);
  assert.equal(arm.coordination, 70);
  assert.equal('balance' in arm, false);

  const sts = normalizeMetrics('sit_to_stand', { movementQuality: 60, stability: 90 }, 70);
  assert.equal(sts.movement, 60);
  assert.equal(sts.balance, 90);

  const reach = normalizeMetrics('seated_reach', { movementQuality: 55, pathEfficiency: 65 }, 60);
  assert.equal(reach.movement, 55);
  assert.equal(reach.coordination, 65);
});

test('normalizeMetrics: balance_hold feeds only Balance', () => {
  const m = normalizeMetrics('balance_hold', { stability: 88, trunkControl: 70, holdSeconds: 30 }, 80);
  assert.equal(m.balance, 88);
  assert.equal('movement' in m, false);
  assert.equal('coordination' in m, false);
  assert.equal(m.holdSeconds, 30); // raw metric is kept
});

test('normalizeMetrics: new tests map to the shared metrics and never invent unmeasured ones', () => {
  const elbow = normalizeMetrics('elbow_flexion', { rangeOfMotion: 70, movementQuality: 82 }, 75);
  assert.deepEqual([elbow.movement, elbow.coordination, 'balance' in elbow], [70, 82, false]);

  const hand = normalizeMetrics('hand_to_mouth', { rangeOfMotion: 60, reachAccuracy: 91 }, 70);
  assert.deepEqual([hand.movement, hand.coordination], [60, 91]);

  const march = normalizeMetrics('marching', { liftHeight: 66, rhythm: 90 }, 75);
  assert.deepEqual([march.movement, march.coordination], [66, 90]);

  const lean = normalizeMetrics('trunk_lean', { rangeOfMotion: 55, control: 77 }, 65);
  assert.deepEqual([lean.movement, lean.balance, 'coordination' in lean], [55, 77, false]);

  // a metric the client did not send is simply absent, not defaulted to the score
  const knee = normalizeMetrics('knee_extension', { rangeOfMotion: 64 }, 70);
  assert.equal(knee.movement, 64);
  assert.equal('coordination' in knee, false);
});

test('normalizeMetrics: shared keys sent by a client for a new test are not trusted', () => {
  const m = normalizeMetrics('balance_hold', { stability: 50, movement: 99, coordination: 99, speech: 99 }, 50);
  assert.equal(m.balance, 50);
  assert.equal('movement' in m, false);
  assert.equal('coordination' in m, false);
  assert.equal('speech' in m, false);
});
