import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle2, Clock, Hand, LoaderCircle, MapPin,
  Mic2, Minus, MoveUp, Scale, ShieldCheck, Sparkles,
} from 'lucide-react';
import ScoreRing from '../components/ScoreRing';
import TrendChart from '../components/TrendChart';
import MotionFigure from '../components/MotionFigure';
import AlertCard, { StableCard } from '../components/AlertCard';
import { api } from '../lib/api';
import { assignedTargetText, exerciseTitle } from '../lib/exercises';

const MEASURES = [
  { id: 'movement', key: 'Movement', icon: MoveUp, motion: 'arm_raise', joint: 'rElbow', demo: 'Arm raise', fallback: [82, 10] },
  { id: 'coordination', key: 'Coordination', icon: Hand, motion: 'hand_to_mouth', joint: 'rWrist', demo: 'Hand to mouth', fallback: [76, 6] },
  { id: 'balance', key: 'Balance', icon: Scale, motion: 'balance_hold', joint: 'pelvis', demo: 'Balance hold', fallback: [71, 4] },
  { id: 'speech', key: 'Speech', icon: Mic2, motion: 'speech', joint: 'head', demo: 'Speech check', fallback: [84, 0] },
];
const AUTOPLAY_MS = 7000;

function TrendPill({ value }) {
  const n = Number(value || 0);
  if (n > 0.5) return <span className="mini-trend up"><ArrowUpRight size={13} /> {Math.abs(n).toFixed(0)}%</span>;
  if (n < -0.5) return <span className="mini-trend down"><ArrowDownRight size={13} /> {Math.abs(n).toFixed(0)}%</span>;
  return <span className="mini-trend flat"><Minus size={13} /> Stable</span>;
}

const partOfDay = () => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
};

export default function PatientDashboard({ dashboard, trends, alerts, setView, onReview, onStartAssignment }) {
  const metrics = dashboard.metrics || {};
  const summary = dashboard.summary || {};
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [activeId, setActiveId] = useState('movement');
  const [autoplay, setAutoplay] = useState(true);

  const userId = dashboard.user?.id;

  useEffect(() => {
    if (!userId) return;
    setLoadingAssignments(true);
    api.patientAssignments(userId)
      .then((list) => setAssignments(list || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [userId, trends.length]);

  useEffect(() => {
    let cancelled = false;
    api.myAppointments()
      .then((res) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = (res.appointments || [])
          .filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= today)
          .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
        setNextAppointment(upcoming[0] || null);
      })
      .catch(() => { if (!cancelled) setNextAppointment(null); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setExplaining(true);

    // Only send metrics that were actually measured, so the model never sees fabricated deviations.
    const measured_metrics = [];
    const findings = {
      trend: summary.trend?.toLowerCase() || 'stable',
      baseline_sessions: dashboard.baseline?.window ?? 0,
      exercise_type: summary.exerciseType || null,
    };
    if (metrics.Movement?.measured && metrics.Movement.change !== null) {
      findings.movement_change = metrics.Movement.change;
      measured_metrics.push('movement');
    }
    if (metrics.Balance?.measured && metrics.Balance.change !== null) {
      findings.balance_change = metrics.Balance.change;
      measured_metrics.push('balance');
    }
    if (metrics.Speech?.measured && metrics.Speech.change !== null) {
      findings.speech_change = metrics.Speech.change;
      measured_metrics.push('speech');
    }
    findings.measured_metrics = measured_metrics;
    findings.details = `Functional score: ${summary.functionalScore ?? 0}/100`;

    api.explanation(findings)
      .then((res) => { if (!cancelled && res?.text) setExplanation(res); })
      .catch(() => { if (!cancelled) setExplanation({ source: 'failed', text: '' }); })
      .finally(() => { if (!cancelled) setExplaining(false); });

    return () => { cancelled = true; };
  }, [summary.functionalScore, summary.change, trends.length]);

  // Motion lab tours the four measures until the user picks one.
  useEffect(() => {
    if (!autoplay) return undefined;
    const id = window.setInterval(() => {
      setActiveId((cur) => MEASURES[(MEASURES.findIndex((m) => m.id === cur) + 1) % MEASURES.length].id);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay]);

  const pick = (id) => { setActiveId(id); setAutoplay(false); };

  const activeAssignments = assignments.filter((a) => ['assigned', 'in_progress'].includes(a.status));
  const completedAssignments = assignments.filter((a) => ['completed', 'reviewed'].includes(a.status));
  const firstName = (dashboard.user?.name || 'there').split(' ')[0];

  const measures = MEASURES.map((m) => ({
    ...m,
    value: metrics[m.key]?.value ?? m.fallback[0],
    change: metrics[m.key]?.change ?? m.fallback[1],
  }));
  const active = measures.find((m) => m.id === activeId) || measures[0];

  const score = summary.functionalScore ?? 0;
  const change = Number(summary.change ?? 0);
  const lastSession = trends[trends.length - 1];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const headline = Math.abs(change) < 0.5
    ? 'level with'
    : change > 0 ? `${change.toFixed(1)}% above` : `${Math.abs(change).toFixed(1)}% below`;

  const apptDate = nextAppointment ? new Date(`${nextAppointment.date}T00:00:00`) : null;

  return (
    <div className="page dash">
      <section className="dash-hero">
        <div>
          <span className="eyebrow">{today} · {trends.length} sessions logged</span>
          <h1>Good {partOfDay()}, <em>{firstName}</em>.</h1>
          <p>Your functional score is <b>{score}</b>, {headline} your personal baseline. A two-minute check keeps the picture sharp.</p>
        </div>
        <div className="dash-hero-actions">
          <button type="button" className="cta" onClick={() => setView('assessment')}>
            Start today’s check <span className="cta-arrow"><ArrowUpRight size={17} /></span>
          </button>
          {lastSession && <span className="hero-meta">Last check · <b>{lastSession.day}</b> · score {lastSession.score}</span>}
        </div>
      </section>

      <div className="dash-grid">
        {/* Motion lab */}
        <section className="lab" aria-label="Motion lab">
          <div className="lab-head">
            <span className="lab-rec"><i /> Motion lab · live model</span>
            <span className="lab-demo">Demonstrating <em>{active.demo}</em></span>
          </div>
          <div className="lab-stage">
            <div className="lab-grid" aria-hidden="true" />
            <MotionFigure
              motion={active.motion}
              variant="dark"
              markers={measures.map((m) => ({ id: m.id, joint: m.joint, label: m.key, value: m.value }))}
              activeMarker={active.id}
              onMarker={pick}
            />
          </div>
          <div className="lab-readout">
            <div>
              <small>{active.key}</small>
              <strong>{active.value}<em>/100</em></strong>
            </div>
            <TrendPill value={active.change} />
          </div>
          <div className="lab-tabs" role="tablist" aria-label="Recovery measures">
            {measures.map((m) => {
              const Icon = m.icon;
              const on = m.id === active.id;
              return (
                <button key={m.id} type="button" role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => pick(m.id)}>
                  <Icon size={15} />
                  <span>{m.key}</span>
                  <b>{m.value}</b>
                  {on && autoplay && <i className="lab-progress" key={active.id} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Score */}
        <section className="panel score-panel">
          <div className="panel-head">
            <span className="eyebrow">Functional score</span>
            <span className="soft-badge green"><Sparkles size={12} /> {summary.trend || 'Stable'}</span>
          </div>
          <ScoreRing score={score} change={change} label="vs personal baseline" />
          <p className="score-foot">
            {dashboard.baseline?.window > 0
              ? `Measured against your last ${dashboard.baseline.window} comparable session${dashboard.baseline.window === 1 ? '' : 's'}: you, not a population average.`
              : 'Your first sessions set your personal reference point.'}
          </p>
        </section>

        {/* Appointment */}
        <section className={`panel appt-panel ${nextAppointment ? 'has' : ''}`}>
          <span className="eyebrow">Next clinic visit</span>
          {nextAppointment ? (
            <>
              <div className="appt-date">
                <strong>{apptDate.getDate()}</strong>
                <div>
                  <b>{apptDate.toLocaleDateString(undefined, { month: 'long' })}</b>
                  <span>{apptDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                </div>
              </div>
              <div className="appt-meta">
                <span><Clock size={13} /> {nextAppointment.startTime}</span>
                <span className="appt-status">{nextAppointment.status}</span>
              </div>
              <div className="appt-doctor">
                <span className="avatar small">{(nextAppointment.doctorName || 'D').replace(/^Dr\.?\s*/, '').charAt(0)}</span>
                <div>
                  <strong>{nextAppointment.doctorName}</strong>
                  <small>{nextAppointment.clinic?.name ? <><MapPin size={11} /> {nextAppointment.clinic.name}</> : (nextAppointment.doctorSpecialty || 'Clinician')}</small>
                </div>
              </div>
              <button type="button" className="primary wide-btn" onClick={() => setView('appointments')}>Manage visit <ArrowRight size={15} /></button>
            </>
          ) : (
            <>
              <div className="appt-empty">
                <Calendar size={26} />
                <strong>No visit booked</strong>
                <span>Share your progress in person with a specialist.</span>
              </div>
              <button type="button" className="primary wide-btn" onClick={() => setView('appointments')}><Calendar size={15} /> Book a visit</button>
            </>
          )}
        </section>

        {/* Trend */}
        <section className="panel trend-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Recovery curve</span>
              <h3>Functional performance over time</h3>
            </div>
            <button type="button" className="link-button" onClick={() => setView('progress')}>Full history <ArrowRight size={14} /></button>
          </div>
          <div className="chart-caption">
            <span><i className="legend-dot" /> Session score</span>
            <span>{dashboard.baseline?.window > 0 ? `Baseline · last ${dashboard.baseline.window} sessions` : 'Initial reference session'}</span>
          </div>
          <TrendChart data={trends} height={220} />
        </section>

        {/* Protocols */}
        <section className="panel protocol-panel">
          <div className="panel-head">
            <div><span className="eyebrow">From your clinician</span><h3>Prescribed protocols</h3></div>
            {loadingAssignments ? <LoaderCircle size={15} className="spin" /> : <span className="soft-badge">{activeAssignments.length} active</span>}
          </div>
          {activeAssignments.length > 0 ? (
            <div className="protocol-list">
              {activeAssignments.map((asgn) => {
                const daysLeft = Math.ceil((new Date(asgn.dueDate) - new Date()) / 86400000);
                return (
                  <div className="protocol-item" key={asgn.id}>
                    <span className="protocol-icon"><Activity size={17} /></span>
                    <div className="protocol-body">
                      <strong>{exerciseTitle(asgn.exerciseType)}</strong>
                      <small>{assignedTargetText(asgn.exerciseType, asgn.targetReps)} · {daysLeft > 0 ? `due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'due today'}</small>
                      {asgn.instructions && <p>{asgn.instructions}</p>}
                    </div>
                    <button type="button" className="primary small-btn" onClick={() => (onStartAssignment ? onStartAssignment(asgn) : setView('assessment'))}>
                      Start <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-note">No pending clinician assignments. A free recovery check is always available.</p>
          )}
          {completedAssignments.length > 0 && (
            <div className="recent-done">
              <span className="eyebrow">Recently completed</span>
              {completedAssignments.slice(0, 3).map((asgn) => (
                <div className="done-item" key={asgn.id}>
                  <CheckCircle2 size={16} className="ok" />
                  <div>
                    <strong>{exerciseTitle(asgn.exerciseType)}</strong>
                    <small>{asgn.status === 'reviewed' ? 'Reviewed by clinician' : 'Awaiting doctor review'}</small>
                    {asgn.doctorNotes && <p>“{asgn.doctorNotes}”</p>}
                  </div>
                  {asgn.completedSession && <b>{asgn.completedSession.score}</b>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI insight */}
        <section className="panel insight-panel">
          <div className="panel-head">
            <span className="eyebrow"><Sparkles size={12} /> AI insight</span>
            <span className="soft-badge">
              {explanation?.source === 'gemini' ? 'Gemini' : explanation?.source === 'openai' ? 'OpenAI'
                : explanation?.source === 'local-fallback' ? 'Local engine' : explanation?.source === 'failed' ? 'Unavailable' : 'Baseline engine'}
            </span>
          </div>
          {explaining ? (
            <div className="insight-loading"><span /><span /><span /></div>
          ) : explanation?.text ? (
            <blockquote className="insight-text">{explanation.text}</blockquote>
          ) : (
            <p className="empty-note">
              {explanation?.source === 'failed'
                ? 'AI explanation is temporarily unavailable. Local baseline tracking continues.'
                : 'Insights appear once you have repeated sessions.'}
            </p>
          )}
          <div className="mini-note"><ShieldCheck size={14} /><span>Non-diagnostic observation. Consult your doctor for medical advice.</span></div>
        </section>

        {/* Check-in steps */}
        <section className="panel checkin-panel">
          <span className="eyebrow">Today’s check-in</span>
          <ol className="steps">
            <li className="done"><span>1</span><div><strong>Camera check</strong><small>Head to feet in view</small></div><CheckCircle2 size={16} /></li>
            <li className="next"><span>2</span><div><strong>Movement test</strong><small>Pick any test · ~1 min</small></div>
              <button type="button" onClick={() => setView('assessment')} aria-label="Start movement test"><ArrowRight size={14} /></button>
            </li>
            <li><span>3</span><div><strong>Speech check</strong><small>Optional · ~30 sec</small></div></li>
          </ol>
          <div className="mini-note"><ShieldCheck size={14} /><span>Video is processed on this device and never uploaded.</span></div>
        </section>
      </div>

      <section className="panel alert-panel">
        <div className="panel-head">
          <div><span className="eyebrow">Explainable alerts</span><h3>What NeuroGuard noticed</h3></div>
        </div>
        <div className="alert-section">
          {alerts.length ? alerts.map((alert) => <AlertCard key={alert.id} alert={alert} onReview={onReview} />) : <StableCard />}
        </div>
      </section>
    </div>
  );
}
