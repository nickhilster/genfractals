import { SeededRandom } from '../math/random';
import {
  MODE_LABELS,
  VISUAL_MODES,
  defaultArtworkControls,
  type ArtworkControls,
  type SceneConfig,
  type Vec2,
  type VisualMode,
} from '../types';
import { PaletteSystem } from './PaletteSystem';

const mandelbrotFocusPoints: readonly Vec2[] = [
  [-0.743643887037151, 0.13182590420533],
  [-0.745428, 0.113009],
  [-0.74877, 0.065053],
  [-1.25066, 0.02012],
  [-0.1011, 0.9563],
];

const sceneTitles: Record<VisualMode, readonly string[]> = {
  'mandelbrot-zoom': ['Seahorse Descent', 'Cardioid Lantern', 'Mineral Basin'],
  'julia-flow': ['Glass Orbit', 'Silent Parameter', 'Tidal Equation'],
  'fractal-bloom': ['Cathedral Bloom', 'Amber Lotus', 'Radiant Fold'],
  'plasma-field': ['Mist Lattice', 'Velvet Weather', 'Soft Current'],
  'particle-field': ['Tracer Garden', 'Flux Lanterns', 'Drift Chorus'],
  'kaleidoscopic-symmetry': ['Mirror Hymn', 'Prism Cloister', 'Symmetry Lantern'],
};

export class SceneGenerator {
  private readonly paletteSystem: PaletteSystem;
  private readonly modeIndices: Record<VisualMode, number>;
  private sceneId = 0;
  private modeBag: VisualMode[] = [];
  private controls: ArtworkControls = defaultArtworkControls;

  constructor(private readonly random: SeededRandom) {
    this.paletteSystem = new PaletteSystem(random);
    this.modeIndices = VISUAL_MODES.reduce<Record<VisualMode, number>>((accumulator, mode, index) => {
      accumulator[mode] = index;
      return accumulator;
    }, {} as Record<VisualMode, number>);
  }

  createInitialScene(): SceneConfig {
    return this.createNextScene();
  }

  setControls(controls: ArtworkControls) {
    this.controls = controls;
  }

  createNextScene(previousScene?: SceneConfig): SceneConfig {
    const mode = this.nextMode(previousScene?.mode);
    const palette = this.paletteSystem.pickPalette(
      mode,
      previousScene?.palette.name,
      this.controls.paletteTemperature,
    );

    const scene: SceneConfig = {
      id: ++this.sceneId,
      title: this.random.pick(sceneTitles[mode]),
      mode,
      modeIndex: this.modeIndices[mode],
      palette,
      holdDuration: this.random.range(60, 180),
      transitionDuration: this.random.range(20, 32),
      iterationDepth: this.random.range(92, 168),
      symmetryLevel: this.random.range(4, 10),
      scale: this.random.range(1.2, 2.8),
      focus: [this.random.range(-0.6, 0.6), this.random.range(-0.6, 0.6)],
      secondary: [this.random.range(-0.9, 0.9), this.random.range(-0.9, 0.9)],
      drift: [this.random.range(-0.12, 0.12), this.random.range(-0.12, 0.12)],
      motion: [
        this.random.range(0.6, 1.45),
        this.random.range(0.65, 1.55),
        this.random.range(0.55, 1.2),
      ],
      rotation: this.random.range(-0.9, 0.9),
      zoomRate: this.random.range(0.026, 0.05),
      seed: this.random.next(),
      formula: this.random.range(0, 3),
    };

    return this.applyControlBias(this.specializeScene(scene));
  }

  private nextMode(previousMode?: VisualMode): VisualMode {
    if (this.modeBag.length === 0) {
      this.refillModeBag(previousMode);
    }

    const next = this.modeBag.shift();

    if (!next) {
      this.refillModeBag(previousMode);
      return this.modeBag.shift()!;
    }

    if (previousMode && next === previousMode) {
      this.refillModeBag(previousMode);
      return this.modeBag.shift()!;
    }

    return next;
  }

  private refillModeBag(previousMode?: VisualMode) {
    this.modeBag = this.random.shuffle(VISUAL_MODES);

    if (this.controls.modeEmphasis !== 'balanced') {
      const emphasis = this.controls.modeEmphasis;
      const insertionCandidates: number[] = [];

      for (let index = 0; index <= this.modeBag.length; index += 1) {
        const left = this.modeBag[index - 1];
        const right = this.modeBag[index];

        if (left !== emphasis && right !== emphasis) {
          insertionCandidates.push(index);
        }
      }

      const insertionIndex =
        insertionCandidates.length > 0
          ? this.random.pick(insertionCandidates)
          : this.random.int(0, this.modeBag.length + 1);

      this.modeBag.splice(insertionIndex, 0, emphasis);
    }

    if (previousMode && this.modeBag[0] === previousMode && this.modeBag.length > 1) {
      const swapIndex = this.modeBag.findIndex((mode, index) => index > 0 && mode !== previousMode);

      if (swapIndex > 0) {
        [this.modeBag[0], this.modeBag[swapIndex]] = [this.modeBag[swapIndex], this.modeBag[0]];
      }
    }
  }

  private applyControlBias(scene: SceneConfig): SceneConfig {
    const motionFactor = clampNumber(this.controls.motionIntensity, 0.35, 2.5);
    const symmetryFactor = clampNumber(1 + this.controls.symmetryBias * 0.6, 0.45, 1.8);
    const symmetryLevel =
      scene.mode === 'mandelbrot-zoom'
        ? 1
        : clampNumber(Math.round(scene.symmetryLevel * symmetryFactor), 2, 14);

    return {
      ...scene,
      symmetryLevel,
      drift: [scene.drift[0] * motionFactor, scene.drift[1] * motionFactor],
      motion: [
        scene.motion[0] * motionFactor,
        scene.motion[1] * motionFactor,
        scene.motion[2] * motionFactor,
      ],
    };
  }

  private specializeScene(scene: SceneConfig): SceneConfig {
    switch (scene.mode) {
      case 'mandelbrot-zoom': {
        return {
          ...scene,
          iterationDepth: this.random.range(118, 170),
          symmetryLevel: 1,
          scale: this.random.range(2.2, 3.25),
          focus: this.random.pick(mandelbrotFocusPoints),
          secondary: [this.random.range(-0.03, 0.03), this.random.range(-0.03, 0.03)],
          drift: [this.random.range(-0.025, 0.025), this.random.range(-0.025, 0.025)],
          motion: [
            this.random.range(0.9, 1.2),
            this.random.range(0.95, 1.3),
            this.random.range(0.5, 0.8),
          ],
          rotation: this.random.range(-0.18, 0.18),
          zoomRate: this.random.range(0.032, 0.055),
          formula: this.random.range(0, 1.9),
        };
      }

      case 'julia-flow':
        return {
          ...scene,
          iterationDepth: this.random.range(104, 160),
          symmetryLevel: this.random.range(2, 5),
          scale: this.random.range(1.45, 2.15),
          focus: [this.random.range(-0.78, 0.78), this.random.range(-0.78, 0.78)],
          secondary: [this.random.range(-0.48, 0.48), this.random.range(-0.48, 0.48)],
          drift: [this.random.range(-0.06, 0.06), this.random.range(-0.06, 0.06)],
          motion: [
            this.random.range(0.7, 1.1),
            this.random.range(0.75, 1.2),
            this.random.range(0.7, 1.15),
          ],
        };

      case 'fractal-bloom':
        return {
          ...scene,
          iterationDepth: this.random.range(80, 120),
          symmetryLevel: this.random.range(5, 11),
          scale: this.random.range(1.45, 2.4),
          focus: [this.random.range(-0.25, 0.25), this.random.range(-0.25, 0.25)],
          drift: [this.random.range(-0.04, 0.04), this.random.range(-0.04, 0.04)],
          zoomRate: this.random.range(0.012, 0.028),
        };

      case 'plasma-field':
        return {
          ...scene,
          iterationDepth: this.random.range(72, 120),
          symmetryLevel: this.random.range(2, 7),
          scale: this.random.range(1.3, 2.25),
          drift: [this.random.range(-0.09, 0.09), this.random.range(-0.09, 0.09)],
          motion: [
            this.random.range(0.65, 0.95),
            this.random.range(0.65, 1.0),
            this.random.range(0.55, 0.85),
          ],
        };

      case 'particle-field':
        return {
          ...scene,
          iterationDepth: this.random.range(56, 100),
          symmetryLevel: this.random.range(2, 5),
          scale: this.random.range(1.25, 2.05),
          focus: [this.random.range(-0.2, 0.2), this.random.range(-0.2, 0.2)],
          secondary: [this.random.range(-0.6, 0.6), this.random.range(-0.6, 0.6)],
          drift: [this.random.range(-0.08, 0.08), this.random.range(-0.08, 0.08)],
          zoomRate: this.random.range(0.008, 0.02),
        };

      case 'kaleidoscopic-symmetry':
        return {
          ...scene,
          iterationDepth: this.random.range(96, 140),
          symmetryLevel: this.random.range(6, 12),
          scale: this.random.range(1.2, 1.95),
          focus: [this.random.range(-0.52, 0.52), this.random.range(-0.52, 0.52)],
          secondary: [this.random.range(-0.32, 0.32), this.random.range(-0.32, 0.32)],
          drift: [this.random.range(-0.03, 0.03), this.random.range(-0.03, 0.03)],
          rotation: this.random.range(-0.35, 0.35),
        };
    }
  }
}

export function describeSceneMode(mode: VisualMode): string {
  return MODE_LABELS[mode];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
