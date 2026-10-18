/** Cool blue lake illustration, shared landscape language with the autumn forest. */
export function paintCoolEnvironment(c, W, H, scene, brightness, random) {
  const range = (a, b) => a + random() * (b - a);
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#d5e5ef'); sky.addColorStop(.55, '#a1c2d8'); sky.addColorStop(1, '#4a84a9');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // Curving distant ridges, with room for the sky between them.
    for (let i = 0; i < 4; i++) {
      c.fillStyle = ['#bdcedb', '#a4bdcf', '#87a8c1', '#718fac'][i];
      c.beginPath(); c.moveTo(-W * .1, H * (.42 + i * .045));
      c.bezierCurveTo(W * .15, H * (.12 + i * .08), W * .25, H * (.61 - i * .02), W * .46, H * (.34 + i * .05));
      c.bezierCurveTo(W * .7, H * (.13 + i * .08), W * .8, H * (.47 + i * .04), W * 1.1, H * .31);
      c.lineTo(W * 1.1, H); c.lineTo(-W * .1, H); c.fill();
    }
    const water = c.createLinearGradient(0, H * .55, 0, H);
    water.addColorStop(0, '#a9c9dc'); water.addColorStop(.5, '#709fbc'); water.addColorStop(1, '#3b7296');
    c.fillStyle = water; c.fillRect(0, H * .56, W, H * .44);
    const reflection = c.createRadialGradient(W * .48, H * .68, 0, W * .48, H * .68, W * .48);
    reflection.addColorStop(0, '#e0eff47a'); reflection.addColorStop(1, '#d3e7f000');
    c.fillStyle = reflection; c.fillRect(0, H * .56, W, H * .44);
    for (let i = 0; i < 220; i++) {
      const y = range(.57, 1) * H, x = range(0, W);
      c.strokeStyle = `rgba(229,243,251,${range(.07, .3)})`; c.lineWidth = range(.5, 1.6);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + range(10, 90), y); c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = i < 6 ? range(-.02, .16) * W : range(.88, 1.04) * W, y = range(.94, 1.05) * H;
      c.fillStyle = i % 2 ? '#526f86' : '#66839a'; c.beginPath(); c.ellipse(x, y, range(25, 70), range(12, 30), -.2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#abc5d355'; c.beginPath(); c.ellipse(x, y - 4, 25, 8, -.2, Math.PI, Math.PI * 2); c.stroke();
    }
  c.fillStyle = `rgba(21,38,57,${(1 - brightness / 100) * .38})`; c.fillRect(0, 0, W, H);
}
