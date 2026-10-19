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
    c.imageSmoothingEnabled = true; c.drawImage(this.canvas, 0, H * .60, W, H * .40); c.restore();
  }
}

export class RainInteraction {
  constructor() { this.reset(); }
  reset() {
    this.pointer = { x: -1000, y: -1000, active: false, strength: 0 };
    this.target = { x: -1000, y: -1000, active: false };
    this.trail = []; this.pulses = []; this.time = 0; this.lastWake = null;
    this.water = new WaterSurface();
  }
  move(x, y, active = true) {
    if (active && !this.target.active && this.pointer.strength < .05) {
      this.pointer.x = x; this.pointer.y = y;
    }
    this.target = { x, y, active };
  }
  release() { this.target.active = false; }
  wake(x, y, W, H, scene) {
    if (this.lastWake && (this.time - this.lastWake.time < .065 || Math.hypot(x - this.lastWake.x, y - this.lastWake.y) < 14)) return;
    if (!containsWater(scene, x, y, W, H)) return;
    this.water.disturb(x / W, (y / H - .60) / .40, .22);
    this.lastWake = { x, y, time: this.time };
  }
  tap(x, y, W, H, scene) {
    if (scene === 'lake') return;
    const water = containsWater(scene, x, y, W, H);
    this.pulses.push({ x, y, age: 0, water, scene });
    if (this.pulses.length > 12) this.pulses.shift();
    if (water) this.water.disturb(x / W, (y / H - .60) / .40, 1.7);
  }
  step(dt) {
    dt = clamp(dt, 0, .05); this.time += dt;
    const follow = 1 - Math.exp(-dt * 6);
    this.pointer.x += (this.target.x - this.pointer.x) * follow;
    this.pointer.y += (this.target.y - this.pointer.y) * follow;
    this.pointer.strength += ((this.target.active ? 1 : 0) - this.pointer.strength) * (1 - Math.exp(-dt * 4));
    this.pointer.active = this.pointer.strength > .005;
    for (const point of this.trail) point.age += dt;
    this.trail = this.trail.filter(point => point.age < 1.5);
    const last = this.trail.at(-1);
    if (this.target.active && (!last || Math.hypot(this.pointer.x - last.x, this.pointer.y - last.y) > 4)) {
      this.trail.push({ x: this.pointer.x, y: this.pointer.y, age: 0, phase: this.time * 17 });
      if (this.trail.length > 40) this.trail.shift();
    }
    for (const pulse of this.pulses) pulse.age += dt;
    this.pulses = this.pulses.filter(pulse => pulse.age < 4.8);
    this.water.step(dt);
  }
  field(x, y, W, H) {
    const radius = clamp(Math.min(W, H) * .28, 105, 190);
    let strongest = 0, offsetX = 0, offsetY = 0;
    const sample = (point, strength, r = radius) => {
      const dx = x - point.x, dy = y - point.y;
      if (Math.abs(dx) > r || Math.abs(dy) > r) return;
      const distance = Math.hypot(dx, dy), u = Math.max(0, 1 - distance / r);
      const influence = u * u * (3 - 2 * u) * strength;
      if (influence <= strongest) return;
      strongest = influence;
      // A continuous direction field avoids flipping sides as the cursor passes.
      offsetX = dx / Math.sqrt(dx * dx + 24 * 24) * r * .55 * influence;
      offsetY = dy / Math.sqrt(distance * distance + 30 * 30) * r * .09 * influence;
    };
    if (this.pointer.active) sample(this.pointer, this.pointer.strength);
    for (let i = 0; i < this.trail.length; i += 4) {
      const point = this.trail[i]; sample(point, (1 - point.age / 1.5) * .20);
    }
    for (const pulse of this.pulses) if (pulse.age < .9) sample(pulse, Math.sin(Math.PI * pulse.age / .9) * .38);
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
    const color = { spring: '248,204,221', pond: '204,238,224', forest: '248,218,165', lake: '217,238,252', day: '248,232,182', window: '237,212,173' }[scene];
    c.save();
    // Dew-like motes drift off a fine, fading thread; keep the native pointer.
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i], u = point.age / 1.5;
      const x = point.x + Math.sin(point.phase + u * 3) * u * 8;
      const y = point.y - u * 9 + Math.cos(point.phase) * u * 4;
      if (i > 0) {
        const previous = this.trail[i - 1];
        c.strokeStyle = `rgba(${color},${(1 - u) * .20})`; c.lineWidth = .9;
        c.beginPath(); c.moveTo(previous.x, previous.y); c.lineTo(x, y); c.stroke();
      }
      c.fillStyle = `rgba(${color},${(1 - u) ** 1.8 * .65})`;
      c.beginPath(); c.arc(x, y, .6 + (1 - u) * 1.3, 0, Math.PI * 2); c.fill();
    }
    if (this.pointer.active) {
      const { x, y, strength } = this.pointer;
      const radius = 16 + Math.sin(this.time * 1.8) * 2;
      const glow = c.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(${color},${strength * .22})`); glow.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = glow; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    c.restore();
  }
}
