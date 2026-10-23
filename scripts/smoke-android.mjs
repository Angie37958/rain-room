import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000 });
mkdirSync('android/build/smoke', { recursive: true });
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
adb('install', '-r', `android/build/rain-room-${version}.apk`);
adb('logcat', '-c');
adb('shell', 'am', 'start', '-W', '-n', 'app.rainroom.android/.MainActivity');
let loaded = false;
for (let i = 0; i < 12; i++) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  adb('shell', 'uiautomator', 'dump', '/sdcard/rain-room.xml');
  const ui = adb('shell', 'cat', '/sdcard/rain-room.xml');
  if (ui.includes('雨景') && ui.includes('专注') && ui.includes('听雨')) { loaded = true; break; }
}
if (loaded) {
  const ui = adb('shell', 'cat', '/sdcard/rain-room.xml');
  const focus = (ui.match(/<node[^>]*>/g) || []).find(node => /(?:text|content-desc)="专注"/.test(node));
  const bounds = focus?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) throw new Error('Mobile focus tab is not accessible');
  adb('shell', 'input', 'tap', String((+bounds[1] + +bounds[3]) / 2), String((+bounds[2] + +bounds[4]) / 2));
  adb('shell', 'uiautomator', 'dump', '/sdcard/rain-room.xml');
  if (!adb('shell', 'cat', '/sdcard/rain-room.xml').includes('开始专注')) throw new Error('Focus sheet did not open');
}
adb('shell', 'screencap', '-p', '/sdcard/rain-room.png');
adb('pull', '/sdcard/rain-room.png', 'android/build/smoke/launch.png');
adb('pull', '/sdcard/rain-room.xml', 'android/build/smoke/launch.xml');
const logs = adb('logcat', '-d', '-s', 'AndroidRuntime:E', 'chromium:E');
if (!loaded || /FATAL EXCEPTION|Uncaught (?:TypeError|ReferenceError|SyntaxError)/.test(logs)) {
  throw new Error(`Android launch failed: ${logs}`);
}
const manifest = readFileSync('android/AndroidManifest.xml', 'utf8');
if (manifest.includes('android.permission.INTERNET')) throw new Error('Offline APK unexpectedly requests internet access');
console.log('Android emulator launch passed: bundled UI loaded without internet permission.');
