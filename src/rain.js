import { createEnvironment } from './environment.js';
import { windowBounds } from './window-environment.js';
import { RainInteraction } from './interaction.js';
const random = (min, max) => min + Math.random() * (max - min);
export class RainScene {
  constructor(canvas, options) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.options = options;
    this.interaction = new RainInteraction(); this.rings = []; this.last = 0;
    this.glassDrops = Array.from({ length: 250 }, () => ({ x: random(.025, .975), y: random(0, .93), r: random(.8, 3.8), phase: random(0, Math.PI * 2) }));
    this.airParticles = Array.from({ length: 280 }, () => ({ x: Math.random(), y: Math.random(), r: random(.8, 2.8), phase: random(0, Math.PI * 2) }));
    this.drops = Array.from({ length: 3600 }, () => ({ x: random(-20, 20), y: random(0, 14), z: random(1, 32), speed: random(8, 15), length: random(.18, .48) }));
    if (!this.ctx) return;
    for (let i = 0; i < 160; i++) this.rings.push({ x: random(-18, 18), z: random(1, 30), age: random(0, .4), life: random(.5, 1), large: false });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.requestFrame());
    this.requestFrame();
  }
  resize() {
    if (!this.ctx) return;
    this.width = innerWidth; this.height = innerHeight; this.resetInteraction();
    const mobile = innerWidth < 720;
    this.low = this.options.quality === 'low' || (this.options.quality === 'auto' && (mobile || navigator.hardwareConcurrency <= 4));
    const ratio = Math.min(devicePixelRatio || 1, this.low ? 1 : 1.6);
    this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.backdrop = createEnvironment(this.width, this.height, this.options.scene, this.options.light, this.low ? 1 : Math.min(ratio, 1.4));
    this.requestFrame();
  }
  setOptions(options) {
    const rebuild = options.quality !== this.options.quality || options.scene !== this.options.scene || options.light !== this.options.light;
    if (options.scene !== this.options.scene || !options.motion) this.resetInteraction();
    this.options = { ...options }; if (rebuild) this.resize(); this.requestFrame();
  }
  project(x, y, z) { const s = Math.min(this.width, this.height) * 1.15 / (z + 4); return { x: this.width * .48 + x * s, y: this.height * .42 + (3.1 - y) * s, s }; }
  resetInteraction() {
    this.interaction.reset();
    for (const particles of [this.drops, this.glassDrops, this.airParticles]) for (const particle of particles) particle.ox = particle.oy = particle.vx = particle.vy = 0;
  }
  movePointer(x, y, active = true) {
    if (!this.options.motion) return;
    this.interaction.move(x, y, active);
    if (active) this.interaction.wake(x, y, this.width, this.height, this.options.scene);
    this.requestFrame();
  }
  releasePointer() { this.interaction.release(); }
  disturb(x, y) {
    if (!this.options.motion) return;
    this.interaction.tap(x, y, this.width, this.height, this.options.scene);
    this.requestFrame();
  }
  requestFrame() { if (this.ctx && !this.frameId && !document.hidden) this.frameId = requestAnimationFrame(t => this.draw(t)); }
  draw(time) {
    this.frameId = null;
    if (document.hidden) { this.last = time; return; }
    if (this.options.motion && time - this.last < (this.low ? 32 : 16)) { this.requestFrame(); return; }
    const dt = this.options.motion ? Math.min((time - this.last) / 1000 || .016, .04) : 0; this.last = time;
    const ctx = this.ctx, W = this.width, H = this.height, light = this.options.light / 100, wind = this.options.wind / 100;
    this.interaction.step(dt);
    ctx.drawImage(this.backdrop, 0, 0, W, H);
    if (this.options.scene === 'lake') {
      this.drawAir(dt, 'snow');
      this.interaction.draw(ctx, W, H, this.options.scene);
      if (this.options.motion) this.requestFrame();
      return;
    }
    if (this.options.scene === 'window') {
      this.drawWindowRain(dt);
      this.interaction.draw(ctx, W, H, this.options.scene);
      if (this.options.motion) this.requestFrame();
      return;
    }
    if (this.options.scene === 'day' || this.options.scene === 'spring') {
      this.drawDayRain(dt);
      if (this.options.scene === 'spring') this.drawAir(dt, 'petals');
      this.interaction.draw(ctx, W, H, this.options.scene);
      if (this.options.motion) this.requestFrame();
      return;
    }
    const cool = this.options.scene === 'lake', autumn = this.options.scene === 'forest';
    const glow = ctx.createRadialGradient(W * .40, H * .74, 0, W * .45, H * .64, W * .7);
    glow.addColorStop(0, `rgba(${cool ? '209,231,249' : autumn ? '249,217,164' : '216,239,170'},${light * .12})`); glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const lights = [{ x: -6, z: 9 }, { x: 0, z: 17 }, { x: 6, z: 8 }];
    for (const spot of lights) {
      const p = this.project(spot.x, 0, spot.z);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, .16);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.s * 4.5);
      g.addColorStop(0, `rgba(${cool ? '194,224,248' : autumn ? '246,214,169' : '185,228,212'},${light * .35})`); g.addColorStop(.2, `rgba(${cool ? '127,176,213' : autumn ? '205,166,116' : '120,180,172'},${light * .18})`); g.addColorStop(1, 'rgba(20,60,60,0)');
      ctx.fillStyle = g; ctx.fillRect(-p.s * 5, -p.s * 5, p.s * 10, p.s * 10); ctx.restore();
    }
    const count = Math.floor((this.low ? 1500 : this.drops.length) * this.options.amount / 100);
    for (let i = 0; i < count; i++) {
      const d = this.drops[i]; d.y -= d.speed * dt; d.x += wind * dt * 2.5;
      if (d.y < 0) {
        if (this.rings.length < (this.low ? 180 : 450)) this.rings.push({ x: d.x, z: d.z, age: 0, life: random(.35, .8), large: false });
        d.y = random(9, 15); d.x = random(-20, 20);
      }
      const p = this.project(d.x, d.y, d.z), q = this.project(d.x + wind * d.length * .18, d.y - d.length, d.z);
      const bent = this.interaction.bend(d, p.x, p.y, W, H, dt);
      const ox = bent.x - p.x, oy = bent.y - p.y;
      const bow = Math.min(1, Math.hypot(q.x - p.x, q.y - p.y) / 35);
      ctx.strokeStyle = `rgba(${cool ? '228,244,255' : autumn ? '255,239,207' : '244,255,221'},${(.20 + .45 / (1 + d.z * .12)) * light * (1 - bent.strength * .5)})`; ctx.lineWidth = d.z < 5 ? 1.1 : .7;
      ctx.beginPath(); ctx.moveTo(bent.x, bent.y); ctx.quadraticCurveTo((p.x + q.x) * .5 + ox * (1 + bow * .025), (p.y + q.y) * .5 + oy, q.x + ox * (1 - bow * .14), q.y + oy); ctx.stroke();
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]; ring.age += dt;
      if (ring.age > ring.life) { this.rings.splice(i, 1); continue; }
      const p = this.project(ring.x, 0, ring.z), u = ring.age / ring.life;
      let illumination = .25;
      for (const spot of lights) illumination += Math.exp(-((ring.x - spot.x) ** 2 + (ring.z - spot.z) ** 2) * .09) * .8;
      ctx.strokeStyle = `rgba(${cool ? '222,242,255' : autumn ? '255,229,184' : '237,255,207'},${(1 - u) / (1 + ring.z * .08) * light * illumination * (ring.large ? 1.8 : 1.3)})`;
      ctx.lineWidth = ring.large ? 1 : .65;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(.1, p.s * (.035 + u * (ring.large ? 2 : .32))), Math.max(.1, p.s * (.012 + u * (ring.large ? .45 : .07))), 0, 0, Math.PI * 2); ctx.stroke();
      if (u < .4 && !ring.large) { ctx.fillStyle = `rgba(${cool ? '216,239,255' : autumn ? '255,228,186' : '206,242,224'},${(1 - u / .4) * illumination * light * .6})`; ctx.fillRect(p.x, p.y - Math.sin(u / .4 * Math.PI) * p.s * .15, 1, 1.5); }
    }
    this.interaction.draw(ctx, W, H, this.options.scene);
    if (this.options.motion) this.requestFrame();
  }
  drawDayRain(dt) {
    const c = this.ctx, W = this.width, H = this.height, spring = this.options.scene === 'spring';
    const count = Math.floor((this.low ? 260 : 620) * this.options.amount / 100);
    const wind = this.options.wind / 100;
    for (let i = 0; i < count; i++) {
      const d = this.drops[i], depth = .3 + d.z / 32;
      d.y -= dt * (4 + d.speed * .55); d.x += wind * dt * 1.4;
      if (d.y < 0) { d.y = 14; d.x = random(-20, 20); }
      if (d.x > 20) d.x = -20; if (d.x < -20) d.x = 20;
      const baseX = (d.x + 20) / 40 * W, baseY = (1 - d.y / 14) * H;
      const bent = this.interaction.bend(d, baseX, baseY, W, H, dt);
      const { x, y } = bent;
      const length = (7 + d.length * 20) / depth;
      const curve = (x - baseX) * .10 * Math.min(1, length / 40);
      c.strokeStyle = `rgba(65,99,119,${(.20 + .12 / depth) * this.options.light / 100 * (1 - bent.strength * .5)})`;
      c.lineWidth = .5 + .45 / depth;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + wind * length * .1 + curve, y + length * .5, x + wind * length * .3, y + length); c.stroke();
      c.strokeStyle = 'rgba(255,255,246,.35)'; c.lineWidth = .5;
      c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + 1 + wind * length * .3, y + length * .65); c.stroke();
    }
    if (spring) {
      // Keep small ripples inside the curved stream, away from the dry banks.
      for (let i = 0; i < 12; i++) {
        const phase = (this.last / 1600 + i * .271) % 1;
        const y = H * (.82 + (i % 4) * .045), x = W * (.60 + Math.sin(i * 3.1) * .045);
        c.strokeStyle = `rgba(242,250,248,${(1 - phase) * .45})`; c.lineWidth = .7;
        c.beginPath(); c.ellipse(x, y, 2 + phase * 15, .6 + phase * 3, 0, 0, Math.PI * 2); c.stroke();
      }
    }
  }
  drawAir(dt, kind) {
    const ctx = this.ctx, W = this.width, H = this.height, snow = kind === 'snow', petals = kind === 'petals';
    const count = Math.floor(snow ? 45 + this.options.amount * 1.8 : petals ? (this.low ? 90 : 145) : 12 + this.options.amount * .4);
    for (let i = 0; i < Math.min(count, this.airParticles.length); i++) {
      const p = this.airParticles[i];
      p.y += dt * (snow ? .012 + p.r * .008 : petals ? .010 + p.r * .004 : -.004);
      p.phase += dt * .6;
      p.x += dt * (this.options.wind / 100 * .025 + Math.sin(p.phase) * .006 + (petals ? .009 : 0));
      if (p.y > 1.03) { p.y = -.03; p.x = Math.random(); }
      if (p.y < -.04) p.y = 1.02;
      if (p.x > 1.03) p.x = -.03; if (p.x < -.03) p.x = 1.03;
      const bent = this.interaction.bend(p, p.x * W, p.y * H, W, H, dt);
      ctx.fillStyle = snow ? `rgba(247,252,255,${.35 + p.r * .16})` : petals ? ['#f7d7e2b8', '#fbe7ebc9', '#e4b3c3ad'][i % 3] : '#fff4d3a8';
      ctx.beginPath();
      if (petals) {
        ctx.save(); ctx.translate(bent.x, bent.y); ctx.rotate(p.phase * .55);
        ctx.scale(.7 + Math.sin(p.phase) * .25, 1);
        const r = p.r * 1.5;
        ctx.moveTo(0, r * 1.25);
        ctx.bezierCurveTo(-r * 1.5, 0, -r * 1.1, -r * 1.4, -.2 * r, -r * .8);
        ctx.quadraticCurveTo(0, -r * .45, r * .2, -r * .8);
        ctx.bezierCurveTo(r * 1.1, -r * 1.4, r * 1.5, 0, 0, r * 1.25);
        ctx.fill(); ctx.restore();
      } else { ctx.arc(bent.x, bent.y, snow ? p.r : p.r * .6, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  drawWindowRain(dt) {
    const ctx = this.ctx, W = this.width, H = this.height;
    const count = Math.min(this.glassDrops.length, Math.floor((this.low ? 45 : 95) * (.3 + this.options.amount / 140)));
    const glass = windowBounds(W, H);
    ctx.save(); ctx.beginPath(); ctx.rect(glass.left + 5, glass.top + 5, glass.right - glass.left - 10, glass.bottom - glass.top - 10); ctx.clip();
    for (let i = 0; i < count; i++) {
      const drop = this.glassDrops[i];
      if (drop.r > 1.9) drop.y += dt * (drop.r - 1.8) * .009 * (.4 + this.options.amount / 100);
      if (drop.y > .94) { drop.y = -.02; drop.x = random(.025, .975); }
      if (Math.abs(drop.x * W - glass.divider) < Math.max(6, W * .006)) continue;
      const baseX = drop.x * W + Math.sin(drop.y * 18 + drop.phase) * 2;
      const bent = this.interaction.bend(drop, baseX, drop.y * H, W, H, dt);
      const x = bent.x, y = bent.y, r = drop.r;
      ctx.globalAlpha = 1 - bent.strength * .75;
      if (r > 2) {
        ctx.strokeStyle = 'rgba(240,247,250,.10)'; ctx.lineWidth = r * .25;
        ctx.beginPath(); ctx.moveTo(x + Math.sin(drop.phase), y - r * 9); ctx.quadraticCurveTo(x - 1, y - r * 3, x, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(225,234,241,.12)'; ctx.strokeStyle = 'rgba(10,22,32,.20)'; ctx.lineWidth = .5;
      ctx.beginPath(); ctx.ellipse(x, y, r * .65, r, -.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(250,253,255,.30)'; ctx.beginPath(); ctx.ellipse(x - r * .18, y - r * .35, Math.max(.3, r * .16), Math.max(.4, r * .24), .2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
