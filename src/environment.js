// Approved artwork placement is shared by rendering and water interactions.
const pictures = new Map();
export function artworkPlacement(W, H) {
  const width = W / H < .82 ? Math.min(W, H * .6) : H * .6;
  const height = width / .6;
  return { x: 0, y: (H-height)/2, width, height };
}
export function artworkPoint(x, y, W, H) {
  const p = artworkPlacement(W, H);
  return { x: (x - p.x) / p.width, y: (y - p.y) / p.height };
}
export function createEnvironment(width, height, scene, brightness, ratio = 1, ready = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const c = canvas.getContext('2d'); c.scale(ratio, ratio);
  if (!pictures.has(scene)) {
    const image = new Image();
    image.src = new URL(`../assets/scenes/${scene}.webp`, import.meta.url).href;
    pictures.set(scene, image);
  }
  const image = pictures.get(scene);
  const paint = () => {
    const paper = {window:'#304866',day:'#f4ecd8',lake:'#cbd9dd'}[scene] || '#f2ecdc';
    c.fillStyle = paper; c.fillRect(0, 0, width, height);
    if (image.complete && image.naturalWidth) {
      const p = artworkPlacement(width, height);
      c.drawImage(image, p.x, p.y, p.width, p.height);
      if (width / height >= .82) {
        const fade = c.createLinearGradient(p.width * .80, 0, p.width, 0);
        fade.addColorStop(0, paper + '00'); fade.addColorStop(1, paper);
        c.fillStyle = fade; c.fillRect(p.width * .80, 0, p.width * .20 + 1, height);
      }
    }
    c.fillStyle = brightness < 50 ? `rgba(24,32,35,${(50-brightness)/250})` : `rgba(255,249,233,${(brightness-50)/330})`;
    c.fillRect(0, 0, width, height); ready();
  };
  if (!image.complete) image.addEventListener('load', paint, { once: true });
  paint(); return canvas;
}
