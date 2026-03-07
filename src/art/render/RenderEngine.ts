import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import type { ArtworkControls, TransitionSnapshot } from '../types';
import { FractalPass } from './FractalPass';
import { compositeFragmentShader, fullscreenVertexShader } from './shaders';

export class RenderEngine {
  private readonly renderer: WebGLRenderer;
  private readonly camera: OrthographicCamera;
  private readonly geometry: PlaneGeometry;
  private readonly currentPass: FractalPass;
  private readonly nextPass: FractalPass;
  private readonly currentTarget: WebGLRenderTarget;
  private readonly nextTarget: WebGLRenderTarget;
  private readonly compositeScene = new Scene();
  private readonly compositeMaterial: ShaderMaterial;
  private readonly resolution = new Vector2(1, 1);
  private readonly resizeHandler = () => this.resize();
  private readonly observer?: ResizeObserver;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor('#04070b');

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geometry = new PlaneGeometry(2, 2);
    this.currentPass = new FractalPass(this.geometry);
    this.nextPass = new FractalPass(this.geometry);
    this.currentTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.nextTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      stencilBuffer: false,
    });

    this.compositeMaterial = new ShaderMaterial({
      uniforms: {
        u_currentTexture: { value: this.currentTarget.texture },
        u_nextTexture: { value: this.currentTarget.texture },
        u_resolution: { value: this.resolution.clone() },
        u_currentAccent: { value: new Color() },
        u_nextAccent: { value: new Color() },
        u_progress: { value: 0 },
        u_time: { value: 0 },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: compositeFragmentShader,
      depthWrite: false,
      depthTest: false,
    });

    this.compositeScene.add(new Mesh(this.geometry, this.compositeMaterial));
    this.container.appendChild(this.renderer.domElement);

    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.resizeHandler);
      this.observer.observe(this.container);
    } else {
      window.addEventListener('resize', this.resizeHandler);
    }

    this.resize();
  }

  render(snapshot: TransitionSnapshot, time: number) {
    this.currentPass.update(snapshot.currentScene, this.resolution, time, snapshot.currentSceneElapsed);
    this.renderer.setRenderTarget(this.currentTarget);
    this.renderer.render(this.currentPass.scene, this.camera);

    const upcomingScene = snapshot.nextScene ?? snapshot.currentScene;

    if (snapshot.nextScene) {
      this.nextPass.update(snapshot.nextScene, this.resolution, time, snapshot.nextSceneElapsed);
      this.renderer.setRenderTarget(this.nextTarget);
      this.renderer.render(this.nextPass.scene, this.camera);
    }

    this.renderer.setRenderTarget(null);

    this.compositeMaterial.uniforms.u_currentTexture.value = this.currentTarget.texture;
    this.compositeMaterial.uniforms.u_nextTexture.value = snapshot.nextScene
      ? this.nextTarget.texture
      : this.currentTarget.texture;
    this.compositeMaterial.uniforms.u_resolution.value.copy(this.resolution);
    this.compositeMaterial.uniforms.u_currentAccent.value.setRGB(...snapshot.currentScene.palette.accent);
    this.compositeMaterial.uniforms.u_nextAccent.value.setRGB(...upcomingScene.palette.accent);
    this.compositeMaterial.uniforms.u_progress.value = snapshot.transitionProgress;
    this.compositeMaterial.uniforms.u_time.value = time;

    this.renderer.render(this.compositeScene, this.camera);
  }

  setControls(controls: ArtworkControls) {
    this.currentPass.setControls(controls);
    this.nextPass.setControls(controls);
  }

  dispose() {
    this.observer?.disconnect();
    window.removeEventListener('resize', this.resizeHandler);

    this.currentPass.dispose();
    this.nextPass.dispose();
    this.currentTarget.dispose();
    this.nextTarget.dispose();
    this.geometry.dispose();
    this.compositeMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private resize() {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    const renderWidth = Math.max(1, Math.floor(width * pixelRatio));
    const renderHeight = Math.max(1, Math.floor(height * pixelRatio));

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.currentTarget.setSize(renderWidth, renderHeight);
    this.nextTarget.setSize(renderWidth, renderHeight);
    this.resolution.set(renderWidth, renderHeight);
  }
}
