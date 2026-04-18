import type { Palette, PaletteTemperaturePreference, Vec3, VisualMode } from '../types';
import { SeededRandom } from '../math/random';

function hexToVec3(hex: string): Vec3 {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const paletteLibrary: Palette[] = [
  {
    name: 'Tidal Glass',
    temperature: 'cool',
    background: hexToVec3('#07131d'),
    shadow: hexToVec3('#11384a'),
    accent: hexToVec3('#58b4bf'),
    glow: hexToVec3('#f0d9a1'),
  },
  {
    name: 'Amber Quiet',
    temperature: 'warm',
    background: hexToVec3('#120a08'),
    shadow: hexToVec3('#5a2e1f'),
    accent: hexToVec3('#d99153'),
    glow: hexToVec3('#f6e0b5'),
  },
  {
    name: 'Verdigris Haze',
    temperature: 'neutral',
    background: hexToVec3('#07100f'),
    shadow: hexToVec3('#1f4a44'),
    accent: hexToVec3('#7cb89f'),
    glow: hexToVec3('#e7d9b9'),
  },
  {
    name: 'Mineral Dusk',
    temperature: 'cool',
    background: hexToVec3('#090b14'),
    shadow: hexToVec3('#263a5b'),
    accent: hexToVec3('#7ca8d4'),
    glow: hexToVec3('#f0d9b2'),
  },
  {
    name: 'Saffron Mist',
    temperature: 'warm',
    background: hexToVec3('#120f08'),
    shadow: hexToVec3('#5d5531'),
    accent: hexToVec3('#b7a35f'),
    glow: hexToVec3('#f4ebc6'),
  },
  {
    name: 'Sea Clay',
    temperature: 'neutral',
    background: hexToVec3('#081013'),
    shadow: hexToVec3('#365058'),
    accent: hexToVec3('#94b1a5'),
    glow: hexToVec3('#f3ddbf'),
  },
  {
    name: 'Rose Ash',
    temperature: 'warm',
    background: hexToVec3('#140b10'),
    shadow: hexToVec3('#593646'),
    accent: hexToVec3('#c88d8f'),
    glow: hexToVec3('#f7e6cb'),
  },
  {
    name: 'Celadon Night',
    temperature: 'cool',
    background: hexToVec3('#06110e'),
    shadow: hexToVec3('#204f46'),
    accent: hexToVec3('#8cd0b5'),
    glow: hexToVec3('#f0ebce'),
  },
  {
    name: 'Words',
    temperature: 'warm',
    background: hexToVec3('#110810'),
    shadow: hexToVec3('#4a2245'),
    accent: hexToVec3('#c98fa8'),
    glow: hexToVec3('#f5e0d0'),
  },
  {
    name: 'Truly Madly',
    temperature: 'warm',
    background: hexToVec3('#0e0b16'),
    shadow: hexToVec3('#3d2563'),
    accent: hexToVec3('#9b72cf'),
    glow: hexToVec3('#f0d8f5'),
  },
  {
    name: 'Heal the World',
    temperature: 'warm',
    background: hexToVec3('#120e06'),
    shadow: hexToVec3('#5c4420'),
    accent: hexToVec3('#d4a054'),
    glow: hexToVec3('#f8edcc'),
  },
];

const modePalettePreferences: Record<VisualMode, readonly string[]> = {
  'mandelbrot-zoom': ['Tidal Glass', 'Mineral Dusk', 'Celadon Night'],
  'julia-flow': ['Sea Clay', 'Rose Ash', 'Mineral Dusk'],
  'fractal-bloom': ['Amber Quiet', 'Saffron Mist', 'Rose Ash'],
  'plasma-field': ['Sea Clay', 'Verdigris Haze', 'Tidal Glass'],
  'particle-field': ['Celadon Night', 'Sea Clay', 'Saffron Mist'],
  'kaleidoscopic-symmetry': ['Rose Ash', 'Amber Quiet', 'Mineral Dusk'],
  'lyrical-drift': ['Words', 'Truly Madly', 'Heal the World'],
};

export class PaletteSystem {
  constructor(private readonly random: SeededRandom) {}

  pickPalette(
    mode: VisualMode,
    previousName?: string,
    temperaturePreference: PaletteTemperaturePreference = 'balanced',
  ): Palette {
    const preferred = modePalettePreferences[mode];
    const candidates = paletteLibrary.filter((palette) => {
      if (!preferred.includes(palette.name) || palette.name === previousName) {
        return false;
      }

      return temperaturePreference === 'balanced' || palette.temperature === temperaturePreference;
    });

    if (candidates.length > 0) {
      return this.random.pick(candidates);
    }

    const fallback = paletteLibrary.filter((palette) => {
      if (palette.name === previousName) {
        return false;
      }

      return temperaturePreference === 'balanced' || palette.temperature === temperaturePreference;
    });

    if (fallback.length > 0) {
      return this.random.pick(fallback);
    }

    return this.random.pick(fallback.length > 0 ? fallback : paletteLibrary);
  }
}
