import { artworkPlacement, artworkPoint } from './environment.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** The same water outlines used to paint the landscapes also clip the waves. */
export function waterPath(c, W, H, scene) {
  const p = artworkPlacement(W, H);
  c.beginPath(); c.rect(p.x + p.width * .53, p.y + p.height * .08, p.width * .3, p.height * .83); c.closePath();
}
export function containsWater(scene, x, y, W, H) {
  if (!['forest', 'pond', 'spring'].includes(scene) || !W || !H) return false;
  const p = artworkPoint(x, y, W, H);
  // Conservative open-water corridor: never ripple over the torn botanical bank.
  if (scene === 'pond' && ((p.x-.63)/.1)**2 + ((p.y-.7)/.1)**2 < 1) return false;
  return p.x > .53 && p.x < .83 && p.y > .08 && p.y < .91;
}

/** A damped two-dimensional water height field, rather than drawn circles. */
export class WaterSurface {
  constructor(columns = 144, rows = 72) {
    this.columns = columns; this.rows = rows;
    this.height = new Float32Array(columns * rows);
    this.previous = new Float32Array(columns * rows);
    this.next = new Float32Array(columns * rows);
    this.propagation = new Float32Array(columns * rows); this.texture = new Float32Array(columns * rows);
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      this.propagation[row * columns + col] = .065 + Math.sin(col * .37 + row * .19) * .008;
      this.texture[row * columns + col] = .63 + .37 * Math.sin(row * 1.9 + col * .18) ** 2;
    }
    this.pending = 0; this.energy = 0; this.quiet = 10;
  }
  disturb(x, y, amount = 1) {
    const cx = x * (this.columns - 1), cy = y * (this.rows - 1);
    for (let row = Math.max(1, Math.floor(cy - 5)); row < Math.min(this.rows - 1, cy + 6); row++) {
      for (let col = Math.max(1, Math.floor(cx - 5)); col < Math.min(this.columns - 1, cx + 6); col++) {
        const index = row * this.columns + col;
        const distance = ((col - cx) ** 2 + (row - cy) ** 2) / 4;
        const impulse = Math.exp(-distance) * amount;
        this.height[index] = clamp(this.height[index] + impulse, -5, 5);
        this.previous[index] = clamp(this.previous[index] + impulse * .78, -5, 5);
      }
    }
    this.quiet = 0; this.energy = Math.max(this.energy, Math.abs(amount));
  }
  step(dt) {
    if (this.quiet > 8) return;
    dt = clamp(dt, 0, .05); this.pending += dt; this.quiet += dt;
    const C = this.columns, R = this.rows;
    while (this.pending >= 1 / 60) {
      let energy = 0;
      for (let row = 1; row < R - 1; row++) for (let col = 1; col < C - 1; col++) {
        const i = row * C + col, current = this.height[i];
        const laplacian = this.height[i - 1] + this.height[i + 1] + this.height[i - C] + this.height[i + C] - current * 4;
        // Small changes in propagation break the mechanically perfect ring.
        const flow = this.propagation[i];
        this.next[i] = clamp((current * 2 - this.previous[i] + laplacian * flow) * .987, -8, 8);
        energy = Math.max(energy, Math.abs(this.next[i]));
      }
      [this.previous, this.height, this.next] = [this.height, this.next, this.previous];
      this.energy = energy; this.pending -= 1 / 60;
    }
  }
  draw(c, W, H, scene) {
    if (this.quiet > 8 || this.energy < .0001) return;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas'); this.canvas.width = this.columns; this.canvas.height = this.rows;
      this.context = this.canvas.getContext('2d'); this.image = this.context.createImageData(this.columns, this.rows);
    }
    const pixels = this.image.data, C = this.columns, R = this.rows, warm = scene === 'forest';
    pixels.fill(0);
    const highlight = warm ? [246, 229, 190] : [217, 239, 220];
    const shadow = warm ? [66, 64, 46] : [43, 83, 80];
    for (let row = 1; row < R - 1; row++) for (let col = 1; col < C - 1; col++) {
      const i = row * C + col;
      const slope = (this.height[i - C] - this.height[i + C]) * .8 + (this.height[i - 1] - this.height[i + 1]) * .28;
      if (Math.abs(slope) < .004) continue;
      const texture = this.texture[i];
      const alpha = Math.min(.26, Math.abs(slope) * .42) * texture;
      if (alpha < .002) continue;
      const color = slope > 0 ? highlight : shadow;
      pixels[i * 4] = color[0]; pixels[i * 4 + 1] = color[1]; pixels[i * 4 + 2] = color[2]; pixels[i * 4 + 3] = alpha * 255;
    }
    this.context.putImageData(this.image, 0, 0);
    c.save(); waterPath(c, W, H, scene); c.clip();
    c.imageSmoothingEnabled = true; c.drawImage(this.canvas, 0, 0, W, H); c.restore();
  }
}

export class RainInteraction {
  constructor() { this.reset(); }
  reset() {
    this.pointer = { x: -1000, y: -1000, active: false, strength: 0 };
    this.target = { x: -1000, y: -1000, active: false };
    this.motion = 0; this.trail = []; this.pulses = []; this.time = 0; this.lastWake = null;
    this.water = new WaterSurface();
  }
  move(x, y, active = true) {
    if (active) {
      if (!this.target.active) this.trail = [];
      const last = this.trail.at(-1);
      if (!last || Math.hypot(x - last.x, y - last.y) >= 1) {
        this.trail.push({ x, y, age: 0 });
        if (this.trail.length > 160) this.trail.shift();
      }
    }
    if (active && !this.target.active && this.pointer.strength < .05) {
      this.pointer.x = x; this.pointer.y = y;
    }
    if (active && this.target.active) {
      const distance = Math.hypot(x - this.target.x, y - this.target.y);
      this.motion = Math.min(1, this.motion + distance / 100);
    }
    this.target = { x, y, active };
  }
  release() { this.target.active = false; this.motion = 0; }
  wake(x, y, W, H, scene) {
    if (this.lastWake && (this.time - this.lastWake.time < .065 || Math.hypot(x - this.lastWake.x, y - this.lastWake.y) < 14)) return;
    if (!containsWater(scene, x, y, W, H)) return;
    this.water.disturb(x / W, y / H, .22);
    this.lastWake = { x, y, time: this.time };
  }
  tap(x, y, W, H, scene) {
    if (scene === 'lake') return;
    const water = containsWater(scene, x, y, W, H);
    this.pulses.push({ x, y, age: 0, water, scene });
    if (this.pulses.length > 12) this.pulses.shift();
    if (water) this.water.disturb(x / W, y / H, 1.7);
  }
  step(dt) {
    dt = clamp(dt, 0, .05); this.time += dt;
    const follow = 1 - Math.exp(-dt * 6);
    this.pointer.x += (this.target.x - this.pointer.x) * follow;
    this.pointer.y += (this.target.y - this.pointer.y) * follow;
    this.pointer.strength += ((this.target.active ? this.motion : 0) - this.pointer.strength) * (1 - Math.exp(-dt * 4));
    this.pointer.active = this.pointer.strength > .005;
    this.motion *= Math.exp(-dt * 7);
    for (const point of this.trail) point.age += dt;
    this.trail = this.trail.filter(point => point.age < .65);
    for (const pulse of this.pulses) pulse.age += dt;
    this.pulses = this.pulses.filter(pulse => pulse.age < 4.8);
    this.water.step(dt);
  }
  field(x, y, W, H) {
    const radius = clamp(Math.min(W, H) * .10, 45, 80);
    let strongest = 0, offsetX = 0, offsetY = 0;
    const sample = (point, strength, r = radius) => {
      const dx = x - point.x, dy = y - point.y;
      if (Math.abs(dx) > r || Math.abs(dy) > r) return;
      const distance = Math.hypot(dx, dy), u = Math.max(0, 1 - distance / r);
      const influence = u * u * (3 - 2 * u) * strength;
      if (influence <= strongest) return;
      strongest = influence;
      // A continuous direction field avoids flipping sides as the cursor passes.
      offsetX = dx / Math.sqrt(dx * dx + 24 * 24) * r * .09 * influence;
      offsetY = dy / Math.sqrt(distance * distance + 30 * 30) * r * .015 * influence;
    };
    if (this.pointer.active) sample(this.pointer, this.pointer.strength);
    return { x: offsetX, y: offsetY, strength: strongest };
  }
  bend(particle, x, y, W, H, dt) {
    const field = this.field(x, y, W, H);
    dt = clamp(dt, 0, .04);
    const frequency = field.strength > .02 ? 5 : 3.7;
    const ox = particle.ox || 0, oy = particle.oy || 0, vx = particle.vx || 0, vy = particle.vy || 0;
    particle.vx = vx + (frequency * frequency * (field.x - ox) - 2 * frequency * vx) * dt;
    particle.vy = vy + (frequency * frequency * (field.y - oy) - 2 * frequency * vy) * dt;
    particle.ox = ox + particle.vx * dt; particle.oy = oy + particle.vy * dt;
    return { x: x + particle.ox, y: y + particle.oy, strength: field.strength };
  }
  draw(c, W, H, scene) {
    if (['forest', 'pond', 'spring'].includes(scene)) this.water.draw(c, W, H, scene);
    if (this.trail.length < 2) return;
    const points = this.trail, first = points[0], last = points.at(-1);
    const tint = {
      spring: '244,183,208', pond: '169,226,207', forest: '244,201,135',
      lake: '181,216,246', day: '241,212,157', window: '234,192,145'
    }[scene] || '221,226,211';
    const fade = (1 - last.age / .65) ** 2;
    const sheen = c.createLinearGradient(first.x, first.y, last.x, last.y);
    sheen.addColorStop(0, `rgba(${tint},0)`);
    sheen.addColorStop(.3, `rgba(${tint},${fade * .32})`);
    sheen.addColorStop(.72, `rgba(${tint},${fade * .65})`);
    sheen.addColorStop(1, `rgba(255,250,239,${fade * .85})`);
    c.save();
    c.strokeStyle = sheen; c.lineCap = 'round'; c.lineJoin = 'round';
    // Both layers share one continuous curve, keeping even fast gestures connected.
    c.beginPath(); c.moveTo(first.x, first.y);
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i], next = points[i + 1];
      c.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    c.lineTo(last.x, last.y);
    c.lineWidth = 3.2; c.globalAlpha = .28;
    c.shadowColor = `rgba(${tint},${fade * .6})`; c.shadowBlur = 9;
    c.stroke();
    c.shadowBlur = 0; c.globalAlpha = 1; c.lineWidth = 1.35;
    c.stroke(); c.restore();
  }
}
