import React from 'react';

/**
 * Stylised line-art human figure used on the dashboard and exercise pages.
 *
 * highlight: 'arms' | 'legs' | 'torso' | null  -> soft yellow region + orange joint
 * markers:   [{ id, x, y, tone, label }]        -> dots positioned in % of the figure box
 * activeId / onSelect                           -> optional marker interaction
 */
const REGIONS = {
  arms: {
    shapes: [
      'M80 112 C62 128 52 176 46 226 L62 230 C68 190 78 150 92 130 Z',
      'M160 112 C178 128 188 176 194 226 L178 230 C172 190 162 150 148 130 Z',
    ],
    joints: [[74, 124], [166, 124], [52, 226], [188, 226]],
  },
  legs: {
    shapes: [
      'M94 262 C92 330 94 372 98 404 L116 404 C118 360 118 310 120 262 Z',
      'M146 262 C148 330 146 372 142 404 L124 404 C122 360 122 310 120 262 Z',
    ],
    joints: [[106, 372], [134, 372]],
  },
  torso: {
    shapes: ['M84 112 C80 170 86 224 94 262 L146 262 C154 224 160 170 156 112 Z'],
    joints: [[120, 188]],
  },
  body: {
    shapes: [
      'M84 112 C80 170 86 224 94 262 L146 262 C154 224 160 170 156 112 Z',
      'M94 262 C90 330 92 384 98 424 L116 424 C118 380 118 320 120 262 Z',
      'M146 262 C150 330 148 384 142 424 L124 424 C122 380 122 320 120 262 Z',
    ],
    joints: [[120, 188], [106, 330], [134, 330], [106, 440], [134, 440]],
  },
};

export default function BodyFigure({ highlight = null, markers = [], activeId = null, onSelect, caption }) {
  const region = highlight ? REGIONS[highlight] : null;
  return (
    <div className="body-figure">
      <div className="body-stage">
        <svg viewBox="0 0 240 500" role="img" aria-label="Body diagram" className="body-svg">
          <defs>
            <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#f1f3f8" />
            </linearGradient>
          </defs>
          <ellipse cx="120" cy="478" rx="92" ry="14" className="body-floor" />
          <g className="body-outline" fill="url(#bodyFill)">
            {/* head + neck */}
            <ellipse cx="120" cy="48" rx="23" ry="29" />
            <path d="M110 74 L110 94 L130 94 L130 74" />
            {/* torso */}
            <path d="M84 104 C98 96 142 96 156 104 C164 110 160 130 158 160 C156 200 150 236 148 268 L92 268 C90 236 84 200 82 160 C80 130 76 110 84 104 Z" />
            {/* arms */}
            <path d="M82 108 C64 118 52 160 44 226 C42 244 40 262 40 276 C46 282 56 282 60 274 C62 258 64 240 68 226 C76 190 88 150 96 128" />
            <path d="M158 108 C176 118 188 160 196 226 C198 244 200 262 200 276 C194 282 184 282 180 274 C178 258 176 240 172 226 C164 190 152 150 144 128" />
            {/* legs */}
            <path d="M92 264 C88 330 90 384 96 424 C96 440 94 456 90 466 L112 466 C116 440 118 420 120 400 C122 360 120 300 120 264 Z" />
            <path d="M148 264 C152 330 150 384 144 424 C144 440 146 456 150 466 L128 466 C124 440 122 420 120 400 C118 360 120 300 120 264 Z" />
          </g>
          {region && (
            <g className="body-highlight">
              {region.shapes.map((d, i) => <path key={i} d={d} />)}
              {region.joints.map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="15" className="joint-halo" />
                  <circle cx={cx} cy={cy} r="7" className="joint-dot" />
                </g>
              ))}
            </g>
          )}
        </svg>

        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`body-marker ${m.tone || 'blue'} ${activeId === m.id ? 'active' : ''}`}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            onClick={() => onSelect?.(m.id)}
            aria-label={m.label}
            title={m.label}
          />
        ))}
      </div>
      {caption}
    </div>
  );
}
