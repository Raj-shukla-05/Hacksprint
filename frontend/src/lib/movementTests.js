// Scoring for the additional movement tests. Each test has:
//   <name>Frame(landmarks)  -> per-video-frame measurements ({ ready: false } when the body is not usable)
//   build<Name>Session(frames) -> { score 0-100, metrics }
// All thresholds are prototype values, NOT clinically validated.
import { LANDMARKS, angle, midpoint, visiblePoint } from './pose';
import {
  adaptiveCycles, clamp, findCycles, mean, median, round, smooth, smoothnessScore, stdev,
} from './mathUtils';

const MIN_FRAMES = 12;

export function durationSeconds(frames) {
  if (frames.length < 2) return 0;
  const first = frames[0].at;
  const last = frames[frames.length - 1].at;
  return first && last ? (last - first) / 1000 : frames.length / 30;
}

const at = (landmarks, name) => landmarks[LANDMARKS[name]];

/* ------------------------------------------------------------------
   Elbow Flex & Extend  (upper limb: elbow range and control)
------------------------------------------------------------------- */
export const ELBOW_TARGET_REPS = 5;

export function elbowFlexionFrame(landmarks) {
  const angles = ['left', 'right'].map((side) => {
    const s = at(landmarks, `${side}Shoulder`);
    const e = at(landmarks, `${side}Elbow`);
    const w = at(landmarks, `${side}Wrist`);
    return [s, e, w].every((p) => visiblePoint(p)) ? angle(s, e, w) : null;
  });
  const usable = angles.filter((v) => v !== null);
  if (!usable.length) return { ready: false };
  // the more bent arm is the one doing the exercise
  return { ready: true, leftAngle: angles[0], rightAngle: angles[1], angle: Math.min(...usable) };
}

export const elbowReps = (frames) => adaptiveCycles(frames.map((f) => f.angle), { kind: 'valley', minRange: 30 });

export function buildElbowFlexionSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < MIN_FRAMES) return { score: 0, metrics: { rangeOfMotion: 0, movementQuality: 0, repetitions: 0 } };
  const angles = smooth(valid.map((f) => f.angle));
  const range = Math.max(...angles) - Math.min(...angles);
  const reps = Math.min(ELBOW_TARGET_REPS, elbowReps(valid).length);
  const rom = clamp((range / 90) * 100, 0, 100);
  const control = smoothnessScore(valid.map((f) => f.angle));
  const repScore = clamp((reps / ELBOW_TARGET_REPS) * 100, 0, 100);
  return {
    score: round(clamp(0.4 * rom + 0.25 * control + 0.35 * repScore, 0, 100)),
    metrics: {
      rangeOfMotion: round(rom),
      movementQuality: round(control),
      repetitions: reps,
      minAngle: round(Math.min(...angles)),
      maxAngle: round(Math.max(...angles)),
    },
  };
}

/* ------------------------------------------------------------------
   Hand to Mouth  (functional: eating / drinking movement)
------------------------------------------------------------------- */
export const HAND_TARGET_REPS = 5;
const HAND_CYCLE = { enter: 60, exit: 30, kind: 'peak' };

export function handToMouthFrame(landmarks) {
  const ls = at(landmarks, 'leftShoulder');
  const rs = at(landmarks, 'rightShoulder');
  if (!visiblePoint(ls) || !visiblePoint(rs)) return { ready: false };
  const shoulderWidth = Math.abs(ls.x - rs.x);
  if (shoulderWidth < 0.05) return { ready: false };

  const ml = at(landmarks, 'mouthLeft');
  const mr = at(landmarks, 'mouthRight');
  const mouth = visiblePoint(ml) && visiblePoint(mr) ? midpoint(ml, mr) : at(landmarks, 'nose');
  if (!visiblePoint(mouth)) return { ready: false };

  const wrists = [at(landmarks, 'leftWrist'), at(landmarks, 'rightWrist')].filter((p) => visiblePoint(p));
  if (!wrists.length) return { ready: false };

  // distance in shoulder-widths, so it does not depend on how far from the camera you sit
  const distance = Math.min(...wrists.map((w) => Math.hypot(w.x - mouth.x, w.y - mouth.y) / shoulderWidth));
  return { ready: true, distance, closeness: clamp(((1.3 - distance) / 1.3) * 100, 0, 100) };
}

export const handReps = (frames) => findCycles(smooth(frames.map((f) => f.closeness)), HAND_CYCLE);

export function buildHandToMouthSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < MIN_FRAMES) return { score: 0, metrics: { reachAccuracy: 0, rangeOfMotion: 0, movementQuality: 0, repetitions: 0 } };
  const closeness = smooth(valid.map((f) => f.closeness));
  const cycles = findCycles(closeness, HAND_CYCLE);
  const reps = Math.min(HAND_TARGET_REPS, cycles.length);
  // how close the hand actually got to the mouth; partial credit when no full rep was completed
  const accuracy = cycles.length ? mean(cycles.map((c) => c.extreme)) : Math.max(...closeness) * 0.6;
  const rom = clamp(((Math.max(...closeness) - Math.min(...closeness)) / 70) * 100, 0, 100);
  const control = smoothnessScore(valid.map((f) => f.closeness));
  const repScore = clamp((reps / HAND_TARGET_REPS) * 100, 0, 100);
  return {
    score: round(clamp(0.35 * accuracy + 0.25 * rom + 0.2 * control + 0.2 * repScore, 0, 100)),
    metrics: {
      reachAccuracy: round(clamp(accuracy, 0, 100)),
      rangeOfMotion: round(rom),
      movementQuality: round(control),
      repetitions: reps,
    },
  };
}

/* ------------------------------------------------------------------
   Seated Knee Extension  (lower limb strength and range; sit side-on to the camera)
------------------------------------------------------------------- */
export const KNEE_TARGET_REPS = 5;

export function kneeExtensionFrame(landmarks) {
  const angles = ['left', 'right'].map((side) => {
    const hip = at(landmarks, `${side}Hip`);
    const knee = at(landmarks, `${side}Knee`);
    const ankle = at(landmarks, `${side}Ankle`);
    return [hip, knee, ankle].every((p) => visiblePoint(p)) ? angle(hip, knee, ankle) : null;
  });
  const usable = angles.filter((v) => v !== null);
  if (!usable.length) return { ready: false };
  // the straighter leg is the one being lifted
  return { ready: true, leftAngle: angles[0], rightAngle: angles[1], angle: Math.max(...usable) };
}

export const kneeReps = (frames) => adaptiveCycles(frames.map((f) => f.angle), { kind: 'peak', minRange: 25 });

export function buildKneeExtensionSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < MIN_FRAMES) return { score: 0, metrics: { rangeOfMotion: 0, movementQuality: 0, repetitions: 0 } };
  const angles = smooth(valid.map((f) => f.angle));
  const range = Math.max(...angles) - Math.min(...angles);
  const reps = Math.min(KNEE_TARGET_REPS, kneeReps(valid).length);
  const rom = clamp((range / 60) * 100, 0, 100);
  const control = smoothnessScore(valid.map((f) => f.angle));
  const repScore = clamp((reps / KNEE_TARGET_REPS) * 100, 0, 100);
  return {
    score: round(clamp(0.4 * rom + 0.25 * control + 0.35 * repScore, 0, 100)),
    metrics: {
      rangeOfMotion: round(rom),
      movementQuality: round(control),
      repetitions: reps,
      peakExtension: round(Math.max(...angles)),
      minAngle: round(Math.min(...angles)),
    },
  };
}

/* ------------------------------------------------------------------
   Marching in Place  (gait readiness: step height, left/right rhythm)
------------------------------------------------------------------- */
export const MARCH_TARGET_STEPS = 10;

export function marchingFrame(landmarks) {
  const ls = at(landmarks, 'leftShoulder');
  const rs = at(landmarks, 'rightShoulder');
  const lh = at(landmarks, 'leftHip');
  const rh = at(landmarks, 'rightHip');
  const lk = at(landmarks, 'leftKnee');
  const rk = at(landmarks, 'rightKnee');
  if (![ls, rs, lh, rh, lk, rk].every((p) => visiblePoint(p))) return { ready: false };
  const sm = midpoint(ls, rs);
  const hm = midpoint(lh, rh);
  const torso = Math.hypot(sm.x - hm.x, sm.y - hm.y);
  if (torso < 0.06) return { ready: false };
  // 0 = knee hanging below the hip, 100 = knee lifted to hip height
  const height = (hip, knee) => clamp(((0.8 - (knee.y - hip.y) / torso) / 0.8) * 100, 0, 100);
  return { ready: true, left: height(lh, lk), right: height(rh, rk) };
}

function marchEvents(frames) {
  const events = [];
  ['left', 'right'].forEach((side) => {
    adaptiveCycles(frames.map((f) => f[side]), { kind: 'peak', minRange: 20 }).forEach((c) => {
      events.push({ side, index: c.enterIndex, height: c.extreme });
    });
  });
  return events.sort((a, b) => a.index - b.index);
}

export const marchSteps = (frames) => marchEvents(frames);

export function buildMarchingSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < MIN_FRAMES) return { score: 0, metrics: { liftHeight: 0, rhythm: 0, symmetry: 0, repetitions: 0 } };
  const events = marchEvents(valid);
  const steps = events.length;

  let alternation = 0;
  if (steps >= 2) {
    let switches = 0;
    for (let i = 1; i < steps; i += 1) if (events[i].side !== events[i - 1].side) switches += 1;
    alternation = switches / (steps - 1);
  }
  const times = events.map((e) => valid[e.index].at ?? e.index * 33);
  const intervals = times.slice(1).map((t, i) => t - times[i]);
  const cv = intervals.length >= 2 && mean(intervals) > 0 ? stdev(intervals) / mean(intervals) : 1;
  let rhythm = 0;
  if (steps >= 3) rhythm = 0.6 * alternation * 100 + 0.4 * (100 - clamp(cv * 100, 0, 100));
  else if (steps === 2) rhythm = alternation * 60;

  const liftHeight = steps ? clamp(mean(events.map((e) => e.height)), 0, 100) : 0;
  const leftMean = mean(events.filter((e) => e.side === 'left').map((e) => e.height));
  const rightMean = mean(events.filter((e) => e.side === 'right').map((e) => e.height));
  const symmetry = leftMean > 0 && rightMean > 0 ? (Math.min(leftMean, rightMean) / Math.max(leftMean, rightMean)) * 100 : 0;
  const repScore = clamp((steps / MARCH_TARGET_STEPS) * 100, 0, 100);

  return {
    score: round(clamp(0.35 * liftHeight + 0.35 * rhythm + 0.15 * symmetry + 0.15 * repScore, 0, 100)),
    metrics: {
      liftHeight: round(liftHeight),
      rhythm: round(clamp(rhythm, 0, 100)),
      symmetry: round(symmetry),
      repetitions: Math.min(MARCH_TARGET_STEPS, steps),
    },
  };
}

/* ------------------------------------------------------------------
   Standing Balance Hold  (static balance: stand still, face the camera)
------------------------------------------------------------------- */
export const BALANCE_HOLD_SECONDS = 30;
export const STEADY_WINDOW = 0.2; // shoulder-widths a hip may drift from its median and still count as "holding"

export function balanceFrame(landmarks) {
  const ls = at(landmarks, 'leftShoulder');
  const rs = at(landmarks, 'rightShoulder');
  const lh = at(landmarks, 'leftHip');
  const rh = at(landmarks, 'rightHip');
  if (![ls, rs, lh, rh].every((p) => visiblePoint(p))) return { ready: false };
  const shoulderWidth = Math.abs(ls.x - rs.x);
  if (shoulderWidth < 0.06) return { ready: false }; // needs a front-facing view
  const sm = midpoint(ls, rs);
  const hm = midpoint(lh, rh);
  const tilt = (Math.atan2(sm.x - hm.x, hm.y - sm.y) * 180) / Math.PI;
  return { ready: true, hipX: hm.x, shoulderWidth, tilt };
}

// Hip position in shoulder-widths. Uses the MEDIAN shoulder width so per-frame landmark noise in the
// width does not leak into the sway measurement.
export function balanceSeries(frames) {
  const sw = median(frames.map((f) => f.shoulderWidth)) || 1;
  return frames.map((f) => f.hipX / sw);
}

export const steadinessOf = (hipXs) => 100 * Math.exp(-stdev(hipXs) / 0.08);

export function buildBalanceHoldSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < 20) return { score: 0, metrics: { stability: 0, trunkControl: 0, holdSeconds: 0 } };
  const hipXs = balanceSeries(valid);
  const stability = steadinessOf(hipXs);
  const trunk = clamp(100 - stdev(valid.map((f) => f.tilt)) * 12, 0, 100);
  const centre = median(hipXs);
  const holdRatio = hipXs.filter((x) => Math.abs(x - centre) <= STEADY_WINDOW).length / hipXs.length;
  const holdSeconds = holdRatio * durationSeconds(valid);
  return {
    score: round(clamp(0.5 * stability + 0.3 * trunk + 0.2 * holdRatio * 100, 0, 100)),
    metrics: {
      stability: round(stability),
      trunkControl: round(trunk),
      holdSeconds: round(holdSeconds, 1),
      swayIndex: round(stdev(hipXs) * 100, 1),
    },
  };
}

/* ------------------------------------------------------------------
   Seated Trunk Lean  (trunk control: lean side to side and come back to centre)
------------------------------------------------------------------- */
export const LEAN_TARGET_REPS = 6;
const LEAN_CYCLE = { enter: 8, exit: 4, kind: 'peak' };

export function trunkLeanFrame(landmarks) {
  const ls = at(landmarks, 'leftShoulder');
  const rs = at(landmarks, 'rightShoulder');
  const lh = at(landmarks, 'leftHip');
  const rh = at(landmarks, 'rightHip');
  if (![ls, rs, lh, rh].every((p) => visiblePoint(p))) return { ready: false };
  const sm = midpoint(ls, rs);
  const hm = midpoint(lh, rh);
  if (Math.hypot(sm.x - hm.x, sm.y - hm.y) < 0.06) return { ready: false };
  return { ready: true, lean: (Math.atan2(sm.x - hm.x, hm.y - sm.y) * 180) / Math.PI };
}

export const leanReps = (frames) => findCycles(smooth(frames.map((f) => Math.abs(f.lean))), LEAN_CYCLE);

export function buildTrunkLeanSession(frames) {
  const valid = frames.filter((f) => f.ready);
  if (valid.length < MIN_FRAMES) return { score: 0, metrics: { rangeOfMotion: 0, symmetry: 0, control: 0, repetitions: 0 } };
  const leans = smooth(valid.map((f) => f.lean));
  const maxRight = Math.max(0, ...leans);
  const maxLeft = Math.max(0, ...leans.map((v) => -v));
  const reps = Math.min(LEAN_TARGET_REPS, leanReps(valid).length);
  const rom = clamp(((maxRight + maxLeft) / 40) * 100, 0, 100);
  const symmetry = maxRight >= 3 && maxLeft >= 3 ? (Math.min(maxRight, maxLeft) / Math.max(maxRight, maxLeft)) * 100 : 0;
  const control = smoothnessScore(valid.map((f) => f.lean));
  const repScore = clamp((reps / LEAN_TARGET_REPS) * 100, 0, 100);
  return {
    score: round(clamp(0.4 * rom + 0.25 * symmetry + 0.2 * control + 0.15 * repScore, 0, 100)),
    metrics: {
      rangeOfMotion: round(rom),
      symmetry: round(symmetry),
      control: round(control),
      repetitions: reps,
      leftLean: round(maxLeft),
      rightLean: round(maxRight),
    },
  };
}
