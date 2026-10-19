const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** The same water outlines used to paint the landscapes also clip the waves. */
export function waterPath(c, W, H, scene) {
  c.beginPath();
  if (scene === 'spring') {
    c.moveTo(W * .62, H * .66);
    c.bezierCurveTo(W * .4, H * .79, W * .82, H * .85, W * .22, H);
    c.lineTo(W * .76, H);
    c.bezierCurveTo(W * .98, H * .85, W * .54, H * .78, W * .66, H * .66);
  } else {
    c.moveTo(0, H * .69);
    c.bezierCurveTo(W * .22, H * .57, W * .7, H * .68, W, H * .59);
    c.lineTo(W, H); c.lineTo(0, H);
  }
  c.closePath();
}

function bezier(a, b, c, d, t) { const u = 1 - t; return u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d; }
export function containsWater(scene, x, y, W, H) {
  if (!['forest', 'pond', 'spring'].includes(scene) || !W || !H) return false;
  x /= W; y /= H;
  const polygon = [];
  const curve = (a, b, c, d) => {
    for (let i = 0; i <= 32; i++) { const t = i / 32; polygon.push([bezier(a[0], b[0], c[0], d[0], t), bezier(a[1], b[1], c[1], d[1], t)]); }
  };
  if (scene === 'spring') {
    curve([.62, .66], [.4, .79], [.82, .85], [.22, 1]);
    polygon.push([.76, 1]); curve([.76, 1], [.98, .85], [.54, .78], [.66, .66]);
  } else {
    curve([0, .69], [.22, .57], [.7, .68], [1, .59]); polygon.push([1, 1], [0, 1]);
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i], [c, d] = polygon[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}

export class RainInteraction {
  constructor() { this.reset(); }
  reset() { this.pointer = { x: -1000, y: -1000, active: false }; this.trail = []; this.pulses = []; }
  move(x, y, active = true) {
    this.pointer = { x, y, active };
    if (!active) return;
    const last = this.trail.at(-1);
    if (!last || Math.hypot(x - last.x, y - last.y) > 18) this.trail.push({ x, y, age: 0 });
    else last.age = 0;
    if (this.trail.length > 12) this.trail.shift();
  }
  release() { this.pointer.active = false; }
  tap(x, y, W, H, scene) {
    if (scene === 'lake') return;
    // Screen-space origins keep the first wave directly under the finger.
    const water = containsWater(scene, x, y, W, H);
    this.pulses.push({ x, y, age: 0, water, scene });
    if (this.pulses.length > 12) this.pulses.shift();
  }
  step(dt) {
    dt = clamp(dt, 0, .05);
    for (const point of this.trail) point.age += dt;
    for (const pulse of this.pulses) pulse.age += dt;
    this.trail = this.trail.filter(point => point.age < .85);
    this.pulses = this.pulses.filter(pulse => pulse.age < 3.2);
  }
  field(x, y, W, H, bias = 1) {
    const radius = clamp(Math.min(W, H) * .28, 105, 190);
    let strongest = 0, offsetX = 0, offsetY = 0;
    const sample = (point, strength, r = radius) => {
      const dx = x - point.x, dy = y - point.y;
      if (Math.abs(dx) > r || Math.abs(dy) > r) return;
      const distance = Math.hypot(dx, dy), u = Math.max(0, 1 - distance / r);
      const influence = u * u * (3 - 2 * u) * strength;
      if (influence <= strongest) return;
      strongest = influence;
      // Open a wide, gently bowed gap instead of nudging single rain strokes.
      offsetX = (Math.abs(dx) < 2 ? bias : Math.sign(dx)) * r * .64 * influence;
      offsetY = (distance > 0 ? dy / distance : 0) * r * .12 * influence;
    };
    if (this.pointer.active) sample(this.pointer, 1);
    for (const point of this.trail) sample(point, (1 - point.age / .85) * .9);
    for (const pulse of this.pulses) if (pulse.age < .7) sample(pulse, (1 - pulse.age / .7) * .95, radius * (.5 + pulse.age));
    return { x: offsetX, y: offsetY, strength: strongest };
  }
  bend(particle, x, y, W, H, dt) {
    const field = this.field(x, y, W, H, particle.x >= 0 ? 1 : -1);
    const blend = 1 - Math.exp(-Math.max(0, dt) * (field.strength > .02 ? 15 : 3.8));
    particle.ox = (particle.ox || 0) + (field.x - (particle.ox || 0)) * blend;
    particle.oy = (particle.oy || 0) + (field.y - (particle.oy || 0)) * blend;
    return { x: x + particle.ox, y: y + particle.oy, strength: field.strength };
  }
  draw(c, W, H, scene) {
    const water = ['forest', 'pond', 'spring'].includes(scene);
    const span = Math.min(190, W * .38, H * .30);
    const warm = scene === 'forest';
    if (water) {
      c.save(); waterPath(c, W, H, scene); c.clip();
      for (const pulse of this.pulses) {
        if (!pulse.water) continue;
        const flatten = .20 + clamp((pulse.y / H - .6) / .4, 0, 1) * .17;
        for (let wave = 0; wave < 3; wave++) {
          const u = (pulse.age - wave * .27) / 2.55;
          if (u <= 0 || u >= 1) continue;
          const ease = 1 - (1 - u) ** 2;
          const r = 3 + ease * span;
          const alpha = Math.min(1, u * 12) * (1 - u) ** 1.45 * (1 - wave * .18);
          c.lineWidth = 2.3 - u;
          c.strokeStyle = `rgba(${warm ? '77,62,39' : '27,78,68'},${alpha * .34})`;
          c.beginPath(); c.ellipse(pulse.x, pulse.y + 1.2, r, r * flatten, 0, 0, Math.PI * 2); c.stroke();
          c.lineWidth = 1.5 - u * .65;
          c.strokeStyle = `rgba(${warm ? '255,239,194' : '240,255,226'},${alpha * .88})`;
          c.beginPath(); c.ellipse(pulse.x, pulse.y - .5, r, r * flatten, 0, 0, Math.PI * 2); c.stroke();
        }
      }
      // Small, fading wakes also make a slow sweep along the water tangible.
      for (const point of this.trail) {
        const u = point.age / .85;
        c.strokeStyle = `rgba(248,248,216,${(1 - u) * .25})`; c.lineWidth = .8;
        c.beginPath(); c.ellipse(point.x, point.y, 4 + u * 24, 1 + u * 7, 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    for (const pulse of this.pulses) {
      if (scene === 'window' || scene === 'lake' || pulse.age > .8) continue;
      const u = pulse.age / .8;
      c.fillStyle = `rgba(${warm ? '255,240,203' : '234,251,244'},${Math.sin(Math.PI * u) * .8})`;
      for (let i = 0; i < 8; i++) {
        const direction = (i / 7 - .5) * 2;
        const x = pulse.x + direction * u * 45;
        const y = pulse.y - Math.sin(Math.PI * u) * (9 + (i % 3) * 7) + u * 4;
        c.beginPath(); c.ellipse(x, y, 1.1, 1.7 - u, direction * .4, 0, Math.PI * 2); c.fill();
      }
    }
  }
}
