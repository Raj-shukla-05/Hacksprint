// One place that describes every movement test: what it is, how it is scored, how reps are counted
// and what to show live. Adding a test = adding one entry here (plus the type name in
// backend/src/exerciseTypes.js).
import {
  ArrowUpFromLine, Armchair, Dumbbell, Footprints, Hand, MoveHorizontal, MoveUp, Scale, Utensils,
} from 'lucide-react';
import {
  armRaiseFrame, buildArmRaiseSession, buildSeatedReachSession, buildSitToStandSession, seatedReachFrame, sitToStandFrame,
} from './scoring';
import {
  BALANCE_HOLD_SECONDS, ELBOW_TARGET_REPS, HAND_TARGET_REPS, KNEE_TARGET_REPS, LEAN_TARGET_REPS, MARCH_TARGET_STEPS,
  balanceFrame, balanceSeries, buildBalanceHoldSession, buildElbowFlexionSession, buildHandToMouthSession,
  buildKneeExtensionSession, buildMarchingSession, buildTrunkLeanSession, elbowFlexionFrame, elbowReps, handReps,
  handToMouthFrame, kneeExtensionFrame, kneeReps, leanReps, marchSteps, marchingFrame, steadinessOf, trunkLeanFrame,
} from './movementTests';
import { clamp, countCycles, smoothnessScore, stdev } from './mathUtils';

export const CATEGORIES = [
  { id: 'upper', label: 'Upper limb' },
  { id: 'lower', label: 'Lower limb' },
  { id: 'balance', label: 'Balance & trunk' },
];

const recent = (frames, pick, n = 45) => frames.slice(-n).map(pick);
const smoothnessOf = (frames, pick) => Math.round(smoothnessScore(recent(frames, pick)));
const last = (frames) => frames[frames.length - 1];

const DEFAULT_SAFETY = 'Use a stable chair and stop if you feel unsafe or unwell.';

export const EXERCISES = {
  /* ------------------------------ upper limb ------------------------------ */
  arm_raise: {
    id: 'arm_raise',
    title: 'Arm Raise',
    category: 'upper',
    icon: MoveUp,
    desc: 'Shoulder range and symmetry',
    instruction: 'Raise both arms slowly until they are as high and comfortable as possible, then lower.',
    area: 'Shoulders and arms',
    region: 'arms',
    position: 'Seated or standing',
    view: 'Face the camera',
    measured: ['Shoulder range', 'Left/right symmetry', 'Movement control', 'Reps'],
    mode: 'reps', targetReps: 5, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Arm height', levelUnit: '%', qualityLabel: 'Symmetry',
    safety: DEFAULT_SAFETY,
    doctorHint: 'Perform 5 slow, bilateral arm raises. Keep shoulders relaxed and hold at the top for 1 second.',
    suggested: true,
    frame: armRaiseFrame,
    build: buildArmRaiseSession,
    count: (frames) => countCycles(frames.map((f) => f.averageElevation || 0), { enter: 70, exit: 48, kind: 'peak' }, 5),
    live: (frames) => {
      const c = last(frames);
      return { phase: c.averageElevation > 70 ? 'Raise' : 'Lower', value: Math.round(c.averageElevation), quality: Math.round(c.symmetry) };
    },
  },
  elbow_flexion: {
    id: 'elbow_flexion',
    title: 'Elbow Flex & Extend',
    category: 'upper',
    icon: Dumbbell,
    desc: 'Elbow range and control',
    instruction: 'Let your arm hang by your side, bend your elbow to bring your hand up toward your shoulder, then lower it slowly.',
    area: 'Elbow and forearm',
    region: 'arms',
    position: 'Seated or standing',
    view: 'Face the camera, arms visible',
    measured: ['Elbow range', 'Smoothness', 'Reps'],
    mode: 'reps', targetReps: ELBOW_TARGET_REPS, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Elbow bend', levelUnit: '°', qualityLabel: 'Smoothness',
    safety: DEFAULT_SAFETY,
    doctorHint: 'Perform 5 slow elbow bends and straightens with the affected arm. Keep the upper arm still by your side.',
    frame: elbowFlexionFrame,
    build: buildElbowFlexionSession,
    count: (frames) => Math.min(ELBOW_TARGET_REPS, elbowReps(frames).length),
    live: (frames) => {
      const c = last(frames);
      return {
        phase: c.angle < 100 ? 'Bent' : c.angle > 150 ? 'Straight' : 'Moving',
        value: Math.round(180 - c.angle),
        quality: smoothnessOf(frames, (f) => f.angle),
      };
    },
  },
  hand_to_mouth: {
    id: 'hand_to_mouth',
    title: 'Hand to Mouth',
    category: 'upper',
    icon: Utensils,
    desc: 'Everyday eating and drinking movement',
    instruction: 'Bring your hand up to your mouth as if drinking from a cup, then return it to your lap. Use the arm you want to train.',
    area: 'Arm and hand',
    region: 'arms',
    position: 'Seated',
    view: 'Face the camera, head and hands visible',
    measured: ['Reach accuracy', 'Movement range', 'Smoothness', 'Reps'],
    mode: 'reps', targetReps: HAND_TARGET_REPS, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Closeness to mouth', levelUnit: '%', qualityLabel: 'Smoothness',
    safety: DEFAULT_SAFETY,
    doctorHint: 'Perform 5 hand-to-mouth reaches as if drinking from a cup, returning the hand to the lap each time.',
    frame: handToMouthFrame,
    build: buildHandToMouthSession,
    count: (frames) => Math.min(HAND_TARGET_REPS, handReps(frames).length),
    live: (frames) => {
      const c = last(frames);
      return {
        phase: c.closeness > 60 ? 'At mouth' : c.closeness < 30 ? 'Lowered' : 'Moving',
        value: Math.round(c.closeness),
        quality: smoothnessOf(frames, (f) => f.closeness),
      };
    },
  },

  /* ------------------------------ lower limb ------------------------------ */
  sit_to_stand: {
    id: 'sit_to_stand',
    title: 'Sit-to-Stand',
    category: 'lower',
    icon: ArrowUpFromLine,
    desc: 'Leg strength and stability',
    instruction: 'From a stable chair, stand up tall and return to the seated position at a comfortable pace.',
    area: 'Hips, knees and legs',
    region: 'legs',
    position: 'Standing from a chair',
    view: 'Face the camera, full body visible',
    measured: ['Knee angle', 'Stability', 'Movement control', 'Reps'],
    mode: 'reps', targetReps: 5, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Knee angle', levelUnit: '°', qualityLabel: 'Smoothness',
    safety: 'Use a sturdy chair against a wall and keep something stable within reach. Stop if you feel dizzy.',
    doctorHint: 'Complete 5 repetitions from a stable chair with arms crossed over chest. Focus on smooth, balanced ascent and descent.',
    frame: sitToStandFrame,
    build: buildSitToStandSession,
    count: (frames) => countCycles(frames.map((f) => f.kneeAngle || 0), { enter: 110, exit: 150, kind: 'valley' }, 5),
    live: (frames) => ({
      phase: 'Tracking',
      value: Math.round(last(frames).kneeAngle),
      quality: smoothnessOf(frames, (f) => f.kneeAngle),
    }),
  },
  knee_extension: {
    id: 'knee_extension',
    title: 'Seated Knee Extension',
    category: 'lower',
    icon: Armchair,
    desc: 'Isolated leg strength and range',
    instruction: 'Sit side-on to the camera. Straighten one knee to lift your foot out in front, hold for a moment, then lower it slowly.',
    area: 'Knee and thigh',
    region: 'legs',
    position: 'Seated',
    view: 'Sit side-on, hip to foot visible',
    measured: ['Knee range', 'Smoothness', 'Reps'],
    mode: 'reps', targetReps: KNEE_TARGET_REPS, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Knee angle', levelUnit: '°', qualityLabel: 'Smoothness',
    safety: DEFAULT_SAFETY,
    doctorHint: 'Perform 5 slow knee extensions seated, one leg at a time, holding the leg straight for 1 second.',
    frame: kneeExtensionFrame,
    build: buildKneeExtensionSession,
    count: (frames) => Math.min(KNEE_TARGET_REPS, kneeReps(frames).length),
    live: (frames) => {
      const c = last(frames);
      return {
        phase: c.angle > 150 ? 'Extended' : c.angle < 115 ? 'Bent' : 'Moving',
        value: Math.round(c.angle),
        quality: smoothnessOf(frames, (f) => f.angle),
      };
    },
  },
  marching: {
    id: 'marching',
    title: 'Marching in Place',
    category: 'lower',
    icon: Footprints,
    desc: 'Step height and left/right rhythm',
    instruction: 'March slowly on the spot, lifting each knee toward hip height and alternating left and right. Hold a counter if you need to.',
    area: 'Hips, knees and legs',
    region: 'legs',
    position: 'Seated or standing',
    view: 'Face the camera, hips and knees visible',
    measured: ['Step height', 'Rhythm', 'Left/right balance', 'Steps'],
    mode: 'reps', targetReps: MARCH_TARGET_STEPS, repsLabel: 'steps', maxSeconds: 30,
    levelLabel: 'Knee lift', levelUnit: '%', qualityLabel: 'Rhythm',
    safety: 'If standing, hold a sturdy counter or chair back. Stop if you feel unsteady.',
    doctorHint: 'Perform 10 slow marching steps in place, alternating legs, lifting each knee toward hip height.',
    frame: marchingFrame,
    build: buildMarchingSession,
    count: (frames) => Math.min(MARCH_TARGET_STEPS, marchSteps(frames).length),
    live: (frames) => {
      const c = last(frames);
      const lift = Math.max(c.left, c.right);
      return {
        phase: lift < 30 ? 'Down' : c.left >= c.right ? 'Left up' : 'Right up',
        value: Math.round(lift),
        quality: smoothnessOf(frames, (f) => Math.max(f.left, f.right)),
      };
    },
  },

  /* --------------------------- balance & trunk ---------------------------- */
  seated_reach: {
    id: 'seated_reach',
    title: 'Seated Reach',
    category: 'balance',
    icon: Hand,
    desc: 'Reach and path efficiency',
    instruction: 'Reach forward and slightly upward with both hands, then return to your starting position.',
    area: 'Trunk and reaching arm',
    region: 'torso',
    position: 'Seated',
    view: 'Face the camera, upper body visible',
    measured: ['Reach distance', 'Path efficiency', 'Movement control', 'Reps'],
    mode: 'reps', targetReps: 5, repsLabel: 'reps', maxSeconds: 45,
    levelLabel: 'Reach', levelUnit: '°', qualityLabel: 'Reach signal',
    safety: DEFAULT_SAFETY,
    doctorHint: 'Perform 5 controlled forward reaches from an upright seated posture. Maintain core stability throughout.',
    frame: seatedReachFrame,
    build: buildSeatedReachSession,
    count: (frames) => countCycles(frames.map((f) => f.reach || 0), { enter: 40, exit: 25, kind: 'peak' }, 5),
    live: (frames) => {
      const c = last(frames);
      return { phase: 'Tracking', value: Math.round(c.reach), quality: Math.round(c.reach) };
    },
  },
  trunk_lean: {
    id: 'trunk_lean',
    title: 'Seated Trunk Lean',
    category: 'balance',
    icon: MoveHorizontal,
    desc: 'Trunk control, side to side',
    instruction: 'Sit tall without leaning on the back of the chair. Lean your upper body slowly to one side, return to the middle, then lean to the other side.',
    area: 'Trunk and core',
    region: 'torso',
    position: 'Seated',
    view: 'Face the camera, shoulders and hips visible',
    measured: ['Lean range', 'Left/right symmetry', 'Control', 'Leans'],
    mode: 'reps', targetReps: LEAN_TARGET_REPS, repsLabel: 'leans', maxSeconds: 45,
    levelLabel: 'Lean', levelUnit: '°', qualityLabel: 'Smoothness',
    safety: 'Sit on a firm chair with both feet flat, and keep a wall or table close on the side you lean toward.',
    doctorHint: 'Perform 6 slow side-to-side trunk leans (3 each side) in a supported seated position, returning to centre each time.',
    frame: trunkLeanFrame,
    build: buildTrunkLeanSession,
    count: (frames) => Math.min(LEAN_TARGET_REPS, leanReps(frames).length),
    live: (frames) => {
      const c = last(frames);
      return {
        phase: c.lean > 8 ? 'Leaning right' : c.lean < -8 ? 'Leaning left' : 'Centre',
        value: Math.round(c.lean),
        quality: smoothnessOf(frames, (f) => f.lean),
      };
    },
  },
  balance_hold: {
    id: 'balance_hold',
    title: 'Standing Balance Hold',
    category: 'balance',
    icon: Scale,
    desc: 'Stand still and steady',
    instruction: 'Stand tall, feet hip-width apart, facing the camera. Stay as still as you can until the timer ends. Rest a hand on a counter if you need to.',
    area: 'Whole body',
    region: 'body',
    position: 'Standing',
    view: 'Face the camera, head to hips visible',
    measured: ['Sway', 'Trunk steadiness', 'Hold time'],
    mode: 'hold', holdSeconds: BALANCE_HOLD_SECONDS, maxSeconds: BALANCE_HOLD_SECONDS,
    levelLabel: 'Steadiness', levelUnit: '%', qualityLabel: 'Trunk steadiness',
    safety: 'Stand right next to a sturdy counter or chair you can grab. Do not do this test if you feel unsteady or dizzy.',
    doctorHint: 'Stand still for 30 seconds, feet hip-width apart, with a sturdy support within reach. Stop if unsteady.',
    frame: balanceFrame,
    build: buildBalanceHoldSession,
    count: () => 0,
    live: (frames) => {
      const window = frames.slice(-90);
      return {
        phase: 'Hold still',
        value: Math.round(steadinessOf(balanceSeries(window))),
        quality: Math.round(clamp(100 - stdev(window.map((f) => f.tilt)) * 12, 0, 100)),
      };
    },
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES);

export const exerciseTitle = (id) => EXERCISES[id]?.title || id;

/** Short text such as "5 reps · up to 45s" or "Hold still · 30s". */
export function targetText(ex) {
  return ex.mode === 'hold'
    ? `Hold still · ${ex.holdSeconds}s`
    : `${ex.targetReps} ${ex.repsLabel} · up to ${ex.maxSeconds}s`;
}

/** Wording for a clinician-set target, e.g. "5 controlled reps" or "30 second hold". */
export function assignedTargetText(type, targetReps) {
  const ex = EXERCISES[type];
  if (!ex) return `${targetReps} reps`;
  if (ex.mode === 'hold') return `${ex.holdSeconds} second hold`;
  return `${targetReps} controlled ${ex.repsLabel}`;
}
