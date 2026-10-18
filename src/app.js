import { setupInstall } from './install.js';
import { FocusTimer, validMinutes, formatTime, sanitizeRecords, addCompletion, todaySummary } from './timer.js';
import { STORAGE_KEY, loadData, sanitizePreferences } from './storage.js';
import { RainAudio } from './audio.js';
import { RainScene } from './rain.js';
import { SCENES } from './scenes.js';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let storage;
try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Unavailable'); }, setItem() { throw new Error('Unavailable'); } }; }
const loaded = loadData(storage);
let prefs = sanitizePreferences(loaded.data.prefs);
if (typeof loaded.data.prefs?.motion !== 'boolean') prefs.motion = !reducedMotion.matches;
let records = sanitizeRecords(loaded.data.records);
let timer = FocusTimer.restore(loaded.data.timer);
let task = typeof loaded.data.task === 'string' ? loaded.data.task.slice(0, 80) : '';
let storageWarningShown = false, toastTimeout, releaseTimeout, taskTimeout;
const audio = new RainAudio();
const scene = new RainScene($('rain'), { ...prefs });

function notify(message) {
  $('status').textContent = message; $('status').classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('status').classList.remove('visible'), 5500);
}
function save() {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, prefs, records, timer: timer.snapshot(), task })); }
  catch {
    if (!storageWarningShown) { storageWarningShown = true; notify('浏览器暂时无法保存数据；本次仍可使用，关闭后不会保留。'); }
  }
}
function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
function updateSummary() {
  const summary = todaySummary(records);
  text('today-minutes', summary.minutes); text('today-sessions', summary.sessions);
}
function renderTimer() {
  const time = formatTime(timer.remaining), isFocus = timer.mode === 'focus', complete = timer.status === 'complete';
  text('timer', time);
  text('immersive-clock', `${isFocus ? '专注' : '休息'} · ${time}`);
  $('duration').disabled = ['running', 'paused'].includes(timer.status);
  if (document.activeElement !== $('duration')) $('duration').value = timer.minutes;
  $('focus-mode').setAttribute('aria-pressed', isFocus); $('break-mode').setAttribute('aria-pressed', !isFocus);
  $('focus-mode').classList.toggle('selected', isFocus); $('break-mode').classList.toggle('selected', !isFocus);
  $('task').hidden = !isFocus;
  const states = { idle: '准备好了再开始', running: isFocus ? '正在专注' : '正在休息', paused: '已暂停，慢慢来', complete: '这一轮完成了' };
  text('timer-state', states[timer.status]);
  $('start').innerHTML = timer.status === 'running' ? '暂停一下' : timer.status === 'paused' ? '继续这一轮 <span aria-hidden="true">↗</span>' : complete ? '再来一轮 <span aria-hidden="true">↗</span>' : `开始${isFocus ? '专注' : '休息'} <span aria-hidden="true">↗</span>`;
  text('timer-note', isFocus ? `不必一次做完，先给它 ${timer.minutes} 分钟。` : '离开屏幕，看看远处，喝一口水。');
  $('completion').hidden = !complete;
  text('completion-text', isFocus ? `完成了 ${timer.minutes} 分钟。站起来活动一下吧。` : '休息结束。准备好后，再开始下一件事。');
  text('next-session', isFocus ? `休息 ${prefs.breakMinutes} 分钟` : `专注 ${prefs.focusMinutes} 分钟`);
  document.title = ['running', 'paused'].includes(timer.status) ? `${time} · ${isFocus ? '专注' : '休息'} · 听雨` : complete ? '这一轮完成了 · 听雨' : '听雨 · Rain Room';
}
function finish(completion) {
  if (!completion) return;
  // Merge any record committed by another tab before saving this completion.
  const latest = loadData(storage).data;
  records = addCompletion(sanitizeRecords([...records, ...sanitizeRecords(latest.records)]), completion);
  save(); updateSummary();
  if (prefs.chime) audio.chime();
  notify(completion.mode === 'focus' ? '这一轮专注完成了。让眼睛和身体也休息一下。' : '休息结束，准备好再开始。');
}
function sync() { finish(timer.tick()); renderTimer(); updateSummary(); }
function preferredMinutes(mode) { return prefs[mode === 'focus' ? 'focusMinutes' : 'breakMinutes']; }
function changeMode(mode) {
  sync();
  if (timer.status === 'running' || timer.status === 'paused') { notify('当前轮次仍在进行。先重置，再切换模式。'); return; }
  timer.reset(mode, preferredMinutes(mode)); save(); renderTimer();
}
function startOrPause() {
  const wasRunning = timer.status === 'running';
  sync();
  if (wasRunning && timer.status === 'complete') return;
  if (timer.status === 'running') finish(timer.pause());
  else { if (timer.status === 'complete') timer.reset(); timer.start(); }
  save(); renderTimer();
}
$('start').addEventListener('click', startOrPause);
$('reset').addEventListener('click', () => { sync(); timer.reset(); save(); renderTimer(); notify('已重置。本轮未完成的时间不计入记录。'); });
$('focus-mode').addEventListener('click', () => changeMode('focus'));
$('break-mode').addEventListener('click', () => changeMode('break'));
$('next-session').addEventListener('click', () => { const mode = timer.mode === 'focus' ? 'break' : 'focus'; timer.reset(mode, preferredMinutes(mode)); timer.start(); save(); renderTimer(); });
function setDuration(event, warn) {
  if (['running', 'paused'].includes(timer.status)) return;
  const value = validMinutes(event.target.value, 0);
  if (!value) { if (warn) { notify('请输入 1 到 180 之间的整数分钟。'); event.target.value = timer.minutes; } return; }
  if (value === timer.minutes) return;
  prefs[timer.mode === 'focus' ? 'focusMinutes' : 'breakMinutes'] = value;
  timer.reset(timer.mode, value); save(); renderTimer();
}
$('duration').addEventListener('input', event => setDuration(event, false));
$('duration').addEventListener('change', event => setDuration(event, true));
$('task').value = task;
$('task').addEventListener('input', event => { task = event.target.value.slice(0, 80); clearTimeout(taskTimeout); taskTimeout = setTimeout(save, 300); });

const presets = { drizzle: { amount: 25, wind: 4, light: 55 }, night: { amount: 65, wind: 12, light: 75 }, storm: { amount: 100, wind: 55, light: 95 } };
function renderWeather() {
  for (const key of ['amount', 'wind', 'light', 'volume', 'texture']) {
    $(key).value = prefs[key];
    text(`${key}-value`, key === 'wind' ? (Math.abs(prefs.wind) < 20 ? '微风' : `${prefs.wind < 0 ? '向左' : '向右'} ${Math.abs(prefs.wind)}%`) : `${prefs[key]}%`);
  }
  for (const key of ['motion', 'chime']) $(key).checked = prefs[key];
  $('quality').value = prefs.quality;
  $('scene').value = prefs.scene;
  document.body.dataset.scene = prefs.scene;
  document.documentElement.dataset.scene = prefs.scene;
  const atmosphere = SCENES[prefs.scene];
  text('focus-heading', atmosphere.heading); text('scene-description', atmosphere.description);
  text('scene-mood', atmosphere.mood); text('interaction-hint', atmosphere.hint);
  const snow = prefs.scene === 'lake';
  text('amount-label', snow ? '飘雪密度' : '雨量');
  text('texture-label', snow ? '风声层次' : '雨声细节');
  $('wind').disabled = prefs.scene === 'window';
  if (prefs.scene === 'window') text('wind-value', '隔窗无风');
  text('light-label', prefs.scene === 'window' ? '室内明暗' : '环境亮度');
  text('sound-hint', snow ? '柔和底声 ↔ 轻轻的风' : prefs.scene === 'window' ? '实录雨声 · 隔窗柔化，保留细小滴答' : '实录雨声 · 绵密雨幕 ↔ 清晰落雨');
  document.querySelector('meta[name="theme-color"]').content = { spring: '#e3ced8', pond: '#c5d4ae', forest: '#d3b38a', lake: '#b7cfdf', day: '#c2ddce', window: '#111619' }[prefs.scene];
  document.querySelectorAll('[data-preset]').forEach(button => {
    const names = snow ? { drizzle: '小雪', night: '中雪', storm: '大雪' } : { drizzle: '细雨', night: '中雨', storm: '骤雨' };
    button.textContent = names[button.dataset.preset];
    const selected = Object.entries(presets[button.dataset.preset]).every(([key, value]) => prefs[key] === value);
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected);
  });
  scene.setOptions(prefs); audio.setVolume(prefs.volume / 100); audio.setWeather(prefs);
}
for (const key of ['amount', 'wind', 'light', 'volume', 'texture']) $(key).addEventListener('input', () => { prefs[key] = Number($(key).value); renderWeather(); save(); });
for (const key of ['motion', 'chime', 'quality', 'scene']) $(key).addEventListener('change', () => { prefs[key] = ['quality', 'scene'].includes(key) ? $(key).value : $(key).checked; renderWeather(); save(); });
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { Object.assign(prefs, presets[button.dataset.preset]); renderWeather(); save(); }));
$('sound').addEventListener('click', async () => {
  $('sound').disabled = true; text('sound', '正在准备声音…');
  try { const enabled = await audio.toggle(); text('sound', enabled ? '关闭声音' : '开启声音'); $('sound').setAttribute('aria-pressed', enabled); }
  catch { text('sound', '开启声音'); $('sound').setAttribute('aria-pressed', 'false'); notify('雨声未能加载，请刷新后重试。'); }
  finally { $('sound').disabled = false; }
});
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { notify('当前环境不支持全屏，可以尝试浏览器的全屏功能。'); }
});
function immerse() {
  const enabled = document.body.classList.toggle('immersed'); $('immerse').setAttribute('aria-pressed', enabled); text('immerse', enabled ? '返回' : '沉浸');
  // Remove invisible controls from the keyboard focus order.
  $('workspace').inert = enabled; document.querySelector('.footer').inert = enabled;
  if (enabled) notify('按 H 或点右上角「返回」，回到控制面板。');
}
$('immerse').addEventListener('click', immerse);
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || document.querySelector('dialog[open]')) return;
  if (event.target.closest('input,textarea,select,[contenteditable]')) return;
  if (event.key.toLowerCase() === 'h') immerse();
  if (event.target.closest('button,a,summary')) return;
  if (event.code === 'Space') { event.preventDefault(); startOrPause(); }
});
document.addEventListener('pointermove', event => { scene.pointer = { x: event.clientX, y: event.clientY, active: event.pointerType !== 'touch' }; });
document.addEventListener('pointerout', event => { if (!event.relatedTarget) scene.pointer.active = false; });
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('button,input,textarea,select,summary,.panel,.timer-card,.daily-summary,.intro,.header,.footer,dialog')) scene.disturb(event.clientX, event.clientY);
});
$('release-form').addEventListener('submit', event => {
  event.preventDefault(); const thought = $('thought').value.trim();
  if (!thought) { notify('写下一句想暂时放下的话，再交给雨。'); $('thought').focus(); return; }
  const words = $('water-words');
  words.classList.remove('release'); void words.offsetWidth;
  words.textContent = thought; words.classList.add('release'); $('thought').value = '';
  clearTimeout(releaseTimeout); releaseTimeout = setTimeout(() => { words.classList.remove('release'); words.textContent = ''; }, 7100);
  scene.disturb(innerWidth * .35, innerHeight * .77);
});
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('clear').addEventListener('click', () => $('clear-dialog').showModal());
$('cancel-clear').addEventListener('click', () => $('clear-dialog').close());
$('confirm-clear').addEventListener('click', () => {
  clearTimeout(taskTimeout); clearTimeout(releaseTimeout);
  records = []; prefs = { ...sanitizePreferences(), motion: !reducedMotion.matches }; task = ''; timer = new FocusTimer();
  $('task').value = ''; $('thought').value = ''; $('water-words').textContent = ''; $('water-words').classList.remove('release');
  let removed = true;
  try { storage.removeItem(STORAGE_KEY); } catch { removed = false; }
  $('clear-dialog').close(); renderWeather(); renderTimer(); updateSummary();
  notify(removed ? '本地记录、任务与偏好已清除。' : '本页已重置，但无法清除存储。请在浏览器设置中清除本站数据。');
});
$('export').addEventListener('click', () => {
  if (!records.length) { notify('完成第一轮专注后，就可以导出记录。'); return; }
  const csv = '\ufeffdate,minutes,completed_at\r\n' + records.map(record => `${record.date},${record.minutes},${new Date(record.completedAt).toISOString()}`).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'rain-room-focus.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('已导出完成记录，不包含任务或杂念文字。');
});
// Keep multiple open tabs consistent without writing back on every storage event.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const incoming = loadData(storage).data;
  prefs = sanitizePreferences(incoming.prefs);
  if (typeof incoming.prefs?.motion !== 'boolean') prefs.motion = !reducedMotion.matches;
  records = sanitizeRecords(incoming.records); timer = FocusTimer.restore(incoming.timer);
  task = typeof incoming.task === 'string' ? incoming.task.slice(0, 80) : '';
  clearTimeout(taskTimeout); $('task').value = task; renderWeather(); renderTimer(); updateSummary();
});
reducedMotion.addEventListener('change', event => { if (event.matches) { prefs.motion = false; renderWeather(); save(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
window.addEventListener('pagehide', () => { clearTimeout(taskTimeout); save(); });
renderWeather(); renderTimer(); updateSummary();
setInterval(sync, 250);
if (!loaded.available) notify('本地数据无法读取；你仍可开始新的一轮。');
if (loaded.data.timer?.status === 'running' && timer.status === 'idle') notify('上次离开后计时已到期，未自动计入记录。可以开始新的一轮。');

setupInstall();
