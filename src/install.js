/** Installation stays optional; unsupported browsers get short instructions. */
export function setupInstall() {
  const button = document.getElementById('install');
  const dialog = document.getElementById('install-dialog');
  const action = document.getElementById('install-action');
  const update = document.getElementById('update-app');
  const status = document.getElementById('offline-status');
  if (window.RainRoomAndroid) {
    button.hidden = true; update.hidden = true;
    status.textContent = '已安装 · 离线可用'; return;
  }
  let prompt;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  button.hidden = Boolean(standalone);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); prompt = event; action.hidden = false;
  });
  window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; dialog.close(); });
  button.addEventListener('click', () => dialog.showModal());
  document.getElementById('close-install').addEventListener('click', () => dialog.close());
  action.addEventListener('click', async () => {
    if (!prompt) return;
    const pending = prompt; prompt = null; action.hidden = true;
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice.outcome === 'accepted') dialog.close();
    } catch { /* The browser may dismiss or withdraw its installation prompt. */ }
  });
  if (!document.querySelector('meta[name="rain-room-build"]')) {
    status.textContent = '本地预览，部署后可离线'; return;
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = '联网使用'; return;
  }
  const register = async () => {
    status.textContent = '正在准备离线雨声…';
    try {
      const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url));
      const showUpdate = () => {
        update.hidden = !(registration.waiting && navigator.serviceWorker.controller);
      };
      showUpdate();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', showUpdate);
      });
      let updating = false;
      update.addEventListener('click', () => {
        if (!registration.waiting) return;
        updating = true; update.disabled = true;
        registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        showUpdate();
        if (updating) location.reload();
      });
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'redundant' && !registration.active) status.textContent = '离线准备未完成，可联网使用';
      });
      await navigator.serviceWorker.ready;
      status.textContent = '已备好离线雨声';
    } catch { status.textContent = '离线准备未完成，可联网使用'; }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
