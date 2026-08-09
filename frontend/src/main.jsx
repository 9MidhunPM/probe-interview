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

function Home({ onStart }) {
  const features = [
    ['Personalized plan', 'Topic planning begins with actual mission history, retries, skips, role, and experience.'],
    ['Adaptive difficulty', 'Stay with a topic long enough to show the reasoning, then raise or lower the bar deliberately.'],
    ['One useful probe', 'A vague answer earns one targeted follow-up before the conversation moves on.'],
    ['Consistency checks', 'Cross-turn details are compared so a contradiction can become a useful question.'],
    ['Reasoning trail', 'The live sidebar makes every specialist contribution inspectable as the interview unfolds.'],
    ['Practice styles', 'Generate confident, unsure, or vague responses to explore how a turn changes before you write your own.'],
  ];
  const pipeline = [
    ['Strengths Finder', 'Finds evidence worth building on in the learning record.'],
    ['Weaknesses Finder', 'Finds gaps, retries, and skipped work that deserve careful attention.'],
    ['Topic Planner', 'Turns those signals into a short, role-aware interview plan.'],
    ['Interviewer', 'Dr. Probey conducts the conversation, one useful question at a time.'],
    ['Response Reviewer', 'Reads each answer to decide whether to probe, advance, simplify, or raise the difficulty.'],
    ['Consistency Checker', 'Keeps an eye on claims across turns and surfaces meaningful conflicts.'],
    ['Evaluator', 'Builds the final strengths, gaps, next steps, and approach recap.'],
  ];
  return <main className="home-shell"><section className="home-hero"><div className="probey-portrait"><img src={asset('interviewer-idle.png')} alt="Dr. Probey, the amber interview guide with round glasses and a navy tie" /></div><div><p className="kicker">Probe Interview</p><h1>Practice the conversation, not a script.</h1><p className="home-lede">Probe is a private technical interview practice room. Bring a candidate&apos;s learning record, have a candid live conversation, and leave with evidence you can use.</p><button type="button" className="home-start" onClick={onStart}>Start setup</button><a href="/classic">Prefer plain chat? Open classic.</a></div></section><section className="landing-section why-section"><div><p className="kicker">Why this exists</p><h2>Technical interviews should test how you think when the script runs out.</h2></div><p>Most interview preparation is either a stack of memorized questions or nothing at all. Probe practices the middle ground: genuine reasoning under real follow-up pressure, grounded in a candidate&apos;s own learning history instead of generic trivia.</p></section><section className="landing-section flow-section"><header><p className="kicker">How it works</p><h2>A practice room that follows the evidence.</h2></header><div className="home-flow" aria-label="How Probe works"><article><span>01</span><h3>Personalized setup</h3><p>Choose a sample or enter the candidate&apos;s role, experience, education, and mission history. Retries and skips help shape a focused starting agenda.</p></article><article><span>02</span><h3>Adaptive conversation</h3><p>Dr. Probey starts with a relevant topic, listens to the answer, and chooses one meaningful next question rather than following a canned list.</p></article><article><span>03</span><h3>Feedback</h3><p>Finish with strengths, gaps, next steps, and an approach recap that explains how the conversation was shaped.</p></article></div></section><section className="landing-section probey-section"><div className="probey-profile"><img src={asset('interviewer-thinking.png')} alt="Dr. Probey considering the next question" /></div><div><p className="kicker">Meet Dr. Probey</p><h2>Friendly face. Serious follow-up.</h2><p>Dr. Probey is the openly AI-powered guide for this practice room. He brings playful curiosity, dry wit when it helps, and direct questions when an answer needs more shape. A sharp detail might earn a brief, theatrical "Ooh, let's sit with that for a second," then he reins it back in and gets useful.</p><p>He is comfortable leaving space when an answer is vague instead of filling it with encouragement. That warmth is a layer over real rigor: no fake biography, no hand-holding, and no charm standing in for a demanding technical conversation.</p></div></section><section className="landing-section features-section"><header><p className="kicker">Features</p><h2>Built for useful practice, not just a polished chat.</h2></header><div className="feature-grid">{features.map(([title, description], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section><section className="landing-section technical-section"><header><p className="kicker">Under the hood</p><h2>More than a chatbot, by design.</h2><p>FastAPI serves the application while LangGraph orchestrates the multi-agent flow. Groq handles the fast specialist passes; OpenAI powers Dr. Probey&apos;s conversation and final evaluation.</p></header><div className="pipeline-grid">{pipeline.map(([name, description], index) => <article key={name}><span>{index + 1}</span><div><h3>{name}</h3><p>{description}</p></div></article>)}</div></section><section className="probey-quote"><img src={asset('interviewer-speaking.png')} alt="Dr. Probey speaking" /><blockquote>&quot;Ooh, let&apos;s sit with that for a second. What would make you choose that path?&quot;</blockquote><p>Curious enough to keep digging. Direct enough to make the answer useful.</p></section><section className="landing-section final-cta"><p className="kicker">Ready when you are</p><h2>Bring the record. Practice the reasoning.</h2><p>Start with a sample candidate or shape the context yourself.</p><button type="button" className="home-start" onClick={onStart}>Start setup</button><a href="/classic">Open the plain-chat classic interface</a></section></main>;
}

function ModeChoice({ onScene, onClassic, onBack }) {
  return <main className="mode-shell"><header className="mode-header"><button type="button" className="back-button" onClick={onBack}>Back</button><span>Probe / choose a mode</span></header><section className="mode-intro"><p className="kicker">Two ways to practice</p><h1>Scene mode or classic chat?</h1><p>Both modes run the same seven-agent engine with the same Dr. Probey reasoning. Pick how you want the conversation to feel.</p></section><div className="mode-grid"><button type="button" className="mode-card scene-mode" onClick={onScene}><span className="mode-label">Dr. Probey</span><span className="mode-title">Scene Mode</span><span className="mode-badge">Recommended</span><p>An immersive interview room. Guided candidate setup, a live scene that reacts as you talk, an inspectable reasoning trail, practice styles, and full feedback.</p></button><button type="button" className="mode-card classic-mode" onClick={onClassic}><span className="mode-label">Plain chat</span><span className="mode-title">Classic Mode</span><p>A familiar chat window. The same adaptive questions and final feedback, without the room, the scene, or the reasoning sidebar.</p></button></div></main>;
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

function Transcript({ transcript }) {
  return <section className="transcript-panel" data-tutorial="transcript"><header><h3>Transcript</h3><span>{transcript.length} messages</span></header><div className="transcript-log">{transcript.map((entry, index) => <article className={`transcript-message ${entry.speaker === 'Dr. Probey' ? 'from-interviewer' : 'from-candidate'}`} key={`${entry.speaker}-${index}`}><strong>{entry.speaker}</strong><p>{entry.message}</p></article>)}</div></section>;
}

function Trace({ trace, transcript }) {
  const [open, setOpen] = useState(null);
  return <aside className="orchestration" data-tutorial="trail"><header><p className="kicker">Live graph</p><h2>Reasoning trail</h2><span>{trace.length} agents this turn</span></header><div className="agent-rail">{agentNames.map((agent) => { const entry = trace.find((item) => item.agent === agent); return <section className={`agent-row ${entry ? 'complete' : 'idle'}`} key={agent}><button type="button" disabled={!entry} onClick={() => setOpen(open === agent ? null : agent)}><span className="agent-dot" /><strong>{agent === 'Interviewer' ? 'Dr. Probey' : agent}</strong><small>{entry ? 'view' : 'idle'}</small></button>{open === agent && <pre className="trace-inline">{JSON.stringify(entry.output, null, 2)}</pre>}</section>; })}</div><Transcript transcript={transcript} /></aside>;
}

const tutorialSteps = [
  ['speech', "This is Dr. Probey asking your question."],
  ['intent', "This shows what he's trying to find out with this question."],
  ['styles', 'Generate a sample answer in this style, or write your own below.'],
  ['compose', 'Edit the generated answer, or type your own from scratch.'],
  ['send', "Send your answer, then click again to hear Dr. Probey's response."],
  ['trail', 'Watch the AI agents working behind the scenes in real time. Click any of them to see their output.'],
  ['transcript', 'A running plain-text log of the conversation, if you want to scan back.'],
];

function getTutorialTarget(name) {
  const target = document.querySelector(`[data-tutorial="${name}"]`);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  const style = window.getComputedStyle(target);
  return rect.width && rect.height && style.display !== 'none' && style.visibility !== 'hidden' ? rect : null;
}

function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState(null);
  const current = tutorialSteps[step];

  useEffect(() => {
    function update() {
      let next = step;
      let rect = getTutorialTarget(tutorialSteps[next][0]);
      while (!rect && next < tutorialSteps.length - 1) {
        next += 1;
        rect = getTutorialTarget(tutorialSteps[next][0]);
      }
      if (!rect) { onClose(); return; }
      if (next !== step) { setStep(next); return; }
      const padding = 8;
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left + (rect.width - width) / 2), window.innerWidth - width - 12);
      const besideTrail = tutorialSteps[next][0] === 'trail' && rect.height > window.innerHeight * .65 && rect.left >= width + 24;
      const below = rect.bottom + 18;
      const top = besideTrail ? Math.max(12, Math.min(rect.top + 18, window.innerHeight - 170)) : below + 170 <= window.innerHeight ? below : Math.max(12, rect.top - 184);
      const tooltipLeft = besideTrail ? rect.left - width - 18 : left;
      setPosition({ left: tooltipLeft, top, width, highlight: { left: Math.max(4, rect.left - padding), top: Math.max(4, rect.top - padding), width: rect.width + padding * 2, height: rect.height + padding * 2 } });
    }
    const frame = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [step, onClose]);

  useEffect(() => {
    function onKeyDown(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function advance() { if (step === tutorialSteps.length - 1) onClose(); else setStep((currentStep) => currentStep + 1); }
  if (!position) return null;
  return <><div className="tutorial-highlight" aria-hidden="true" style={position.highlight} /><section className="tutorial-tooltip" role="dialog" aria-live="polite" aria-label={`Tutorial step ${step + 1}`} style={{ left: position.left, top: position.top, width: position.width }}><span>Guide {step + 1} of {tutorialSteps.length}</span><p>{current[1]}</p><div><button type="button" onClick={advance}>{step === tutorialSteps.length - 1 ? 'Finish' : 'Next'}</button><button type="button" className="tutorial-skip" onClick={onClose}>Skip tutorial</button></div></section></>;
}

function InterviewStage({ candidate, response, transcript, trace, busy, generating, onGenerate, onSend, onCloseFeedback }) {
  const [draft, setDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const approach = response.trace?.find((entry) => entry.agent === 'Evaluator')?.output?.approach || [];
  useEffect(() => { if (response.done && response.feedback) setFeedbackOpen(true); }, [response]);
  useEffect(() => { if (window.localStorage.getItem('probe_tutorial_seen') !== 'true') setTutorialOpen(true); }, []);
  async function generate(style) { const answer = await onGenerate(style); setDraft(answer); }
  async function submit(event) { event.preventDefault(); if (!draft.trim()) return; const answer = draft.trim(); setDraft(''); await onSend(answer); }
  function closeTutorial() { window.localStorage.setItem('probe_tutorial_seen', 'true'); setTutorialOpen(false); }
  return <main className="scene-app"><header className="app-header"><a href="/classic">Classic</a><span>Probe / live practice</span><button type="button" className="replay-tutorial" onClick={() => setTutorialOpen(true)}>Replay tutorial</button><strong>{candidate.member.name}</strong></header><div className="app-shell"><section className="scene-pane"><section className="interviewer-panel"><div className="turn-speech" data-tutorial="speech"><Markdown>{response.reply}</Markdown></div></section><section className="scene-frame" aria-label="Interview room"><div className="scene-camera"><img className="scene-backdrop" src={asset('interview-room.png')} alt="" /><div className="speaker interviewer-speaker is-active"><img className="scene-character interviewer-character" src={asset(busy ? 'interviewer-thinking.png' : 'interviewer-speaking.png')} alt="Dr. Probey" /></div><div className="question-intent" data-tutorial="intent"><strong>Question intent</strong><span>Understand the reasoning behind your approach.</span></div><div className="speaker candidate-speaker"><img className="scene-character candidate-character" src={asset('candidate-idle.png')} alt={candidate.member.name} /></div></div></section><form className="candidate-panel" onSubmit={submit}><p className="turn-label">{candidate.member.name}</p><section className="composer-slot" data-tutorial="compose"><span>{response.done ? 'Interview complete' : 'Compose your response'}</span><textarea name="candidate-response" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write or edit a response" disabled={busy || response.done} /></section><div className="style-rail" data-tutorial="styles">{responseStyles.map(([style, label]) => <button type="button" key={style} onClick={() => generate(style)} disabled={busy || response.done}>{generating === style ? 'Generating...' : label}</button>)}</div><button className="primary-action" data-tutorial="send" disabled={busy || response.done || !draft.trim()}>{response.done ? 'Interview complete' : busy ? 'Dr. Probey is thinking...' : 'Send answer'}</button></form></section><Trace trace={trace} transcript={transcript} /></div>{tutorialOpen && <Tutorial onClose={closeTutorial} />}{feedbackOpen && <Feedback feedback={response.feedback} approach={approach} onClose={() => { setFeedbackOpen(false); onCloseFeedback(); }} />}</main>;
}

function App() {
  const [screen, setScreen] = useState('home');
  const [candidate, setCandidate] = useState(null);
  const [response, setResponse] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [trace, setTrace] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');
  async function start(selected) { const id = crypto.randomUUID(); setBusy(true); try { const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, candidate: selected }) }); setCandidate(selected); setSessionId(id); setResponse(next); setTranscript([{ speaker: 'Dr. Probey', message: next.reply }]); setTrace(next.trace || []); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function generate(style) { setGenerating(style); setBusy(true); try { return (await request('/api/simulate-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: response.reply, candidate, style }) })).answer; } catch (err) { setError(err.message); return ''; } finally { setBusy(false); setGenerating(''); } }
  async function send(message) { setBusy(true); setTranscript((current) => [...current, { speaker: candidate.member.name, message }]); try { const next = await request('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, message }) }); setResponse(next); setTrace(next.trace || []); setTranscript((current) => [...current, { speaker: 'Dr. Probey', message: next.reply }]); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  if (!response && screen === 'home') return <Home onStart={() => setScreen('mode')} />;
  if (!response && screen === 'mode') return <ModeChoice onScene={() => setScreen('setup')} onClassic={() => { window.location.href = '/classic'; }} onBack={() => setScreen('home')} />;
  if (!response) return <><CandidateSetup onStart={start} onBack={() => setScreen('mode')} />{error && <p className="toast" role="alert">{error}</p>}</>;
  return <><InterviewStage candidate={candidate} response={response} transcript={transcript} trace={trace} busy={busy} generating={generating} onGenerate={generate} onSend={send} onCloseFeedback={() => {}} />{error && <p className="toast" role="alert">{error}</p>}</>;
}

createRoot(document.getElementById('root')).render(<App />);
