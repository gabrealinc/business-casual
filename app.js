const STORAGE_KEY = 'business-casual-v3';
const defaultState = { routines: [], journal: [], cart: [], preferences: { intro: true, sound: true, reduceMotion: false } };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      ...defaultState,
      ...saved,
      preferences: { ...defaultState.preferences, ...(saved.preferences || {}) },
      routines: Array.isArray(saved.routines) ? saved.routines : [],
      journal: Array.isArray(saved.journal) ? saved.journal : [],
      cart: Array.isArray(saved.cart) ? saved.cart : []
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

let state = loadState();
let connectionInterval;
let previousFocus;
let hideTimer;
let toastTimer;
let introComplete = false;
let timer = { duration: 25 * 60, remaining: 25 * 60, running: false, interval: null };
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function setConnectionStep(step) {
  const current = Math.min(3, step);
  $('#cinemaTrack').style.setProperty('--step', current);
  $$('.connect-card').forEach((card, index) => card.classList.toggle('is-active', index === current));
  $$('.flow-arrow').forEach((arrow, index) => arrow.classList.toggle('is-lit', index < current));
  $$('.step-dots i').forEach((dot, index) => dot.classList.toggle('is-active', index === current));
  document.title = `Business Casual – ${['Dialing...', 'Authenticating...', 'Connected!', 'Welcome!'][current]}`;
}

function startConnection() {
  setConnectionStep(0);
  let dial = 8;
  const dialTick = setInterval(() => {
    dial = Math.min(100, dial + 17);
    $('#dialProgress').style.width = `${dial}%`;
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
  introComplete = true;
  document.title = 'Business Casual – Log off. Live more.';
  openHashPanel();
}

function showToast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 2600);
}

function openPanel(id, updateHash = true) {
  const panel = document.getElementById(id);
  if (!panel) return;
  clearTimeout(hideTimer);
  previousFocus = document.activeElement;
  $$('.app-modal').forEach((item) => { item.hidden = true; });
  panel.hidden = false;
  $('#modalLayer').classList.add('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'false');
  if (updateHash) history.replaceState(null, '', `#${id.replace('Panel', '')}`);
  setTimeout(() => panel.querySelector('button,input,select,textarea')?.focus(), 50);
}

function closePanel() {
  $('#modalLayer').classList.remove('is-open');
  $('#modalLayer').setAttribute('aria-hidden', 'true');
  history.replaceState(null, '', location.pathname + location.search);
  hideTimer = setTimeout(() => $$('.app-modal').forEach((panel) => { panel.hidden = true; }), 220);
  previousFocus?.focus?.();
}

function openHashPanel() {
  if (!introComplete) return;
  const map = { shop: 'shopPanel', how: 'howPanel', story: 'storyPanel', setup: 'setupPanel', impact: 'impactPanel', journal: 'journalPanel' };
  const id = map[location.hash.slice(1)];
  if (id) openPanel(id, false);
}

function escapeHTML(value) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

function renderRoutines() {
  $$('.saved-option').forEach((option) => option.remove());
  state.routines.forEach((routine) => {
    const option = document.createElement('option');
    option.className = 'saved-option';
    option.textContent = routine.name;
    $('#focusRoutine').append(option);
  });
  $('#savedRoutines').innerHTML = state.routines.map((routine) => `<div class="saved-routine"><span><b>${escapeHTML(routine.name)}</b><br><small>${escapeHTML(routine.day)} at ${formatTime(routine.time)}</small></span><button type="button" data-delete="${routine.id}" aria-label="Delete ${escapeHTML(routine.name)}">×</button></div>`).join('');
}

function renderCart() {
  const items = $('#cartItems');
  items.innerHTML = state.cart.length ? state.cart.map((item) => `<div class="cart-item"><span>${escapeHTML(item.name)}<br><b>$${item.price}</b></span><button data-remove="${escapeHTML(item.name)}" aria-label="Remove ${escapeHTML(item.name)}">×</button></div>`).join('') : '<p class="empty-cart">Nothing saved yet. Choose what feels like you.</p>';
  $('#cartTotal').textContent = `$${state.cart.reduce((sum, item) => sum + item.price, 0)}`;
  $$('.add-button').forEach((button) => {
    const added = state.cart.some((item) => item.name === button.dataset.add);
    button.classList.toggle('is-added', added);
    button.textContent = added ? 'SAVED TO DROP LIST ✓' : 'ADD TO DROP LIST';
  });
}

function renderJournal() {
  $('#journalHistory').innerHTML = state.journal.length ? `<p class="modal-kicker">RECENT CHECK-INS</p>${state.journal.slice(0, 3).map((entry) => `<div class="journal-entry"><b>${escapeHTML(entry.trigger)}</b> · ${escapeHTML(entry.date)}${entry.need ? `<br>${escapeHTML(entry.need)}` : ''}</div>`).join('')}` : '';
}

const setupCopy = {
  ritual: '<h3>Open Business Casual</h3><ol><li>Open the NFC-writing app recommended in your care card.</li><li>Write the Business Casual URL to the piece.</li><li>Tap the piece whenever you want to start a timer, routine, or check-in.</li></ol><p>This creates an intentional pause. It does not block other apps.</p>',
  block: '<h3>Connect a compatible blocker</h3><ol><li>Choose a third-party blocking app that supports NFC automations.</li><li>Follow that app’s instructions and grant its required permissions.</li><li>Use your removable Business Casual piece as the physical key.</li></ol><p>Compatibility and subscription costs depend on the app. Business Casual does not yet provide native phone blocking.</p>',
  custom: '<h3>Program your own link</h3><ol><li>Choose a safe HTTPS link, playlist, journal prompt, contact, or shortcut.</li><li>Use an NFC-writing app to replace the existing link.</li><li>Test the piece before relying on it.</li></ol><p>The tag is rewritable. We will include the exact tag type and step-by-step care card with every tested piece.</p>'
};

function setSetupTab(name) {
  $$('.setup-tabs button').forEach((button) => button.classList.toggle('is-selected', button.dataset.setupTab === name));
  $('#setupContent').innerHTML = setupCopy[name];
}

function updateTimer() {
  $('#timerDisplay').textContent = `${String(Math.floor(timer.remaining / 60)).padStart(2, '0')}:${String(timer.remaining % 60).padStart(2, '0')}`;
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
    timer.interval = setInterval(() => {
      timer.remaining -= 1;
      if (timer.remaining <= 0) finishTimer();
      updateTimer();
    }, 1000);
  }
  updateTimer();
}

function resetTimer() { clearInterval(timer.interval); timer.running = false; timer.remaining = timer.duration; updateTimer(); }
function finishTimer() { clearInterval(timer.interval); timer.running = false; timer.remaining = 0; showToast('Welcome back. Hope real life was nice.'); if (state.preferences.sound) playChime(); }
function playChime() {
  try {
    const audio = new AudioContext();
    [523, 659, 784].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain).connect(audio.destination);
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, audio.currentTime + index * .12);
      gain.gain.exponentialRampToValueAtTime(.12, audio.currentTime + index * .12 + .02);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + index * .12 + .28);
      oscillator.start(audio.currentTime + index * .12);
      oscillator.stop(audio.currentTime + index * .12 + .3);
    });
  } catch {}
}

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
$$('[data-home]').forEach((button) => button.addEventListener('click', closePanel));
$('#modalLayer').addEventListener('click', (event) => { if (event.target === event.currentTarget) closePanel(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#modalLayer').classList.contains('is-open')) closePanel(); });
window.addEventListener('hashchange', openHashPanel);

$$('[data-minutes]').forEach((button) => button.addEventListener('click', () => {
  $$('.duration-row button').forEach((item) => item.classList.remove('is-selected'));
  button.classList.add('is-selected');
  timer.duration = Number(button.dataset.minutes) * 60;
  resetTimer();
}));
$('#startTimer').addEventListener('click', toggleTimer);
$('#resetTimer').addEventListener('click', resetTimer);

$('#routineForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.routines.unshift({ id: crypto.randomUUID(), name: form.get('routineName').trim(), day: form.get('routineDay'), time: form.get('routineTime') });
  state.routines = state.routines.slice(0, 6);
  saveState(); renderRoutines(); event.currentTarget.reset(); $('#routineTime').value = '18:00'; showToast('Routine saved.');
});
$('#savedRoutines').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  state.routines = state.routines.filter((item) => item.id !== button.dataset.delete);
  saveState(); renderRoutines();
});

$$('[data-add]').forEach((button) => button.addEventListener('click', () => {
  const name = button.dataset.add;
  const exists = state.cart.some((item) => item.name === name);
  state.cart = exists ? state.cart.filter((item) => item.name !== name) : [...state.cart, { name, price: Number(button.dataset.price) }];
  saveState(); renderCart(); showToast(exists ? 'Removed from your drop list.' : 'Saved to your drop list.');
}));
$('#cartItems').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.cart = state.cart.filter((item) => item.name !== button.dataset.remove);
  saveState(); renderCart();
});

$('#journalForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.journal.unshift({ trigger: form.get('trigger'), need: form.get('need').trim(), date: new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date()) });
  state.journal = state.journal.slice(0, 10);
  saveState(); renderJournal(); event.currentTarget.reset(); showToast('Moment saved to this browser.');
});

$$('[data-setup-tab]').forEach((button) => button.addEventListener('click', () => setSetupTab(button.dataset.setupTab)));
$('#settingsForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.preferences = { intro: $('#introToggle').checked, sound: $('#soundToggle').checked, reduceMotion: $('#motionToggle').checked };
  saveState(); applyPreferences(); $('#settingsMessage').textContent = 'Saved to this browser ✓'; showToast('Settings saved.');
});

function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date()); }
applyPreferences(); renderRoutines(); renderCart(); renderJournal(); setSetupTab('ritual'); updateTimer(); updateClock();
setInterval(updateClock, 30000);
if (state.preferences.intro) startConnection(); else enterDesktop();
