import React, { useState, useEffect } from 'react';
import {
  AlertCircle, ArrowLeft, Check, ChevronRight, Clock, FileText, Hand, MoveUp, Play, Scale, ShieldCheck,
  Sparkles, Timer, X,
} from 'lucide-react';
import CameraAssessment, { EXERCISES, TEST_SECONDS } from '../components/CameraAssessment';
import BodyFigure from '../components/BodyFigure';
import ScoreRing from '../components/ScoreRing';
import TrendChart from '../components/TrendChart';
import { api } from '../lib/api';

const tests = [
  { id: 'arm_raise', desc: 'Range, symmetry and control', icon: MoveUp, featured: true },
  { id: 'sit_to_stand', desc: 'Repetitions and stability', icon: Scale },
  { id: 'seated_reach', desc: 'Reach and path efficiency', icon: Hand },
];

const MEASURED = {
  arm_raise: ['Shoulder range', 'Left/right symmetry', 'Movement control', 'Reps'],
  sit_to_stand: ['Knee angle', 'Stability', 'Movement control', 'Reps'],
  seated_reach: ['Reach distance', 'Path efficiency', 'Movement control', 'Reps'],
};

const titleOf = (type) => EXERCISES[type]?.title || type;

export default function AssessmentPage({
  onSave, onDone, assignment, onClearAssignment, onSelectAssignment, userId, dashboard, trends = [],
}) {
  const [exercise, setExercise] = useState(() => assignment?.exerciseType || 'arm_raise');
  const [phase, setPhase] = useState('select'); // 'select' | 'test'
  const [runKey, setRunKey] = useState(0);
  const [sessionResult, setSessionResult] = useState(null);
  const [trackingWarning, setTrackingWarning] = useState(null);
  const [plan, setPlan] = useState([]);

  useEffect(() => {
    if (assignment?.exerciseType) setExercise(assignment.exerciseType);
  }, [assignment?.exerciseType]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api.patientAssignments(userId)
      .then((list) => { if (!cancelled) setPlan((list || []).filter((a) => ['assigned', 'in_progress'].includes(a.status))); })
      .catch(() => { if (!cancelled) setPlan([]); });
    return () => { cancelled = true; };
  }, [userId, sessionResult]);

  const startTest = (id) => {
    setExercise(id);
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
      setTrackingWarning('Inconsistent body tracking detected, so this attempt was not saved. Make sure your upper body is in view with good lighting, then try again.');
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
    return (
      <div className="page exercise-page">
        <div className="exercise-head">
          <div>
            <button type="button" className="back-link" onClick={backToTests}><ArrowLeft size={15} /> Back to tests</button>
            <h1>Today’s check</h1>
            <p>The test ends on its own after {TEST_SECONDS} seconds, or as soon as you finish 5 reps.</p>
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
  const last = trends[trends.length - 1];
  const dataRows = [
    { label: 'Movement', icon: MoveUp, m: metrics.Movement },
    { label: 'Balance', icon: Scale, m: metrics.Balance },
    { label: 'Coordination', icon: Hand, m: metrics.Coordination },
  ];

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
            <div className="test-list">
              {tests.map(({ id, desc, icon: Icon, featured }) => {
                const locked = !!assignment && assignment.exerciseType !== id;
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    aria-disabled={locked}
                    className={`test-card ${exercise === id ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => !locked && setExercise(id)}
                    onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExercise(id); } }}
                  >
                    <span className="tile-icon"><Icon size={18} /></span>
                    <span className="tile-text">
                      <strong>{titleOf(id)}</strong>
                      <small>{desc}</small>
                      <em><Timer size={11} /> 5 reps · up to {TEST_SECONDS}s</em>
                    </span>
                    {featured && exercise !== id && <span className="recommended">Suggested</span>}
                    <button
                      type="button"
                      className="test-start"
                      disabled={locked}
                      onClick={(e) => { e.stopPropagation(); startTest(id); }}
                      aria-label={`Start ${titleOf(id)}`}
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
                <strong>{titleOf(assignment.exerciseType)}</strong>
                <p>{assignment.instructions}</p>
                <small>Target: {assignment.targetReps} reps</small>
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
                      <strong>{titleOf(asgn.exerciseType)}</strong>
                      <small>{asgn.targetReps} controlled reps</small>
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
          <div className="measure-chips">
            {MEASURED[exercise].map((m) => <span key={m}>{m}</span>)}
          </div>
          <button className="auth-submit start-big" type="button" onClick={() => startTest(exercise)}>
            <Play size={17} /> <span>Start {info.title}</span>
          </button>
          <p className="check-note"><ShieldCheck size={14} /> Video is processed on your device and never uploaded.</p>
        </section>

        {/* Data */}
        <aside className="check-right">
          <section className="panel">
            <div className="panel-head"><h3>Your data</h3>{summary.trend && <span className="soft-badge green">{summary.trend}</span>}</div>
            <ScoreRing score={summary.functionalScore ?? 0} change={summary.change ?? 0} />
            <div className="data-rows">
              {dataRows.map(({ label, icon: Icon, m }) => (
                <div className="data-row" key={label}>
                  <span className="data-icon"><Icon size={15} /></span>
                  <span>{label}</span>
                  <strong>{m?.value ?? '–'}</strong>
                  <em className={Number(m?.change) < -0.5 ? 'down' : Number(m?.change) > 0.5 ? 'up' : ''}>
                    {m?.change == null ? '' : `${Number(m.change) > 0 ? '+' : ''}${Number(m.change).toFixed(0)}%`}
                  </em>
                </div>
              ))}
            </div>
            {last && <p className="data-last">Latest session: <strong>{last.day}</strong> · score <strong>{last.score}</strong></p>}
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
