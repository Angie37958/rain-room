// A seamless, softly filtered noise bed; intentionally no simulated bird calls.
export function synthesizeBreeze(rate, seconds, random = Math.random) {
  const n = Math.round(rate * seconds);
  return Array.from({ length: 2 }, (_, channel) => {
    const samples = new Float32Array(n); let low = 0;
    for (let i = 0; i < n; i++) {
      low += ((random() * 2 - 1) - low) * .025;
      const phase = i / n * Math.PI * 2;
      samples[i] = low * (.65 + .18 * Math.sin(phase * 3 + channel) + .1 * Math.sin(phase * 7));
    }
    // Crossfade both ends to avoid a click at the loop boundary.
    const edge = Math.min(rate, Math.floor(n / 4));
    for (let i = 0; i < edge; i++) {
      const t = i / edge, a = samples[i], b = samples[n-edge+i];
      samples[i] = b * (1-t) + a*t;
    }
    return samples.slice(0, n-edge);
  });
}
import { RECORDINGS, rainMix, loopChannel } from './recordings.js';
export { rainMix } from './recordings.js';

/** Local CC0 field recordings, with a separate quiet winter wind bed. */
export class RainAudio {
  constructor() {
    this.enabled = false; this.context = null; this.level = .4;
    this.weather = { amount: 65, texture: 75, scene: 'forest' }; this.layers = {};
  }
  async initialize() {
    const context = this.context;
    this.gain = context.createGain(); this.gain.gain.value = 0;
    this.outdoorFilter = context.createBiquadFilter(); this.outdoorFilter.type = 'lowpass'; this.outdoorFilter.Q.value = .55;
    this.outdoorFilter.connect(this.gain);
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 12; limiter.ratio.value = 3;
    limiter.attack.value = .02; limiter.release.value = .3;
    this.gain.connect(limiter); limiter.connect(context.destination);
    const recordings = await Promise.all(Object.entries(RECORDINGS).map(async ([kind, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Recording unavailable');
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      return [kind, Array.from({ length: decoded.numberOfChannels }, (_, i) => loopChannel(decoded.getChannelData(i), decoded.sampleRate)), decoded.sampleRate];
    }));
    recordings.push(['wind', synthesizeBreeze(context.sampleRate, 23), context.sampleRate]);
    for (const [kind, channels, rate] of recordings) {
      const buffer = context.createBuffer(channels.length, channels[0].length, rate);
      // One shared gain preserves stereo balance. Leave headroom for overlaps.
      let square = 0, peak = 0;
      for (const channel of channels) for (const sample of channel) { square += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
      const rms = Math.sqrt(square / (channels.length * channels[0].length));
      const scale = Math.min(3, .14 / Math.max(.001, rms), .8 / Math.max(.001, peak));
      channels.forEach((channel, i) => buffer.copyToChannel(channel.map(sample => sample * scale), i));
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; source.loop = true; gain.gain.value = 0;
      source.connect(gain); gain.connect(this.outdoorFilter); source.start(0, Math.random() * buffer.duration);
      this.layers[kind] = gain;
    }
    this.setWeather(this.weather);
  }
  async toggle() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable');
      this.context = new Audio();
      // Resume within the click gesture, before awaiting the local recording load.
      this.loading = (async () => { await this.context.resume(); await this.initialize(); })();
    }
    try { await this.loading; await this.context.resume(); }
    catch (error) {
      await this.context.close().catch(() => {});
      this.context = null; this.layers = {}; this.gain = null; this.outdoorFilter = null;
      throw error;
    }
    this.enabled = !this.enabled;
    this.setVolume(this.level);
    return this.enabled;
  }
  setVolume(level) {
    this.level = level;
    if (!this.gain || !this.context || this.context.state === 'closed') return;
    this.gain.gain.setTargetAtTime(this.enabled ? level * .9 : 0, this.context.currentTime, .6);
    clearTimeout(this.suspendTimer);
    if (!this.enabled) this.suspendTimer = setTimeout(() => { if (!this.enabled) this.context?.suspend().catch(() => {}); }, 3500);
  }
  setWeather(weather) {
    this.weather = { ...this.weather, ...weather };
    if (!this.outdoorFilter || !this.context || this.context.state === 'closed') return;
    const { cutoff, levels } = rainMix(this.weather);
    this.outdoorFilter.frequency.setTargetAtTime(cutoff, this.context.currentTime, .8);
    for (const [kind, level] of Object.entries(levels)) this.layers[kind]?.gain.setTargetAtTime(level, this.context.currentTime, .8);
  }
  chime() {
    if (!this.enabled || this.context?.state !== 'running' || this.level === 0) return;
    for (const [i, frequency] of [523.25, 659.25].entries()) {
      const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
      const start = this.context.currentTime + i * .28;
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(this.level * .08, start + .02); envelope.gain.exponentialRampToValueAtTime(.0001, start + 1.3);
      oscillator.connect(envelope); envelope.connect(this.context.destination); oscillator.start(start); oscillator.stop(start + 1.4);
    }
  }
}
