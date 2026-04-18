export const VISUAL_MODES = [
  'mandelbrot-zoom',
  'julia-flow',
  'fractal-bloom',
  'plasma-field',
  'particle-field',
  'kaleidoscopic-symmetry',
  'lyrical-drift',
] as const;

export type VisualMode = (typeof VISUAL_MODES)[number];
export type ArtPhase = 'evolving' | 'transitioning';
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type PaletteTemperature = 'warm' | 'neutral' | 'cool';
export type PaletteTemperaturePreference = 'balanced' | PaletteTemperature;
export type ModeEmphasis = 'balanced' | VisualMode;

export interface Palette {
  name: string;
  temperature: PaletteTemperature;
  background: Vec3;
  shadow: Vec3;
  accent: Vec3;
  glow: Vec3;
}

export interface SceneConfig {
  id: number;
  title: string;
  mode: VisualMode;
  modeIndex: number;
  palette: Palette;
  holdDuration: number;
  transitionDuration: number;
  iterationDepth: number;
  symmetryLevel: number;
  scale: number;
  focus: Vec2;
  secondary: Vec2;
  drift: Vec2;
  motion: [number, number, number];
  rotation: number;
  zoomRate: number;
  seed: number;
  formula: number;
}

export interface TransitionSnapshot {
  currentScene: SceneConfig;
  nextScene: SceneConfig | null;
  phase: ArtPhase;
  transitionProgress: number;
  currentSceneElapsed: number;
  nextSceneElapsed: number;
}

export interface ArtworkStatus {
  currentTitle: string;
  currentModeLabel: string;
  paletteName: string;
  phase: ArtPhase;
  upcomingTitle: string | null;
}

export interface ArtworkControls {
  zoomMultiplier: number;
  motionIntensity: number;
  paletteTemperature: PaletteTemperaturePreference;
  transitionLengthMultiplier: number;
  symmetryBias: number;
  modeEmphasis: ModeEmphasis;
}

export const defaultArtworkControls: ArtworkControls = {
  zoomMultiplier: 1,
  motionIntensity: 1,
  paletteTemperature: 'balanced',
  transitionLengthMultiplier: 1,
  symmetryBias: 0,
  modeEmphasis: 'balanced',
};

export const MODE_LABELS: Record<VisualMode, string> = {
  'mandelbrot-zoom': 'Mandelbrot Deep Zoom',
  'julia-flow': 'Julia Flow',
  'fractal-bloom': 'Fractal Bloom',
  'plasma-field': 'Plasma Fractal Field',
  'particle-field': 'Particle Fractal Field',
  'kaleidoscopic-symmetry': 'Kaleidoscopic Fractal Symmetry',
  'lyrical-drift': 'Lyrical Drift',
};

export const PALETTE_TEMPERATURE_LABELS: Record<PaletteTemperaturePreference, string> = {
  balanced: 'Balanced',
  warm: 'Warm',
  neutral: 'Neutral',
  cool: 'Cool',
};

export const MODE_EMPHASIS_LABELS: Record<ModeEmphasis, string> = {
  balanced: 'Balanced',
  'mandelbrot-zoom': 'Zoom',
  'julia-flow': 'Julia',
  'fractal-bloom': 'Bloom',
  'plasma-field': 'Plasma',
  'particle-field': 'Particle',
  'kaleidoscopic-symmetry': 'Symmetry',
  'lyrical-drift': 'Lyrical',
};
