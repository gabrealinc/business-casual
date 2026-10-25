const STORAGE_KEY = 'business-casual-v1';
const defaultState = {
  routines: [],
  preferences: { theme: 'violet', sound: true, reduceMotion: false },
  bootSeen: false,
};

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...defaultState,
      ...saved,
      preferences: { ...defaultState.preferences, ...(saved?.preferences || {}) },
      routines: Array.isArray(saved?.routines) ? saved.routines : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
};

let state = loadState();
let timer = { selectedSeconds: 25 * 60, remainingSeconds: 25 * 60, interval: null, running: false };
let previousFocus = null;
let toastTimeout = null;
let panelHideTimeout = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function applyPreferences() {
  document.body.dataset.theme = state.preferences.theme;
  document.body.classList.toggle('reduce-motion', state.preferences.reduceMotion);
  $(`input[name="theme"][value="${state.preferences.theme}"]`).checked = true;
  $('#soundToggle').checked = state.preferences.sound;
  $('#motionToggle').checked = state.preferences.reduceMotion;
}

function finishBoot() {
  clearInterval(window.bootInterval);
  state.bootSeen = true;
  saveState();
  $('#bootScreen').classList.add('is-finished');
  $('#desktop').classList.add('is-ready');
  $('#desktop').setAttribute('aria-hidden', 'false');
  setTimeout(() => $('[data-open="focusPanel"]').focus(), 550);
}

function runBoot() {
  const messages = [
    'Locating a quieter frequency',
    'Unsubscribing from unnecessary urgency',
    'Downloading fresh air',
    'Connecting to somewhere real',
    'You are now free to wander',
  ];
  let progress = state.bootSeen ? 65 : 2;
  let messageIndex = state.bootSeen ? 2 : 0;
  $('#bootProgress').style.width = `${progress}%`;
  $('#bootMessage').textContent = messages[messageIndex];
  window.bootInterval = setInterval(() => {
    progress = Math.min(100, progress + Math.ceil(Math.random() * 18));
    messageIndex = Math.min(messages.length - 1, Math.floor((progress / 101) * messages.length));
    $('#bootProgress').style.width = `${progress}%`;
    $('#bootMessage').textContent = messages[messageIndex];
    if (progress >= 100) setTimeout(finishBoot, 450);
  }, state.preferences.reduceMotion ? 60 : 620);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function openPanel(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  clearTimeout(panelHideTimeout);
  previousFocus = document.activeElement;
  $$('.panel').forEach((item) => { item.hidden = true; });
  panel.hidden = false;
  $('#panelBackdrop').classList.add('is-open');
  $('#panelBackdrop').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => panel.querySelector('button, input, select')?.focus(), 50);
}

function closePanel() {
  $('#panelBackdrop').classList.remove('is-open');
  $('#panelBackdrop').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  panelHideTimeout = setTimeout(() => { $$('.panel').forEach((item) => { item.hidden = true; }); }, 220);
  previousFocus?.focus?.();
}

function renderRoutines() {
  const list = $('#savedRoutines');
  const next = $('#nextRoutine');
  const focusSelect = $('#focusRoutine');
  $$('.user-routine-option', focusSelect).forEach((option) => option.remove());
  if (!state.routines.length) {
    list.innerHTML = '<p class="form-status">No saved routines yet. Your future self has a clean calendar.</p>';
    next.innerHTML = '<span class="routine-icon" aria-hidden="true">☀</span><div><strong>No plans yet</strong><p>Schedule something worth logging off for.</p></div>';
    return;
  }
  list.innerHTML = state.routines.map((routine) => `
    <div class="saved-routine">
      <span aria-hidden="true">${routine.mood}</span>
      <div><strong>${escapeHTML(routine.name)}</strong><small>${escapeHTML(routine.day)} at ${formatTime(routine.time)}</small></div>
      <button class="delete-routine" type="button" data-delete-routine="${routine.id}" aria-label="Delete ${escapeHTML(routine.name)}">×</button>
    </div>`).join('');
  const routine = state.routines[0];
  next.innerHTML = `<span class="routine-icon" aria-hidden="true">${routine.mood}</span><div><strong>${escapeHTML(routine.name)}</strong><p>${escapeHTML(routine.day)} at ${formatTime(routine.time)}</p></div>`;
  state.routines.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.name;
    option.textContent = item.name;
    option.className = 'user-routine-option';
    focusSelect.append(option);
  });
}

function escapeHTML(value) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}

function updateClock() {
  $('#clock').textContent = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function updateTimerUI() {
  const minutes = Math.floor(timer.remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (timer.remainingSeconds % 60).toString().padStart(2, '0');
  $('#timerDisplay').textContent = `${minutes}:${seconds}`;
  $('#timerLabel').textContent = timer.running ? `LIVING: ${$('#focusRoutine').value.toUpperCase()}` : timer.remainingSeconds === 0 ? 'YOU DID IT' : 'READY WHEN YOU ARE';
  $('#startTimer').textContent = timer.running ? 'Pause' : timer.remainingSeconds === 0 ? 'Start again' : 'Start living';
  const elapsed = 1 - timer.remainingSeconds / timer.selectedSeconds;
  $('#timerRing').style.setProperty('--progress', `${Math.max(0, elapsed * 100)}%`);
  document.title = timer.running ? `${minutes}:${seconds} – Business Casual` : 'Business Casual – Log off. Clock in to life.';
}

function startOrPauseTimer() {
  if (timer.remainingSeconds <= 0) timer.remainingSeconds = timer.selectedSeconds;
  timer.running = !timer.running;
  document.body.classList.toggle('is-focusing', timer.running);
  $('#systemStatus').textContent = timer.running ? 'LIVING LIFE' : 'ONLINE';
  clearInterval(timer.interval);
  if (timer.running) {
    showToast(`You are logging off for: ${$('#focusRoutine').value}`);
    timer.interval = setInterval(() => {
      timer.remainingSeconds -= 1;
      if (timer.remainingSeconds <= 0) completeTimer();
      updateTimerUI();
    }, 1000);
  }
  updateTimerUI();
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.remainingSeconds = timer.selectedSeconds;
  document.body.classList.remove('is-focusing');
  $('#systemStatus').textContent = 'ONLINE';
  updateTimerUI();
}

function completeTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.remainingSeconds = 0;
  document.body.classList.remove('is-focusing');
  $('#systemStatus').textContent = 'ONLINE';
  showToast('Welcome back. Hope real life was nice.');
  if (state.preferences.sound) playChime();
}

function playChime() {
  try {
    const audio = new AudioContext();
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain).connect(audio.destination);
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audio.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + index * 0.12 + 0.3);
      oscillator.start(audio.currentTime + index * 0.12);
      oscillator.stop(audio.currentTime + index * 0.12 + 0.32);
    });
  } catch { /* Sound is an optional enhancement. */ }
}

$('#skipBoot').addEventListener('click', finishBoot);
$$('[data-open]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.open)));
$$('[data-close]').forEach((button) => button.addEventListener('click', closePanel));
$$('[data-switch]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.switch)));
$('#panelBackdrop').addEventListener('click', (event) => { if (event.target === event.currentTarget) closePanel(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#panelBackdrop').classList.contains('is-open')) closePanel();
});

$('#routineForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const routine = {
    id: crypto.randomUUID(),
    name: form.get('routineName').trim(),
    day: form.get('routineDay'),
    time: form.get('routineTime'),
    mood: form.get('routineMood'),
  };
  state.routines.unshift(routine);
  state.routines = state.routines.slice(0, 8);
  saveState();
  renderRoutines();
  event.currentTarget.reset();
  $('#routineTime').value = '18:00';
  showToast('Routine saved. Real life is on the calendar.');
});

$('#savedRoutines').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-routine]');
  if (!button) return;
  state.routines = state.routines.filter((item) => item.id !== button.dataset.deleteRoutine);
  saveState();
  renderRoutines();
  showToast('Routine removed. Your time is yours again.');
});

$$('[data-minutes]').forEach((button) => button.addEventListener('click', () => {
  $$('.duration-buttons button').forEach((item) => item.classList.remove('is-selected'));
  button.classList.add('is-selected');
  timer.selectedSeconds = Number(button.dataset.minutes) * 60;
  resetTimer();
}));

$('#startTimer').addEventListener('click', startOrPauseTimer);
$('#resetTimer').addEventListener('click', resetTimer);

$('#settingsForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.preferences = {
    theme: new FormData(event.currentTarget).get('theme'),
    sound: $('#soundToggle').checked,
    reduceMotion: $('#motionToggle').checked,
  };
  saveState();
  applyPreferences();
  $('#settingsStatus').textContent = 'Saved to this browser ✓';
  showToast('Desktop settings saved.');
});

applyPreferences();
renderRoutines();
updateTimerUI();
updateClock();
setInterval(updateClock, 30000);
runBoot();
