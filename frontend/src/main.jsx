import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const asset = (name) => `/assets/${name}`;

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ detail: 'Server returned an invalid response.' }));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
  return data;
}

function Login({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setSending(true); setError('');
    try { await request('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) }); onAuthenticated(); }
    catch (err) { setError(err.message); } finally { setSending(false); }
  };
  return <main className="gate"><section className="gate-card"><p className="kicker">Private practice room</p><h1>Probe Interview</h1><p>Enter the access password to begin a guided technical conversation.</p><form onSubmit={submit}><label htmlFor="password">Access password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /><button disabled={sending}>{sending ? 'Checking access...' : 'Enter the room'}</button><p className="error" role="alert">{error}</p></form></section></main>;
}

function TracePanel({ trace }) {
  const [open, setOpen] = useState(false);
  if (!trace?.length) return null;
  const tone = (agent) => agent.includes('Finder') || agent === 'Topic Planner' ? 'setup' : agent === 'Interviewer' ? 'interview' : agent === 'Response Reviewer' ? 'review' : agent === 'Consistency Checker' ? 'check' : 'evaluate';
  return <section className="trace-panel"><button className="trace-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><span>{open ? 'Hide reasoning' : 'Show reasoning'}</span><small>{trace.length} agents this turn</small></button>{open && <div className="trace-list">{trace.map((entry, index) => <details className="trace-entry" key={`${entry.agent}-${index}`}><summary><span className={`badge ${tone(entry.agent)}`}>{entry.agent}</span><span>{Object.keys(entry.output).join(' · ')}</span></summary><pre>{JSON.stringify(entry.output, null, 2)}</pre></details>)}</div>}</section>;
}

function CandidateSetup({ onStart }) {
  const [candidates, setCandidates] = useState([]); const [raw, setRaw] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { request('/data/candidates.json').then((data) => setCandidates(data.candidates || [])).catch((err) => setError(err.message)); }, []);
  const choose = (id) => { const candidate = candidates.find((entry) => entry.member.id === id); if (candidate) setRaw(JSON.stringify(candidate, null, 2)); };
  const start = async () => { try { const candidate = JSON.parse(raw); setLoading(true); await onStart(candidate); } catch (err) { setError(err.message || 'Enter valid candidate JSON.'); setLoading(false); } };
  return <main className="setup-shell"><section className="setup-copy"><p className="kicker">A scene, not a script</p><h1>Set the room.</h1><p>Load a candidate history, then let the conversation reveal where their reasoning holds up.</p><a href="/classic">Open classic interface</a></section><section className="setup-card"><label>Load a sample<select defaultValue="" onChange={(event) => choose(event.target.value)}><option value="">Choose a candidate</option>{candidates.map((candidate) => <option key={candidate.member.id} value={candidate.member.id}>{candidate.member.name} · {candidate.member.jobRole}</option>)}</select></label><label>Candidate JSON<textarea value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="Paste a complete candidate object" spellCheck="false" /></label><button onClick={start} disabled={loading}>{loading ? 'Preparing interview...' : 'Enter interview room'}</button><p className="error">{error}</p></section></main>;
}

function Scene({ candidate, response, onSend, busy }) {
  const [mode, setMode] = useState('custom'); const [custom, setCustom] = useState(''); const [displayed, setDisplayed] = useState(''); const [camera, setCamera] = useState('interviewer'); const [speaking, setSpeaking] = useState(true);
  useEffect(() => { setDisplayed(''); setCamera('interviewer'); setSpeaking(true); let index = 0; const timer = window.setInterval(() => { index += 3; setDisplayed(response.reply.slice(0, index)); if (index >= response.reply.length) { window.clearInterval(timer); setSpeaking(false); } }, 16); return () => window.clearInterval(timer); }, [response.reply]);
  const submit = async () => { let answer = custom.trim(); setCamera('candidate'); if (mode !== 'custom') answer = await onSend({ style: mode, question: response.reply, candidate, simulate: true }); else await onSend({ answer, candidate, simulate: false }); setCustom(''); };
  const candidatePose = mode === 'confident' ? 'candidate-confident.png' : mode === 'unsure' ? 'candidate-nervous.png' : mode === 'vague' ? 'candidate-vague.png' : busy ? 'candidate-speaking.png' : 'candidate-idle.png';
  const interviewerPose = speaking ? 'interviewer-speaking.png' : busy ? 'interviewer-thinking.png' : 'interviewer-idle.png';
  return <main className="scene-app"><header className="scene-header"><a href="/classic">Classic</a><span>Probe / live practice</span><strong>{candidate.member.name}</strong></header><section className={`scene-viewport ${camera === 'candidate' ? 'camera-candidate' : 'camera-interviewer'}`}><div className="room"><img className="room-art" src={asset('interview-room.png')} alt="Interview room" /><div className="interviewer-zone"><div className="speech"><span>Interviewer</span><p>{displayed || '...'}</p></div><img src={asset(interviewerPose)} alt="Interviewer" /></div><div className="candidate-zone"><img src={asset(candidatePose)} alt="Candidate" /></div></div></section><section className="control-deck"><div className="question-meta"><span>Current topic</span><strong>{response.trace?.find((entry) => entry.agent === 'Interviewer')?.output.topic || 'Interview'}</strong></div><div className="answer-panel"><p>Choose a response posture</p><div className="style-grid">{[['confident', 'Confidently answer'], ['unsure', 'Act unsure'], ['vague', 'Give a vague answer']].map(([value, label]) => <button className={mode === value ? 'selected' : ''} key={value} onClick={() => setMode(value)} disabled={busy}>{label}</button>)}</div><label className="custom-answer"><span>Or write your own</span><textarea value={custom} onChange={(event) => { setCustom(event.target.value); setMode('custom'); }} placeholder="Type a candidate response" disabled={busy} /></label><button className="send-answer" disabled={busy || (mode === 'custom' && !custom.trim())} onClick={submit}>{busy ? 'Thinking...' : mode === 'custom' ? 'Send custom response' : `Generate ${mode} response`}</button></div><TracePanel trace={response.trace} />{response.done && <section className="feedback"><h2>Session notes</h2><p>{response.feedback.summary}</p><div><h3>Strengths</h3><ul>{response.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Gaps</h3><ul>{response.feedback.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div></section>}</section></main>;
}

function App() {
  const [auth, setAuth] = useState('checking'); const [candidate, setCandidate] = useState(null); const [response, setResponse] = useState(null); const [sessionId, setSessionId] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { request('/api/session').then(() => setAuth('yes')).catch(() => setAuth('no')); }, []);
  const start = async (selected) => { const id = crypto.randomUUID(); setBusy(true); try { const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, candidate: selected }) }); setCandidate(selected); setSessionId(id); setResponse(next); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const send = async ({ style, question, candidate: context, simulate, answer }) => { setBusy(true); setError(''); try { const text = simulate ? (await request('/api/simulate-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, candidate: context, style }) })).answer : answer; const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, message: text }) }); setResponse(next); return text; } catch (err) { setError(err.message); throw err; } finally { setBusy(false); } };
  if (auth === 'checking') return <main className="loading">Opening interview room...</main>;
  if (auth === 'no') return <Login onAuthenticated={() => setAuth('yes')} />;
  if (!response) return <CandidateSetup onStart={start} />;
  return <><Scene candidate={candidate} response={response} onSend={send} busy={busy} />{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
