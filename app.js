const STORAGE_KEY = 'business-casual-v2';
const defaultState = { routines: [], preferences: { intro: true, sound: true, reduceMotion: false } };

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...saved, preferences: { ...defaultState.preferences, ...(saved?.preferences || {}) }, routines: Array.isArray(saved?.routines) ? saved.routines : [] };
  } catch { return { routines: [], preferences: { ...defaultState.preferences } }; }
}

let state = loadState();
let connectionStep = 0;
let connectionInterval = null;
let timer = { duration: 25 * 60, remaining: 25 * 60, running: false, interval: null };
let previousFocus = null;
let hideTimer = null;
let toastTimer = null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function setConnectionStep(step) {
  connectionStep = Math.min(3, step);
  $('#cinemaTrack').style.setProperty('--step', connectionStep);
  $$('.connect-card').forEach((card, index) => card.classList.toggle('is-active', index === connectionStep));
  $$('.flow-arrow').forEach((arrow, index) => arrow.classList.toggle('is-lit', index < connectionStep));
  $$('.step-dots i').forEach((dot, index) => dot.classList.toggle('is-active', index === connectionStep));
  const statuses = ['Dialing...', 'Authenticating...', 'Connected!', 'Welcome!'];
  document.title = `Business Casual – ${statuses[connectionStep]}`;
}

function startConnection() {
  setConnectionStep(0);
  let dial = 8;
  const progress = $('#dialProgress');
  const dialTick = setInterval(() => {
    dial = Math.min(100, dial + 17);
    progress.style.width = `${dial}%`;
    if (dial > 35) $('#dialStatus').textContent = dial < 80 ? 'Negotiating...' : 'Almost there...';
    if (dial >= 100) clearInterval(dialTick);
  }, 350);
  const timings = state.preferences.reduceMotion ? [250, 600, 950] : [2500, 5100, 7500];
  timings.forEach((delay, index) => setTimeout(() => setConnectionStep(index + 1), delay));
  connectionInterval = setTimeout(enterDesktop, state.preferences.reduceMotion ? 1350 : 9800);
}

function enterDesktop() {
  clearTimeout(connectionInterval);
  $('#connectionScreen').classList.add('is-gone');
  $('#desktop').classList.add('is-ready');
  $('#desktop').setAttribute('aria-hidden', 'false');
  document.title = 'Business Casual – Log out. Live more.';
}

function showToast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 2600);
}

function openPanel(id) {
  clearTimeout(hideTimer);
  previousFocus = document.activeElement;
  $$('.app-modal').forEach((panel) => { panel.hidden = true; });
  const panel = document.getElementById(id);
  panel.hidden = false;
  $('#modalLayer').classList.add('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'false');
  setTimeout(() => panel.querySelector('button,input,select')?.focus(), 50);
}

function closePanel() {
  $('#modalLayer').classList.remove('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'true');
  hideTimer = setTimeout(() => $$('.app-modal').forEach((panel) => { panel.hidden = true; }), 220);
  previousFocus?.focus?.();
}

function escapeHTML(value) { const span = document.createElement('span'); span.textContent = value; return span.innerHTML; }
function formatTime(value) { const [h,m] = value.split(':').map(Number); return new Intl.DateTimeFormat([], { hour:'numeric', minute:'2-digit' }).format(new Date(2000,0,1,h,m)); }

function renderRoutines() {
  const list = $('#savedRoutines');
  $$('.saved-option').forEach((option) => option.remove());
  state.routines.forEach((routine) => { const option = document.createElement('option'); option.className = 'saved-option'; option.textContent = routine.name; $('#focusRoutine').append(option); });
  list.innerHTML = state.routines.length ? state.routines.map((routine) => `<div class="saved-routine"><span><b>${escapeHTML(routine.name)}</b><br><small>${escapeHTML(routine.day)} at ${formatTime(routine.time)}</small></span><button type="button" data-delete="${routine.id}" aria-label="Delete ${escapeHTML(routine.name)}">×</button></div>`).join('') : '';
}

function updateTimer() {
  const minutes = String(Math.floor(timer.remaining / 60)).padStart(2,'0');
  const seconds = String(timer.remaining % 60).padStart(2,'0');
  $('#timerDisplay').textContent = `${minutes}:${seconds}`;
  $('#timerMessage').textContent = timer.running ? `Living: ${$('#focusRoutine').value}` : timer.remaining === 0 ? 'Welcome back.' : 'Ready when you are.';
  $('#startTimer').textContent = timer.running ? 'PAUSE' : timer.remaining === 0 ? 'START AGAIN' : 'START LIVING';
  $('#systemStatus').textContent = timer.running ? 'LIVING LIFE' : 'ONLINE';
  document.body.classList.toggle('is-focusing', timer.running);
}

function toggleTimer() {
  if (timer.remaining <= 0) timer.remaining = timer.duration;
  timer.running = !timer.running;
  clearInterval(timer.interval);
  if (timer.running) {
    showToast(`Logging off for: ${$('#focusRoutine').value}`);
    timer.interval = setInterval(() => { timer.remaining -= 1; if (timer.remaining <= 0) finishTimer(); updateTimer(); },1000);
  }
  updateTimer();
}

function resetTimer() { clearInterval(timer.interval); timer.running = false; timer.remaining = timer.duration; updateTimer(); }
function finishTimer() { clearInterval(timer.interval); timer.running = false; timer.remaining = 0; updateTimer(); showToast('Welcome back. Hope real life was nice.'); if (state.preferences.sound) playChime(); }
function playChime() { try { const audio = new AudioContext(); [523,659,784].forEach((frequency,index) => { const oscillator=audio.createOscillator();const gain=audio.createGain();oscillator.connect(gain).connect(audio.destination);oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,audio.currentTime+index*.12);gain.gain.exponentialRampToValueAtTime(.12,audio.currentTime+index*.12+.02);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+index*.12+.28);oscillator.start(audio.currentTime+index*.12);oscillator.stop(audio.currentTime+index*.12+.3); }); } catch {} }

function applyPreferences() {
  $('#introToggle').checked = state.preferences.intro;
  $('#soundToggle').checked = state.preferences.sound;
  $('#motionToggle').checked = state.preferences.reduceMotion;
  document.body.classList.toggle('reduce-motion', state.preferences.reduceMotion);
}

$('#skipConnection').addEventListener('click', enterDesktop);
$('#enterDesktop').addEventListener('click', enterDesktop);
$$('[data-open]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.open)));
$$('[data-close]').forEach((button) => button.addEventListener('click', closePanel));
$('#modalLayer').addEventListener('click', (event) => { if (event.target === event.currentTarget) closePanel(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#modalLayer').classList.contains('is-open')) closePanel(); });
$$('[data-minutes]').forEach((button) => button.addEventListener('click', () => { $$('.duration-row button').forEach((item) => item.classList.remove('is-selected'));button.classList.add('is-selected');timer.duration=Number(button.dataset.minutes)*60;resetTimer(); }));
$('#startTimer').addEventListener('click', toggleTimer);
$('#resetTimer').addEventListener('click', resetTimer);
$('#routineForm').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); state.routines.unshift({ id:crypto.randomUUID(), name:form.get('routineName').trim(), day:form.get('routineDay'), time:form.get('routineTime') }); state.routines = state.routines.slice(0,6); saveState(); renderRoutines(); event.currentTarget.reset(); $('#routineTime').value='18:00'; showToast('Routine saved.'); });
$('#savedRoutines').addEventListener('click', (event) => { const button=event.target.closest('[data-delete]');if(!button)return;state.routines=state.routines.filter((item)=>item.id!==button.dataset.delete);saveState();renderRoutines(); });
$('#settingsForm').addEventListener('submit', (event) => { event.preventDefault(); state.preferences={ intro:$('#introToggle').checked,sound:$('#soundToggle').checked,reduceMotion:$('#motionToggle').checked };saveState();applyPreferences();$('#settingsMessage').textContent='Saved to this browser ✓';showToast('Settings saved.'); });
function updateClock(){ $('#clock').textContent=new Intl.DateTimeFormat([], {hour:'numeric',minute:'2-digit'}).format(new Date()); }
applyPreferences();renderRoutines();updateTimer();updateClock();setInterval(updateClock,30000);
if (state.preferences.intro) startConnection(); else enterDesktop();
