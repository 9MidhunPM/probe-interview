import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import './styles.css';

const asset = (name) => `/assets/${name}`;
const responseStyles = [['confident', 'Confidently answer'], ['unsure', 'Act unsure'], ['vague', 'Give a vague answer']];
const agentNames = ['Strengths Finder', 'Weaknesses Finder', 'Topic Planner', 'Interviewer', 'Answer Generator', 'Response Reviewer', 'Consistency Checker', 'Evaluator'];

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ detail: 'Server returned an invalid response.' }));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
  return data;
}

function Markdown({ children }) { return <div className="markdown-content"><ReactMarkdown>{children}</ReactMarkdown></div>; }

function Login({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    try { await request('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) }); onAuthenticated(); }
    catch (err) { setError(err.message); }
    finally { setSending(false); }
  }
  return <main className="gate"><section className="gate-card"><p className="kicker">Private practice room</p><h1>Probe Interview</h1><p>Enter the access password to begin a guided technical conversation.</p><form onSubmit={submit}><label htmlFor="password">Access password<input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label><button disabled={sending}>{sending ? 'Checking access...' : 'Enter the room'}</button><p className="error" role="alert">{error}</p></form></section></main>;
}

function Home({ onStart }) {
  return <main className="home-shell"><section className="home-hero"><div className="probey-portrait"><img src={asset('interviewer-idle.png')} alt="Dr. Probey, the amber interview guide with round glasses and a navy tie" /></div><div><p className="kicker">Probe Interview</p><h1>Practice the conversation, not a script.</h1><p className="home-lede">Probe is a private technical interview practice room. Bring a candidate&apos;s learning record, have a candid live conversation, and leave with evidence you can use.</p><button type="button" className="home-start" onClick={onStart}>Start setup</button><a href="/classic">Prefer plain chat? Open classic.</a></div></section><section className="home-flow" aria-label="How Probe works"><article><span>01</span><h2>Personalized setup</h2><p>Choose a sample candidate or add the role, experience, learning history, and missions that should shape the interview.</p></article><article><span>02</span><h2>Adaptive conversation</h2><p>Dr. Probey follows the reasoning, not a fixed question list. Answer yourself or generate a response style to explore a turn.</p></article><article><span>03</span><h2>Feedback</h2><p>Finish with a clear summary of strengths, gaps, next steps, and the approach behind the questions.</p></article></section><section className="home-notes"><article><p className="kicker">Meet Dr. Probey</p><h2>Friendly face. Serious follow-up.</h2><p>Dr. Probey is the openly AI-powered guide for this practice room. He brings playful curiosity, dry wit when it helps, and direct questions when an answer needs more shape. A sharp detail might earn a brief, theatrical “Ooh, let&apos;s sit with that for a second,” then he reins it back in and gets useful.</p><p>He is comfortable leaving space when an answer is vague instead of filling it with encouragement. That warmth is a layer over real rigor: no fake biography, no hand-holding, and no charm standing in for a demanding technical conversation.</p></article><article><p className="kicker">For the curious</p><h2>Several specialists, one conversation.</h2><p>Before the conversation, Strengths Finder, Weaknesses Finder, and Topic Planner turn the learning record into a personalized plan. They give Dr. Probey a grounded place to begin instead of a generic list of questions.</p><p>Turn by turn, Response Reviewer and Consistency Checker adapt the difficulty and flag contradictions worth exploring. At the end, the Evaluator assembles the feedback, including Dr. Probey&apos;s approach recap. It is more than a chatbot, without asking you to read an architecture diagram.</p></article></section></main>;
}

const emptyMission = () => ({ day: '', title: '', outcome: 'passed', attempts: '1' });
const toForm = (candidate) => ({ id: candidate.member.id, name: candidate.member.name, jobRole: candidate.member.jobRole, yearsExperience: String(candidate.member.yearsExperience), education: candidate.member.education, status: candidate.member.status, missions: candidate.missions.map((mission) => ({ day: String(mission.day), title: mission.title, outcome: mission.skipped ? 'skipped' : mission.passed ? 'passed' : 'not-passed', attempts: mission.attempts == null ? '' : String(mission.attempts) })) });

function candidateFromForm(form) {
  const labels = { name: 'Name', jobRole: 'Job role', education: 'Education' };
  const missing = Object.keys(labels).find((key) => !form[key].trim());
  if (missing) throw new Error(`${labels[missing]} is required.`);
  const yearsExperience = Number(form.yearsExperience);
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 80) throw new Error('Years of experience must be between 0 and 80.');
  if (!form.missions.length) throw new Error('Add at least one mission.');
  const missions = form.missions.map((mission, index) => {
    const day = Number(mission.day);
    if (!Number.isInteger(day) || day < 1) throw new Error(`Mission ${index + 1} needs a positive day number.`);
    if (!mission.title.trim()) throw new Error(`Mission ${index + 1} needs a title.`);
    const attempts = Number(mission.attempts);
    if (mission.outcome !== 'skipped' && (!Number.isInteger(attempts) || attempts < 1)) throw new Error(`Mission ${index + 1} needs at least one attempt.`);
    return mission.outcome === 'skipped' ? { day, title: mission.title.trim(), skipped: true } : { day, title: mission.title.trim(), passed: mission.outcome === 'passed', attempts };
  });
  return { member: { id: form.id, name: form.name.trim(), jobRole: form.jobRole.trim(), yearsExperience, education: form.education.trim(), status: form.status }, missions, signals: { commitDays: Math.max(...missions.map((mission) => mission.day)), missionsCompleted: missions.filter((mission) => mission.passed).length, missionsFirstTry: missions.filter((mission) => mission.passed && mission.attempts === 1).length } };
}

function CandidateSetup({ onStart, onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(null);
  const [raw, setRaw] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { request('/data/candidates.json').then((data) => { setCandidates(data.candidates || []); if (data.candidates?.[0]) setForm(toForm(data.candidates[0])); }).catch((err) => setError(err.message)); }, []);
  function choose(id) { const candidate = candidates.find((entry) => entry.member.id === id); if (candidate) { setForm(toForm(candidate)); setRaw(''); setError(''); } }
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function updateMission(index, key, value) { setForm((current) => ({ ...current, missions: current.missions.map((mission, missionIndex) => missionIndex === index ? { ...mission, [key]: value } : mission) })); }
  async function start() { try { const selected = advanced ? JSON.parse(raw) : candidateFromForm(form); setLoading(true); setError(''); await onStart(selected); } catch (err) { setError(err.message || 'Review the candidate details and try again.'); setLoading(false); } }
  if (!form) return <main className="loading">Loading candidate records...</main>;
  return <main className="editor-shell"><header className="editor-header"><button type="button" className="back-button" onClick={onBack}>Back</button><span>Probe / candidate setup</span><a href="/classic">Classic</a></header><section className="editor-intro"><p className="kicker">Personalized setup</p><h1>Set the context before the questions start.</h1><p>Load a sample, then tune the details that should shape Dr. Probey&apos;s interview. Mission outcomes and retries are useful signals, not grades.</p></section><section className="candidate-picker" aria-label="Sample candidates"><strong>Start with a sample</strong>{candidates.map((candidate) => <button type="button" className={form.id === candidate.member.id ? 'selected' : ''} key={candidate.member.id} onClick={() => choose(candidate.member.id)}>{candidate.member.name}<small>{candidate.member.jobRole}</small></button>)}</section><section className="editor-card"><div className="editor-card-head"><div><p className="kicker">Candidate details</p><h2>Interview context</h2></div><button type="button" className="advanced-toggle" onClick={() => setAdvanced((value) => !value)}>{advanced ? 'Use guided editor' : 'Use JSON instead'}</button></div>{advanced ? <label htmlFor="candidate-json">Candidate JSON<textarea id="candidate-json" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="Paste a complete candidate object" spellCheck="false" /></label> : <><div className="detail-grid"><label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label>Job role<input value={form.jobRole} onChange={(event) => update('jobRole', event.target.value)} /></label><label>Years experience<input type="number" min="0" max="80" step=".5" value={form.yearsExperience} onChange={(event) => update('yearsExperience', event.target.value)} /></label><label>Education<input value={form.education} onChange={(event) => update('education', event.target.value)} /></label><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>COMPLETED</option><option>IN PROGRESS</option></select></label></div><section className="mission-editor"><div><h3>Missions</h3><p>Record the learning work that should inform this interview.</p></div>{form.missions.map((mission, index) => <div className="mission-row" key={`${index}-${mission.title}`}><label>Day<input type="number" min="1" value={mission.day} onChange={(event) => updateMission(index, 'day', event.target.value)} /></label><label>Title<input value={mission.title} onChange={(event) => updateMission(index, 'title', event.target.value)} /></label><label>Outcome<select value={mission.outcome} onChange={(event) => updateMission(index, 'outcome', event.target.value)}><option value="passed">Passed</option><option value="not-passed">Not passed</option><option value="skipped">Skipped</option></select></label><label>Attempts<input type="number" min="1" disabled={mission.outcome === 'skipped'} value={mission.attempts} onChange={(event) => updateMission(index, 'attempts', event.target.value)} /></label><button type="button" className="remove-mission" onClick={() => setForm((current) => ({ ...current, missions: current.missions.filter((_, missionIndex) => missionIndex !== index) }))} disabled={form.missions.length === 1}>Remove</button></div>)}<button type="button" className="add-mission" onClick={() => setForm((current) => ({ ...current, missions: [...current.missions, emptyMission()] }))}>Add mission</button></section></>}<button className="enter-room" type="button" disabled={loading} onClick={start}>{loading ? 'Building interview...' : 'Start interview'}</button><p className="editor-error" role="alert">{error}</p></section></main>;
}

function Feedback({ feedback, approach, onClose }) {
  return <div className="feedback-overlay" role="presentation" onClick={onClose}><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={(event) => event.stopPropagation()}><header><p className="kicker">Interview complete</p><h2 id="feedback-title">Session feedback</h2><button className="modal-close" type="button" onClick={onClose}>Close</button></header><div className="feedback-body"><p className="feedback-summary">{feedback.summary}</p>{approach.length > 0 && <section className="probey-approach"><h3>Dr. Probey&apos;s approach</h3><ul>{approach.map((item) => <li key={item}>{item}</li>)}</ul></section>}{[['Strengths', feedback.strengths], ['Gaps', feedback.gaps], ['Next steps', feedback.next]].map(([label, items]) => <section key={label}><h3>{label}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div></section></div>;
}

function Trace({ trace }) {
  const [open, setOpen] = useState(null);
  return <aside className="orchestration"><header><p className="kicker">Live graph</p><h2>Reasoning trail</h2><span>{trace.length} agents this turn</span></header><div className="agent-rail">{agentNames.map((agent) => { const entry = trace.find((item) => item.agent === agent); return <section className={`agent-row ${entry ? 'complete' : 'idle'}`} key={agent}><button type="button" disabled={!entry} onClick={() => setOpen(open === agent ? null : agent)}><span className="agent-dot" /><strong>{agent === 'Interviewer' ? 'Dr. Probey' : agent}</strong><small>{entry ? 'view' : 'idle'}</small></button>{open === agent && <pre className="trace-inline">{JSON.stringify(entry.output, null, 2)}</pre>}</section>; })}</div></aside>;
}

function InterviewStage({ candidate, response, transcript, trace, busy, generating, onGenerate, onSend, onCloseFeedback }) {
  const [draft, setDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const approach = response.trace?.find((entry) => entry.agent === 'Evaluator')?.output?.approach || [];
  useEffect(() => { if (response.done && response.feedback) setFeedbackOpen(true); }, [response]);
  async function generate(style) { const answer = await onGenerate(style); setDraft(answer); }
  async function submit(event) { event.preventDefault(); if (!draft.trim()) return; const answer = draft.trim(); setDraft(''); await onSend(answer); }
  return <main className="scene-app"><header className="app-header"><a href="/classic">Classic</a><span>Probe / live practice</span><strong>{candidate.member.name}</strong></header><div className="app-shell"><section className="scene-pane"><section className="interviewer-panel"><div className="turn-speech"><Markdown>{response.reply}</Markdown></div></section><section className="scene-frame" aria-label="Interview room"><div className="scene-camera"><img className="scene-backdrop" src={asset('interview-room.png')} alt="" /><div className="speaker interviewer-speaker is-active"><img className="scene-character interviewer-character" src={asset(busy ? 'interviewer-thinking.png' : 'interviewer-speaking.png')} alt="Dr. Probey" /></div><div className="speaker candidate-speaker"><img className="scene-character candidate-character" src={asset('candidate-idle.png')} alt={candidate.member.name} /></div></div></section><form className="candidate-panel" onSubmit={submit}><p className="turn-label">{candidate.member.name}</p><section className="composer-slot"><span>{response.done ? 'Interview complete' : 'Compose your response'}</span><textarea name="candidate-response" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write or edit a response" disabled={busy || response.done} /></section><div className="style-rail">{responseStyles.map(([style, label]) => <button type="button" key={style} onClick={() => generate(style)} disabled={busy || response.done}>{generating === style ? 'Generating...' : label}</button>)}</div><button className="primary-action" disabled={busy || response.done || !draft.trim()}>{response.done ? 'Interview complete' : busy ? 'Dr. Probey is thinking...' : 'Send answer'}</button></form></section><Trace trace={trace} /></div>{feedbackOpen && <Feedback feedback={response.feedback} approach={approach} onClose={() => { setFeedbackOpen(false); onCloseFeedback(); }} />}</main>;
}

function App() {
  const [auth, setAuth] = useState('checking');
  const [screen, setScreen] = useState('home');
  const [candidate, setCandidate] = useState(null);
  const [response, setResponse] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [trace, setTrace] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { request('/api/session').then(() => setAuth('yes')).catch(() => setAuth('no')); }, []);
  async function start(selected) { const id = crypto.randomUUID(); setBusy(true); try { const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, candidate: selected }) }); setCandidate(selected); setSessionId(id); setResponse(next); setTranscript([{ speaker: 'Dr. Probey', message: next.reply }]); setTrace(next.trace || []); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function generate(style) { setGenerating(style); setBusy(true); try { return (await request('/api/simulate-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: response.reply, candidate, style }) })).answer; } catch (err) { setError(err.message); return ''; } finally { setBusy(false); setGenerating(''); } }
  async function send(message) { setBusy(true); setTranscript((current) => [...current, { speaker: candidate.member.name, message }]); try { const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, message }) }); setResponse(next); setTrace(next.trace || []); setTranscript((current) => [...current, { speaker: 'Dr. Probey', message: next.reply }]); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  if (auth === 'checking') return <main className="loading">Opening interview room...</main>;
  if (auth === 'no') return <Login onAuthenticated={() => setAuth('yes')} />;
  if (!response && screen === 'home') return <Home onStart={() => setScreen('setup')} />;
  if (!response) return <><CandidateSetup onStart={start} onBack={() => setScreen('home')} />{error && <p className="toast" role="alert">{error}</p>}</>;
  return <><InterviewStage candidate={candidate} response={response} transcript={transcript} trace={trace} busy={busy} generating={generating} onGenerate={generate} onSend={send} onCloseFeedback={() => {}} />{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
