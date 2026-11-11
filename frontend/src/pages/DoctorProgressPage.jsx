import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, LoaderCircle } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TrendChart from '../components/TrendChart';
import AlertCard, { StableCard } from '../components/AlertCard';
import { api } from '../lib/api';
import { EXERCISES, EXERCISE_IDS } from '../lib/exercises';

const STATUS_ORDER = { review: 0, monitor: 1, stable: 2 };
const STATUS_LABEL = { review: 'Review recommended', monitor: 'Monitor', stable: 'Stable' };
const EXERCISE_LABEL = Object.fromEntries(EXERCISE_IDS.map((id) => [id, EXERCISES[id].title]));
const DOMAIN_LINES = [
  { key: 'movement', name: 'Movement', color: '#16140f' },
  { key: 'balance', name: 'Balance', color: '#ef5f2f' },
  { key: 'coordination', name: 'Coordination', color: '#8a78ee' },
  { key: 'speech', name: 'Speech', color: '#9cc21f' },
];

export default function DoctorProgressPage({ doctor }) {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.doctorPatients(doctor.id)
      .then((list) => {
        const sorted = list.slice().sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || a.name.localeCompare(b.name));
        setPatients(sorted);
        if (sorted.length) setSelectedId(sorted[0].id);
      })
      .catch(() => setError('Could not load patients. Make sure the backend is running.'))
      .finally(() => setLoadingList(false));
  }, [doctor.id]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      api.dashboard(selectedId),
      api.trends(selectedId),
      api.assessments(selectedId),
      api.alerts(selectedId),
    ])
      .then(([dashboard, trends, sessions, alerts]) => { if (!cancelled) setData({ dashboard, trends, sessions, alerts }); })
      .catch(() => { if (!cancelled) { setData(null); setError('Could not load this patient’s progress.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const patient = patients.find((p) => p.id === selectedId);
  const trends = data?.trends || [];
  const sessions = data?.sessions || [];

  const stats = useMemo(() => {
    if (!trends.length) return null;
    const first = trends[0].score;
    const latest = trends[trends.length - 1].score;
    return { first, latest, change: latest - first };
  }, [trends]);

  return (
    <div className="page">
      <div className="hero-row">
        <div>
          <span className="eyebrow">Detailed review</span>
          <h1>Patient <em>progress</em></h1>
          <p>Longitudinal performance, domain breakdown and session history for one patient. Signals are functional-monitoring aids, not diagnoses.</p>
        </div>
        <label className="field patient-picker">
          Patient
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loadingList || !patients.length}
          >
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {STATUS_LABEL[p.status] || p.status}</option>)}
          </select>
        </label>
      </div>

      {(loadingList || loading) && <div className="loading-bar"><LoaderCircle size={15} className="spin" /> Loading progress…</div>}
      {error && <div className="login-error" role="alert">{error}</div>}
      {!loadingList && !patients.length && !error && <p className="empty-note">No patients are assigned to you yet.</p>}

      {data && patient && (
        <>
          {!trends.length ? (
            <section className="card wide"><p className="empty-note">{patient.name} has not recorded any sessions yet.</p></section>
          ) : (
            <>
              <div className="stats-strip">
                <div><span>Current score</span><strong>{stats.latest}/100</strong></div>
                <div><span>Since first check</span><strong className={stats.change >= 0 ? 'positive' : 'negative'}>{stats.change >= 0 ? '+' : ''}{stats.change} points</strong></div>
                <div><span>Sessions tracked</span><strong>{trends.length}</strong></div>
                <div><span>Personal baseline</span><strong>{data.dashboard.baseline.window ? `${data.dashboard.baseline.functionalScore}/100` : 'Not yet set'}</strong></div>
              </div>

              <section className="card wide">
                <div className="card-head">
                  <div><span className="eyebrow">{patient.name}{patient.age ? ` · Age ${patient.age}` : ''}</span><h3>Functional performance</h3></div>
                  <div className={`status-badge ${patient.status}`}><span /> {STATUS_LABEL[patient.status] || patient.status}</div>
                </div>
                <TrendChart data={trends} />
                <div className="insight-box"><Info size={18} /><div><strong>Compared with their own baseline</strong><span>Baseline is the mean of the patient’s previous (up to 5) sessions. The latest session is {data.dashboard.summary.change >= 0 ? '+' : ''}{data.dashboard.summary.change}% versus that baseline ({data.dashboard.summary.trend.toLowerCase()}).</span></div></div>
              </section>

              <section className="card wide">
                <div className="card-head"><div><span className="eyebrow">Domain breakdown</span><h3>Movement, balance, coordination, speech</h3></div></div>
                <div className="domain-grid">
                  {Object.entries(data.dashboard.metrics).map(([name, m]) => (
                    <div className="history-card" key={name}>
                      <div><span>{name}</span></div>
                      {m ? (
                        <>
                          <strong>{m.value}</strong>
                          <span className={`history-trend ${m.change === null ? '' : m.change >= 0 ? 'positive' : 'negative'}`}>
                            {m.change === null ? 'No baseline yet' : <>{m.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(m.change)}% vs baseline</>}
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>—</strong>
                          <span className="history-trend">Not measured in latest session</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trends} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 6" stroke="#ddd5c4" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7d7668', fontSize: 11, fontFamily: 'Geist Mono, monospace' }} dy={8} />
                    <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: '#7d7668', fontSize: 11, fontFamily: 'Geist Mono, monospace' }} width={34} />
                    <Tooltip contentStyle={{ background: '#16140f', border: 0, borderRadius: 12, color: '#f2eee5', fontSize: 12 }} itemStyle={{ color: '#f2eee5' }} labelStyle={{ color: '#d4f15a', fontFamily: 'Geist Mono, monospace' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {DOMAIN_LINES.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.5} dot={false} />)}
                  </LineChart>
                </ResponsiveContainer>
                <p className="empty-note">Domains an exercise does not measure are filled with the session score (or a default for speech) in this chart; check the session log for what each session actually recorded.</p>
              </section>

              <div className="alert-section">
                {data.alerts.length ? data.alerts.map((a) => <AlertCard key={a.id} alert={a} />) : <StableCard />}
              </div>
            </>
          )}

          <section className="card wide">
            <div className="card-head"><div><span className="eyebrow">Session log</span><h3>All recorded sessions ({sessions.length})</h3></div></div>
            {!sessions.length ? <p className="empty-note">No sessions recorded.</p> : (
              <div className="session-log">
                {sessions.map((s) => (
                  <div className="session-row" key={s.id}>
                    <div className="patient-person"><div><strong>{EXERCISE_LABEL[s.exerciseType] || s.exerciseType}</strong><span>{new Date(s.timestamp).toLocaleString()} · {s.duration || 0}s{s.source === 'demo' ? ' · demo data' : ''}</span></div></div>
                    <div className="patient-score"><strong>{Math.round(s.score)}</strong><span>/100</span></div>
                    <span>{s.assignmentId ? 'Prescribed protocol' : 'Self-initiated'}</span>
                    <span className={s.trackingQuality?.qualityWarning ? 'negative' : ''}>{s.trackingQuality?.qualityWarning || (s.trackingQuality?.trackingRatio != null ? `Tracking ${Math.round(s.trackingQuality.trackingRatio * 100)}%` : '')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
