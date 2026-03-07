import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../math/random';
import { defaultArtworkControls, type ArtworkControls, type SceneConfig } from '../types';
import { PaletteSystem } from './PaletteSystem';
import { SceneGenerator } from './SceneGenerator';
import { TransitionSystem } from './TransitionSystem';

describe('PaletteSystem', () => {
  it('filters palettes by curated temperature families', () => {
    const paletteSystem = new PaletteSystem(new SeededRandom(42));

    const warmPalette = paletteSystem.pickPalette('fractal-bloom', undefined, 'warm');
    const coolPalette = paletteSystem.pickPalette('mandelbrot-zoom', undefined, 'cool');
    const neutralPalette = paletteSystem.pickPalette('plasma-field', undefined, 'neutral');

    expect(warmPalette.temperature).toBe('warm');
    expect(coolPalette.temperature).toBe('cool');
    expect(neutralPalette.temperature).toBe('neutral');
  });
});

describe('SceneGenerator controls', () => {
  it('gives the emphasized mode more representation without excluding the rest', () => {
    const balancedGenerator = new SceneGenerator(new SeededRandom(7));
    balancedGenerator.setControls(defaultArtworkControls);

    const emphasizedGenerator = new SceneGenerator(new SeededRandom(7));
    emphasizedGenerator.setControls({
      ...defaultArtworkControls,
      modeEmphasis: 'fractal-bloom',
    });

    const balancedScenes = generateScenes(balancedGenerator, 24);
    const emphasizedScenes = generateScenes(emphasizedGenerator, 24);

    const balancedBloomCount = balancedScenes.filter((scene) => scene.mode === 'fractal-bloom').length;
    const emphasizedBloomCount = emphasizedScenes.filter((scene) => scene.mode === 'fractal-bloom').length;

    expect(emphasizedBloomCount).toBeGreaterThan(balancedBloomCount);
    expect(new Set(emphasizedScenes.map((scene) => scene.mode)).size).toBeGreaterThan(4);
  });

  it('applies symmetry and motion bias to future scenes', () => {
    const stillGenerator = new SceneGenerator(new SeededRandom(19));
    stillGenerator.setControls({
      ...defaultArtworkControls,
      motionIntensity: 0.45,
      symmetryBias: -0.8,
    });

    const activeGenerator = new SceneGenerator(new SeededRandom(19));
    activeGenerator.setControls({
      ...defaultArtworkControls,
      motionIntensity: 1.8,
      symmetryBias: 0.8,
    });

    const stillScenes = generateScenes(stillGenerator, 18).filter((scene) => scene.mode !== 'mandelbrot-zoom');
    const activeScenes = generateScenes(activeGenerator, 18).filter((scene) => scene.mode !== 'mandelbrot-zoom');

    expect(average(stillScenes.map((scene) => scene.symmetryLevel))).toBeLessThan(
      average(activeScenes.map((scene) => scene.symmetryLevel)),
    );
    expect(average(stillScenes.map(sceneMotionMagnitude))).toBeLessThan(
      average(activeScenes.map(sceneMotionMagnitude)),
    );
  });
});

describe('TransitionSystem controls', () => {
  it('uses the transition length multiplier during an active dissolve', () => {
    const firstScene = createScene(1, 'mandelbrot-zoom');
    const secondScene = createScene(2, 'plasma-field');
    const source = {
      createInitialScene: () => firstScene,
      createNextScene: () => secondScene,
      setControls: (_controls: ArtworkControls) => undefined,
    };

    const transitionSystem = new TransitionSystem(source);
    transitionSystem.setControls({
      ...defaultArtworkControls,
      transitionLengthMultiplier: 0.6,
    });

    transitionSystem.initialize(0);
    transitionSystem.update(0.1);
    const midTransition = transitionSystem.update(3);
    const completed = transitionSystem.update(7);

    expect(midTransition.phase).toBe('transitioning');
    expect(midTransition.transitionProgress).toBeGreaterThan(0);
    expect(completed.phase).toBe('evolving');
    expect(completed.currentScene.id).toBe(secondScene.id);
  });
});

function generateScenes(generator: SceneGenerator, count: number) {
  const scenes: SceneConfig[] = [];
  let previousScene: SceneConfig | undefined;

  for (let index = 0; index < count; index += 1) {
    const scene = index === 0 ? generator.createInitialScene() : generator.createNextScene(previousScene);
    scenes.push(scene);
    previousScene = scene;
  }

  return scenes;
}

function sceneMotionMagnitude(scene: SceneConfig) {
  return (scene.motion[0] + scene.motion[1] + scene.motion[2]) / 3;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createScene(id: number, mode: SceneConfig['mode']): SceneConfig {
  return {
    id,
    title: `Scene ${id}`,
    mode,
    modeIndex: 0,
    palette: {
      name: 'Test',
      temperature: 'neutral',
      background: [0, 0, 0],
      shadow: [0, 0, 0],
      accent: [1, 1, 1],
      glow: [1, 1, 1],
    },
    holdDuration: 0,
    transitionDuration: 10,
    iterationDepth: 100,
    symmetryLevel: 5,
    scale: 1.5,
    focus: [0, 0],
    secondary: [0, 0],
    drift: [0, 0],
    motion: [1, 1, 1],
    rotation: 0,
    zoomRate: 0.03,
    seed: 0.5,
    formula: 0,
  };
}
