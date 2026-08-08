import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const asset = (name) => `/assets/${name}`;
const agents = ['Strengths Finder', 'Weaknesses Finder', 'Topic Planner', 'Interviewer', 'Answer Generator', 'Response Reviewer', 'Consistency Checker', 'Evaluator'];
const responseStyles = [
  ['confident', 'Confidently answer', 'Generates a strong, self-assured response you can edit before sending.'],
  ['unsure', 'Act unsure', 'Generates an honest answer that shows your reasoning under uncertainty.'],
  ['vague', 'Give a vague answer', 'Generates a deliberately broad answer so you can test the follow-up.'],
];

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
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await request('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return <main className="gate"><section className="gate-card"><p className="kicker">Private practice room</p><h1>Probe Interview</h1><p>Enter the access password to begin a guided technical conversation.</p><form onSubmit={submit}><label htmlFor="password">Access password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /><button disabled={sending}>{sending ? 'Checking access...' : 'Enter the room'}</button><p className="error" role="alert">{error}</p></form></section></main>;
}

function CandidateSetup({ onStart }) {
  const [candidates, setCandidates] = useState([]);
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { request('/data/candidates.json').then((data) => setCandidates(data.candidates || [])).catch((err) => setError(err.message)); }, []);

  const choose = (id) => {
    const candidate = candidates.find((entry) => entry.member.id === id);
    if (candidate) setRaw(JSON.stringify(candidate, null, 2));
  };

  const start = async () => {
    try {
      const candidate = JSON.parse(raw);
      setLoading(true);
      await onStart(candidate);
    } catch (err) {
      setError(err.message || 'Enter valid candidate JSON.');
      setLoading(false);
    }
  };

  return <main className="setup-shell"><section className="setup-copy"><p className="kicker">A scene, not a script</p><h1>Set the room.</h1><p>Load a candidate history, then let the conversation reveal where their reasoning holds up.</p><a href="/classic">Open classic interface</a></section><section className="setup-card"><label>Load a sample<select defaultValue="" onChange={(event) => choose(event.target.value)}><option value="">Choose a candidate</option>{candidates.map((candidate) => <option key={candidate.member.id} value={candidate.member.id}>{candidate.member.name} · {candidate.member.jobRole}</option>)}</select></label><label>Candidate JSON<textarea value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="Paste a complete candidate object" spellCheck="false" /></label><button onClick={start} disabled={loading}>{loading ? 'Preparing interview...' : 'Enter interview room'}</button><p className="error">{error}</p></section></main>;
}

function TraceSidebar({ trace, activeAgents, generationStatus }) {
  const [expanded, setExpanded] = useState(null);
  const entries = Object.fromEntries((trace || []).map((entry) => [entry.agent, entry]));

  return <aside className="orchestration"><header><p className="kicker">Live graph</p><h2>Reasoning trail</h2><span>{trace?.length || 0} agents this turn</span></header><div className="agent-rail">{agents.map((agent) => {
    const entry = entries[agent];
    const isGenerator = agent === 'Answer Generator';
    const active = activeAgents.includes(agent) || (isGenerator && generationStatus === 'active');
    const complete = Boolean(entry) || (isGenerator && generationStatus === 'complete');
    return <section className={`agent-row ${complete ? 'complete' : ''} ${active ? 'active' : ''}`} key={agent}><button onClick={() => entry && setExpanded(expanded === agent ? null : agent)} disabled={!entry}><span className="agent-dot" /><strong>{agent}</strong><small>{active ? 'working' : complete ? 'complete' : 'idle'}</small></button>{entry && expanded === agent && <pre>{JSON.stringify(entry.output, null, 2)}</pre>}</section>;
  })}</div></aside>;
}

function InterviewStage({ candidate, response, phase, pending, busy, activeAgents, generationStatus, onGenerate, onSend, onNext, onInterviewerReady, onAdvanceToCandidate }) {
  const [typedReply, setTypedReply] = useState('');
  const [draft, setDraft] = useState('');
  const [candidateSpeech, setCandidateSpeech] = useState('');
  const [candidateText, setCandidateText] = useState('');
  const [candidateTyping, setCandidateTyping] = useState(false);
  const [pose, setPose] = useState('idle');
  const [isTyping, setIsTyping] = useState(true);
  const [focusedSpeaker, setFocusedSpeaker] = useState(null);

  useEffect(() => {
    setTypedReply('');
    setIsTyping(true);
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 3;
      setTypedReply(response.reply.slice(0, cursor));
      if (cursor >= response.reply.length) {
        window.clearInterval(timer);
        setIsTyping(false);
        onInterviewerReady();
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [response.reply]);

  useEffect(() => {
    if (!candidateText) return undefined;
    setCandidateSpeech('');
    setCandidateTyping(true);
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 3;
      setCandidateSpeech(candidateText.slice(0, cursor));
      if (cursor >= candidateText.length) {
        window.clearInterval(timer);
        setCandidateTyping(false);
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [candidateText]);

  const generate = async (style) => {
    setPose(style);
    const answer = await onGenerate(style);
    setDraft(answer);
    setCandidateSpeech(answer);
  };
  const send = async () => {
    if (!draft.trim()) return;
    const answer = draft.trim();
    setCandidateText(answer);
    await onSend(answer);
  };
  const advanceToInterviewer = () => {
    setPose('idle');
    setCandidateText('');
    setCandidateTyping(false);
    onNext();
  };

  const candidateImage = candidateTyping ? 'candidate-speaking.png' : busy && phase === 'candidate' ? 'candidate-thinking.png' : pose === 'confident' ? 'candidate-confident.png' : pose === 'unsure' ? 'candidate-nervous.png' : pose === 'vague' ? 'candidate-vague.png' : 'candidate-idle.png';
  const interviewerImage = isTyping ? 'interviewer-speaking.png' : 'interviewer-idle.png';
  const canRespond = phase === 'candidate' && !isTyping && !response.done;
  const interviewerActive = phase === 'interviewer' || phase === 'interviewer-ready';
  const interviewerFocused = focusedSpeaker ? focusedSpeaker === 'interviewer' : interviewerActive;
  const candidateFocused = focusedSpeaker ? focusedSpeaker === 'candidate' : !interviewerActive;

  return <main className="scene-app"><header className="app-header"><a href="/classic">Classic</a><span>Probe / live practice</span><strong>{candidate.member.name}</strong></header><div className="app-shell"><section className="scene-pane"><section className={`interview-scene ${interviewerActive ? 'interviewer-turn' : 'candidate-turn'}`}><img className="scene-backdrop" src={asset('interview-room.png')} alt="" /><div className="scene-wash" /><section className={`speaker interviewer-speaker ${interviewerActive ? 'is-active' : 'is-idle'}`}><button type="button" className={`speech-bubble interviewer-bubble ${interviewerFocused ? 'is-focused' : 'is-receded'}`} onClick={() => setFocusedSpeaker((current) => current === 'interviewer' ? null : 'interviewer')}><span>Interviewer</span><p>{typedReply || '...'}</p></button><img className="scene-character interviewer-character" src={asset(interviewerImage)} alt="Interviewer" /></section><section className={`speaker candidate-speaker ${interviewerActive ? 'is-idle' : 'is-active'}`}><button type="button" className={`speech-bubble candidate-bubble ${candidateFocused ? 'is-focused' : 'is-receded'}`} onClick={() => setFocusedSpeaker((current) => current === 'candidate' ? null : 'candidate')}><span>{candidate.member.name}</span><p>{candidateSpeech || (canRespond ? 'Choose a response style or write your own answer.' : 'Waiting for your turn...')}</p></button><img className="scene-character candidate-character" src={asset(candidateImage)} alt="Candidate" /></section></section>{phase === 'interviewer-ready' && <section className="interviewer-dock"><p>Interviewer turn complete</p><span>Read the question, then move to the candidate response.</span><button onClick={onAdvanceToCandidate}>Next: prepare your answer</button></section>}{canRespond && <section className="response-dock"><div className="dock-heading"><p>Candidate response</p><span>Generate a starting point, then make it your own.</span></div><div className="style-grid">{responseStyles.map(([style, label, description]) => <div className="style-action" key={style}><button className={pose === style ? 'selected' : ''} onClick={() => generate(style)} disabled={busy}>{label}</button><small>{description}</small></div>)}</div><label><span>Custom response</span><small className="field-description">Write your own response or edit a generated one before sending.</small><textarea value={draft} onChange={(event) => { setDraft(event.target.value); setCandidateSpeech(event.target.value); setPose('idle'); }} placeholder="Write or edit the generated answer" disabled={busy} /></label><button className="send-answer" disabled={busy || !draft.trim()} onClick={send}>Send answer</button></section>}{phase === 'candidate-complete' && <section className="next-dock"><p>Answer sent. Review the candidate response before continuing.</p><button onClick={advanceToInterviewer} disabled={!pending}>Next: hear the interviewer</button></section>}</section><TraceSidebar trace={pending?.trace || response.trace} activeAgents={activeAgents} generationStatus={generationStatus} /></div>{response.done && <section className="feedback"><h2>Session notes</h2><p>{response.feedback.summary}</p><div><h3>Strengths</h3><ul>{response.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Gaps</h3><ul>{response.feedback.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div></section>}</main>;
}

function App() {
  const [auth, setAuth] = useState('checking');
  const [candidate, setCandidate] = useState(null);
  const [response, setResponse] = useState(null);
  const [pending, setPending] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState('interviewer');
  const [busy, setBusy] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [generationStatus, setGenerationStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => { request('/api/session').then(() => setAuth('yes')).catch(() => setAuth('no')); }, []);

  const start = async (selected) => {
    const id = crypto.randomUUID();
    setBusy(true);
    setGenerationStatus('idle');
    setActiveAgents(['Strengths Finder', 'Weaknesses Finder', 'Topic Planner', 'Interviewer']);
    try {
      const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, candidate: selected }) });
      setCandidate(selected);
      setSessionId(id);
      setResponse(next);
      setPhase('interviewer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setActiveAgents([]);
    }
  };

  const generate = async (style) => {
    setBusy(true);
    setGenerationStatus('active');
    setError('');
    try {
      const result = await request('/api/simulate-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: response.reply, candidate, style }) });
      setGenerationStatus('complete');
      return result.answer;
    } catch (err) {
      setGenerationStatus('idle');
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const send = async (answer) => {
    setBusy(true);
    setGenerationStatus('idle');
    setError('');
    setActiveAgents(['Response Reviewer', 'Consistency Checker', 'Interviewer']);
    try {
      const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, message: answer }) });
      setPending(next);
      setPhase('candidate-complete');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
      setActiveAgents([]);
    }
  };

  const next = () => {
    if (!pending) return;
    setResponse(pending);
    setPending(null);
    setPhase('interviewer');
  };

  if (auth === 'checking') return <main className="loading">Opening interview room...</main>;
  if (auth === 'no') return <Login onAuthenticated={() => setAuth('yes')} />;
  if (!response) return <CandidateSetup onStart={start} />;
  return <><InterviewStage candidate={candidate} response={response} pending={pending} phase={phase} busy={busy} activeAgents={activeAgents} generationStatus={generationStatus} onGenerate={generate} onSend={send} onNext={next} onInterviewerReady={() => setPhase((current) => current === 'interviewer' ? 'interviewer-ready' : current)} onAdvanceToCandidate={() => setPhase('candidate')} />{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
