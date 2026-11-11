// A tiny 3D stick-figure rig: joint angles -> 3D joint positions -> perspective projection.
// Every movement test has a looping keyframe "motion" so the UI can demonstrate it.
// Coordinates: x = subject's right side, y = up, z = toward the viewer. Units are roughly px at scale 1.

const RAD = Math.PI / 180;

export const BODY = {
  spine: 60, neck: 13, headR: 14, shoulderW: 25, hipW: 13,
  upperArm: 34, foreArm: 31, thigh: 48, shin: 46, ankle: 5, foot: 11,
};

// Angles are degrees. Arms: Abd = out to the side, Flex = forward, Elb = elbow bend, Rot = forearm swung across the body.
// Legs: Hip = hip flexion (knee forward/up), HipA = out to the side, Knee = knee bend.
export const REST = {
  lean: 0, bend: 0, twist: 0, sway: 0, nod: 0, tilt: 0, breathe: 1,
  lAbd: 9, lFlex: 4, lElb: 14, lRot: 0,
  rAbd: 9, rFlex: 4, rElb: 14, rRot: 0,
  lHip: 0, lHipA: 3, lKnee: 0,
  rHip: 0, rHipA: 3, rKnee: 0,
  seat: 0, talk: 0,
};
const KEYS = Object.keys(REST);

const rotX = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x, y * c - z * s, y * s + z * c]; };
const rotY = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, y, -x * s + z * c]; };
const rotZ = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c, z]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

const HANG = [0, -1, 0];
const flex = (v, deg) => rotX(v, -deg * RAD);                // hanging limb swings forward (+z)
const abduct = (v, deg, side) => rotZ(v, side * deg * RAD);  // limb swings out to its side

/** Pose (angles) -> 3D joints, with the feet planted on the floor (y = 0). */
export function solve(p) {
  const B = BODY;
  const trunk = (v) => rotZ(rotX(rotY(v, p.twist * RAD), p.bend * RAD), -p.lean * RAD);
  const head = (v) => rotZ(rotX(v, p.nod * RAD), -p.tilt * RAD);
  const J = {};
  J.pelvis = [p.sway, 0, 0];
  const spine = B.spine * p.breathe;
  J.neck = add(J.pelvis, trunk([0, spine, 0]));
  J.head = add(J.neck, trunk(head([0, B.neck + B.headR, 0])));
  J.nose = add(J.head, trunk(head([0, -2, B.headR])));

  for (const [k, s] of [['l', -1], ['r', 1]]) {
    const sh = add(J.neck, trunk([s * B.shoulderW, -5, 0]));
    const ab = p[`${k}Abd`], fl = p[`${k}Flex`], el = p[`${k}Elb`], ro = p[`${k}Rot`];
    const upper = trunk(abduct(flex(HANG, fl), ab, s));
    const foreLocal = rotY(flex(HANG, el), -s * ro * RAD);
    const fore = trunk(abduct(flex(foreLocal, fl), ab, s));
    J[`${k}Shoulder`] = sh;
    J[`${k}Elbow`] = add(sh, mul(upper, B.upperArm));
    J[`${k}Wrist`] = add(J[`${k}Elbow`], mul(fore, B.foreArm));

    const hf = p[`${k}Hip`], ha = p[`${k}HipA`], kn = p[`${k}Knee`];
    const hip = add(J.pelvis, [s * B.hipW, 0, 0]);
    const thigh = abduct(flex(HANG, hf), ha, s);
    const shin = abduct(flex(flex(HANG, -kn), hf), ha, s);
    const foot = abduct(flex([0, -0.18, 1], hf - kn), ha, s);
    J[`${k}Hip`] = hip;
    J[`${k}Knee`] = add(hip, mul(thigh, B.thigh));
    J[`${k}Ankle`] = add(J[`${k}Knee`], mul(shin, B.shin));
    J[`${k}Toe`] = add(J[`${k}Ankle`], mul(foot, B.foot));
  }

  // Plant whichever foot is lower (smoothly blended so lifting a foot never pops).
  const yL = J.lAnkle[1], yR = J.rAnkle[1];
  const wL = 1 / (1 + Math.exp((yL - yR) / 2.5));
  const g = add(mul(J.lAnkle, wL), mul(J.rAnkle, 1 - wL));
  const shift = [0, B.ankle - g[1], -g[2]];
  for (const key of Object.keys(J)) J[key] = add(J[key], shift);
  return J;
}

/** 3D point -> screen point with a soft perspective. */
export function projectPoint(v, { yaw, cx, cy, scale, pitch = 13, focal = 760 }) {
  // turn the figure, then tilt the camera to look slightly down at the floor
  const [x, y, z] = rotX(rotY(v, yaw * RAD), pitch * RAD);
  const k = (scale * focal) / (focal - z * scale);
  return { x: cx + x * k, y: cy - y * k, z, k };
}

export function project(J, view) {
  const out = {};
  for (const key of Object.keys(J)) out[key] = projectPoint(J[key], view);
  return out;
}

export const BONES = [
  ['pelvis', 'neck', 'torso'], ['lShoulder', 'rShoulder', 'torso'], ['lHip', 'rHip', 'torso'], ['neck', 'head', 'head'],
  ['lShoulder', 'lElbow', 'arms'], ['lElbow', 'lWrist', 'arms'], ['rShoulder', 'rElbow', 'arms'], ['rElbow', 'rWrist', 'arms'],
  ['lHip', 'lKnee', 'legs'], ['lKnee', 'lAnkle', 'legs'], ['lAnkle', 'lToe', 'legs'],
  ['rHip', 'rKnee', 'legs'], ['rKnee', 'rAnkle', 'legs'], ['rAnkle', 'rToe', 'legs'],
];

export const JOINTS = [
  ['neck', 'torso'], ['pelvis', 'torso'],
  ['lShoulder', 'arms'], ['rShoulder', 'arms'], ['lElbow', 'arms'], ['rElbow', 'arms'], ['lWrist', 'arms'], ['rWrist', 'arms'],
  ['lHip', 'legs'], ['rHip', 'legs'], ['lKnee', 'legs'], ['rKnee', 'legs'], ['lAnkle', 'legs'], ['rAnkle', 'legs'],
];

export function inRegion(part, region) {
  if (!region) return false;
  if (region === 'body') return true;
  if (region === 'torso') return part === 'torso';
  return part === region;
}

/* ------------------------------------------------------------------ motions */

const SEATED = { seat: 1, lHip: 88, rHip: 88, lKnee: 88, rKnee: 88, lHipA: 7, rHipA: 7, lFlex: 22, rFlex: 22, lElb: 38, rElb: 38 };
const STAND_ARMS = { lAbd: 9, rAbd: 9, lFlex: 4, rFlex: 4, lElb: 14, rElb: 14 };

const def = (label, region, trail, keys) => {
  const frames = keys.map(([dur, pose]) => ({ dur, pose: { ...REST, ...pose } }));
  return { label, region, trail, frames, total: frames.reduce((n, f) => n + f.dur, 0) };
};

const ARM_UP = { lAbd: 168, rAbd: 168, lFlex: 12, rFlex: 12, lElb: 4, rElb: 4 };
const R_CURL = { rElb: 142, rAbd: 6, rFlex: 8 };
const L_CURL = { lElb: 142, lAbd: 6, lFlex: 8 };
const MOUTH = { rFlex: 104, rAbd: 14, rElb: 152, rRot: 56, nod: 8 };
const SIT_LEAN = { ...SEATED, bend: 36, lFlex: 40, rFlex: 40, lElb: 20, rElb: 20 };
const STAND = { seat: 1, bend: 4, lHip: 4, rHip: 4, lKnee: 3, rKnee: 3, ...STAND_ARMS };
const HALF_SIT = { seat: 1, bend: 28, lHip: 52, rHip: 52, lKnee: 54, rKnee: 54, lFlex: 30, rFlex: 30, lElb: 20, rElb: 20 };
const KICK = { ...SEATED, rKnee: 6, lElb: 50, rElb: 50 };
const REACH = { ...SEATED, bend: 26, lFlex: 94, rFlex: 94, lElb: 4, rElb: 4, lAbd: 3, rAbd: 3 };
const L_STEP = { lHip: 72, lKnee: 86, rFlex: 32, rElb: 34, lFlex: -22, lElb: 18 };
const R_STEP = { rHip: 72, rKnee: 86, lFlex: 32, lElb: 34, rFlex: -22, rElb: 18 };
const ONE_LEG = { lHip: 34, lKnee: 76, lAbd: 40, rAbd: 40, lElb: 10, rElb: 10 };

export const MOTIONS = {
  idle: def('Resting', null, [], [[2.2, {}], [2.2, { lAbd: 12, rAbd: 12, nod: 3 }]]),
  arm_raise: def('Arm Raise', 'arms', ['lWrist', 'rWrist'], [
    [0.8, {}], [2.0, ARM_UP], [0.5, ARM_UP], [1.8, {}],
  ]),
  elbow_flexion: def('Elbow Flex & Extend', 'arms', ['rWrist', 'lWrist'], [
    [0.5, {}], [1.2, R_CURL], [0.3, R_CURL], [1.1, {}], [1.2, L_CURL], [0.3, L_CURL], [1.1, {}],
  ]),
  hand_to_mouth: def('Hand to Mouth', 'arms', ['rWrist'], [
    [0.6, {}], [1.5, MOUTH], [0.5, MOUTH], [1.4, {}],
  ]),
  sit_to_stand: def('Sit to Stand', 'legs', ['pelvis', 'head'], [
    [0.8, SEATED], [0.9, SIT_LEAN], [1.3, STAND], [0.6, STAND], [1.0, HALF_SIT], [0.9, SEATED],
  ]),
  knee_extension: def('Knee Extension', 'legs', ['rAnkle'], [
    [0.7, SEATED], [1.3, KICK], [0.6, KICK], [1.2, SEATED],
  ]),
  marching: def('Marching', 'legs', ['lAnkle', 'rAnkle'], [
    [0.55, L_STEP], [0.45, {}], [0.55, R_STEP], [0.45, {}],
  ]),
  seated_reach: def('Seated Reach', 'torso', ['lWrist', 'rWrist'], [
    [0.7, SEATED], [1.6, REACH], [0.6, REACH], [1.4, SEATED],
  ]),
  trunk_lean: def('Trunk Lean', 'torso', ['head'], [
    [0.6, SEATED], [1.6, { ...SEATED, lean: -22, rAbd: 26, rElb: 20 }], [0.4, { ...SEATED, lean: -22, rAbd: 26, rElb: 20 }],
    [1.8, { ...SEATED, lean: 22, lAbd: 26, lElb: 20 }], [0.4, { ...SEATED, lean: 22, lAbd: 26, lElb: 20 }], [1.4, SEATED],
  ]),
  balance_hold: def('Balance Hold', 'body', ['head', 'pelvis'], [
    [0.8, {}], [1.0, { ...ONE_LEG, sway: 4, lean: -3 }], [1.3, { ...ONE_LEG, lAbd: 46, rAbd: 34, sway: 7, lean: 2.5 }],
    [1.3, { ...ONE_LEG, lAbd: 34, rAbd: 46, sway: 3, lean: -3 }], [1.0, {}],
  ]),
  speech: def('Speech', 'head', [], [
    [0.45, { talk: 1, nod: 4, rFlex: 30, rElb: 70, rRot: 20 }], [0.4, { talk: 0, nod: -2, rFlex: 34, rElb: 76, rRot: 24 }],
    [0.45, { talk: 1, nod: 5, rFlex: 28, rElb: 64, rRot: 18, tilt: 3 }], [0.6, { talk: 0, nod: 0 }],
  ]),
};

const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

export function lerpPose(a, b, u) {
  const out = {};
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * u;
  return out;
}

export function poseAt(motion, t) {
  const { frames, total } = motion;
  let tt = ((t % total) + total) % total;
  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i];
    if (tt <= f.dur) {
      const prev = frames[(i - 1 + frames.length) % frames.length];
      return lerpPose(prev.pose, f.pose, ease(tt / f.dur));
    }
    tt -= f.dur;
  }
  return frames[0].pose;
}

export { ease };

/** A stool that stays exactly where the seated pelvis sits. */
const SEAT_PELVIS = solve({ ...REST, ...SEATED }).pelvis;
export function stoolPoints() {
  const top = SEAT_PELVIS[1] - 6;
  const cz = SEAT_PELVIS[2] - 6;
  const corners = [[-20, cz - 15], [20, cz - 15], [20, cz + 15], [-20, cz + 15]];
  return {
    seat: corners.map(([x, z]) => [x, top, z]),
    legs: corners.map(([x, z]) => [[x, top - 4, z], [x * 1.08, 0, z]]),
  };
}

/** Points on a floor ring around the figure. */
export function ringPoints(radius, n = 48, cz = -14) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * radius, 0, cz + Math.sin(a) * radius];
  });
}
