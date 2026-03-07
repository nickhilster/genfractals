import { describeSceneMode } from './SceneGenerator';
import {
  defaultArtworkControls,
  type ArtworkControls,
  type ArtworkStatus,
  type SceneConfig,
  type TransitionSnapshot,
} from '../types';

type StatusListener = (status: ArtworkStatus) => void;
type SceneSource = Pick<
  {
    createInitialScene(): SceneConfig;
    createNextScene(previousScene?: SceneConfig): SceneConfig;
    setControls(controls: ArtworkControls): void;
  },
  'createInitialScene' | 'createNextScene' | 'setControls'
>;

export class TransitionSystem {
  private currentScene: SceneConfig | null = null;
  private nextScene: SceneConfig | null = null;
  private phaseStartTime = 0;
  private transitionStartTime = 0;
  private phase: TransitionSnapshot['phase'] = 'evolving';
  private controls: ArtworkControls = defaultArtworkControls;

  constructor(
    private readonly sceneGenerator: SceneSource,
    private readonly onStatusChange?: StatusListener,
  ) {
    this.sceneGenerator.setControls(this.controls);
  }

  setControls(controls: ArtworkControls) {
    this.controls = controls;
    this.sceneGenerator.setControls(controls);
  }

  initialize(startTime: number): TransitionSnapshot {
    this.currentScene = this.sceneGenerator.createInitialScene();
    this.nextScene = null;
    this.phaseStartTime = startTime;
    this.transitionStartTime = 0;
    this.phase = 'evolving';
    this.notify();
    return this.buildSnapshot(startTime);
  }

  update(time: number): TransitionSnapshot {
    if (!this.currentScene) {
      return this.initialize(time);
    }

    const elapsed = time - this.phaseStartTime;

    if (!this.nextScene && elapsed >= this.currentScene.holdDuration) {
      this.nextScene = this.sceneGenerator.createNextScene(this.currentScene);
      this.transitionStartTime = time;
      this.phase = 'transitioning';
      this.notify();
    }

    if (this.nextScene) {
      const transitionElapsed = time - this.transitionStartTime;
      const transitionProgress = Math.min(transitionElapsed / this.currentTransitionDuration(), 1);

      if (transitionProgress >= 1) {
        this.currentScene = this.nextScene;
        this.nextScene = null;
        this.phaseStartTime = time;
        this.transitionStartTime = 0;
        this.phase = 'evolving';
        this.notify();
      }
    }

    return this.buildSnapshot(time);
  }

  private buildSnapshot(time: number): TransitionSnapshot {
    if (!this.currentScene) {
      throw new Error('Transition system was used before initialization.');
    }

    const currentSceneElapsed = time - this.phaseStartTime;

    if (!this.nextScene) {
      return {
        currentScene: this.currentScene,
        nextScene: null,
        phase: this.phase,
        transitionProgress: 0,
        currentSceneElapsed,
        nextSceneElapsed: 0,
      };
    }

    return {
      currentScene: this.currentScene,
      nextScene: this.nextScene,
      phase: this.phase,
      transitionProgress: Math.min((time - this.transitionStartTime) / this.currentTransitionDuration(), 1),
      currentSceneElapsed,
      nextSceneElapsed: Math.max(0, time - this.transitionStartTime),
    };
  }

  private currentTransitionDuration() {
    if (!this.currentScene) {
      return 1;
    }

    return this.currentScene.transitionDuration * clampNumber(this.controls.transitionLengthMultiplier, 0.6, 1.8);
  }

  private notify() {
    if (!this.currentScene || !this.onStatusChange) {
      return;
    }

    this.onStatusChange({
      currentTitle: this.currentScene.title,
      currentModeLabel: describeSceneMode(this.currentScene.mode),
      paletteName: this.currentScene.palette.name,
      phase: this.phase,
      upcomingTitle: this.nextScene?.title ?? null,
    });
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
