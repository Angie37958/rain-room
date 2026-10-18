/** Same layered Canvas illustration style as the outdoor scenes. */
export function windowBounds(W, H) {
  return { left: W * .24, top: H * .09, right: W * .98, bottom: H * .79, divider: W * .77 };
}
export function paintWindow(c, W, H, brightness, random) {
  const range = (a, b) => a + random() * (b - a), glass = windowBounds(W, H);
  const wall = c.createLinearGradient(0, 0, W, H);
  wall.addColorStop(0, '#383a3c'); wall.addColorStop(.5, '#222d35'); wall.addColorStop(1, '#18242f');
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  c.save(); c.beginPath(); c.rect(glass.left, glass.top, glass.right - glass.left, glass.bottom - glass.top); c.clip();
  const night = c.createLinearGradient(0, glass.top, 0, glass.bottom);
  night.addColorStop(0, '#344858'); night.addColorStop(.6, '#486071'); night.addColorStop(1, '#2c4558');
  c.fillStyle = night; c.fillRect(glass.left, glass.top, W, H);
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ['#425768', '#344c60', '#293e50'][layer];
    for (let i = 0; i < 17; i++) {
      const x = glass.left + (i / 16 - .05) * (glass.right - glass.left), width = range(.035, .075) * W;
      const top = range(.43, .65) * H + layer * H * .04;
      c.fillRect(x, top, width, H);
      for (let row = 0; row < 8; row++) for (let col = 0; col < 3; col++) {
        if (random() > .18) continue;
        c.fillStyle = random() > .5 ? '#bf9e6f70' : '#9ab4c345';
        c.fillRect(x + width * (.13 + col * .27), top + 12 + row * H * .025, Math.max(2, width * .08), H * .007);
      }
      c.fillStyle = ['#425768', '#344c60', '#293e50'][layer];
    }
  }
  const haze = c.createLinearGradient(0, H * .28, 0, H * .8);
  haze.addColorStop(0, '#9baeba00'); haze.addColorStop(.45, '#a4b6be12'); haze.addColorStop(1, '#7d919500');
  c.fillStyle = haze; c.fillRect(glass.left, glass.top, W, H);
  for (let i = 0; i < 80; i++) {
    const x = range(glass.left, glass.right), y = range(glass.top, glass.bottom);
    c.strokeStyle = '#d4e3ed18'; c.lineWidth = .6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1, Math.min(glass.bottom, y + range(14, 65))); c.stroke();
  }
  c.restore();
  // Restrained rectangular frame keeps the same simple shapes as trees and ridges.
  c.strokeStyle = '#15232d'; c.lineWidth = Math.max(9, W * .009);
  c.strokeRect(glass.left, glass.top, glass.right - glass.left, glass.bottom - glass.top);
  c.beginPath(); c.moveTo(glass.divider, glass.top); c.lineTo(glass.divider, glass.bottom); c.stroke();
  c.strokeStyle = '#86938e32'; c.lineWidth = 1;
  c.strokeRect(glass.left + 6, glass.top + 6, glass.right - glass.left - 12, glass.bottom - glass.top - 12);
  const light = c.createRadialGradient(W * .115, H * .59, 0, W * .115, H * .59, Math.min(W, H) * .53);
  light.addColorStop(0, '#efb66361'); light.addColorStop(.5, '#cc965527'); light.addColorStop(1, '#cc965500');
  c.fillStyle = light; c.fillRect(0, 0, W, H);
  const table = c.createLinearGradient(0, H * .81, 0, H);
  table.addColorStop(0, '#68503d'); table.addColorStop(.12, '#594632'); table.addColorStop(1, '#332f2c');
  c.fillStyle = table; c.beginPath(); c.moveTo(0, H * .84); c.lineTo(W, H * .79); c.lineTo(W, H); c.lineTo(0, H); c.fill();
  for (let i = 0; i < 25; i++) {
    const y = range(.84, 1) * H;
    c.strokeStyle = '#bc966823'; c.lineWidth = .7;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y - H * .035); c.stroke();
  }
  // Gentle ambient warmth from an off-screen light, without a visible fixture.
  c.save(); c.translate(0, H * .88); c.scale(1, .28);
  // Use a separate gradient in the transformed coordinate system for the desk glow.
  const deskGlow = c.createRadialGradient(W * .12, 0, 0, W * .12, 0, W * .25);
  deskGlow.addColorStop(0, '#eec27866'); deskGlow.addColorStop(1, '#eec27800'); c.fillStyle = deskGlow; c.fillRect(0, -W * .3, W * .45, W * .6); c.restore();
  // A book left open in the warm spill of light, with curved paper and a bookmark.
  c.save(); c.translate(W * .145, H * .895); c.rotate(-.055);
  const bw = Math.min(W * .23, H * .34), bh = bw * .30;
  c.fillStyle = '#16212b55'; c.beginPath(); c.ellipse(0, bh * .4, bw * .65, bh * .65, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#655346';
  c.beginPath(); c.moveTo(-bw * .55, -bh * .28); c.lineTo(-bw * .03, -bh * .12); c.lineTo(bw * .53, -bh * .34); c.lineTo(bw * .59, bh * .68); c.lineTo(0, bh * .8); c.lineTo(-bw * .59, bh * .6); c.closePath(); c.fill();
  for (const side of [-1, 1]) {
    const paper = c.createLinearGradient(0, 0, side * bw * .55, 0);
    paper.addColorStop(0, '#b3a18a'); paper.addColorStop(.12, '#e4d1ac'); paper.addColorStop(1, side < 0 ? '#f0ddba' : '#cec1a6');
    c.fillStyle = paper;
    c.beginPath(); c.moveTo(0, -bh * .13); c.quadraticCurveTo(side * bw * .23, -bh * .55, side * bw * .52, -bh * .34);
    c.lineTo(side * bw * .56, bh * .55); c.quadraticCurveTo(side * bw * .26, bh * .39, 0, bh * .72); c.closePath(); c.fill();
    c.strokeStyle = '#776a5457'; c.lineWidth = .7;
    for (let row = 0; row < 9; row++) {
      const y = -bh * .15 + row * bh * .072;
      c.beginPath(); c.moveTo(side * bw * .08, y + bh * .14); c.quadraticCurveTo(side * bw * .27, y - bh * .03, side * bw * (row === 8 ? .35 : .45), y); c.stroke();
    }
  }
  c.strokeStyle = '#8d7a60'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -bh * .13); c.lineTo(0, bh * .72); c.stroke();
  c.fillStyle = '#a26652'; c.beginPath(); c.moveTo(bw * .12, bh * .48); c.lineTo(bw * .18, bh * .47); c.lineTo(bw * .19, bh * .95); c.lineTo(bw * .15, bh * .86); c.lineTo(bw * .12, bh * .97); c.fill();
  c.restore();
  c.fillStyle = `rgba(7,14,23,${(1 - brightness / 100) * .35})`; c.fillRect(0, 0, W, H);
}
