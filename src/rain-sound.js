/** Soft, non-tonal rain synthesis. No clicks, pitch glides, downloads or tracking. */
export function synthesizeRain(kind, rate = 44100, seconds = 13, random = Math.random) {
  const length = Math.floor(rate * seconds);
  const channels = [new Float32Array(length), new Float32Array(length)];
  if (kind === 'bed') {
    for (const samples of channels) {
      const seam = Math.floor(rate * .18), raw = new Float32Array(length + seam);
      let low = 0, body = 0, slow = 0;
      for (let i = 0; i < raw.length; i++) {
        const white = random() * 2 - 1;
        low += .075 * (white - low); body += .016 * (white - body); slow += .002 * (white - slow);
        raw[i] = (low - slow) * .25 + body * .30 + white * .003;
      }
      samples.set(raw.subarray(0, length));
      // Circular overlap: the last sample leads into the extra tail at sample zero.
      for (let i = 0; i < seam; i++) {
        const blend = .5 - .5 * Math.cos(Math.PI * i / seam);
        samples[i] = raw[length + i] * (1 - blend) + raw[i] * blend;
      }
    }
  } else {
    const leaves = kind === 'leaves', glass = kind === 'glass';
    const density = leaves ? 120 : glass ? 5 : 20;
    let time = 0;
    while (time < seconds) {
      time += -Math.log(Math.max(.00001, 1 - random())) / density;
      if (time >= seconds) break;
      const start = Math.floor(time * rate), pan = .15 + random() * .7;
      const left = Math.sqrt(1 - pan), right = Math.sqrt(pan);
      const duration = leaves ? .035 + random() * .08 : .075 + random() * .14;
      const count = Math.floor(duration * rate);
      const amplitude = leaves ? .035 + random() ** 2 * .10 : glass ? .05 + random() ** 2 * .11 : .08 + random() ** 2 * .22;
      let smooth = 0, body = 0;
      for (let j = 0; j < count; j++) {
        const age = j / rate, u = j / count, white = random() * 2 - 1;
        smooth += (leaves ? .22 : .10) * (white - smooth);
        body += .025 * (white - body);
        // Rounded attack plus a smooth zero tail; no oscillator and no hard transient.
        const attack = Math.sin(Math.min(1, age / (leaves ? .009 : .020)) * Math.PI / 2) ** 2;
        const decay = (1 - u) ** 2 * Math.exp(-u * 2.0);
        const grain = leaves ? smooth - body * .6 : smooth * .85 + body * .6;
        const sample = grain * amplitude * attack * decay;
        const index = (start + j) % length;
        channels[0][index] += sample * left; channels[1][index] += sample * right;
      }
    }
  }
  let peak = 0;
  for (const samples of channels) for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > .65 ? .65 / peak : 1;
  if (scale < 1) for (const samples of channels) for (let i = 0; i < length; i++) samples[i] *= scale;
  return channels;
}
