const STORAGE_KEY = 'business-casual-tap-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return { introSeen: Boolean(saved.introSeen) };
  } catch {
    return { introSeen: false };
  }
}

let state = loadState();
let introTimer;
let hideTimer;
let previousFocus;
let toastTimer;
let timer = { duration: 25 * 60, remaining: 25 * 60, running: false, interval: null, startedAt: null };
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function setConnectionStep(step) {
  const current = Math.min(2, step);
  $('#cinemaTrack').style.setProperty('--step', current);
  $$('.connect-card').forEach((card, index) => card.classList.toggle('is-active', index === current));
  $$('.flow-arrow').forEach((arrow, index) => arrow.classList.toggle('is-lit', index < current));
  $$('.step-dots i').forEach((dot, index) => dot.classList.toggle('is-active', index === current));
}

function startConnection() {
  let progress = 8;
  const progressTimer = setInterval(() => {
    progress = Math.min(100, progress + 17);
    $('#dialProgress').style.width = `${progress}%`;
    if (progress > 35) $('#dialStatus').textContent = progress < 80 ? 'Recognizing...' : 'Almost there...';
    if (progress >= 100) clearInterval(progressTimer);
  }, 300);
  [2000, 4000].forEach((delay, index) => setTimeout(() => setConnectionStep(index + 1), delay));
  introTimer = setTimeout(enterDesktop, 6200);
}

function enterDesktop() {
  clearTimeout(introTimer);
  state.introSeen = true;
  saveState();
  $('#connectionScreen').classList.add('is-gone');
  $('#desktop').classList.add('is-ready');
  $('#desktop').setAttribute('aria-hidden', 'false');
  document.title = 'Business Casual – Tap to get real';
}

function openPanel(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  clearTimeout(hideTimer);
  previousFocus = document.activeElement;
  $$('.app-modal').forEach((item) => { item.hidden = true; });
  panel.hidden = false;
  $('#modalLayer').classList.add('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'false');
  setTimeout(() => panel.querySelector('button,input,select')?.focus(), 40);
}

function closePanel() {
  $('#modalLayer').classList.remove('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'true');
  hideTimer = setTimeout(() => $$('.app-modal').forEach((panel) => { panel.hidden = true; }), 200);
  previousFocus?.focus?.();
}

function showToast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 2600);
}

function updateTimer() {
  $('#timerDisplay').textContent = `${String(Math.floor(timer.remaining / 60)).padStart(2, '0')}:${String(timer.remaining % 60).padStart(2, '0')}`;
  $('#timerMessage').textContent = timer.running ? 'Timer running.' : timer.remaining === 0 ? 'Time is yours again.' : 'Ready when you are.';
  $('#startTimer').textContent = timer.running ? 'PAUSE' : timer.remaining === 0 ? 'START AGAIN' : 'START TIMER';
  $('#systemStatus').textContent = timer.running ? 'LIVING LIFE' : 'ONLINE';
  document.body.classList.toggle('is-focusing', timer.running);
}

function toggleTimer() {
  if (timer.remaining <= 0) timer.remaining = timer.duration;
  timer.running = !timer.running;
  clearInterval(timer.interval);
  if (timer.running) {
    timer.startedAt ||= Date.now();
    showToast('Timer started.');
    timer.interval = setInterval(() => {
      timer.remaining -= 1;
      if (timer.remaining <= 0) completeSession();
      updateTimer();
    }, 1000);
  }
  updateTimer();
}

function completeSession() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.remaining = 0;
  showToast('Timer complete.');
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.startedAt = null;
  timer.remaining = timer.duration;
  updateTimer();
}

function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date()); }

$('#skipConnection').addEventListener('click', enterDesktop);
$('#enterDesktop').addEventListener('click', enterDesktop);
$$('[data-open]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.open)));
$$('[data-close]').forEach((button) => button.addEventListener('click', closePanel));
$$('[data-home]').forEach((button) => button.addEventListener('click', closePanel));
$('#modalLayer').addEventListener('click', (event) => { if (event.target === event.currentTarget) closePanel(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#modalLayer').classList.contains('is-open')) closePanel(); });

$$('[data-minutes]').forEach((button) => button.addEventListener('click', () => {
  $$('.duration-row button').forEach((item) => item.classList.remove('is-selected'));
  button.classList.add('is-selected');
  timer.duration = Number(button.dataset.minutes) * 60;
  resetTimer();
}));
$('#startTimer').addEventListener('click', toggleTimer);
$('#resetTimer').addEventListener('click', resetTimer);

updateTimer();
updateClock();
setInterval(updateClock, 30000);
if (state.introSeen) enterDesktop(); else startConnection();
