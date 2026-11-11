// The movement tests the app supports, and how each test's scores feed the shared
// Movement / Balance / Coordination / Speech metrics used by the trend engine.
// Keep this list in step with frontend/src/lib/exercises.js.

const EXERCISE_TYPES = [
  'arm_raise',
  'elbow_flexion',
  'hand_to_mouth',
  'sit_to_stand',
  'knee_extension',
  'marching',
  'seated_reach',
  'trunk_lean',
  'balance_hold',
];

const isValidExerciseType = (type) => EXERCISE_TYPES.includes(type);

// For the newer tests: { sharedMetric: nameOfTheMetricTheFrontendSends }.
// A shared metric a test does not measure is left out (never defaulted), so unmeasured
// dimensions are not shown as if they had been measured.
const METRIC_MAP = {
  elbow_flexion: { movement: 'rangeOfMotion', coordination: 'movementQuality' },
  hand_to_mouth: { movement: 'rangeOfMotion', coordination: 'reachAccuracy' },
  knee_extension: { movement: 'rangeOfMotion', coordination: 'movementQuality' },
  marching: { movement: 'liftHeight', coordination: 'rhythm' },
  trunk_lean: { movement: 'rangeOfMotion', balance: 'control' },
  balance_hold: { balance: 'stability' },
};

const SHARED = ['movement', 'balance', 'coordination', 'speech'];

function normalizeMetrics(exerciseType, inputMetrics, score) {
  const input = inputMetrics || {};
  const out = { ...input };

  if (exerciseType === 'arm_raise') {
    // arm_raise measures movement (range of motion) and coordination (symmetry).
    // Balance is NOT measured in an arm_raise session.
    out.movement = Number(input.rangeOfMotion ?? input.movementQuality ?? score);
    out.coordination = Number(input.symmetry ?? score);
    if (input.speech !== undefined && input.speech !== null) {
      out.speech = Number(input.speech);
    } else {
      delete out.speech;
    }
    if (input.balance === undefined || input.balance === null) {
      delete out.balance;
    }
  } else if (exerciseType === 'sit_to_stand') {
    // sit_to_stand measures movement quality and balance (stability).
    out.movement = Number(input.movementQuality ?? score);
    if (input.stability !== undefined || input.balance !== undefined) {
      out.balance = Number(input.stability ?? input.balance);
    }
    delete out.speech;
  } else if (exerciseType === 'seated_reach') {
    // seated_reach measures movement quality and coordination (path efficiency).
    out.movement = Number(input.movementQuality ?? score);
    if (input.pathEfficiency !== undefined || input.coordination !== undefined) {
      out.coordination = Number(input.pathEfficiency ?? input.coordination);
    }
    delete out.balance;
    delete out.speech;
  } else if (METRIC_MAP[exerciseType]) {
    SHARED.forEach((key) => delete out[key]);
    Object.entries(METRIC_MAP[exerciseType]).forEach(([shared, source]) => {
      const value = Number(input[source]);
      if (input[source] !== undefined && input[source] !== null && Number.isFinite(value)) out[shared] = value;
    });
  }
  return out;
}

module.exports = { EXERCISE_TYPES, isValidExerciseType, normalizeMetrics, METRIC_MAP };
