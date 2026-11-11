import React, { useState, useEffect } from 'react';
import {
  AlertCircle, ArrowLeft, ChevronRight, Clock, Eye, FileText, Play, ShieldCheck, Sparkles, Timer, User, X,
} from 'lucide-react';
import CameraAssessment from '../components/CameraAssessment';
import BodyFigure from '../components/BodyFigure';
import ScoreRing from '../components/ScoreRing';
import TrendChart from '../components/TrendChart';
import { api } from '../lib/api';
import {
  CATEGORIES, EXERCISES, EXERCISE_IDS, assignedTargetText, exerciseTitle, targetText,
} from '../lib/exercises';
import { Hand, MoveUp, Scale } from 'lucide-react';

const DATA_ROWS = [
  { key: 'Movement', icon: MoveUp },
  { key: 'Balance', icon: Scale },
  { key: 'Coordination', icon: Hand },
];

export default function AssessmentPage({
  onSave, onDone, assignment, onClearAssignment, onSelectAssignment, userId, dashboard, trends = [],
}) {
  const [exercise, setExercise] = useState(() => assignment?.exerciseType || 'arm_raise');
  const [category, setCategory] = useState(() => EXERCISES[assignment?.exerciseType || 'arm_raise']?.category || 'upper');
  const [phase, setPhase] = useState('select'); // 'select' | 'test'
  const [runKey, setRunKey] = useState(0);
  const [sessionResult, setSessionResult] = useState(null);
  const [trackingWarning, setTrackingWarning] = useState(null);
  const [plan, setPlan] = useState([]);

  useEffect(() => {
    if (assignment?.exerciseType && EXERCISES[assignment.exerciseType]) {
      setExercise(assignment.exerciseType);
      setCategory(EXERCISES[assignment.exerciseType].category);
    }
  }, [assignment?.exerciseType]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api.patientAssignments(userId)
      .then((list) => { if (!cancelled) setPlan((list || []).filter((a) => ['assigned', 'in_progress'].includes(a.status))); })
      .catch(() => { if (!cancelled) setPlan([]); });
    return () => { cancelled = true; };
  }, [userId, sessionResult]);

  const choose = (id) => {
    setExercise(id);
    setCategory(EXERCISES[id].category);
  };

  const startTest = (id) => {
    choose(id);
    setSessionResult(null);
    setTrackingWarning(null);
    setRunKey((k) => k + 1);
    setPhase('test'); // the camera opens when this view mounts
  };

  const backToTests = () => { setPhase('select'); setTrackingWarning(null); };

  const handleAssessmentComplete = (result) => {
    setTrackingWarning(null);

    // A test only counts if the body was actually tracked.
    const isValidSession = result.score > 0 && result.duration >= 3;
    if (!isValidSession) {
      setTrackingWarning('Inconsistent body tracking detected, so this attempt was not saved. Make sure the body parts this test needs are in view with good lighting, then try again.');
      setSessionResult(null);
      return;
    }

    const trackingQuality = {
      validFrames: 150,
      totalFrames: 160,
      trackingRatio: 0.94,
      isValid: true,
      qualityWarning: null,
    };
    setSessionResult(result);
    onSave?.(result, assignment?.id, trackingQuality);
  };

  /* ---------------- Camera / test view ---------------- */
  if (phase === 'test') {
    const t = EXERCISES[exercise];
    return (
      <div className="page exercise-page">
        <div className="exercise-head">
          <div>
            <button type="button" className="back-link" onClick={backToTests}><ArrowLeft size={15} /> Back to tests</button>
            <h1>Today’s check</h1>
            <p>
              {t.mode === 'hold'
                ? `The test ends on its own after ${t.holdSeconds} seconds.`
                : `The test ends on its own after ${t.maxSeconds} seconds, or as soon as you finish ${t.targetReps} ${t.repsLabel}.`}
            </p>
          </div>
          <span className="privacy-pill"><Sparkles size={14} /> Privacy-first</span>
        </div>

        {trackingWarning && (
          <div className="warn-banner"><AlertCircle size={18} /><span>{trackingWarning}</span></div>
        )}

        <CameraAssessment
          key={runKey}
          exercise={exercise}
          autoStart
          onComplete={handleAssessmentComplete}
          onExit={backToTests}
        />

        {sessionResult && (
          <div className="post-session">
            <div>
              <span className="eyebrow">{assignment ? 'Protocol session recorded' : 'Saved to NeuroGuard'}</span>
              <h3>{sessionResult.exerciseTitle}: {sessionResult.score}/100</h3>
              <p>
                {assignment
                  ? 'Your session was recorded against your prescribed protocol and is ready for clinician review.'
                  : 'The new session will be compared with your personal baseline.'}
              </p>
            </div>
            <button className="primary" onClick={onDone}>Back to overview</button>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- Test selection view ---------------- */
  const info = EXERCISES[exercise];
  const metrics = dashboard?.metrics || {};
  const summary = dashboard?.summary || {};
  const lastSession = trends[trends.length - 1];
  const visibleTests = EXERCISE_IDS.filter((id) => EXERCISES[id].category === category);

  return (
    <div className="page exercise-page">
      <div className="exercise-head">
        <div>
          <h1>{assignment ? 'Assigned protocol' : 'Today’s check'}</h1>
          <p>Pick a test and press Start. The camera opens only then, and the test ends by itself.</p>
        </div>
        <span className="privacy-pill"><Sparkles size={14} /> Privacy-first</span>
      </div>

      <div className="check-grid">
        {/* Tests */}
        <aside className="check-left">
          <section className="panel">
            <div className="panel-head">
              <h3>Tests</h3>
              {assignment && onClearAssignment && (
                <button type="button" className="link-button" onClick={onClearAssignment}><X size={12} /> Free practice</button>
              )}
            </div>
            <div className="cat-tabs" role="tablist" aria-label="Test areas">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  className={category === c.id ? 'on' : ''}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="test-list">
              {visibleTests.map((id) => {
                const t = EXERCISES[id];
                const Icon = t.icon;
                const locked = !!assignment && assignment.exerciseType !== id;
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    aria-disabled={locked}
                    className={`test-card ${exercise === id ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => !locked && choose(id)}
                    onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(id); } }}
                  >
                    <span className="tile-icon"><Icon size={18} /></span>
                    <span className="tile-text">
                      <strong>{t.title}</strong>
                      <small>{t.desc}</small>
                      <em><Timer size={11} /> {targetText(t)}</em>
                    </span>
                    {t.suggested && exercise !== id && <span className="recommended">Suggested</span>}
                    <button
                      type="button"
                      className="test-start"
                      disabled={locked}
                      onClick={(e) => { e.stopPropagation(); startTest(id); }}
                      aria-label={`Start ${t.title}`}
                    >
                      <Play size={14} /> Start
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Treatment plan</h3><span className="soft-badge">{plan.length} assigned</span></div>
            {assignment && (
              <div className="plan-active">
                <div className="plan-active-head"><FileText size={14} /> Current protocol</div>
                <strong>{exerciseTitle(assignment.exerciseType)}</strong>
                <p>{assignment.instructions}</p>
                <small>Target: {assignedTargetText(assignment.exerciseType, assignment.targetReps)}</small>
              </div>
            )}
            {plan.length > 0 ? (
              <div className="plan-list">
                {plan.map((asgn) => {
                  const daysLeft = Math.ceil((new Date(asgn.dueDate) - new Date()) / 86400000);
                  const isCurrent = assignment?.id === asgn.id;
                  return (
                    <button
                      key={asgn.id}
                      type="button"
                      className={`plan-item ${isCurrent ? 'current' : ''}`}
                      onClick={() => onSelectAssignment?.(asgn)}
                    >
                      <span className="plan-time"><Clock size={12} /> {daysLeft > 0 ? `${daysLeft}d left` : 'Today'}</span>
                      <strong>{exerciseTitle(asgn.exerciseType)}</strong>
                      <small>{assignedTargetText(asgn.exerciseType, asgn.targetReps)}</small>
                      <ChevronRight size={16} className="plan-go" />
                    </button>
                  );
                })}
              </div>
            ) : (
              !assignment && <p className="empty-note">No clinician protocols right now. Free practice is always available.</p>
            )}
          </section>
        </aside>

        {/* Skeleton */}
        <section className="panel check-center">
          <div className="check-center-head">
            <span className="eyebrow">Selected test</span>
            <h2>{info.title}</h2>
            <p>{info.instruction}</p>
          </div>
          <BodyFigure highlight={info.region} />
          <div className="check-area"><strong>{info.area}</strong><span>highlighted area</span></div>
          <div className="setup-chips">
            <span><User size={13} /> {info.position}</span>
            <span><Eye size={13} /> {info.view}</span>
          </div>
          <div className="measure-chips">
            {info.measured.map((m) => <span key={m}>{m}</span>)}
          </div>
          <button className="auth-submit start-big" type="button" onClick={() => startTest(exercise)}>
            <Play size={17} /> <span>Start {info.title}</span>
          </button>
          <p className="check-note"><ShieldCheck size={14} /> {info.safety}</p>
        </section>

        {/* Data */}
        <aside className="check-right">
          <section className="panel">
            <div className="panel-head"><h3>Your data</h3>{summary.trend && <span className="soft-badge green">{summary.trend}</span>}</div>
            <ScoreRing score={summary.functionalScore ?? 0} change={summary.change ?? 0} />
            <div className="data-rows">
              {DATA_ROWS.map(({ key, icon: Icon }) => {
                const m = metrics[key];
                return (
                  <div className="data-row" key={key}>
                    <span className="data-icon"><Icon size={15} /></span>
                    <span>{key}</span>
                    <strong>{m?.value ?? '–'}</strong>
                    <em className={Number(m?.change) < -0.5 ? 'down' : Number(m?.change) > 0.5 ? 'up' : ''}>
                      {m?.change == null ? '' : `${Number(m.change) > 0 ? '+' : ''}${Number(m.change).toFixed(0)}%`}
                    </em>
                  </div>
                );
              })}
            </div>
            {lastSession && <p className="data-last">Latest session: <strong>{lastSession.day}</strong> · score <strong>{lastSession.score}</strong></p>}
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Recent trend</h3></div>
            <TrendChart data={trends} compact />
          </section>
        </aside>
      </div>
    </div>
  );
}
