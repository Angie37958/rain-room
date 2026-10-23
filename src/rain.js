import { createEnvironment, artworkPlacement } from './environment.js';
import { RainInteraction } from './interaction.js';
const random = (min, max) => min + Math.random() * (max - min);
export class RainScene {
  constructor(canvas, options) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.options = options;
    this.interaction = new RainInteraction(); this.last = 0;
    this.airParticles = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), r: random(.8, 2.8), phase: random(0, Math.PI * 2) }));
    this.drops = Array.from({ length: 700 }, () => ({ x: random(-20, 20), y: random(0, 14), z: random(1, 32), speed: random(8, 15), length: random(.18, .48) }));
    if (!this.ctx) return;
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
    this.backdrop = createEnvironment(this.width, this.height, this.options.scene, this.options.light, this.low ? 1 : Math.min(ratio, 1.4), () => this.requestFrame());
    this.requestFrame();
  }
  setOptions(options) {
    const rebuild = options.quality !== this.options.quality || options.scene !== this.options.scene || options.light !== this.options.light;
    if (options.scene !== this.options.scene || !options.motion) this.resetInteraction();
    this.options = { ...options }; if (rebuild) this.resize(); this.requestFrame();
  }
  project(x, y, z) { const s = Math.min(this.width, this.height) * 1.15 / (z + 4); return { x: this.width * .48 + x * s, y: this.height * .42 + (3.1 - y) * s, s }; }
  resetInteraction() {
    this.interaction.reset(); this.ripples = []; this.rippleWait = 0;
    for (const particles of [this.drops, this.airParticles]) for (const particle of particles) particle.ox = particle.oy = particle.vx = particle.vy = 0;
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
    const kind = this.options.scene;
    if (kind === 'lake') this.drawAir(dt, 'snow');
    else if (kind === 'window') this.drawGlass(dt);
    else if (kind === 'day') this.drawAir(dt, 'leaves');
    else {
      this.drawPaperRain(dt);
      if (kind === 'spring') this.drawAir(dt, 'petals');
      if (kind === 'forest') this.drawAir(dt, 'autumn');
      this.drawRipples(dt);
    }
    this.interaction.draw(ctx, W, H, kind);
    if (this.options.motion) this.requestFrame();
  }
  drawRipples(dt) {
    const W = this.width, H = this.height, c = this.ctx;
    this.ripples ??= []; this.rippleWait = (this.rippleWait || 0) - dt;
    if (dt && this.rippleWait <= 0) {
      const p = artworkPlacement(W, H);
      this.ripples.push({ x: p.x + p.width * random(.57, .8), y: p.y + p.height * random(.12, .83), age: 0 });
      this.rippleWait = random(.6, 1.8) * (1.4 - this.options.amount / 120);
    }
    this.ripples = this.ripples.filter(p => p.age < 3);
    for (const p of this.ripples) {
      p.age += dt; const r = 3 + p.age * 14;
      c.strokeStyle = `rgba(85,111,100,${Math.sin(p.age / 3 * Math.PI) * .13})`; c.lineWidth = .65;
      c.beginPath(); c.ellipse(p.x, p.y, r, r * .36, 0, 0, Math.PI * 1.9); c.stroke();
    }
  }
  drawGlass(dt) {
    const c = this.ctx, W = this.width, H = this.height, p = artworkPlacement(W, H);
    c.save(); c.beginPath(); c.rect(p.x + p.width * .37, p.y, p.width * .59, p.height * .89); c.clip();
    const count = Math.floor(20 + this.options.amount * .55);
    for (let i = 0; i < count; i++) {
      const d = this.airParticles[i];
      d.y += dt * (.007 + d.r * .005) * (.7 + .3 * Math.sin(d.phase)); d.phase += dt * .3;
      if (d.y > .9) { d.y = -.02; d.x = Math.random(); }
      const x = p.x + p.width * (.4 + d.x * .54), y = p.y + d.y * p.height;
      const trail = 12 + d.r * 19;
      c.strokeStyle = 'rgba(186,207,221,.36)'; c.lineWidth = .65;
      c.beginPath(); c.moveTo(x, y - trail); c.quadraticCurveTo(x + Math.sin(d.phase) * 2, y - trail * .4, x, y); c.stroke();
      c.fillStyle = 'rgba(216,228,231,.68)'; c.beginPath(); c.ellipse(x, y, .65 + d.r * .25, 1.2 + d.r * .6, 0, 0, Math.PI*2); c.fill();
    }
    c.restore();
  }
  drawPaperRain(dt) {
    const c = this.ctx, W = this.width, H = this.height;
    const windowScene = this.options.scene === 'window';
    const count = Math.floor((this.low ? 260 : 540) * (.25 + this.options.amount / 100 * .75));
    c.save();
    if (windowScene) {
      const portrait = W / H < .82;
      c.beginPath(); c.rect(W * (portrait ? .25 : .52), H * (portrait ? .36 : .2), W * (portrait ? .72 : .45), H * (portrait ? .46 : .62)); c.clip();
    }
    for (let i = 0; i < count; i++) {
      const drop = this.drops[i];
      drop.y -= dt * (2 + drop.speed * .17); drop.x += this.options.wind / 100 * dt * .4;
      if (drop.y < 0) { drop.y = 14; drop.x = random(-20, 20); }
      if (drop.x > 20) drop.x = -20;
      if (drop.x < -20) drop.x = 20;
      const x = (drop.x + 20) / 40 * W, y = (1 - drop.y / 14) * H;
      const bent = this.interaction.bend(drop, x, y, W, H, dt);
      const length = 12 + drop.length * 32;
      c.strokeStyle = i % 3 === 0 ? 'rgba(255,255,245,.66)' : 'rgba(56,88,86,.36)';
      c.lineWidth = i % 4 === 0 ? 1.15 : .85;
      c.beginPath(); c.moveTo(bent.x, bent.y); c.lineTo(bent.x + this.options.wind / 100 * 2, bent.y + length); c.stroke();
    }
    c.restore();
  }
  drawAir(dt, kind) {
    const ctx = this.ctx, W = this.width, H = this.height, snow = kind === 'snow', petals = kind === 'petals';
    const count = Math.floor((snow ? 70 + this.options.amount * 1.5 : petals ? 45 + this.options.amount * .9 : kind === 'autumn' ? 30 + this.options.amount * .7 : 12 + this.options.amount * .18) * (this.low ? .85 : 1));
    for (let i = 0; i < Math.min(count, this.airParticles.length); i++) {
      const p = this.airParticles[i];
      p.y += dt * (snow ? .027 + p.r * .014 : petals ? .024 + p.r * .009 : .02 + p.r * .007);
      p.phase += dt * .6;
      p.x += dt * (this.options.wind / 100 * .025 + Math.sin(p.phase) * .006 + (petals ? .009 : 0));
      if (p.y > 1.03) { p.y = -.03; p.x = Math.random(); }
      if (p.y < -.04) p.y = 1.02;
      if (p.x > 1.03) p.x = -.03; if (p.x < -.03) p.x = 1.03;
      const bent = this.interaction.bend(p, p.x * W, p.y * H, W, H, dt);
      ctx.fillStyle = snow ? `rgba(247,252,255,${.35 + p.r * .16})` : petals ? ['#e9a8bacf', '#fbe3e9ed', '#d78fa7cf'][i % 3] : '#fff4d3a8';
      ctx.beginPath();
      if (petals || kind === 'autumn' || kind === 'leaves') {
        ctx.save(); ctx.translate(bent.x, bent.y); ctx.rotate(p.phase * .55);
        ctx.scale(.7 + Math.sin(p.phase) * .25, 1);
        const r = p.r * (petals ? 2 : 2.6);
        if (!petals) ctx.fillStyle = kind === 'autumn' ? ['#bb793fb0','#c9a153b0','#9b5944a0'][i%3] : '#90a57980';
        ctx.moveTo(0, r * 1.25);
        ctx.bezierCurveTo(-r * 1.5, 0, -r * 1.1, -r * 1.4, -.2 * r, -r * .8);
        ctx.quadraticCurveTo(0, -r * .45, r * .2, -r * .8);
        ctx.bezierCurveTo(r * 1.1, -r * 1.4, r * 1.5, 0, 0, r * 1.25);
        ctx.fill(); ctx.restore();
      } else { ctx.arc(bent.x, bent.y, snow ? p.r : p.r * .6, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}
