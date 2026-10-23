export const RECORDINGS = {
  bed: new URL('../assets/audio/gentle-rain.mp3', import.meta.url),
  detail: new URL('../assets/audio/light-rain.mp3', import.meta.url)
};

export function rainMix({ amount = 65, texture = 75, scene = 'forest' } = {}) {
  const rain = Math.max(0, Math.min(1, amount / 100));
  const detail = Math.max(0, Math.min(1, texture / 100));
  if (scene === 'day') return { cutoff: 1500 + detail * 2000, levels: { bed: 0, detail: 0, wind: .32 + rain * .22 } };
  if (scene === 'lake') return { cutoff: 1000 + detail * 1400, levels: { bed: 0, detail: 0, wind: .6 + rain * .3 } };
  const sheltered = scene === 'window';
  return {
    cutoff: sheltered ? 2600 + detail * 1600 : 6500 + detail * 6500,
    levels: {
      bed: (.7 + rain * .25) * (1 - detail * .35),
      detail: (.12 + detail * .55) * (.6 + rain * .4) * (sheltered ? .45 : 1),
      wind: 0
    }
  };
}

// Overlap the recording's tail with its head; the resulting buffer can loop
// without a hard cut. Keep stereo timing and the original rain's dynamics.
export function loopChannel(samples, sampleRate, seconds = 3) {
  const overlap = Math.min(Math.round(sampleRate * seconds), Math.floor(samples.length / 4));
  if (overlap < 2) return samples.slice();
  const output = samples.slice(0, samples.length - overlap);
  for (let i = 0; i < overlap; i++) {
    const angle = i / (overlap - 1) * Math.PI / 2;
    output[i] = samples[output.length + i] * Math.cos(angle) + samples[i] * Math.sin(angle);
  }
  return output;
}
