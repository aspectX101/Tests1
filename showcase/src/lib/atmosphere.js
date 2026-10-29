// Film layer drawn from the timeline clock: slow dust particles with depth and a fine grain.
// Both are pure functions of time, so a seek always reproduces the same frame.
import { random } from './motion.js';

export class Atmosphere {
  constructor(dustCanvas, grainCanvas, { width, height, count = 120, seed = 11 } = {}) {
    this.width = width;
    this.height = height;
    this.dust = dustCanvas.getContext('2d');
    this.grain = grainCanvas.getContext('2d');
    dustCanvas.width = grainCanvas.width = width;
    dustCanvas.height = grainCanvas.height = height;
    const rand = random(seed);
    this.particles = Array.from({ length: count }, () => {
      const depth = 0.15 + rand() * 0.85;
      return {
        x: rand() * width, y: rand() * height, depth,
        vx: (rand() - 0.35) * 22, vy: -(6 + rand() * 18),
        size: depth > 0.92 ? 5 + rand() * 9 : 0.5 + depth * 1.9,
        twinkle: 0.4 + rand() * 1.6, phase: rand() * Math.PI * 2,
      };
    });
    this.sprite = makeSprite();
    this.tiles = Array.from({ length: 6 }, (_, i) => makeNoise(256, seed + i));
    this.patterns = this.tiles.map((tile) => this.grain.createPattern(tile, 'repeat'));
    // level: overall dust brightness, drift: extra horizontal camera movement (px/s).
    this.state = { level: 0, drift: 0, grain: 1 };
  }

  render(time) {
    const { dust, width, height, state } = this;
    dust.clearRect(0, 0, width, height);
    if (state.level > 0.001) {
      for (const p of this.particles) {
        const travel = time * (p.vx + state.drift) * p.depth;
        const x = mod(p.x + travel, width + 40) - 20;
        const y = mod(p.y + time * p.vy * p.depth, height + 40) - 20;
        const flicker = 0.55 + 0.45 * Math.sin(time * p.twinkle + p.phase);
        const alpha = state.level * flicker * (p.size > 4 ? 0.09 : 0.18 + 0.55 * p.depth);
        if (alpha <= 0.002) continue;
        dust.globalAlpha = Math.min(1, alpha);
        const s = p.size * 2.4;
        dust.drawImage(this.sprite, x - s / 2, y - s / 2, s, s);
      }
      dust.globalAlpha = 1;
    }
    const g = this.grain;
    g.clearRect(0, 0, width, height);
    if (state.grain > 0) {
      const tile = Math.floor(time * 24) % this.patterns.length;
      g.globalAlpha = state.grain;
      g.fillStyle = this.patterns[tile];
      g.save();
      g.translate((tile * 97) % 256, (tile * 53) % 256);
      g.fillRect(-256, -256, width + 512, height + 512);
      g.restore();
    }
  }
}

const mod = (a, n) => ((a % n) + n) % n;

function makeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function makeNoise(size, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const data = g.createImageData(size, size);
  const rand = random(seed * 7919);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * 120;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  return c;
}
