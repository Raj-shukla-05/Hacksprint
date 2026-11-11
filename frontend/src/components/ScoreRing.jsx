import React, { useEffect, useState } from 'react';

const R = 70;
const C = 2 * Math.PI * R;
const ARC = C * 0.75; // 270° gauge, open at the bottom
const START = 135;
const TICKS = Array.from({ length: 31 }, (_, i) => START + (270 / 30) * i);

export default function ScoreRing({ score = 79, label = 'Functional performance', change = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const tip = ((START + 270 * (shown / 100)) * Math.PI) / 180;
  const delta = Number(change) || 0;

  return (
    <div className="score-ring-wrap">
      <svg viewBox="0 0 180 168" className="score-ring" aria-hidden="true">
        <g className="ring-ticks">
          {TICKS.map((a, i) => {
            const r = (a * Math.PI) / 180;
            const r1 = i % 5 === 0 ? 81 : 83;
            return <line key={i} x1={90 + Math.cos(r) * r1} y1={90 + Math.sin(r) * r1} x2={90 + Math.cos(r) * 87} y2={90 + Math.sin(r) * 87} />;
          })}
        </g>
        <circle cx="90" cy="90" r={R} className="ring-track" strokeDasharray={`${ARC} ${C}`} transform={`rotate(${START} 90 90)`} />
        <circle
          cx="90" cy="90" r={R} className="ring-value"
          strokeDasharray={`${ARC} ${C}`} strokeDashoffset={ARC * (1 - shown / 100)}
          transform={`rotate(${START} 90 90)`}
        />
        <circle cx={90 + Math.cos(tip) * R} cy={90 + Math.sin(tip) * R} r="7.5" className="ring-tip" style={{ transition: 'cx 1.2s cubic-bezier(.2,.7,.2,1), cy 1.2s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="score-center" aria-label={`${value} out of 100`}><strong>{value}</strong><span>/100</span></div>
      <div className="score-label">
        <strong>{label}</strong>
        <span className={delta >= 0 ? 'positive' : 'negative'}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs baseline</span>
      </div>
    </div>
  );
}
