import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
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

function MarkdownContent({ children }) {
  return <div className="markdown-content"><ReactMarkdown>{children}</ReactMarkdown></div>;
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

function TranscriptPanel({ transcript }) {
  return <section className="transcript-panel" aria-label="Interview transcript"><header><h3>Transcript</h3><span>{transcript.length} turns</span></header><div className="transcript-log">{transcript.map((turn, index) => <div className={`transcript-message ${turn.speaker === 'Interviewer' ? 'from-interviewer' : 'from-candidate'}`} key={`${turn.speaker}-${index}`}><strong>{turn.speaker}</strong><p>{turn.message}</p></div>)}</div></section>;
}

function TraceSidebar({ trace, activeAgents, generationStatus, transcript }) {
  const [expanded, setExpanded] = useState(null);
  const entries = Object.fromEntries((trace || []).map((entry) => [entry.agent, entry]));
  return <aside className="orchestration"><header><p className="kicker">Live graph</p><h2>Reasoning trail</h2><span>{trace?.length || 0} agents this turn</span></header><div className="agent-rail">{agents.map((agent) => {
    const entry = entries[agent];
    const isGenerator = agent === 'Answer Generator';
    const active = activeAgents.includes(agent) || (isGenerator && generationStatus === 'active');
    const complete = Boolean(entry) || (isGenerator && generationStatus === 'complete');
    return <section className={`agent-row ${complete ? 'complete' : ''} ${active ? 'active' : ''}`} key={agent}><button onClick={() => entry && setExpanded(expanded === agent ? null : agent)} disabled={!entry}><span className="agent-dot" /><strong>{agent}</strong><small>{active ? 'working' : complete ? 'complete' : 'idle'}</small></button>{entry && expanded === agent && <pre>{JSON.stringify(entry.output, null, 2)}</pre>}</section>;
  })}</div><TranscriptPanel transcript={transcript} /></aside>;
}

function FeedbackModal({ feedback, onClose }) {
  return <div className="feedback-overlay" role="presentation"><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><button className="modal-close" type="button" aria-label="Close feedback" onClick={onClose}>Close</button><p className="kicker">Interview complete</p><h2 id="feedback-title">Session feedback</h2><p className="feedback-summary">{feedback.summary}</p><section><h3>Strengths</h3><ul>{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Gaps</h3><ul>{feedback.gaps.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Next steps</h3><ul>{(feedback.next || []).map((item) => <li key={item}>{item}</li>)}</ul></section></section></div>;
}

function InterviewStage({ candidate, response, phase, pending, busy, activeAgents, generationStatus, transcript, onGenerate, onSend, onNext, onInterviewerReady, onAdvanceToCandidate }) {
  const [typedReply, setTypedReply] = useState('');
  const [draft, setDraft] = useState('');
  const [candidateSpeech, setCandidateSpeech] = useState('');
  const [candidateText, setCandidateText] = useState('');
  const [candidateTyping, setCandidateTyping] = useState(false);
  const [pose, setPose] = useState('idle');
  const [isTyping, setIsTyping] = useState(true);
  const [focusedSpeaker, setFocusedSpeaker] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
      cursor += 3;
      setCandidateSpeech(candidateText.slice(0, cursor));
      if (cursor >= candidateText.length) {
        window.clearInterval(timer);
        setCandidateTyping(false);
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [candidateText]);

  useEffect(() => {
    if (response.done && response.feedback) setFeedbackOpen(true);
  }, [response.done, response.feedback]);

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
  const toggleFocus = (speaker) => setFocusedSpeaker((current) => current === speaker ? null : speaker);
  const handleBubbleKeyDown = (event, speaker) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFocus(speaker);
    }
  };

  const candidateImage = candidateTyping ? 'candidate-speaking.png' : busy && phase === 'candidate' ? 'candidate-thinking.png' : pose === 'confident' ? 'candidate-confident.png' : pose === 'unsure' ? 'candidate-nervous.png' : pose === 'vague' ? 'candidate-vague.png' : 'candidate-idle.png';
  const interviewerImage = isTyping ? 'interviewer-speaking.png' : 'interviewer-idle.png';
  const canRespond = phase === 'candidate' && !isTyping && !response.done;
  const interviewerActive = phase === 'interviewer' || phase === 'interviewer-ready';
  const cameraFocus = focusedSpeaker || (interviewerActive ? 'interviewer' : 'candidate');
  const candidateCopy = candidateSpeech || (canRespond ? 'Choose a response style or write your own answer.' : 'Waiting for your turn...');
  const candidateTurn = canRespond ? <label className="candidate-composer"><span>Compose your response</span><small>Generate a starting point or write directly here, then send when ready.</small><textarea name="candidate-response" value={draft} onFocus={() => setFocusedSpeaker('candidate')} onChange={(event) => { setDraft(event.target.value); setCandidateSpeech(event.target.value); setPose('idle'); }} placeholder="Write or edit the generated answer" disabled={busy} /></label> : <div className="turn-speech" role="button" tabIndex="0" aria-pressed={cameraFocus === 'candidate'} onClick={() => toggleFocus('candidate')} onKeyDown={(event) => handleBubbleKeyDown(event, 'candidate')}><MarkdownContent>{candidateCopy}</MarkdownContent></div>;

  return <main className="scene-app"><header className="app-header"><a href="/classic">Classic</a><span>Probe / live practice</span><strong>{candidate.member.name}</strong></header><div className="app-shell"><section className="scene-pane"><section className={`turn-panel interviewer-panel ${cameraFocus === 'interviewer' ? 'is-focused' : 'is-receded'}`}><p className="turn-label">Interviewer</p><div className="turn-speech" role="button" tabIndex="0" aria-pressed={cameraFocus === 'interviewer'} onClick={() => toggleFocus('interviewer')} onKeyDown={(event) => handleBubbleKeyDown(event, 'interviewer')}><MarkdownContent>{typedReply || '...'}</MarkdownContent></div></section><section className="scene-frame" aria-label="Interview room"><div className={`scene-camera camera-${cameraFocus}`}><img className="scene-backdrop" src={asset('interview-room.png')} alt="" /><div className={`speaker interviewer-speaker ${interviewerActive ? 'is-active' : 'is-idle'}`}><img className="scene-character interviewer-character" src={asset(interviewerImage)} alt="Interviewer" /></div><div className={`speaker candidate-speaker ${interviewerActive ? 'is-idle' : 'is-active'}`}><img className="scene-character candidate-character" src={asset(candidateImage)} alt="Candidate" /></div></div></section><section className={`turn-panel candidate-panel ${cameraFocus === 'candidate' ? 'is-focused' : 'is-receded'}`}><p className="turn-label">{candidate.member.name}</p>{candidateTurn}{phase === 'interviewer-ready' && <section className="interviewer-dock"><span>Read the question, then move to the candidate response.</span><button onClick={onAdvanceToCandidate}>Next: prepare your answer</button></section>}{canRespond && <section className="response-dock"><div className="dock-heading"><p>Response style</p><span>Generate a starting point, then edit it in the composer above.</span></div><div className="style-grid">{responseStyles.map(([style, label, description]) => <div className="style-action" key={style}><button type="button" className={pose === style ? 'selected' : ''} onClick={() => generate(style)} disabled={busy}>{label}</button><small>{description}</small></div>)}</div><button className="send-answer" disabled={busy || !draft.trim()} onClick={send}>Send answer</button></section>}{phase === 'candidate-complete' && <section className="next-dock"><p>Answer sent. Review the candidate response before continuing.</p><button onClick={advanceToInterviewer} disabled={!pending}>Next: hear the interviewer</button></section>}</section></section><TraceSidebar trace={pending?.trace || response.trace} activeAgents={activeAgents} generationStatus={generationStatus} transcript={transcript} /></div>{feedbackOpen && response.feedback && <FeedbackModal feedback={response.feedback} onClose={() => setFeedbackOpen(false)} />}</main>;
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
  const [transcript, setTranscript] = useState([]);
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
      setTranscript([{ speaker: 'Interviewer', message: next.reply }]);
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
    setTranscript((current) => [...current, { speaker: candidate.member.name, message: answer }]);
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
    setTranscript((current) => [...current, { speaker: 'Interviewer', message: pending.reply }]);
    setResponse(pending);
    setPending(null);
    setPhase('interviewer');
  };
  if (auth === 'checking') return <main className="loading">Opening interview room...</main>;
  if (auth === 'no') return <Login onAuthenticated={() => setAuth('yes')} />;
  if (!response) return <CandidateSetup onStart={start} />;
  return <><InterviewStage candidate={candidate} response={response} pending={pending} phase={phase} busy={busy} activeAgents={activeAgents} generationStatus={generationStatus} transcript={transcript} onGenerate={generate} onSend={send} onNext={next} onInterviewerReady={() => setPhase((current) => current === 'interviewer' && !response.done ? 'interviewer-ready' : current)} onAdvanceToCandidate={() => setPhase('candidate')} />{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
