import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, CircleAlert, LoaderCircle, Play, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { createPoseLandmarker, drawSkeleton } from '../lib/pose';
import MotionFigure from './MotionFigure';
import { EXERCISES } from '../lib/exercises';

const GET_READY_SECONDS = 3;       // time to get into position before recording starts
const FINISH_DELAY_MS = 1500;      // short pause after the last rep so it is captured
const MAX_FRAMES = 3600;           // enough to keep a whole test (about 60s) for scoring

const pad = (n) => String(n).padStart(2, '0');
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export default function CameraAssessment({ exercise = 'arm_raise', onComplete, onExit, autoStart = false }) {
  const ex = EXERCISES[exercise];
  const maxSeconds = ex.maxSeconds;
  const targetReps = ex.mode === 'hold' ? 0 : ex.targetReps;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const framesRef = useRef([]);
  const runRef = useRef(0);            // bumps on every start/stop so stale async work can bail out
  const recordingRef = useRef(false);  // frames are only kept after the get-ready countdown
  const finishedRef = useRef(false);
  const elapsedRef = useRef(0);
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;

  const [status, setStatus] = useState('idle'); // idle | loading | running | done | error
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0); // get-ready seconds left (0 = recording)
  const [elapsed, setElapsed] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState({ phase: 'Ready', value: 0, quality: 0, reps: 0 });
  const [result, setResult] = useState(null);

  elapsedRef.current = elapsed;

  // Open the camera by itself when the page asks for it (user already picked a test and pressed Start).
  useEffect(() => {
    if (autoStart) startCamera();
    return () => {
      runRef.current += 1;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get-ready countdown, then start recording.
  useEffect(() => {
    if (status !== 'running' || countdown <= 0) return undefined;
    const id = window.setTimeout(() => {
      const next = countdown - 1;
      if (next <= 0) {
        framesRef.current = [];
        recordingRef.current = true;
      }
      setCountdown(next);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [status, countdown]);

  // Test clock.
  useEffect(() => {
    if (status !== 'running' || countdown > 0) return undefined;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [status, countdown]);

  // Auto-finish: time is up…
  useEffect(() => {
    if (status === 'running' && countdown === 0 && elapsed >= maxSeconds) finishAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, countdown, elapsed, maxSeconds]);

  // …or the rep target has been reached (short pause so the last rep is captured). Hold tests only end on time.
  useEffect(() => {
    if (ex.mode === 'hold' || status !== 'running' || countdown > 0 || liveMetrics.reps < targetReps) return undefined;
    const id = window.setTimeout(finishAssessment, FINISH_DELAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, countdown, liveMetrics.reps]);

  async function startCamera() {
    const runId = ++runRef.current;
    try {
      setError('');
      setResult(null);
      framesRef.current = [];
      recordingRef.current = false;
      finishedRef.current = false;
      setElapsed(0);
      setLiveMetrics({ phase: 'Ready', value: 0, quality: 0, reps: 0 });
      setStatus('loading');
      if (!landmarkerRef.current) landmarkerRef.current = await createPoseLandmarker();
      if (runRef.current !== runId) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      if (runRef.current !== runId) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (runRef.current !== runId) return;
      setCountdown(GET_READY_SECONDS);
      setStatus('running');
      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      if (runRef.current !== runId) return;
      console.error(err);
      setError(err?.message?.includes('Permission') ? 'Camera permission was blocked. Allow camera access and try again.' : 'Unable to start the camera or AI model. Check your internet connection and browser permissions.');
      setStatus('error');
    }
  }

  function processFrame(timestamp) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarkerRef.current || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    try {
      const detection = landmarkerRef.current.detectForVideo(video, timestamp);
      const landmarks = detection?.landmarks?.[0];
      const ctx = canvas.getContext('2d');
      if (landmarks) {
        drawSkeleton(ctx, video, landmarks);
        const test = EXERCISES[exerciseRef.current];
        const frame = test.frame(landmarks);
        if (frame?.ready && recordingRef.current) {
          framesRef.current.push({ ...frame, at: Date.now() });
          if (framesRef.current.length > MAX_FRAMES) framesRef.current.shift();
          const frames = framesRef.current;
          setLiveMetrics({ ...test.live(frames), reps: test.count(frames) });
        }
      }
    } catch (err) {
      // Ignore individual-frame issues to keep the assessment loop alive.
    }
    rafRef.current = requestAnimationFrame(processFrame);
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    rafRef.current = null;
    streamRef.current = null;
    recordingRef.current = false;
  }

  function finishAssessment() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const test = EXERCISES[exerciseRef.current];
    const data = test.build(framesRef.current);
    const final = {
      exercise: test.id,
      exerciseTitle: test.title,
      score: data.score,
      metrics: data.metrics,
      duration: elapsedRef.current,
    };
    setResult(final);
    stopCamera();
    setStatus('done');
    onComplete?.(final);
  }

  function cancelTest() {
    runRef.current += 1;
    finishedRef.current = true;
    stopCamera();
    onExit?.();
  }

  const remaining = Math.max(0, maxSeconds - elapsed);
  const progress = Math.min(100, (elapsed / maxSeconds) * 100);
  const active = status === 'running' || status === 'loading';
  const unit = ex.levelUnit;

  return (
    <div className="assessment-layout">
      <div className="assessment-main">
        <div className="assessment-head">
          <div>
            <span className="eyebrow">{status === 'done' ? 'Test complete' : 'Live functional check'}</span>
            <h2>{ex.title}</h2>
            <p>{ex.instruction}</p>
          </div>
          <div className={`timer-pill ${status === 'running' && countdown === 0 ? 'live' : ''}`}>
            <span /> {status === 'running' && countdown === 0 ? `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)} left` : `${pad(Math.floor(maxSeconds / 60))}:${pad(maxSeconds % 60)} test`}
          </div>
        </div>

        <div className="camera-card">
          <div className="camera-progress"><i style={{ width: `${status === 'done' ? 100 : progress}%` }} /></div>
          <div className="camera-stage">
            <video ref={videoRef} className="camera-video" playsInline muted />
            <canvas ref={canvasRef} className="camera-canvas" />
            {status === 'idle' && (
              <div className="camera-placeholder">
                <div className="camera-placeholder-icon"><Camera size={30} /></div>
                <strong>Ready for your check</strong>
                <span>{ex.view}.</span>
                <button className="primary" onClick={startCamera}><Play size={17} /> Start test</button>
              </div>
            )}
            {status === 'loading' && <div className="camera-overlay"><LoaderCircle className="spin" size={28} /><strong>Opening camera…</strong><span>Loading the on-device movement model.</span></div>}
            {status === 'error' && <div className="camera-overlay error"><CircleAlert size={28} /><strong>Camera check could not start</strong><span>{error}</span><button className="secondary" onClick={startCamera}><RotateCcw size={15} /> Try again</button></div>}
            {status === 'running' && (
              <div className="camera-overlay-ui">
                <div className="live-tag"><span /> AI LIVE</div>
                <div className="pose-status"><CheckCircle2 size={15} /> {countdown > 0 ? 'Get into position' : 'Recording'}</div>
                {countdown > 0 && (
                  <div className="get-ready">
                    <small>Starting in</small>
                    <strong key={countdown}>{countdown}</strong>
                    <span>{ex.instruction}</span>
                    <em>{ex.position} · {ex.view}</em>
                  </div>
                )}
              </div>
            )}
            {status === 'done' && result && (
              <div className="camera-overlay done">
                <CheckCircle2 size={30} />
                <strong>{result.score > 0 ? `${result.exerciseTitle} complete` : 'No movement captured'}</strong>
                <span>{result.score > 0 ? `Score ${result.score}/100` : 'We could not see you clearly, so nothing was saved.'}</span>
              </div>
            )}
          </div>
          <div className="camera-footer">
            <div><ShieldCheck size={16} /><span>Processed on this device • raw video is not uploaded</span></div>
            <div className="camera-controls">
              {active && <button className="secondary" onClick={cancelTest}><X size={15} /> Cancel test</button>}
              {status === 'running' && countdown === 0 && <span className="auto-note">Ends automatically</span>}
            </div>
          </div>
        </div>

        {status === 'done' && result && (
          <div className="result-banner">
            <div className="result-score">{result.score}<span>/100</span></div>
            <div><strong>{result.score > 0 ? `${result.exerciseTitle} completed` : 'Test ended with no score'}</strong><span>{result.score > 0 ? 'Session processed. Your metrics are ready for baseline comparison.' : 'Make sure the needed body parts are in view with good lighting, then try again.'}</span></div>
            <div className="result-actions">
              <button className="secondary" onClick={startCamera}><RotateCcw size={15} /> Try again</button>
              {onExit && <button className="primary" onClick={onExit}><ArrowLeft size={15} /> Back to tests</button>}
            </div>
          </div>
        )}
      </div>

      <aside className="assessment-side">
        <div className="side-section body-detail">
          <span className="section-kicker">Follow along</span>
          <MotionFigure motion={exercise} variant="light" yaw={-30} swing={10} floor={false} />
          <div className="body-caption"><strong>{ex.area}</strong><span>{ex.title}</span></div>
        </div>
        <div className="side-section">
          <span className="section-kicker">Session target</span>
          {ex.mode === 'hold' ? (
            <div className="target-card"><span className="target-number">{ex.holdSeconds}</span><div><strong>seconds, as still as you can</strong><span>{ex.position}</span></div></div>
          ) : (
            <div className="target-card"><span className="target-number">{ex.targetReps}</span><div><strong>controlled {ex.repsLabel}</strong><span>or {maxSeconds}s, whichever comes first</span></div></div>
          )}
        </div>
        <div className="side-section">
          <span className="section-kicker">Live metrics</span>
          <div className="live-metrics">
            <div><span>Movement phase</span><strong>{liveMetrics.phase}</strong></div>
            <div><span>{ex.levelLabel}</span><strong>{liveMetrics.value}{unit}</strong></div>
            <div><span>{ex.qualityLabel}</span><strong>{liveMetrics.quality}%</strong></div>
            {ex.mode === 'hold'
              ? <div><span>Hold time</span><strong>{Math.min(elapsed, maxSeconds)}/{ex.holdSeconds}s</strong></div>
              : <div><span>{cap(ex.repsLabel)}</span><strong>{liveMetrics.reps}/{targetReps}</strong></div>}
          </div>
        </div>
        <div className="side-section">
          <span className="section-kicker">Safety</span>
          <div className="safety-note"><ShieldCheck size={18} /><div><strong>Stay safe</strong><span>{ex.safety}</span></div></div>
        </div>
      </aside>
    </div>
  );
}
