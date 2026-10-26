const STORAGE_KEY = 'business-casual-tap-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return { introSeen: Boolean(saved.introSeen), sessions: Array.isArray(saved.sessions) ? saved.sessions : [] };
  } catch {
    return { introSeen: false, sessions: [] };
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
  const current = Math.min(3, step);
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
  [2100, 4200, 6200].forEach((delay, index) => setTimeout(() => setConnectionStep(index + 1), delay));
  introTimer = setTimeout(enterDesktop, 8500);
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
  $('#timerMessage').textContent = timer.running ? `Coming back to: ${$('#focusRoutine').value}` : timer.remaining === 0 ? 'Welcome back.' : 'Ready when you are.';
  $('#startTimer').textContent = timer.running ? 'PAUSE' : timer.remaining === 0 ? 'START AGAIN' : 'START LIVING';
  $('#systemStatus').textContent = timer.running ? 'LIVING LIFE' : 'ONLINE';
  document.body.classList.toggle('is-focusing', timer.running);
}

function toggleTimer() {
  if (timer.remaining <= 0) timer.remaining = timer.duration;
  timer.running = !timer.running;
  clearInterval(timer.interval);
  if (timer.running) {
    timer.startedAt ||= Date.now();
    showToast('Your time is yours.');
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
  state.sessions.unshift({
    id: String(Date.now()),
    routine: $('#focusRoutine').value,
    intention: $('#intention').value.trim(),
    minutes: Math.round(timer.duration / 60),
    date: new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date())
  });
  state.sessions = state.sessions.slice(0, 20);
  saveState();
  renderHistory();
  showToast('Welcome back. This moment was saved.');
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.startedAt = null;
  timer.remaining = timer.duration;
  updateTimer();
}

function escapeHTML(value) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function renderHistory() {
  $('#sessionHistory').innerHTML = state.sessions.length ? state.sessions.map((session) => `<article><span>${escapeHTML(session.date)}</span><b>${escapeHTML(session.routine)}</b><p>${session.minutes} minutes${session.intention ? ` · ${escapeHTML(session.intention)}` : ''}</p></article>`).join('') : '<div class="empty-history"><span>🌙</span><p>Your quiet moments will appear here after you complete a timer.</p></div>';
}

const guideCopy = {
  focus: `<h3>Use the necklace to turn on Focus</h3><ol><li>Open Apple’s <b>Shortcuts</b> app and tap <b>Automation</b>.</li><li>Create a new Personal Automation and choose <b>NFC</b>.</li><li>Scan this piece and name it “Business Casual.”</li><li>Add the <b>Set Focus</b> action and choose Do Not Disturb or a custom Focus.</li><li>Choose the automatic running option available on your phone, then save.</li></ol><p>Shortcuts recognizes the physical tag, so the Business Casual website can remain written on it.</p>`,
  block: `<h3>Use the necklace with an app blocker</h3><p>A Focus silences notifications but does not stop you from opening apps. For stronger boundaries, use a compatible Screen Time app such as Foqos.</p><ol><li>Install the blocker and grant only the permissions you understand.</li><li>Select the apps and sites you want it to restrict.</li><li>Follow its NFC setup and scan this piece as the physical key.</li><li>Test how sessions start and end before relying on it.</li></ol><a class="guide-link" href="https://www.foqos.app/" target="_blank" rel="noreferrer">VISIT FOQOS ↗</a><p class="fine-print">Business Casual is not affiliated with Foqos. Compatibility, features, and pricing can change.</p>`,
  routine: `<h3>Ideas for your tap</h3><div class="idea-chips"><span>Study + playlist</span><span>Sunset walk</span><span>Journal mode</span><span>Dinner mode</span><span>Call someone I love</span><span>Creative hour</span><span>Caregiving presence</span><span>Bedtime wind-down</span></div><p>In Shortcuts, one NFC scan can run several actions. Start small with one action, test it, then add more.</p>`,
  rewrite: `<h3>Replace the Business Casual link</h3><ol><li>Copy and save <b>${location.origin}/tap</b> in case you want it back later.</li><li>Open a trusted NFC-writing app such as NFC Tools.</li><li>Choose <b>Write</b>, add your link, and scan the NFC area of the piece.</li><li>Test the new tap before closing the app.</li></ol><p><b>Keep the tag rewritable.</b> Do not choose “lock” or “make read-only” unless you are certain. Rewriting the tag removes this website until you write the Business Casual link back.</p><button id="copyGuideUrl" class="copy-button">COPY BUSINESS CASUAL LINK</button>`
};

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

$$('[data-guide]').forEach((button) => button.addEventListener('click', () => {
  $('#guideDetail').innerHTML = guideCopy[button.dataset.guide];
  $('#guideDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}));
$('#guideDetail').addEventListener('click', async (event) => {
  if (event.target.id !== 'copyGuideUrl') return;
  try { await navigator.clipboard.writeText(`${location.origin}/tap`); showToast('Business Casual link copied.'); }
  catch { showToast(`Save this link: ${location.origin}/tap`); }
});

$('#clearHistory').addEventListener('click', () => {
  state.sessions = [];
  saveState();
  renderHistory();
  showToast('Your moments were cleared.');
});

renderHistory();
updateTimer();
updateClock();
setInterval(updateClock, 30000);
if (state.introSeen) enterDesktop(); else startConnection();
