import React, { useEffect, useState } from 'react';
import {
  Activity, ClipboardCheck, Hand, Mic2, MoveUp, Scale, Sparkles,
  ShieldCheck, LoaderCircle, Calendar, Clock, ArrowRight, MapPin,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import ScoreRing from '../components/ScoreRing';
import TrendChart from '../components/TrendChart';
import BodyFigure from '../components/BodyFigure';
import AlertCard, { StableCard } from '../components/AlertCard';
import { api } from '../lib/api';

const exerciseName = (type) => (
  type === 'arm_raise' ? 'Arm Raise' : type === 'sit_to_stand' ? 'Sit-to-Stand' : 'Seated Reach'
);

function TrendPill({ value }) {
  const n = Number(value || 0);
  if (n > 0.5) return <span className="mini-trend up"><ArrowUpRight size={13} /> {Math.abs(n).toFixed(0)}%</span>;
  if (n < -0.5) return <span className="mini-trend down"><ArrowDownRight size={13} /> {Math.abs(n).toFixed(0)}%</span>;
  return <span className="mini-trend flat"><Minus size={13} /> Stable</span>;
}

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function PatientDashboard({ dashboard, trends, alerts, setView, onReview, onStartAssignment }) {
  const metrics = dashboard.metrics || {};
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [activeMarker, setActiveMarker] = useState('movement');

  const userId = dashboard.user?.id;

  const loadAssignments = () => {
    if (!userId) return;
    setLoadingAssignments(true);
    api.patientAssignments(userId)
      .then((list) => setAssignments(list || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  };

  useEffect(() => {
    loadAssignments();
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

    // Only send metrics that were actually measured (metric.measured === true and change !== null).
    // This prevents the model from receiving fabricated deviations for unmeasured dimensions.
    const measured_metrics = [];
    const findings = {
      trend: dashboard.summary?.trend?.toLowerCase() || 'stable',
      baseline_sessions: dashboard.baseline?.window ?? 0,
      exercise_type: dashboard.summary?.exerciseType || null,
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
    findings.details = `Functional score: ${dashboard.summary?.functionalScore ?? 0}/100`;

    api.explanation(findings)
      .then((res) => {
        if (!cancelled && res?.text) {
          setExplanation(res);
        }
      })
      .catch(() => {
        if (!cancelled) setExplanation({ source: 'failed', text: '' });
      })
      .finally(() => {
        if (!cancelled) setExplaining(false);
      });

    return () => { cancelled = true; };
  }, [dashboard.summary?.functionalScore, dashboard.summary?.change, trends.length]);

  const activeAssignments = assignments.filter((a) => ['assigned', 'in_progress'].includes(a.status));
  const completedAssignments = assignments.filter((a) => ['completed', 'reviewed'].includes(a.status));

  const firstName = (dashboard.user?.name || 'Patient').split(' ')[0];

  const measures = [
    { id: 'movement', label: 'Movement', icon: MoveUp, value: metrics.Movement?.value ?? 82, change: metrics.Movement?.change ?? 10, tone: 'blue', x: 36, y: 25, region: 'torso' },
    { id: 'coordination', label: 'Coordination', icon: Hand, value: metrics.Coordination?.value ?? 76, change: metrics.Coordination?.change ?? 6, tone: 'teal', x: 18, y: 54, region: 'arms' },
    { id: 'balance', label: 'Balance', icon: Scale, value: metrics.Balance?.value ?? 71, change: metrics.Balance?.change ?? 4, tone: 'orange', x: 44, y: 76, region: 'legs' },
    { id: 'speech', label: 'Speech', icon: Mic2, value: metrics.Speech?.value ?? 84, change: metrics.Speech?.change ?? 0, tone: 'blue', x: 50, y: 10, region: null },
  ];
  const active = measures.find((m) => m.id === activeMarker) || measures[0];
  const ActiveIcon = active.icon;

  return (
    <div className="page dash">
      <div className="greeting-row">
        <div>
          <h1>Hello, {firstName} <span className="wave">👋</span></h1>
          <p>Here’s your recovery update for today.</p>
        </div>
        <button className="primary pill-btn" onClick={() => setView('assessment')}><ClipboardCheck size={17} /> Start today’s check</button>
      </div>

      <div className="dash-grid">
        {/* Body figure */}
        <section className="panel body-panel">
          <BodyFigure
            highlight={active.region}
            markers={measures.map((m) => ({ id: m.id, x: m.x, y: m.y, tone: m.tone, label: m.label }))}
            activeId={active.id}
            onSelect={setActiveMarker}
          />
          <div className="body-callout">
            <span className={`callout-icon ${active.tone}`}><ActiveIcon size={16} /></span>
            <div>
              <small>{active.label}</small>
              <strong>{active.value}<em>/100</em></strong>
            </div>
            <TrendPill value={active.change} />
          </div>
          <div className="body-tabs">
            {measures.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} className={m.id === active.id ? 'on' : ''} onClick={() => setActiveMarker(m.id)}>
                  <Icon size={14} /> {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Middle column */}
        <div className="dash-col">
          <section className="panel">
            <div className="panel-head">
              <h3>Recovery overview</h3>
              <span className="soft-badge green"><Sparkles size={13} /> {dashboard.summary?.trend || 'Stable'}</span>
            </div>
            <div className="overview-score">
              <ScoreRing score={dashboard.summary?.functionalScore ?? 0} change={dashboard.summary?.change ?? 0} />
              <div className="score-note">
                <strong>Personal baseline comparison</strong>
                <span>You are compared with your own previous sessions, not a population average.</span>
                <button className="link-button" onClick={() => setView('progress')}>View full history</button>
              </div>
            </div>
            <div className="chart-caption">
              <span><i className="legend-dot" /> Functional performance</span>
              <span>{
                dashboard.baseline?.window > 0
                  ? `Baseline: last ${dashboard.baseline.window} comparable session${dashboard.baseline.window === 1 ? '' : 's'}`
                  : 'Initial reference session'
              }</span>
            </div>
            <TrendChart data={trends} compact />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Prescribed protocols</h3>
              {loadingAssignments
                ? <LoaderCircle size={15} className="spin" />
                : <span className="soft-badge">{activeAssignments.length} active</span>}
            </div>
            {activeAssignments.length > 0 ? (
              <div className="protocol-list">
                {activeAssignments.map((asgn) => {
                  const daysLeft = Math.ceil((new Date(asgn.dueDate) - new Date()) / 86400000);
                  return (
                    <div className="protocol-item" key={asgn.id}>
                      <span className="protocol-icon"><Activity size={17} /></span>
                      <div className="protocol-body">
                        <strong>{exerciseName(asgn.exerciseType)}</strong>
                        <small>{asgn.targetReps} controlled reps · {daysLeft > 0 ? `due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'due today'}</small>
                        {asgn.instructions && <p>{asgn.instructions}</p>}
                      </div>
                      <button
                        className="primary small-btn"
                        onClick={() => { if (onStartAssignment) onStartAssignment(asgn); else setView('assessment'); }}
                      >
                        Start <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-note">No pending clinician assignments. You can still do a free recovery check anytime.</p>
            )}

            {completedAssignments.length > 0 && (
              <div className="recent-done">
                <span className="section-kicker">Recently completed</span>
                {completedAssignments.slice(0, 3).map((asgn) => (
                  <div className="done-item" key={asgn.id}>
                    <CheckCircle2 size={16} className="ok" />
                    <div>
                      <strong>{exerciseName(asgn.exerciseType)}</strong>
                      <small>{asgn.status === 'reviewed' ? 'Reviewed by clinician' : 'Awaiting doctor review'}</small>
                      {asgn.doctorNotes && <p>💬 “{asgn.doctorNotes}”</p>}
                    </div>
                    {asgn.completedSession && <b>{asgn.completedSession.score}/100</b>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="dash-col">
          <section className="panel appointment-panel">
            <div className="panel-head"><h3>Upcoming appointment</h3></div>
            {nextAppointment ? (
              <>
                <div className="appt-doctor">
                  <span className="avatar">{(nextAppointment.doctorName || 'D').replace(/^Dr\.?\s*/, '').charAt(0)}</span>
                  <div>
                    <strong>{nextAppointment.doctorName}</strong>
                    <small>{nextAppointment.doctorSpecialty || 'Clinician'}</small>
                  </div>
                  <span className={`soft-badge ${nextAppointment.status === 'confirmed' ? 'green' : ''}`}>{nextAppointment.status}</span>
                </div>
                <div className="appt-meta">
                  <span><Calendar size={14} /> {formatDate(nextAppointment.date)}</span>
                  <span><Clock size={14} /> {nextAppointment.startTime}</span>
                  {nextAppointment.clinic?.name && <span><MapPin size={14} /> {nextAppointment.clinic.name}</span>}
                </div>
                <button className="secondary wide-btn" onClick={() => setView('appointments')}>Manage appointment</button>
              </>
            ) : (
              <>
                <p className="empty-note">No upcoming clinic visit. Book one with your doctor.</p>
                <button className="primary wide-btn" onClick={() => setView('appointments')}><Calendar size={15} /> Book appointment</button>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Today’s check-in</h3><Activity size={17} className="muted" /></div>
            <div className="checklist">
              <div className="check-row done"><span>1</span><div><strong>Camera check</strong><small>Head, shoulders, hands, feet visible</small></div><b>Done</b></div>
              <div className="check-row pending"><span>2</span><div><strong>Movement assessment</strong><small>Arm raise · ~2 min</small></div><button onClick={() => setView('assessment')}>Start</button></div>
              <div className="check-row optional"><span>3</span><div><strong>Speech assessment</strong><small>Optional · ~30 sec</small></div><b>Optional</b></div>
            </div>
            <div className="mini-note"><span className="shield-note">✓</span><span>Raw camera frames are processed locally and never stored.</span></div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>AI insight</h3>
              <span className="soft-badge">
                <Sparkles size={13} /> {
                  explanation?.source === 'gemini'
                    ? 'Gemini AI'
                    : explanation?.source === 'local-fallback'
                      ? 'Local'
                      : (explanation?.source === 'failed' ? 'Unavailable' : 'Baseline engine')
                }
              </span>
            </div>
            {explaining ? (
              <div className="loading-bar"><LoaderCircle size={15} className="spin" /> Generating explanation…</div>
            ) : explanation?.text ? (
              <p className="insight-text">{explanation.text}</p>
            ) : (
              <p className="empty-note">
                {explanation?.source === 'failed'
                  ? 'AI explanation is temporarily unavailable. Local baseline tracking continues.'
                  : 'Insights appear once you have repeated sessions.'}
              </p>
            )}
            <div className="mini-note"><ShieldCheck size={14} /><span>Non-diagnostic observation. Consult your doctor for medical advice.</span></div>
          </section>
        </div>
      </div>

      <section className="panel alert-section">
        <div className="panel-head"><h3>What NeuroGuard noticed</h3><span className="soft-badge">Explainable alerts</span></div>
        {alerts.length ? alerts.map((alert) => <AlertCard key={alert.id} alert={alert} onReview={onReview} />) : <StableCard />}
      </section>
    </div>
  );
}
