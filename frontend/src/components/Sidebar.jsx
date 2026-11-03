import React, { useState } from 'react';
import {
  Activity, Bell, Calendar, HeartPulse, LayoutDashboard, LineChart, Settings, ShieldCheck,
  Stethoscope, UserRound, UsersRound, Video,
} from 'lucide-react';
import { Logo } from './Logo';

const COLLAPSE_KEY = 'neuroguard.sidebarCollapsed';

export default function Sidebar({ view, setView, role, userName, onDemoDecline }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const patientItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'assessment', label: 'Today’s Check', icon: Video },
    { id: 'progress', label: 'My Progress', icon: LineChart },
    { id: 'appointments', label: 'Doctor Appointments', icon: Calendar },
  ];
  const doctorItems = [
    { id: 'doctor', label: 'All patients', icon: UsersRound },
    { id: 'progress', label: 'Patient Progress', icon: LineChart },
    { id: 'appointments', label: 'Clinic Appointments', icon: Calendar },
  ];

  const items = role === 'doctor' ? doctorItems : patientItems;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="logo-toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <Logo compact={collapsed} />
      </button>
      <div className="nav-label">Workspace</div>
      <nav>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)} title={collapsed ? label : undefined}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="safety-card">
        <ShieldCheck size={18} />
        <div><strong>Privacy first</strong><span>Camera frames stay on device.</span></div>
      </div>
      <button className="nav-item" onClick={() => setView('settings')} title={collapsed ? 'Settings' : undefined}><Settings size={19} /><span>Settings</span></button>
      {role === 'patient' && <button className="demo-link" onClick={onDemoDecline}><Activity size={16} /> Load decline demo</button>}
      <div className="sidebar-footer">
        <div className="avatar">{(userName || 'U').replace(/^Dr\.?\s*/, '').charAt(0).toUpperCase()}</div>
        <div>
          <strong>{userName || 'Raj Kumar'}</strong>
          <span>{role === 'doctor' ? 'Doctor account' : 'Patient account'}</span>
        </div>
        <Stethoscope size={16} />
      </div>
    </aside>
  );
}
