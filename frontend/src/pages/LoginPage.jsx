import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Eye, EyeOff, Lock, LoaderCircle, Mail, ShieldCheck, Stethoscope, UserPlus, UserRound,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import MotionFigure from '../components/MotionFigure';
import { api } from '../lib/api';
import { EXERCISES } from '../lib/exercises';

const DEMO_ACCOUNTS = [
  { label: 'Patient', name: 'Raj Kumar', email: 'raj@neuroguard.demo', password: 'patient123', icon: UserRound },
  { label: 'Doctor', name: 'Dr. Priya Nair', email: 'priya@neuroguard.demo', password: 'doctor123', icon: Stethoscope },
];

const FEATURES = [
  ['9', 'guided movement tests'],
  ['0', 'video frames uploaded'],
  ['1', 'baseline that matters: yours'],
];

const SHOWCASE = ['arm_raise', 'marching', 'sit_to_stand', 'hand_to_mouth', 'trunk_lean', 'knee_extension', 'balance_hold', 'elbow_flexion', 'seated_reach'];
const SHOWCASE_MS = 5600;

/* The hero: the motion model cycles through every test the app can score. */
function MotionHero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), SHOWCASE_MS);
    return () => window.clearInterval(id);
  }, []);
  const id = SHOWCASE[i];
  const t = EXERCISES[id];
  return (
    <div className="auth-stage">
      <div className="auth-stage-figure">
        <MotionFigure motion={id} variant="dark" yaw={-30} swing={20} label={`${t.title} demonstration`} />
      </div>
      <div className="auth-readout" aria-live="polite">
        <small>Now demonstrating · {String(i + 1).padStart(2, '0')}/{String(SHOWCASE.length).padStart(2, '0')}</small>
        <strong key={id}>{t.title}</strong>
        <span>{t.measured.slice(0, 3).join(' · ')}</span>
        <div className="auth-ticks">
          {SHOWCASE.map((x, n) => (
            <button key={x} type="button" className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Show ${EXERCISES[x].title}`}>
              {n === i && <i key={i} style={{ animationDuration: `${SHOWCASE_MS}ms` }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('patient');
  const [specialization, setSpecialization] = useState('Neurology');
  const [clinicName, setClinicName] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [consultationFee, setConsultationFee] = useState('1000');
  const [experienceYears, setExperienceYears] = useState('5');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const switchMode = (next) => { setMode(next); setError(''); setPassword(''); setConfirm(''); };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const mail = email;
    const pass = password;
    if (!mail.trim() || !pass) { setError('Enter your email and password.'); return; }
    if (signup) {
      if (!name.trim()) { setError('Enter your full name.'); return; }
      if (pass.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (pass !== confirm) { setError('Passwords do not match.'); return; }
    }
    setBusy(true);
    setError('');
    try {
      const payload = { name: name.trim(), email: mail, password: pass, role };
      if (signup && role === 'doctor') {
        payload.specialization = specialization;
        if (clinicName.trim() || clinicCity.trim()) {
          payload.clinic = {
            name: clinicName.trim() || undefined,
            city: clinicCity.trim() || undefined,
          };
        }
        if (consultationFee) payload.consultationFee = Number(consultationFee);
        if (experienceYears) payload.experienceYears = Number(experienceYears);
      }
      const { user, token } = signup
        ? await api.signup(payload)
        : await api.login(mail, pass);
      onLogin(user, token);
    } catch (err) {
      if (err instanceof TypeError) setError('Cannot reach the server. Make sure the backend is running.');
      else setError(err.status === 401 ? 'Invalid email or password.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-top">
          <Logo tone="light" />
          <span className="auth-tag"><i /> On-device pose AI</span>
        </div>
        <MotionHero />
        <div className="auth-hero-copy">
          <h2>Recovery, <em>in motion.</em></h2>
          <p>A short daily movement check, scored in your browser and turned into clear, clinician-ready progress for stroke recovery.</p>
          <ul className="auth-features">
            {FEATURES.map(([n, text]) => <li key={text}><b>{n}</b><span>{text}</span></li>)}
          </ul>
        </div>
      </section>

      {/* Form side */}
      <section className="auth-panel">
        <form className={`auth-card ${signup && role === 'doctor' ? 'wide' : ''}`} onSubmit={submit} noValidate>
          <div className="auth-mobile-logo"><Logo /></div>
          <div className="auth-title">
            <span className="eyebrow">{signup ? 'New account' : 'Sign in'}</span>
            <h1>{signup ? <>Start your <em>baseline</em>.</> : <>Welcome <em>back</em>.</>}</h1>
            <p>{signup ? 'Set up NeuroGuard to start monitoring recovery.' : 'Sign in to continue your recovery monitoring.'}</p>
          </div>

          {signup && (
            <>
              <div className="auth-roles" role="radiogroup" aria-label="Account type">
                {[
                  { id: 'patient', label: 'Patient', icon: UserRound },
                  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={role === id}
                    className={role === id ? 'active' : ''}
                    onClick={() => setRole(id)}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
              <label className="auth-field">Full name
                <span className="auth-input">
                  <UserRound size={17} />
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={role === 'doctor' ? 'e.g. Sanjay Gupta' : 'Your name'} />
                </span>
              </label>
              {role === 'doctor' && (
                <>
                  <label className="auth-field">Specialization
                    <select className="auth-select" value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                      <option value="Neurology">Neurology</option>
                      <option value="Physical Medicine and Rehabilitation">Physical Medicine & Rehabilitation</option>
                      <option value="Physiotherapy">Physiotherapy</option>
                      <option value="Occupational Therapy">Occupational Therapy</option>
                      <option value="Speech and Language Therapy">Speech & Language Therapy</option>
                      <option value="Neurorehabilitation">Neurorehabilitation</option>
                    </select>
                  </label>
                  <div className="auth-row">
                    <label className="auth-field">Clinic name
                      <span className="auth-input"><input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. Apex Neuro Center" /></span>
                    </label>
                    <label className="auth-field">City
                      <span className="auth-input"><input value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} placeholder="e.g. Mumbai" /></span>
                    </label>
                  </div>
                  <div className="auth-row">
                    <label className="auth-field">Consultation fee (₹)
                      <span className="auth-input"><input type="number" min="0" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} placeholder="1000" /></span>
                    </label>
                    <label className="auth-field">Experience (years)
                      <span className="auth-input"><input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="5" /></span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          <label className="auth-field">Email
            <span className="auth-input">
              <Mail size={17} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@example.com" />
            </span>
          </label>
          <label className="auth-field">Password
            <span className="auth-input">
              <Lock size={17} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 8 characters' : '••••••••'} />
              <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          {signup && (
            <label className="auth-field">Confirm password
              <span className="auth-input">
                <Lock size={17} />
                <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat password" />
              </span>
            </label>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" type="submit" disabled={busy}>
            <span>{signup ? 'Create account' : 'Sign in'}</span>
            <i className="auth-submit-icon">{busy ? <LoaderCircle size={17} className="spin" /> : signup ? <UserPlus size={17} /> : <ArrowRight size={17} />}</i>
          </button>

          <div className="auth-switch">
            {signup ? 'Already have an account?' : 'New to NeuroGuard?'}{' '}
            <button type="button" onClick={() => switchMode(signup ? 'signin' : 'signup')}>{signup ? 'Sign in' : 'Create an account'}</button>
          </div>

          {!signup && (
            <div className="auth-demo">
              <div className="auth-demo-title"><span /> Demo accounts · tap to fill <span /></div>
              <div className="auth-demo-grid">
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.email} type="button" disabled={busy} onClick={() => fillDemo(a)}>
                      <span className="demo-avatar"><Icon size={16} /></span>
                      <span className="demo-text"><strong>{a.label}</strong><small>{a.name}</small></span>
                      <ArrowRight size={15} className="demo-go" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="auth-fineprint"><ShieldCheck size={14} /> NeuroGuard is a prototype for functional monitoring and does not replace professional medical care.</p>
        </form>
      </section>
    </div>
  );
}
