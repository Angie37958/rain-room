import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000 });
mkdirSync('android/build/smoke', { recursive: true });
adb('install', '-r', 'android/build/rain-room-0.12.1.apk');
adb('logcat', '-c');
adb('shell', 'am', 'start', '-W', '-n', 'app.rainroom.android/.MainActivity');
let loaded = false;
for (let i = 0; i < 12; i++) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  adb('shell', 'uiautomator', 'dump', '/sdcard/rain-room.xml');
  const ui = adb('shell', 'cat', '/sdcard/rain-room.xml');
  if (ui.includes('开始专注') && ui.includes('雨景') && ui.includes('听雨')) { loaded = true; break; }
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
