import React, { useState } from 'react';
import {
  Activity, ArrowRight, Eye, EyeOff, Lock, LoaderCircle, Mail, ShieldCheck,
  Stethoscope, TrendingUp, UserPlus, UserRound,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';

const DEMO_ACCOUNTS = [
  { label: 'Patient', name: 'Raj Kumar', email: 'raj@neuroguard.demo', password: 'patient123', icon: UserRound },
  { label: 'Doctor', name: 'Dr. Priya Nair', email: 'priya@neuroguard.demo', password: 'doctor123', icon: Stethoscope },
];

const FEATURES = [
  { icon: Activity, title: 'Guided home exercises', text: 'Camera-based movement checks, scored in seconds.' },
  { icon: TrendingUp, title: 'Your own baseline', text: 'Progress is measured against you, not an average.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Video is processed on your device and never uploaded.' },
];

/* Animated pose-skeleton used as the hero illustration. */
function PoseHero() {
  const joints = [
    [150, 94], [108, 120], [192, 120], [88, 182], [84, 244],
    [124, 232], [176, 232], [120, 318], [180, 318], [118, 396], [182, 396],
  ];
  return (
    <div className="pose-hero" aria-hidden="true">
      <svg viewBox="0 0 300 430" className="pose-svg">
        <defs>
          <radialGradient id="poseGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#7aa7ff" stopOpacity=".55" />
            <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="215" r="190" fill="url(#poseGlow)" />
        <g className="pose-lines">
          <circle cx="150" cy="52" r="26" />
          <path d="M150 78 L150 94" />
          <path d="M108 120 L192 120" />
          <path d="M108 120 L124 232 M192 120 L176 232 M124 232 L176 232" />
          <path d="M108 120 L88 182 L84 244" />
          <path d="M124 232 L120 318 L118 396" />
          <path d="M176 232 L180 318 L182 396" />
        </g>
        {/* the right arm raises and lowers like the Arm Raise exercise */}
        <g className="pose-arm">
          <path d="M192 120 L212 182 L216 244" className="pose-arm-line" />
          <circle cx="212" cy="182" r="6" className="pose-joint" />
          <circle cx="216" cy="244" r="6" className="pose-joint" />
        </g>
        {joints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" className="pose-joint" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
        <circle cx="150" cy="52" r="6" className="pose-joint" />
      </svg>

      <div className="float-card fc-top">
        <span className="fc-dot" /> <strong>Body detected</strong>
        <small>AI live · on-device</small>
      </div>
      <div className="float-card fc-mid">
        <small>Arm raise</small>
        <strong>Rep 3 / 5</strong>
        <div className="fc-bar"><i /></div>
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
      {/* Brand / hero side */}
      <section className="auth-hero">
        <div className="auth-hero-top"><Logo /></div>
        <PoseHero />
        <div className="auth-hero-copy">
          <h2>Recovery you can <em>see</em>, from home.</h2>
          <p>NeuroGuard turns a short daily exercise into clear, clinician-ready progress for stroke recovery.</p>
          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span><Icon size={17} /></span>
                <div><strong>{title}</strong><small>{text}</small></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form side */}
      <section className="auth-panel">
        <form className={`auth-card ${signup && role === 'doctor' ? 'wide' : ''}`} onSubmit={submit} noValidate>
          <div className="auth-mobile-logo"><Logo /></div>
          <div className="auth-title">
            <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
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
            {busy ? <LoaderCircle size={17} className="spin" /> : signup ? <UserPlus size={17} /> : null}
            <span>{signup ? 'Create account' : 'Sign in'}</span>
            {!busy && !signup && <ArrowRight size={17} />}
          </button>

          <div className="auth-switch">
            {signup ? 'Already have an account?' : 'New to NeuroGuard?'}{' '}
            <button type="button" onClick={() => switchMode(signup ? 'signin' : 'signup')}>{signup ? 'Sign in' : 'Create an account'}</button>
          </div>

          {!signup && (
            <div className="auth-demo">
              <div className="auth-demo-title"><span /> Try a demo account <span /></div>
              <div className="auth-demo-grid">
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.email} type="button" disabled={busy} onClick={() => fillDemo(a)}>
                      <span className="demo-avatar"><Icon size={16} /></span>
                      <span className="demo-text"><strong>{a.label}</strong><small>{a.name}</small></span>
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
