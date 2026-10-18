/** Seasonal landscapes share the original layered, softly coloured Canvas style. */
export function paintSeason(c, W, H, scene, brightness, random) {
  const range = (a, b) => a + random() * (b - a), spring = scene === 'spring';
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, spring ? '#f0dfe4' : '#badbe7'); sky.addColorStop(.55, spring ? '#e7e6d4' : '#e4edcf'); sky.addColorStop(1, '#90ae86');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const sunX = W * .62, sunY = H * .19;
  const halo = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * .28);
  halo.addColorStop(0, spring ? '#fff3df75' : '#fff6d5a0'); halo.addColorStop(1, '#fff3df00'); c.fillStyle = halo; c.fillRect(0, 0, W, H);
  if (!spring) { c.fillStyle = '#fff2ca'; c.beginPath(); c.arc(sunX, sunY, H * .035, 0, Math.PI * 2); c.fill(); }
  for (let i = 0; i < 7; i++) {
    const x = range(.1, .95) * W, y = range(.14, .35) * H;
    c.fillStyle = spring ? '#faf1eb66' : '#f8faf1b0'; c.beginPath(); c.ellipse(x, y, W * range(.05, .10), H * .014, 0, 0, Math.PI * 2); c.fill();
  }
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = (spring ? ['#bdc7b3', '#a3b798', '#8ba982'] : ['#a5bf9f', '#90b28a', '#7fa574'])[layer];
    c.beginPath(); c.moveTo(0, H);
    c.lineTo(0, H * (.47 + layer * .11)); c.bezierCurveTo(W * .24, H * (.29 + layer * .14), W * .55, H * (.69 + layer * .05), W, H * (.42 + layer * .11));
    c.lineTo(W, H); c.fill();
  }
  if (spring) {
    // A pale stream and flowering branches make spring distinct from a green pond.
    const stream = c.createLinearGradient(0, H * .64, 0, H); stream.addColorStop(0, '#c9d8d4'); stream.addColorStop(1, '#85b2b9');
    c.fillStyle = stream; c.beginPath(); c.moveTo(W * .62, H * .66); c.bezierCurveTo(W * .4, H * .79, W * .82, H * .85, W * .22, H); c.lineTo(W * .76, H); c.bezierCurveTo(W * .98, H * .85, W * .54, H * .78, W * .66, H * .66); c.fill();
    c.strokeStyle = '#f8eee040'; c.lineWidth = 1;
    for (let i = 0; i < 50; i++) { const x = range(.35, .7) * W, y = range(.78, 1) * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x + range(8, 40), y); c.stroke(); }
    for (const [x, lean, width] of [[.035, .02, .035], [.98, -.02, .03]]) {
      c.strokeStyle = '#78615b'; c.lineWidth = W * width;
      c.beginPath(); c.moveTo(W * x, H * .9); c.bezierCurveTo(W * (x + lean), H * .6, W * (x - lean), H * .2, W * (x + lean * 3), -H * .05); c.stroke();
      c.lineWidth = W * .008;
      c.beginPath(); c.moveTo(W * x, H * .28); c.quadraticCurveTo(W * (x < .5 ? .2 : .8), H * .09, W * (x < .5 ? .35 : .65), H * .12); c.stroke();
    }
    for (let i = 0; i < 500; i++) {
      const x = range(-.04, 1.04) * W, y = range(-.05, .26) * H, r = range(4, 12) * Math.min(W / 750, 1.2);
      if (Math.abs(x / W - .5) < .14 && y > H * .04) continue;
      c.fillStyle = ['#e3aabd', '#eec1ce', '#f7dce2', '#f9e9e7'][i % 4];
      for (let j = 0; j < 5; j++) { const angle = j * Math.PI * 2 / 5; c.beginPath(); c.ellipse(x + Math.cos(angle) * r * .5, y + Math.sin(angle) * r * .5, r * .55, r * .4, angle, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#b58b6c80'; c.beginPath(); c.arc(x, y, r * .15, 0, Math.PI * 2); c.fill();
    }
  } else {
    // Open meadow, a winding footpath and a bench: clearly outdoors in daylight.
    c.fillStyle = '#d4c99c'; c.beginPath(); c.moveTo(W * .52, H * .66); c.bezierCurveTo(W * .47, H * .77, W * .18, H * .87, W * .46, H); c.lineTo(W * .57, H); c.bezierCurveTo(W * .27, H * .87, W * .53, H * .76, W * .55, H * .66); c.fill();
    c.strokeStyle = '#526e56'; c.lineWidth = Math.max(2, W * .003);
    for (const x of [.08, .24]) { c.beginPath(); c.moveTo(W * x, H * .82); c.lineTo(W * x, H * .94); c.stroke(); }
    c.fillStyle = '#aa8860';
    c.fillRect(W * .065, H * .81, W * .19, H * .015); c.fillRect(W * .065, H * .835, W * .19, H * .015); c.fillRect(W * .055, H * .875, W * .21, H * .016);
    c.strokeStyle = '#647c4e'; c.lineWidth = 1;
    for (let i = 0; i < 160; i++) {
      const x = range(0, W), y = range(.79, 1.04) * H, r = range(2, 4);
      if (x > W * .30 && x < W * .60) continue;
      c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x - 2, y); c.stroke();
      c.fillStyle = i % 3 === 0 ? '#e8d782' : '#f5edda';
      for (let j = 0; j < 5; j++) { c.beginPath(); c.ellipse(x + Math.cos(j * 1.256) * r, y + Math.sin(j * 1.256) * r, r, r * .6, j * 1.256, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#c6a95a'; c.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  c.fillStyle = `rgba(43,58,51,${(1 - brightness / 100) * .26})`; c.fillRect(0, 0, W, H);
}

export function paintIce(c, W, H, random) {
  const range = (a, b) => a + random() * (b - a);
  const ice = c.createLinearGradient(0, H * .56, 0, H);
  ice.addColorStop(0, '#c1d6e1'); ice.addColorStop(.35, '#a4c4d7'); ice.addColorStop(1, '#729eb9');
  c.fillStyle = ice; c.fillRect(0, H * .56, W, H * .44);
  for (let i = 0; i < 20; i++) {
    const x = range(0, W), y = range(.60, 1) * H;
    c.strokeStyle = '#e9f4f84a'; c.lineWidth = range(.6, 1.5);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + W * .035, y - H * .015); c.lineTo(x + W * .09, y + H * .004); c.stroke();
  }
  c.fillStyle = '#e7edf0'; c.beginPath(); c.moveTo(0, H * .85); c.quadraticCurveTo(W * .13, H * .84, W * .32, H); c.lineTo(0, H); c.fill();
  c.beginPath(); c.moveTo(W, H * .87); c.quadraticCurveTo(W * .87, H * .84, W * .70, H); c.lineTo(W, H); c.fill();
  for (const x of [.035, .09, .955]) {
    c.strokeStyle = '#6e8798'; c.lineWidth = Math.max(2, W * .003);
    c.beginPath(); c.moveTo(W * x, H * .91); c.lineTo(W * (x + .012), H * .45); c.stroke();
    c.lineWidth = Math.max(1, W * .0015);
    for (let j = 0; j < 5; j++) {
      const y = H * (.5 + j * .06), side = j % 2 ? -1 : 1;
      c.beginPath(); c.moveTo(W * (x + .01), y + H * .10); c.lineTo(W * (x + .01 + side * .04), y); c.stroke();
      c.strokeStyle = '#edf4f7'; c.beginPath(); c.moveTo(W * (x + .01 + side * .005), y + H * .08); c.lineTo(W * (x + .01 + side * .037), y); c.stroke(); c.strokeStyle = '#6e8798';
    }
  }
}
