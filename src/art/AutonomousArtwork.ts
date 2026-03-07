import { createTimeSeed, SeededRandom } from './math/random';
import { RenderEngine } from './render/RenderEngine';
import { SceneGenerator } from './systems/SceneGenerator';
import { TransitionSystem } from './systems/TransitionSystem';
import type { ArtworkControls, ArtworkStatus } from './types';

export class AutonomousArtwork {
  private readonly renderEngine: RenderEngine;
  private readonly transitionSystem: TransitionSystem;
  private animationFrameId = 0;
  private running = false;

  constructor(container: HTMLElement, onStatusChange?: (status: ArtworkStatus) => void) {
    const random = new SeededRandom(createTimeSeed());
    const sceneGenerator = new SceneGenerator(random);

    this.renderEngine = new RenderEngine(container);
    this.transitionSystem = new TransitionSystem(sceneGenerator, onStatusChange);
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    const startTime = performance.now() * 0.001;
    this.transitionSystem.initialize(startTime);

    const renderLoop = (frameTime: number) => {
      if (!this.running) {
        return;
      }

      const time = frameTime * 0.001;
      const snapshot = this.transitionSystem.update(time);
      this.renderEngine.render(snapshot, time);
      this.animationFrameId = window.requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = window.requestAnimationFrame(renderLoop);
  }

  setControls(controls: ArtworkControls) {
    this.renderEngine.setControls(controls);
    this.transitionSystem.setControls(controls);
  }

  dispose() {
    this.running = false;
    window.cancelAnimationFrame(this.animationFrameId);
    this.renderEngine.dispose();
  }
}
