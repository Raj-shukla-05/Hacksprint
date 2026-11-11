import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Ban, Check, CheckCircle2, ChevronRight, FileText, LoaderCircle,
  PlusCircle, Search, Send, ShieldCheck, Sparkles, UsersRound, X,
} from 'lucide-react';
import TrendChart from '../components/TrendChart';
import AlertCard, { StableCard } from '../components/AlertCard';
import { api } from '../lib/api';
import { CATEGORIES, EXERCISES, EXERCISE_IDS, assignedTargetText, exerciseTitle as titleOfExercise } from '../lib/exercises';

const DEFAULT_INSTRUCTIONS = {
  ...Object.fromEntries(EXERCISE_IDS.map((id) => [id, EXERCISES[id].doctorHint])),
  arm_raise: 'Perform 5 slow, bilateral arm raises in the morning. Keep shoulders level and pause at highest comfortable elevation.',
  sit_to_stand: 'Complete 5 repetitions from a stable chair with arms crossed over chest. Focus on smooth, balanced ascent and descent.',
  seated_reach: 'Perform 5 controlled forward reaches from an upright seated posture. Maintain core stability throughout.',
};

const TILES = [
  { id: 'all', label: 'All patients', icon: UsersRound },
  { id: 'review', label: 'Review recommended', icon: AlertCircle },
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'stable', label: 'Stable', icon: CheckCircle2 },
];
const STATUS_LABEL = { review: 'Review recommended', monitor: 'Monitor', stable: 'Stable' };
const STATUS_ORDER = { review: 0, monitor: 1, stable: 2 };
const initials = (name = '') => name.replace(/^Dr\.?\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const partOfDay = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

export default function DoctorPage({ doctor }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const loadPatients = () => api.doctorPatients(doctor.id)
    .then((list) => {
      setPatients(list);
      // Open the most urgent patient by default so the panel is never empty.
      setSelectedId((cur) => cur || list.slice().sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3))[0]?.id || null);
    })
    .catch(() => setError('Could not load patients. Make sure the backend is running.'))
    .finally(() => setLoading(false));

  useEffect(() => { loadPatients(); }, [doctor.id]);

  const counts = useMemo(() => ({
    all: patients.length,
    review: patients.filter((p) => p.status === 'review').length,
    monitor: patients.filter((p) => p.status === 'monitor').length,
    stable: patients.filter((p) => p.status === 'stable').length,
  }), [patients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => (filter === 'all' || p.status === filter) && (!q || p.name.toLowerCase().includes(q)))
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || a.name.localeCompare(b.name));
  }, [patients, query, filter]);

  const selected = patients.find((p) => p.id === selectedId);
  const firstName = (doctor.name || '').replace(/^Dr\.?\s*/, '').split(' ')[0];

  return (
    <div className="page doc">
      <div className="hero-row">
        <div>
          <span className="eyebrow">Clinic triage · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>Good {partOfDay()}, Dr. <em>{firstName}</em>.</h1>
          <p>
            {loading ? 'Loading your patients…'
              : counts.review > 0
                ? `${counts.review} patient${counts.review === 1 ? '' : 's'} recommended for review. The list is ordered by who needs attention first.`
                : 'No patient currently needs a review. The list is ordered by who needs attention first.'}
          </p>
        </div>
      </div>

      <section className="triage-tiles" aria-label="Filter by status">
        {TILES.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`triage-tile ${id} ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>
            <span className="triage-icon"><Icon size={16} /></span>
            <strong>{counts[id]}</strong>
            <span>{label}</span>
          </button>
        ))}
      </section>

      <div className="doc-layout">
        <section className="card patients-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">{filter === 'all' ? 'Everyone in your care' : `Filtered · ${STATUS_LABEL[filter]}`}</span>
              <h3>Patients <span className="count">{visible.length}</span></h3>
            </div>
            <div className="search-box">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" aria-label="Search patients" />
            </div>
          </div>

          {loading && <div className="loading-bar"><LoaderCircle size={15} className="spin" /> Loading patients…</div>}
          {error && <div className="login-error" role="alert">{error}</div>}
          {!loading && !error && !visible.length && <p className="empty-note">No patients match your search.</p>}

          {visible.length > 0 && (
            <div className="ptable" role="list">
              <div className="ptable-head" aria-hidden="true">
                <span>Patient</span><span>Score</span><span>vs baseline</span><span>Status</span><span />
              </div>
              {visible.map((p) => {
                const change = Number(p.change) || 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="listitem"
                    className={`prow ${p.status} ${p.id === selectedId ? 'selected' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                    aria-current={p.id === selectedId}
                  >
                    <span className="prow-person">
                      <span className="pavatar">{initials(p.name)}</span>
                      <span><strong>{p.name}</strong><small>{p.age ? `${p.age} yrs · ` : ''}{p.sessions} session{p.sessions === 1 ? '' : 's'} · {p.lastCheck}</small></span>
                    </span>
                    <span className="prow-score">
                      <b>{p.score}</b>
                      <i><u style={{ width: `${Math.max(0, Math.min(100, p.score))}%` }} /></i>
                    </span>
                    <span className={`prow-delta ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(change)}%</span>
                    <span className={`status-badge ${p.status}`}><span /> {STATUS_LABEL[p.status] || p.status}</span>
                    <ChevronRight size={16} className="prow-go" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <PatientDetail patient={selected} onDemoLoaded={loadPatients} />
      </div>
    </div>
  );
}

function PatientDetail({ patient, onDemoLoaded }) {
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [busy, setBusy] = useState(false);

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [exerciseType, setExerciseType] = useState('arm_raise');
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS.arm_raise);
  const [targetReps, setTargetReps] = useState(5);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review form
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadPatientData = () => {
    if (!patient) return;
    setBusy(true);

    // Fetch the patient dashboard so the explanation is grounded in measured metrics.
    const dashboardPromise = api.dashboard(patient.id).catch(() => null);

    Promise.all([
      api.trends(patient.id),
      api.alerts(patient.id),
      api.patientAssignments(patient.id),
      dashboardPromise,
    ])
      .then(([t, a, asgns, dashData]) => {
        setTrends(t || []);
        setAlerts(a || []);
        setAssignments(asgns || []);

        const dm = dashData?.metrics || {};
        const measured_metrics = [];
        const findings = {
          trend: patient.status === 'review' ? 'persistent_decline' : (patient.status || 'stable'),
          baseline_sessions: dashData?.baseline?.window ?? null,
          exercise_type: dashData?.summary?.exerciseType || null,
          details: `Clinical review for ${patient.name}. Status: ${patient.status}.`,
        };
        if (dm.Movement?.measured && dm.Movement.change !== null) {
          findings.movement_change = dm.Movement.change;
          measured_metrics.push('movement');
        }
        if (dm.Balance?.measured && dm.Balance.change !== null) {
          findings.balance_change = dm.Balance.change;
          measured_metrics.push('balance');
        }
        if (dm.Speech?.measured && dm.Speech.change !== null) {
          findings.speech_change = dm.Speech.change;
          measured_metrics.push('speech');
        }
        findings.measured_metrics = measured_metrics;

        return api.explanation(findings)
          .catch(() => ({ source: 'failed', text: 'AI summary is temporarily unavailable. Baseline metrics remain active.' }));
      })
      .then((exp) => setExplanation(exp))
      .catch(() => {
        setTrends([]);
        setAlerts([]);
        setAssignments([]);
        setExplanation(null);
      })
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    setShowAssignForm(false);
    setFormError('');
    setFormSuccess('');
    setReviewingId(null);
    loadPatientData();
  }, [patient?.id]);

  const handleDemoDecline = async () => {
    setBusy(true);
    try {
      await api.demoDecline(patient.id);
      await onDemoLoaded?.();
      loadPatientData();
    } catch (err) {
      alert(err.message || 'Failed to load decline demo');
      setBusy(false);
    }
  };

  const handleExerciseChange = (type) => {
    setExerciseType(type);
    setInstructions(DEFAULT_INSTRUCTIONS[type] || '');
    const test = EXERCISES[type];
    if (test) setTargetReps(test.mode === 'hold' ? 1 : test.targetReps);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!instructions.trim()) { setFormError('Please enter clinical instructions for the patient.'); return; }
    if (!dueDate) { setFormError('Please specify a valid due date.'); return; }
    if (new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0))) { setFormError('Due date cannot be in the past.'); return; }

    setSubmitting(true);
    try {
      await api.createAssignment({
        patientId: patient.id,
        exerciseType,
        instructions: instructions.trim(),
        targetReps: Number(targetReps) || 5,
        dueDate: new Date(dueDate).toISOString(),
      });
      setFormSuccess('Assessment assigned to patient.');
      setShowAssignForm(false);
      loadPatientData();
    } catch (err) {
      setFormError(err.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this assigned protocol?')) return;
    try {
      await api.updateAssignmentStatus(id, { status: 'cancelled' });
      loadPatientData();
    } catch (err) {
      alert(err.message || 'Failed to cancel assignment');
    }
  };

  const handleReviewSession = async (assignmentId) => {
    if (!reviewNotes.trim()) { alert('Please provide clinical feedback or impression before approving.'); return; }
    setReviewSubmitting(true);
    try {
      await api.updateAssignmentStatus(assignmentId, { status: 'reviewed', doctorNotes: reviewNotes.trim() });
      setReviewingId(null);
      setReviewNotes('');
      loadPatientData();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!patient) {
    return (
      <section className="card detail-card detail-empty">
        <UsersRound size={28} />
        <h3>Select a patient</h3>
        <p className="empty-note">Pick anyone from the list to see their trend, alerts and protocols.</p>
      </section>
    );
  }

  const change = Number(patient.change) || 0;
  const pendingReview = assignments.filter((a) => a.status === 'completed').length;

  return (
    <section className={`card detail-card ${patient.status}`}>
      <div className="detail-top">
        <span className="pavatar large">{initials(patient.name)}</span>
        <div className="detail-id">
          <span className={`status-badge ${patient.status}`}><span /> {STATUS_LABEL[patient.status] || patient.status}</span>
          <h2>{patient.name}</h2>
          <small>{patient.age ? `${patient.age} yrs · ` : ''}{patient.sessions} sessions · last check {patient.lastCheck}</small>
        </div>
        {busy && <LoaderCircle size={16} className="spin detail-busy" />}
      </div>

      <div className="detail-stats">
        <div><span>Score</span><strong>{patient.score}</strong></div>
        <div><span>vs baseline</span><strong className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : '−'}{Math.abs(change)}%</strong></div>
        <div><span>Sessions</span><strong>{patient.sessions}</strong></div>
        <div><span>To review</span><strong>{pendingReview}</strong></div>
      </div>

      <div className="detail-actions">
        <button
          type="button"
          className="primary"
          onClick={() => { setShowAssignForm(!showAssignForm); setFormError(''); setFormSuccess(''); }}
        >
          {showAssignForm ? <X size={15} /> : <PlusCircle size={15} />} {showAssignForm ? 'Close form' : 'Assign assessment'}
        </button>
        <button type="button" className="secondary" onClick={handleDemoDecline} disabled={busy}>
          <Activity size={15} /> Load decline demo
        </button>
      </div>

      {formSuccess && <div className="form-success"><Check size={15} /> {formSuccess}</div>}

      {showAssignForm && (
        <form onSubmit={handleCreateAssignment} className="assign-form">
          <div className="assign-form-head">
            <strong>New assessment protocol</strong>
            <span className="eyebrow">for {patient.name.split(' ')[0]}</span>
          </div>
          {formError && <div className="form-error">{formError}</div>}
          <div className="form-grid">
            <label className="field">Protocol
              <select value={exerciseType} onChange={(e) => handleExerciseChange(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <optgroup key={cat.id} label={cat.label}>
                    {EXERCISE_IDS.filter((id) => EXERCISES[id].category === cat.id).map((id) => (
                      <option key={id} value={id}>{EXERCISES[id].title} ({EXERCISES[id].desc})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="field">
              {EXERCISES[exerciseType]?.mode === 'hold' ? `Hold time (fixed ${EXERCISES[exerciseType].holdSeconds}s)` : `Target ${EXERCISES[exerciseType]?.repsLabel || 'repetitions'}`}
              <input type="number" min="1" max="20" disabled={EXERCISES[exerciseType]?.mode === 'hold'} value={targetReps} onChange={(e) => setTargetReps(e.target.value)} />
            </label>
            <label className="field">Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <label className="field">Clinician instructions
            <textarea rows="3" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Enter tailored guidance for the patient…" />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setShowAssignForm(false)}>Cancel</button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />} Assign protocol
            </button>
          </div>
        </form>
      )}

      <div className="detail-section">
        <span className="eyebrow">Signals</span>
        <div className="alert-section">
          {alerts.length ? alerts.map((a) => <AlertCard key={a.id} alert={a} />) : (trends.length ? <StableCard /> : <p className="empty-note">No sessions recorded yet.</p>)}
        </div>
      </div>

      {trends.length > 0 && (
        <div className="detail-section">
          <span className="eyebrow">Recovery curve</span>
          <TrendChart data={trends} height={190} />
        </div>
      )}

      {explanation?.text && (
        <div className="detail-section ai-summary">
          <div className="ai-summary-head">
            <span className="eyebrow"><Sparkles size={12} /> AI longitudinal summary</span>
            <span className="soft-badge">
              {explanation.source === 'gemini' ? 'Gemini' : explanation.source === 'openai' ? 'OpenAI'
                : explanation.source === 'local-fallback' ? 'Local engine' : explanation.source === 'failed' ? 'Unavailable' : 'Baseline engine'}
            </span>
          </div>
          <p>{explanation.text}</p>
          <div className="mini-note"><ShieldCheck size={13} /><span>Assistive functional summary; clinical decisions must be made independently.</span></div>
        </div>
      )}

      <div className="detail-section">
        <span className="eyebrow">Assigned protocols · {assignments.length}</span>
        {assignments.length === 0 ? (
          <p className="empty-note">No protocols assigned to this patient yet.</p>
        ) : (
          <div className="asgn-list">
            {assignments.map((asgn) => {
              const isCompleted = asgn.status === 'completed';
              const isReviewed = asgn.status === 'reviewed';
              const isPending = asgn.status === 'assigned' || asgn.status === 'in_progress';
              const isReviewingThis = reviewingId === asgn.id;
              return (
                <div key={asgn.id} className={`asgn ${asgn.status}`}>
                  <div className="asgn-head">
                    <div>
                      <strong>{titleOfExercise(asgn.exerciseType)}</strong>
                      <small>Target: {assignedTargetText(asgn.exerciseType, asgn.targetReps)} · due {new Date(asgn.dueDate).toLocaleDateString()}</small>
                    </div>
                    <span className={`status-badge ${asgn.status}`}><span /> {asgn.status.replace('_', ' ')}</span>
                  </div>
                  {asgn.instructions && <p className="asgn-text">{asgn.instructions}</p>}

                  {asgn.completedSession && (
                    <div className="asgn-session">
                      <span>Completed {new Date(asgn.completedSession.timestamp).toLocaleDateString()}</span>
                      <b>{asgn.completedSession.score}<small>/100</small></b>
                      {asgn.completedSession.trackingQuality?.qualityWarning && (
                        <em><AlertCircle size={12} /> {asgn.completedSession.trackingQuality.qualityWarning}</em>
                      )}
                    </div>
                  )}

                  {isReviewed && asgn.doctorNotes && (
                    <div className="asgn-review">
                      <strong>Clinician review</strong>
                      <p>“{asgn.doctorNotes}”</p>
                      <small>Reviewed {new Date(asgn.reviewedAt).toLocaleDateString()}</small>
                    </div>
                  )}

                  {(isPending || (isCompleted && !isReviewingThis)) && (
                    <div className="asgn-actions">
                      {isPending && (
                        <button type="button" className="table-button danger" onClick={() => handleCancelAssignment(asgn.id)}><Ban size={12} /> Cancel</button>
                      )}
                      {isCompleted && !isReviewingThis && (
                        <button type="button" className="primary small-btn" onClick={() => { setReviewingId(asgn.id); setReviewNotes(''); }}>
                          <FileText size={13} /> Review session
                        </button>
                      )}
                    </div>
                  )}

                  {isReviewingThis && (
                    <div className="asgn-review-form">
                      <label className="field">Clinical review feedback
                        <textarea rows="2" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Document clinical impression and guidance…" />
                      </label>
                      <div className="form-actions">
                        <button type="button" className="secondary small-btn" onClick={() => setReviewingId(null)}>Cancel</button>
                        <button type="button" className="primary small-btn" disabled={reviewSubmitting} onClick={() => handleReviewSession(asgn.id)}>
                          {reviewSubmitting ? <LoaderCircle size={12} className="spin" /> : <Check size={13} />} Approve & sign off
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
