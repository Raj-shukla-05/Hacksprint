import React, { useEffect, useRef, useState } from 'react';
import {
  BONES, JOINTS, MOTIONS, REST, ease, inRegion, lerpPose, poseAt, project, projectPoint, ringPoints, solve, stoolPoints,
} from '../lib/motion';

/**
 * Animated 3D motion-capture skeleton.
 *
 * motion   key of MOTIONS (an exercise id, 'speech' or 'idle'); changing it blends smoothly into the new loop
 * region   'arms' | 'legs' | 'torso' | 'head' | 'body' | null  (defaults to the motion's own region)
 * markers  [{ id, joint, label, value }] hotspots pinned to moving joints
 * variant  'dark' (on ink panels) | 'light' (on paper)
 */
const W = 300;
const H = 360;
const GROUND = 330;
const TRAIL = 30;
const BLEND_S = 0.7;

const STOOL = stoolPoints();
const RINGS = [64, 96].map((r) => ringPoints(r));
const RIPPLE = ringPoints(1, 40, 0); // unit circle at the origin; scaled + offset per frame

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const pts = (list) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const depthOpacity = (z) => Math.max(0.42, Math.min(1, 0.78 + z / 90));

export default function MotionFigure({
  motion = 'idle',
  region,
  markers = [],
  activeMarker,
  onMarker,
  variant = 'dark',
  yaw = -26,
  swing = 12,
  scale = 1.3,
  floor = true,
  trails = true,
  className = '',
  label,
}) {
  const rootRef = useRef(null);
  const motionRef = useRef(motion);
  const startRef = useRef(0);
  const blendFromRef = useRef(null);
  const poseRef = useRef({ ...REST });
  const trailRef = useRef({});
  const visibleRef = useRef(true);
  const [frame, setFrame] = useState(() => buildFrame(MOTIONS[motion] || MOTIONS.idle, 1.1, 0, yaw, null, scale));

  // Blend from wherever the figure is into the new motion.
  useEffect(() => {
    if (motionRef.current === motion) return;
    motionRef.current = motion;
    blendFromRef.current = poseRef.current;
    startRef.current = performance.now();
  }, [motion]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion()) {
      setFrame(buildFrame(MOTIONS[motionRef.current] || MOTIONS.idle, 1.6, 0, yaw, null, scale));
      return undefined;
    }
    let raf = 0;
    startRef.current = performance.now();
    const step = (now) => {
      raf = requestAnimationFrame(step);
      if (!visibleRef.current) return;
      const m = MOTIONS[motionRef.current] || MOTIONS.idle;
      const t = (now - startRef.current) / 1000;
      let pose = poseAt(m, t);
      if (blendFromRef.current) {
        const u = t / BLEND_S;
        if (u >= 1) blendFromRef.current = null;
        else pose = lerpPose(blendFromRef.current, pose, ease(u));
      }
      const g = now / 1000;
      pose.breathe = 1 + 0.012 * Math.sin(g * 2.1);
      poseRef.current = pose;
      const f = buildFrame(m, null, g, yaw + swing * Math.sin(g * 0.33), pose, scale);

      // motion trails (fade out joints that are no longer traced)
      const store = trailRef.current;
      const live = trails ? m.trail : [];
      for (const j of Object.keys(store)) if (!live.includes(j)) store[j] = store[j].slice(2);
      for (const j of live) {
        const list = store[j] || (store[j] = []);
        list.push({ x: f.P[j].x, y: f.P[j].y });
        if (list.length > TRAIL) list.shift();
      }
      f.trails = Object.entries(store).filter(([, l]) => l.length > 1);
      setFrame(f);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [yaw, swing, trails, scale]);

  const m = MOTIONS[motion] || MOTIONS.idle;
  const hot = region === undefined ? m.region : region;
  const { P, view, pose, g } = frame;

  // painter's algorithm: far bones first
  const bones = BONES
    .map(([a, b, part]) => ({ a: P[a], b: P[b], part, z: (P[a].z + P[b].z) / 2, key: `${a}-${b}` }))
    .sort((x, y) => x.z - y.z);

  const ground = (v) => projectPoint(v, view);
  const shadow = ground([P.pelvis.world[0], 0, P.pelvis.world[2]]);
  const ripple = (g * 0.45) % 1;

  return (
    <div ref={rootRef} className={`mf mf-${variant} ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mf-svg" role="img" aria-label={label || `${m.label} demonstration`}>
        {floor && (
          <g className="mf-floor">
            {RINGS.map((ring, i) => <polygon key={i} points={pts(ring.map(ground))} className={i ? 'mf-ring outer' : 'mf-ring'} />)}
            <polygon
              points={pts(RIPPLE.map(([x, y, z]) => ground([x * (40 + ripple * 80), y, -14 + z * (40 + ripple * 80)])))}
              className="mf-ripple"
              style={{ opacity: 0.55 * (1 - ripple) }}
            />
          </g>
        )}
        <ellipse cx={shadow.x} cy={shadow.y} rx={38 * shadow.k} ry={9 * shadow.k} className="mf-shadow" />

        {pose.seat > 0.02 && (
          <g className="mf-stool" style={{ opacity: pose.seat }}>
            {STOOL.legs.map(([top, bottom], i) => {
              const a = ground(top);
              const b = ground(bottom);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
            <polygon points={pts(STOOL.seat.map(ground))} />
          </g>
        )}

        {frame.trails?.map(([j, list]) => (
          <g key={j} className="mf-trail">
            {list.slice(1).map((p, i) => (
              <line
                key={i}
                x1={list[i].x} y1={list[i].y} x2={p.x} y2={p.y}
                style={{ opacity: ((i + 1) / list.length) * 0.9 }}
                strokeWidth={1 + ((i + 1) / list.length) * 2.6}
              />
            ))}
          </g>
        ))}

        <polygon points={pts([P.lShoulder, P.rShoulder, P.rHip, P.lHip])} className={`mf-torso ${inRegion('torso', hot) ? 'hot' : ''}`} />

        {bones.map(({ a, b, part, z, key }) => {
          const on = inRegion(part, hot);
          const k = (a.k + b.k) / 2;
          return (
            <g key={key} style={{ opacity: depthOpacity(z) }} className={on ? 'hot' : ''}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="mf-flesh" strokeWidth={(part === 'torso' ? 10 : 12) * k} />
              {on && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="mf-glow" strokeWidth={9 * k} />}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="mf-bone" strokeWidth={2.6 * k} />
            </g>
          );
        })}

        {JOINTS.map(([j, part]) => {
          const p = P[j];
          const on = inRegion(part, hot);
          return <circle key={j} cx={p.x} cy={p.y} r={(on ? 4.4 : 3.4) * p.k} className={`mf-joint ${on ? 'hot' : ''}`} style={{ opacity: depthOpacity(p.z) }} />;
        })}

        <circle cx={P.head.x} cy={P.head.y} r={14 * P.head.k} className={`mf-head ${inRegion('head', hot) ? 'hot' : ''}`} />
        {P.nose.z > P.head.z - 2 && <circle cx={P.nose.x} cy={P.nose.y} r={2.2 * P.head.k} className="mf-nose" />}

        {motion === 'speech' && [0, 1, 2].map((i) => {
          const u = (g * 0.9 + i / 3) % 1;
          const r = (18 + u * 34) * P.head.k;
          return (
            <path
              key={i}
              d={`M ${P.nose.x + r * 0.55} ${P.nose.y - r * 0.6} A ${r} ${r} 0 0 1 ${P.nose.x + r * 0.55} ${P.nose.y + r * 0.6}`}
              className="mf-voice"
              style={{ opacity: (1 - u) * (0.4 + pose.talk * 0.6) }}
            />
          );
        })}
      </svg>

      {markers.map((mk) => {
        const p = P[mk.joint];
        if (!p) return null;
        const on = mk.id === activeMarker;
        return (
          <button
            key={mk.id}
            type="button"
            className={`mf-marker ${on ? 'on' : ''} ${p.x > W / 2 ? 'right' : 'left'}`}
            style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
            onClick={() => onMarker?.(mk.id)}
            aria-label={`${mk.label}${mk.value != null ? ` ${mk.value}` : ''}`}
            aria-pressed={on}
          >
            <i />
            {on && <span><small>{mk.label}</small><b>{mk.value}</b></span>}
          </button>
        );
      })}
    </div>
  );
}

function buildFrame(m, t, g, yaw, givenPose, scale = 1.3) {
  const pose = givenPose || poseAt(m, t ?? 0);
  const J = solve(pose);
  const view = { yaw, cx: W / 2, cy: GROUND, scale };
  const P = project(J, view);
  for (const key of Object.keys(P)) P[key].world = J[key];
  return { P, view, pose, g: g || 0 };
}
