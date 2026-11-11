import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/shell.css';
import './styles/motion.css';
import './styles/dashboard.css';
import './styles/auth.css';
import './styles/check.css';
import './styles/doctor.css';
import './styles/appointments.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
