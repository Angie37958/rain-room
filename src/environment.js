import { waterPath } from './interaction.js';
import { paintCoolEnvironment } from './cool-environments.js';
import { paintWindow } from './window-environment.js';
import { paintSeason, paintIce } from './seasonal-environments.js';
/** Cache the detailed landscape. Only rain and ripples need repainting each frame. */
export function createEnvironment(width, height, scene, brightness, ratio = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const c = canvas.getContext('2d'); c.scale(ratio, ratio);
  const W = width, H = height;
  let seed = 61826;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  if (scene === 'spring' || scene === 'day') {
    paintSeason(c, W, H, scene, brightness, random);
    return canvas;
  }
  if (scene === 'lake' || scene === 'window') {
    if (scene === 'window') paintWindow(c, W, H, brightness, random);
    else {
      paintCoolEnvironment(c, W, H, scene, brightness, random);
      paintIce(c, W, H, random);
      c.fillStyle = `rgba(21,38,57,${(1 - brightness / 100) * .30})`; c.fillRect(0, H * .56, W, H * .44);
    }
    return canvas;
  }
  const autumn = scene === 'forest';
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, autumn ? '#efdbb0' : '#d8e3b8'); sky.addColorStop(.45, autumn ? '#d3b587' : '#abc9a4'); sky.addColorStop(1, autumn ? '#a38a67' : '#5b8868');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  // Soft wooded ridges make the open middle feel distant.
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = (autumn ? ['#d2b28a', '#ba9572', '#a47c61'] : ['#9bb790', '#89a982', '#789c75'])[layer];
    c.beginPath(); c.moveTo(0, H);
    for (let x = -W * .1; x <= W * 1.2; x += W / 20) c.lineTo(x, H * (.32 + layer * .07) + Math.sin(x / W * 9 + layer * 2) * H * .045 + range(-H * .02, H * .02));
    c.lineTo(W, H); c.closePath(); c.fill();
  }
  for (let i = 0; i < 42; i++) {
    const x = range(0, W), base = range(.58, .70) * H, top = range(.12, .35) * H;
    c.strokeStyle = `rgba(${autumn ? '108,72,47' : '47,89,57'},${range(.08, .21)})`; c.lineWidth = range(1, 5);
    c.beginPath(); c.moveTo(x, base); c.bezierCurveTo(x + 4, H * .4, x - 8, H * .3, x - 14, top); c.stroke();
  }
  const mist = c.createLinearGradient(0, H * .28, 0, H * .72);
  mist.addColorStop(0, '#e0ebd400'); mist.addColorStop(.5, autumn ? '#f4e4c475' : '#deead475'); mist.addColorStop(1, '#d1e3c000');
  c.fillStyle = mist; c.fillRect(0, H * .28, W, H * .44);
  const water = c.createLinearGradient(0, H * .62, 0, H);
  water.addColorStop(0, autumn ? '#cfb68b' : '#a7bea0'); water.addColorStop(.3, autumn ? '#b19870' : '#7fa384'); water.addColorStop(1, autumn ? '#756f57' : '#47795d');
  c.fillStyle = water; waterPath(c, W, H, scene); c.fill();
  for (let i = 0; i < 130; i++) {
    const x = range(0, W), y = range(H * .67, H), length = range(8, 75);
    c.strokeStyle = `rgba(226,243,193,${range(.025, .12)})`; c.lineWidth = range(.5, 1.5);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + length, y); c.stroke();
  }
  function leaf(x, y, length, angle, color, slender = .30) {
    c.save(); c.translate(x, y); c.rotate(angle); c.fillStyle = color;
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(length * .32, -length * slender, length * .85, -length * slender, length, 0); c.bezierCurveTo(length * .63, length * slender * .6, length * .22, length * slender * .7, 0, 0); c.fill();
    c.strokeStyle = '#b2ca7726'; c.lineWidth = .6; c.beginPath(); c.moveTo(0, 0); c.lineTo(length * .85, 0); c.stroke(); c.restore();
  }
  function fern(x, y, length, direction) {
    c.save(); c.translate(x, y); c.rotate(direction);
    c.strokeStyle = '#82613d'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(length * .2, -length * .5, length * .55, -length); c.stroke();
    for (let i = 1; i < 16; i++) {
      const t = i / 16, px = length * .55 * t * t, py = -length * t, size = length * .28 * Math.sin(t * Math.PI);
      leaf(px, py, size, -2.7 + t * .4, i % 2 ? '#ac733c' : '#c19b48', .18);
      leaf(px, py, size, -.25 - t * .4, i % 2 ? '#c49c4d' : '#9f693d', .18);
    }
    c.restore();
  }
  if (scene === 'forest') {
    for (const [x, lean, thick] of [[-.02, .035, .048], [.035, -.07, .020], [.985, -.025, .039], [1.05, -.1, .055]]) {
      const bark = c.createLinearGradient(W * x, 0, W * (x + thick), 0); bark.addColorStop(0, '#69503d'); bark.addColorStop(.5, '#8b6b49'); bark.addColorStop(1, '#5b493b');
      c.strokeStyle = bark; c.lineWidth = W * thick;
      c.beginPath(); c.moveTo(W * x, H * .81); c.bezierCurveTo(W * (x + lean), H * .55, W * (x + lean * .5), H * .25, W * (x + lean * 1.8), -H * .1); c.stroke();
      c.strokeStyle = '#76563c'; c.lineWidth = W * thick * .25;
      c.beginPath(); c.moveTo(W * (x + lean), H * .25); c.quadraticCurveTo(W * (x + lean + .1), H * .1, W * (x + .18), H * .08); c.stroke();
    }
    // Dense, individually drawn canopy leaves rather than a flat green wash.
    for (let i = 0; i < 680; i++) {
      const x = range(-.12, 1.12) * W, y = range(-.14, .22) * H;
      if (Math.abs(x / W - .52) < .18 && y > H * .06 && random() < .8) continue;
      leaf(x, y, range(10, 42) * Math.min(W / 900, 1.3), range(-Math.PI, Math.PI), ['#bd6c35', '#d69c42', '#d6ad50', '#b75832', '#96743e'][i % 5]);
    }
    for (let i = 0; i < 18; i++) fern(i < 9 ? range(-.05, .15) * W : range(.88, 1.08) * W, range(.91, 1.1) * H, range(.13, .27) * H, range(-.7, .7));
    for (let i = 0; i < 55; i++) leaf(range(0, W), range(H * .71, H), range(7, 17), range(-Math.PI, Math.PI), ['#c2823e', '#c8a154', '#a66c3c'][i % 3], .22);
  } else if (scene === 'pond') {
    // Overhanging willow leaves frame a brighter, more open water surface.
    for (let i = 0; i < 32; i++) {
      const x = range(-.02, 1.05) * W, end = range(.1, .36) * H;
      c.strokeStyle = '#557a4380'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x - W * .02, end * .6, x + W * .025, end); c.stroke();
      for (let j = 0; j < 9; j++) leaf(x + W * .025 * j / 9, end * j / 9, range(16, 30), j % 2 ? 1.8 : .7, '#698e49', .14);
    }
    for (let i = 0; i < 37; i++) {
      const x = range(-.05, 1.05) * W, y = range(.71, 1.08) * H, r = range(16, 55) * (y / H);
      c.fillStyle = i % 2 ? '#3f7f53' : '#6a974f'; c.beginPath(); c.ellipse(x, y, r, r * .31, -.12, .1, Math.PI * 1.91); c.lineTo(x, y); c.fill();
      c.strokeStyle = '#c2d08645'; c.lineWidth = .7;
      for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * .85, y + Math.sin(a) * r * .25); c.stroke(); }
    }
    for (const [x, y] of [[.08, .85], [.85, .78], [.69, .94]]) {
      c.strokeStyle = '#4c7650'; c.lineWidth = 2; c.beginPath(); c.moveTo(W * x, H * y + 12); c.lineTo(W * x, H * y - 20); c.stroke();
      for (let j = 0; j < 6; j++) leaf(W * x, H * y - 18, 20, -Math.PI + j * .33, j % 2 ? '#e4d5bf' : '#f5edda', .48);
    }
  }
  // A warm opening in the canopy; brightness varies without burying the greens.
  const sun = c.createRadialGradient(W * .52, H * .12, 0, W * .52, H * .12, Math.max(W, H) * .55);
  sun.addColorStop(0, '#f8f4cf70'); sun.addColorStop(.5, '#f0f0c615'); sun.addColorStop(1, '#f0f0c600');
  c.fillStyle = sun; c.fillRect(0, 0, W, H);
  c.fillStyle = `rgba(${autumn ? '67,44,25' : '16,48,30'},${(1 - brightness / 100) * .42})`; c.fillRect(0, 0, W, H);
  return canvas;
}
