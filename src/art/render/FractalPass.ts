import { Color, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { ArtworkControls, SceneConfig } from '../types';
import { fractalFragmentShader, fullscreenVertexShader } from './shaders';

export class FractalPass {
  readonly scene = new Scene();
  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private lastSceneId = -1;

  constructor(geometry: PlaneGeometry) {
    this.material = new ShaderMaterial({
      uniforms: {
        u_resolution: { value: new Vector2(1, 1) },
        u_time: { value: 0 },
        u_sceneTime: { value: 0 },
        u_seed: { value: 0 },
        u_scale: { value: 1 },
        u_detail: { value: 128 },
        u_symmetry: { value: 6 },
        u_rotation: { value: 0 },
        u_zoomRate: { value: 0.03 },
        u_zoomMultiplier: { value: 1 },
        u_motionIntensity: { value: 1 },
        u_symmetryBias: { value: 0 },
        u_formula: { value: 0 },
        u_mode: { value: 0 },
        u_focus: { value: new Vector2() },
        u_secondary: { value: new Vector2() },
        u_drift: { value: new Vector2() },
        u_motion: { value: new Vector3(1, 1, 1) },
        u_palette0: { value: new Color() },
        u_palette1: { value: new Color() },
        u_palette2: { value: new Color() },
        u_palette3: { value: new Color() },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: fractalFragmentShader,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update(scene: SceneConfig, resolution: Vector2, globalTime: number, sceneTime: number) {
    if (this.lastSceneId !== scene.id) {
      this.applyScene(scene);
      this.lastSceneId = scene.id;
    }

    this.material.uniforms.u_resolution.value.copy(resolution);
    this.material.uniforms.u_time.value = globalTime;
    this.material.uniforms.u_sceneTime.value = sceneTime;
  }

  setZoomMultiplier(multiplier: number) {
    this.material.uniforms.u_zoomMultiplier.value = multiplier;
  }

  setControls(controls: ArtworkControls) {
    this.material.uniforms.u_zoomMultiplier.value = controls.zoomMultiplier;
    this.material.uniforms.u_motionIntensity.value = controls.motionIntensity;
    this.material.uniforms.u_symmetryBias.value = controls.symmetryBias;
  }

  dispose() {
    this.material.dispose();
  }

  private applyScene(scene: SceneConfig) {
    this.material.uniforms.u_seed.value = scene.seed;
    this.material.uniforms.u_scale.value = scene.scale;
    this.material.uniforms.u_detail.value = scene.iterationDepth;
    this.material.uniforms.u_symmetry.value = scene.symmetryLevel;
    this.material.uniforms.u_rotation.value = scene.rotation;
    this.material.uniforms.u_zoomRate.value = scene.zoomRate;
    this.material.uniforms.u_formula.value = scene.formula;
    this.material.uniforms.u_mode.value = scene.modeIndex;
    this.material.uniforms.u_focus.value.set(scene.focus[0], scene.focus[1]);
    this.material.uniforms.u_secondary.value.set(scene.secondary[0], scene.secondary[1]);
    this.material.uniforms.u_drift.value.set(scene.drift[0], scene.drift[1]);
    this.material.uniforms.u_motion.value.set(scene.motion[0], scene.motion[1], scene.motion[2]);
    this.material.uniforms.u_palette0.value.setRGB(...scene.palette.background);
    this.material.uniforms.u_palette1.value.setRGB(...scene.palette.shadow);
    this.material.uniforms.u_palette2.value.setRGB(...scene.palette.accent);
    this.material.uniforms.u_palette3.value.setRGB(...scene.palette.glow);
  }
}
