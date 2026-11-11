import React from 'react';

/** Volt square with a figure mid arm-raise, plus the Neuro*guard* wordmark. */
export function Logo({ compact = false, tone = 'dark' }) {
  return (
    <div className={`brand ${tone === 'light' ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="7.6" r="3.1" />
          <path d="M6.5 5.5 L11.8 13.4 L16 12.6 L20.2 13.4 L25.5 5.5 M16 12.6 V19.6 M16 19.6 L11.6 27 M16 19.6 L20.4 27" />
        </svg>
      </span>
      {!compact && <span className="brand-word">Neuro<em>guard</em></span>}
    </div>
  );
}
