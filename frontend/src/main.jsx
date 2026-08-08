import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import './styles.css';

const asset = (name) => `/assets/${name}`;
const agents = ['Strengths Finder', 'Weaknesses Finder', 'Topic Planner', 'Interviewer', 'Answer Generator', 'Response Reviewer', 'Consistency Checker', 'Evaluator'];
const responseStyles = [
  ['confident', 'Confidently answer'],
  ['unsure', 'Act unsure'],
  ['vague', 'Give a vague answer'],
];
const displayAgent = (agent) => agent === 'Interviewer' ? 'Dr. Probey' : agent;

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ detail: 'Server returned an invalid response.' }));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
  return data;
}

function MarkdownContent({ children }) {
  return <div className="markdown-content"><ReactMarkdown>{children}</ReactMarkdown></div>;
}

function Login({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event) {
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
  }

  return <main className="gate"><section className="gate-card"><p className="kicker">Private practice room</p><h1>Probe Interview</h1><p>Enter the access password to begin a guided technical conversation.</p><form onSubmit={submit}><label htmlFor="password">Access password<input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label><button disabled={sending}>{sending ? 'Checking access...' : 'Enter the room'}</button><p className="error" role="alert">{error}</p></form></section></main>;
}

function CandidateSetup({ onStart }) {
  const [candidates, setCandidates] = useState([]);
  const [raw, setRaw] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    request('/data/candidates.json').then((data) => setCandidates(data.candidates || [])).catch((err) => setError(err.message));
  }, []);

  function choose(id) {
    const candidate = candidates.find((entry) => entry.member.id === id);
    if (!candidate) return;
    setSelectedId(id);
    setRaw(JSON.stringify(candidate, null, 2));
  }

  async function start() {
    try {
      const candidate = JSON.parse(raw);
      setLoading(true);
      await onStart(candidate);
    } catch (err) {
      setError(err.message || 'Enter valid candidate JSON.');
      setLoading(false);
    }
  }

  return <main className="setup-shell"><section className="setup-copy"><div className="setup-art"><img src={asset('interview-room.png')} alt="Bright interview room" /><img src={asset('interviewer-idle.png')} alt="" /><img src={asset('candidate-idle.png')} alt="" /></div><p className="kicker">Personalized technical practice</p><h1>Enter prepared.<br />Leave with proof.</h1><p>Probe turns a candidate&apos;s actual learning history into a live technical interview, then shows the reasoning behind every next question.</p><div className="process-strip"><article><strong>1. Read the record</strong><span>Strengths, retries, skips, and role context set the agenda.</span></article><article><strong>2. Practice live</strong><span>Read, respond, and choose how deeply to probe each topic.</span></article><article><strong>3. Review the evidence</strong><span>Follow the agent trail and leave with focused feedback.</span></article></div><a href="/classic">Open classic interface</a></section><section className="setup-card"><header><p className="kicker">Choose a profile</p><h2>Who is interviewing?</h2><span>Select a candidate to load their interview context.</span></header><div className="candidate-grid">{candidates.map((candidate) => <button type="button" className={`candidate-card ${selectedId === candidate.member.id ? 'selected' : ''}`} key={candidate.member.id} onClick={() => choose(candidate.member.id)}><strong>{candidate.member.name}</strong><span>{candidate.member.jobRole}</span><small>{candidate.member.yearsExperience} years · {candidate.signals.missionsCompleted} missions</small></button>)}</div><details className="candidate-data"><summary>Review or edit candidate data</summary><label htmlFor="candidate-json">Candidate JSON<textarea id="candidate-json" name="candidate-json" value={raw} onChange={(event) => { setRaw(event.target.value); setSelectedId(''); }} placeholder="Paste a complete candidate object" spellCheck="false" /></label></details><button className="enter-room" type="button" onClick={start} disabled={!raw || loading}>{loading ? 'Preparing interview...' : 'Enter interview room'}</button><p className="error" role="alert">{error}</p></section></main>;
}

function TranscriptPanel({ transcript }) {
  return <section className="transcript-panel" aria-label="Interview transcript"><header><h3>Transcript</h3><span>{transcript.length} turns</span></header><div className="transcript-log">{transcript.map((turn, index) => <div className={`transcript-message ${turn.speaker === 'Dr. Probey' ? 'from-interviewer' : 'from-candidate'}`} key={`${turn.speaker}-${index}`}><strong>{turn.speaker}</strong><p>{turn.message}</p></div>)}</div></section>;
}

function TraceModal({ entry, onClose }) {
  return <div className="feedback-overlay" role="presentation" onClick={onClose}><section className="trace-modal" role="dialog" aria-modal="true" aria-labelledby="trace-title" onClick={(event) => event.stopPropagation()}><header><p className="kicker">Live graph output</p><h2 id="trace-title">{displayAgent(entry.agent)}</h2><button className="modal-close" type="button" aria-label="Close agent output" onClick={onClose}>Close</button></header><pre>{JSON.stringify(entry.output, null, 2)}</pre></section></div>;
}

function TraceSidebar({ trace, history, activeAgents, generationStatus, generationOutput, transcript }) {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const currentEntries = Object.fromEntries((trace || []).map((entry) => [entry.agent, entry]));
  const generatedEntry = generationOutput ? { agent: 'Answer Generator', output: { answer: generationOutput } } : null;

  return <aside className="orchestration"><header><p className="kicker">Live graph</p><h2>Reasoning trail</h2><span>{trace?.length || 0} agents this turn</span></header><div className="agent-rail">{agents.map((agent) => {
    const isGenerator = agent === 'Answer Generator';
    const currentEntry = currentEntries[agent];
    const entry = currentEntry || history[agent] || (isGenerator ? generatedEntry : null);
    const active = activeAgents.includes(agent) || (isGenerator && generationStatus === 'active');
    const complete = Boolean(currentEntry) || (isGenerator && generationStatus === 'complete');
    const state = active ? 'working' : complete ? 'complete' : entry ? 'available' : 'idle';
    return <section className={`agent-row ${state}`} key={agent}><button type="button" onClick={() => entry && setSelectedEntry(entry)} disabled={!entry}><span className="agent-dot" /><strong>{displayAgent(agent)}</strong><small>{state}</small></button></section>;
  })}</div><TranscriptPanel transcript={transcript} />{selectedEntry && <TraceModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}</aside>;
}

function FeedbackModal({ feedback, onClose }) {
  return <div className="feedback-overlay" role="presentation" onClick={onClose}><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={(event) => event.stopPropagation()}><header><p className="kicker">Interview complete</p><h2 id="feedback-title">Session feedback</h2><button className="modal-close" type="button" aria-label="Close feedback" onClick={onClose}>Close</button></header><div className="feedback-body"><p className="feedback-summary">{feedback.summary}</p>{feedback.approach?.length > 0 && <section className="probey-approach"><h3>Dr. Probey&apos;s approach</h3><ul>{feedback.approach.map((item) => <li key={item}>{item}</li>)}</ul></section>}<section><h3>Strengths</h3><ul>{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Gaps</h3><ul>{feedback.gaps.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Next steps</h3><ul>{(feedback.next || []).map((item) => <li key={item}>{item}</li>)}</ul></section></div></section></div>;
}

function ProbeyMoment({ message, onDismiss }) {
  return <aside className="probey-moment" role="status"><strong>Dr. Probey</strong><span>{message}</span><button type="button" aria-label="Dismiss Dr. Probey moment" onClick={onDismiss}>Close</button></aside>;
}

function InterviewStage({ candidate, response, phase, pending, busy, activeAgents, generationStatus, transcript, traceHistory, generationOutput, onGenerate, onSend, onNext, onInterviewerReady, onAdvanceToCandidate }) {
  const [typedReply, setTypedReply] = useState('');
  const [draft, setDraft] = useState('');
  const [candidateSpeech, setCandidateSpeech] = useState('');
  const [candidateText, setCandidateText] = useState('');
  const [candidateTyping, setCandidateTyping] = useState(false);
  const [isCandidateEditing, setIsCandidateEditing] = useState(false);
  const [pose, setPose] = useState('idle');
  const [isTyping, setIsTyping] = useState(true);
  const [focusedSpeaker, setFocusedSpeaker] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const editingTimer = useRef(null);

  useEffect(() => {
    setTypedReply('');
    setIsTyping(true);
    setFocusedSpeaker(null);
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 2;
      setTypedReply(response.reply.slice(0, cursor));
      if (cursor >= response.reply.length) {
        window.clearInterval(timer);
        setIsTyping(false);
        onInterviewerReady();
      }
    }, 24);
    return () => window.clearInterval(timer);
  }, [response.reply]);

  useEffect(() => {
    if (!candidateText) return undefined;
    setCandidateSpeech('');
    setCandidateTyping(true);
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 2;
      setCandidateSpeech(candidateText.slice(0, cursor));
      if (cursor >= candidateText.length) {
        window.clearInterval(timer);
        setCandidateTyping(false);
      }
    }, 24);
    return () => window.clearInterval(timer);
  }, [candidateText]);

  useEffect(() => {
    if (response.done && response.feedback) setFeedbackOpen(true);
  }, [response.done, response.feedback]);

  useEffect(() => () => window.clearTimeout(editingTimer.current), []);

  const isCandidateTurn = phase === 'candidate' && !response.done;
  const hasPendingReply = phase === 'candidate-complete';
  const interviewerActive = phase === 'interviewer' || phase === 'interviewer-ready';
  const cameraFocus = focusedSpeaker || (interviewerActive ? 'interviewer' : 'candidate');
  const interviewerTrace = (response.trace || []).find((entry) => entry.agent === 'Interviewer')?.output;
  const questionIntent = interviewerTrace?.topic ? `${interviewerTrace.direction === 'probe' ? 'Probe for depth' : 'Establish a baseline'} on ${interviewerTrace.topic}.` : 'Clarify the candidate\'s reasoning before moving forward.';
  const candidateImage = generationStatus === 'active' || isCandidateEditing ? 'candidate-thinking.png' : candidateTyping ? 'candidate-speaking.png' : pose === 'confident' ? 'candidate-confident.png' : pose === 'unsure' ? 'candidate-nervous.png' : pose === 'vague' ? 'candidate-vague.png' : 'candidate-idle.png';
  const interviewerImage = isTyping ? 'interviewer-speaking.png' : busy && isCandidateTurn ? 'interviewer-thinking.png' : 'interviewer-idle.png';
  const candidateDisplay = candidateText ? candidateSpeech || '...' : 'Your sent answer will appear here.';
  const actionLabel = response.done ? 'Interview complete' : isCandidateTurn ? busy ? 'Preparing interviewer...' : 'Send answer' : hasPendingReply ? 'Next: hear the interviewer' : isTyping ? 'Interviewer is speaking...' : 'Next: prepare your answer';
  const actionDisabled = response.done || busy || (isCandidateTurn && !draft.trim()) || (!isCandidateTurn && !hasPendingReply && isTyping);

  async function generate(style) {
    setPose(style);
    const answer = await onGenerate(style);
    setDraft(answer);
  }

  async function send() {
    if (!draft.trim()) return;
    const answer = draft.trim();
    setIsCandidateEditing(false);
    setCandidateText(answer);
    await onSend(answer);
  }

  function advance() {
    if (hasPendingReply) {
      setPose('idle');
      setDraft('');
      setCandidateSpeech('');
      setCandidateText('');
      setCandidateTyping(false);
      onNext();
      return;
    }
    onAdvanceToCandidate();
  }

  function updateDraft(event) {
    setDraft(event.target.value);
    setPose('idle');
    setIsCandidateEditing(true);
    window.clearTimeout(editingTimer.current);
    editingTimer.current = window.setTimeout(() => setIsCandidateEditing(false), 700);
  }

  async function handleAction() {
    if (isCandidateTurn) await send();
    else if (!response.done && !isTyping) advance();
  }

  return <main className="scene-app"><header className="app-header"><a href="/classic">Classic</a><span>Probe / live practice</span><strong>{candidate.member.name}</strong></header><div className="app-shell"><section className="scene-pane"><section className={`turn-panel interviewer-panel ${cameraFocus === 'interviewer' ? 'is-focused' : 'is-receded'}`}><p className="turn-label">Interviewer</p><div className="turn-speech" role="button" tabIndex="0" aria-pressed={cameraFocus === 'interviewer'} onClick={() => setFocusedSpeaker('interviewer')}><MarkdownContent>{typedReply || '...'}</MarkdownContent></div></section><section className="scene-frame" aria-label="Interview room"><div className={`scene-camera camera-${cameraFocus}`}><img className="scene-backdrop" src={asset('interview-room.png')} alt="" /><div className="question-intent" key={`intent-${response.reply}`}><strong>Question intent</strong><span>{questionIntent}</span></div><div className={`speaker interviewer-speaker ${interviewerActive ? 'is-active' : 'is-idle'}`}><img className="scene-character interviewer-character" src={asset(interviewerImage)} alt="Interviewer" /></div><div className={`speaker candidate-speaker ${interviewerActive ? 'is-idle' : 'is-active'}`}><img className="scene-character candidate-character" src={asset(candidateImage)} alt="Candidate" /></div></div></section><section className={`candidate-panel ${cameraFocus === 'candidate' ? 'is-focused' : 'is-receded'}`}><p className="turn-label">{candidate.member.name}</p><section className={`composer-slot ${isCandidateTurn ? 'is-editable' : 'is-readonly'}`}><span>{isCandidateTurn ? 'Compose your response' : 'Candidate response'}</span>{isCandidateTurn ? <textarea name="candidate-response" value={draft} onFocus={() => setFocusedSpeaker('candidate')} onChange={updateDraft} placeholder="Write or edit the generated answer" disabled={busy} /> : <div className="sent-answer" aria-live="polite"><MarkdownContent>{candidateDisplay}</MarkdownContent></div>}</section><div className="style-rail" aria-label="Response style">{responseStyles.map(([style, label]) => <button type="button" key={style} className={pose === style ? 'selected' : ''} onClick={() => generate(style)} disabled={!isCandidateTurn || busy}>{label}</button>)}</div><button className="primary-action" type="button" onClick={handleAction} disabled={actionDisabled}>{actionLabel}</button></section></section><TraceSidebar trace={response.trace} history={traceHistory} activeAgents={activeAgents} generationStatus={generationStatus} generationOutput={generationOutput} transcript={transcript} /></div>{feedbackOpen && <FeedbackModal feedback={response.feedback} onClose={() => setFeedbackOpen(false)} />}</main>;
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
  const [generationOutput, setGenerationOutput] = useState('');
  const [traceHistory, setTraceHistory] = useState({});
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [dismissedMoment, setDismissedMoment] = useState('');

  useEffect(() => { request('/api/session').then(() => setAuth('yes')).catch(() => setAuth('no')); }, []);

  async function start(selected) {
    const id = crypto.randomUUID();
    setBusy(true);
    setGenerationStatus('idle');
    setGenerationOutput('');
    setActiveAgents(['Strengths Finder', 'Weaknesses Finder', 'Topic Planner', 'Interviewer']);
    try {
      const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, candidate: selected }) });
      setCandidate(selected);
      setSessionId(id);
      setResponse(next);
      setPhase('interviewer');
      setTranscript([{ speaker: 'Dr. Probey', message: next.reply }]);
      setTraceHistory(Object.fromEntries((next.trace || []).map((entry) => [entry.agent, entry])));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setActiveAgents([]);
    }
  }

  async function generate(style) {
    setBusy(true);
    setGenerationStatus('active');
    setError('');
    try {
      const result = await request('/api/simulate-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: response.reply, candidate, style }) });
      setGenerationStatus('complete');
      setGenerationOutput(result.answer);
      return result.answer;
    } catch (err) {
      setGenerationStatus('idle');
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function send(answer) {
    setBusy(true);
    setGenerationStatus('idle');
    setError('');
    setActiveAgents(['Response Reviewer', 'Consistency Checker', 'Interviewer']);
    setTranscript((current) => [...current, { speaker: candidate.member.name, message: answer }]);
    try {
      const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, message: answer }) });
      setPending(next);
      setTraceHistory((current) => ({ ...current, ...Object.fromEntries((next.trace || []).map((entry) => [entry.agent, entry])) }));
      const signal = next.trace?.find((entry) => entry.agent === 'Response Reviewer')?.output?.signal;
      setPhase('candidate-complete');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
      setActiveAgents([]);
    }
  }

  function next() {
    if (!pending) return;
    setTranscript((current) => [...current, { speaker: 'Dr. Probey', message: pending.reply }]);
    const approach = pending.trace?.find((entry) => entry.agent === 'Evaluator')?.output?.approach || [];
    setResponse({ ...pending, feedback: pending.feedback ? { ...pending.feedback, approach } : pending.feedback });
    setPending(null);
    setPhase('interviewer');
  }

  const pendingSignal = pending ? traceHistory['Response Reviewer']?.output?.signal : null;
  const pendingMoment = { probe: 'is digging deeper into that answer.', escalate: 'is raising the bar with a harder follow-up.', check_in: 'is checking in before changing direction.', advance: 'is moving to a new focus while the reasoning is still fresh.', simplify: 'is reframing the question from a different angle.' }[pendingSignal];
  const showMoment = phase === 'candidate-complete' && transcript.length % 4 === 2 && dismissedMoment !== pending?.reply;

  useEffect(() => {
    if (!showMoment) return undefined;
    const timer = window.setTimeout(() => setDismissedMoment(pending.reply), 8000);
    return () => window.clearTimeout(timer);
  }, [showMoment, pending]);

  if (auth === 'checking') return <main className="loading">Opening interview room...</main>;
  if (auth === 'no') return <Login onAuthenticated={() => setAuth('yes')} />;
  if (!response) return <CandidateSetup onStart={start} />;
  return <><InterviewStage candidate={candidate} response={response} pending={pending} phase={phase} busy={busy} activeAgents={activeAgents} generationStatus={generationStatus} transcript={transcript} traceHistory={traceHistory} generationOutput={generationOutput} onGenerate={generate} onSend={send} onNext={next} onInterviewerReady={() => setPhase((current) => current === 'interviewer' && !response.done ? 'interviewer-ready' : current)} onAdvanceToCandidate={() => setPhase('candidate')} />{showMoment && <ProbeyMoment message={pendingMoment || 'is weighing the next turn.'} onDismiss={() => setDismissedMoment(pending.reply)} />}{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
