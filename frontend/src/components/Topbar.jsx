import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, Bell, Calendar, Check, CheckCheck, ChevronDown, LayoutDashboard, LineChart, LogOut, Settings,
  UsersRound, Video,
} from 'lucide-react';
import { Logo } from './Logo';
import { api } from '../lib/api';

const PATIENT_NAV = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'assessment', label: 'Today’s check', icon: Video },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
];
const DOCTOR_NAV = [
  { id: 'doctor', label: 'Patients', icon: UsersRound },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'appointments', label: 'Clinic', icon: Calendar },
];

const initial = (name) => (name || 'U').replace(/^Dr\.?\s*/, '').charAt(0).toUpperCase();

function useOutsideClose(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, setOpen]);
  return ref;
}

export default function Topbar({ role, view, setView, userName, onLogout, systemStatus, onDemoDecline }) {
  const items = role === 'doctor' ? DOCTOR_NAV : PATIENT_NAV;
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useOutsideClose(notifOpen, setNotifOpen);
  const menuRef = useOutsideClose(menuOpen, setMenuOpen);

  const isInMemory = systemStatus?.database === 'in-memory';
  const isOffline = systemStatus?.database === 'offline';

  useEffect(() => {
    const load = () => api.notifications().then((res) => setNotifications(res.notifications || [])).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch { /* ignore */ }
  };
  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const go = (id) => { setView(id); setMenuOpen(false); };

  return (
    <>
      <header className="topbar">
        <button type="button" className="topbar-brand" onClick={() => go(role === 'doctor' ? 'doctor' : 'dashboard')} aria-label="Go to home">
          <Logo />
        </button>

        <nav className="topnav" aria-label="Main">
          {items.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}>
              <Icon size={16} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <span
            className={`live-chip ${isInMemory ? 'warn' : ''} ${isOffline ? 'off' : ''}`}
            title={isOffline ? 'Backend unreachable — showing demo data' : isInMemory ? 'Session mode: data held in memory' : 'All systems operational'}
          >
            <i /> <span>{isOffline ? 'Offline demo' : isInMemory ? 'Session mode' : 'Live'}</span>
          </span>

          <div className="notification-wrapper" ref={notifRef}>
            <button type="button" className="icon-button" onClick={() => setNotifOpen((o) => !o)} aria-label={`Notifications (${unread} unread)`} aria-expanded={notifOpen}>
              <Bell size={17} />
              {unread > 0 && <span className="unread-badge">{unread}</span>}
            </button>
            {notifOpen && (
              <div className="notification-dropdown">
                <div className="dropdown-head">
                  <strong>Notifications</strong>
                  {unread > 0 && <button type="button" className="mark-all-btn" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
                </div>
                <div className="dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="empty-notifs">You’re all caught up.</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <div className="notif-body">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <small>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString()}</small>
                      </div>
                      {!n.read && (
                        <button type="button" className="mark-single-read-btn" title="Mark as read" onClick={() => markRead(n.id)}><Check size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="profile-wrapper" ref={menuRef}>
            <button type="button" className="profile-menu" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
              <span className="avatar small">{initial(userName)}</span>
              <span className="profile-name"><b>{userName}</b><small>{role === 'doctor' ? 'Clinician' : 'Patient'}</small></span>
              <ChevronDown size={15} />
            </button>
            {menuOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-head">
                  <span className="avatar">{initial(userName)}</span>
                  <div><strong>{userName}</strong><small>{role === 'doctor' ? 'Clinician account' : 'Patient account'}</small></div>
                </div>
                <button type="button" role="menuitem" onClick={() => go('settings')}><Settings size={16} /> Privacy & settings</button>
                {role === 'patient' && (
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDemoDecline?.(); }}>
                    <Activity size={16} /> Load decline demo
                  </button>
                )}
                <button type="button" role="menuitem" className="signout" onClick={onLogout}><LogOut size={16} /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="dock" aria-label="Main (mobile)">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
