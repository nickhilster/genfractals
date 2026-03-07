export const fullscreenVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fractalFragmentShader = `
  precision highp float;

  varying vec2 vUv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_sceneTime;
  uniform float u_seed;
  uniform float u_scale;
  uniform float u_detail;
  uniform float u_symmetry;
  uniform float u_rotation;
  uniform float u_zoomRate;
  uniform float u_zoomMultiplier;
  uniform float u_motionIntensity;
  uniform float u_symmetryBias;
  uniform float u_formula;
  uniform int u_mode;
  uniform vec2 u_focus;
  uniform vec2 u_secondary;
  uniform vec2 u_drift;
  uniform vec3 u_motion;
  uniform vec3 u_palette0;
  uniform vec3 u_palette1;
  uniform vec3 u_palette2;
  uniform vec3 u_palette3;

  const float PI = 3.14159265359;
  const int MAX_ITER = 180;

  mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  // Compact hash helpers keep the shader deterministic without texture lookups.
  float hash21(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  vec2 hash22(vec2 value) {
    return vec2(
      hash21(value),
      hash21(value + vec2(83.11, 37.97))
    );
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 eased = local * local * (3.0 - 2.0 * local);

    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, eased.x), mix(c, d, eased.x), eased.y);
  }

  // Fractal Brownian motion gives the softer modes a layered, atmospheric structure.
  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(point);
      point = rotate2d(0.42) * point * 2.02 + vec2(3.1, 1.7);
      amplitude *= 0.52;
    }

    return value;
  }

  vec2 complexSquare(vec2 z) {
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
  }

  vec2 kaleido(vec2 point, float segments) {
    float angle = atan(point.y, point.x);
    float radius = length(point);
    float sector = (PI * 2.0) / max(segments, 1.0);
    angle = mod(angle, sector);
    angle = abs(angle - sector * 0.5);
    return vec2(cos(angle), sin(angle)) * radius;
  }

  // Palette interpolation uses four anchors so each scene can stay curated but dynamic.
  vec3 samplePalette(float t) {
    float clamped = clamp(t, 0.0, 1.0);
    vec3 lower = mix(u_palette0, u_palette1, smoothstep(0.0, 0.38, clamped));
    vec3 upper = mix(u_palette2, u_palette3, smoothstep(0.42, 1.0, clamped));
    return mix(lower, upper, smoothstep(0.24, 0.92, clamped));
  }

  vec3 ambientBase(vec2 point) {
    float radial = length(point);
    float haze = exp(-1.8 * radial) * (0.45 + 0.55 * fbm(point * 0.8 + u_seed * 9.0));
    vec3 gradient = mix(u_palette0, u_palette1, 0.42 + 0.18 * point.y);
    return gradient * 0.55 + u_palette3 * haze * 0.12;
  }

  float segmentDistance(vec2 point, vec2 start, vec2 end) {
    vec2 startToPoint = point - start;
    vec2 startToEnd = end - start;
    float lineLength = max(dot(startToEnd, startToEnd), 0.0001);
    float projection = clamp(dot(startToPoint, startToEnd) / lineLength, 0.0, 1.0);
    return length(startToPoint - startToEnd * projection);
  }

  // The particle mode follows a recursive, multi-scale vector field for a fractal feel.
  vec2 fractalField(vec2 point, float time) {
    vec2 warped = point;
    vec2 velocity = vec2(0.0);
    float amplitude = 1.0;

    for (int layer = 0; layer < 4; layer++) {
      float index = float(layer);
      velocity += amplitude * vec2(
        sin(warped.y * (2.4 + index * 1.2) + time * (0.07 + index * 0.015) + u_seed * 6.28318),
        cos(warped.x * (2.9 + index * 1.4) - time * (0.06 + index * 0.012) - u_seed * 4.111)
      );
      warped = warped * 1.65 + vec2(0.45, -0.38);
      amplitude *= 0.58;
    }

    vec2 swirl = vec2(-point.y, point.x) / (0.45 + dot(point, point));
    return normalize(velocity + swirl * 0.45);
  }

  float zoomWeight() {
    if (u_mode == 0) {
      return 1.0;
    }

    if (u_mode == 1) {
      return 0.75;
    }

    if (u_mode == 2) {
      return 0.55;
    }

    if (u_mode == 3) {
      return 0.5;
    }

    if (u_mode == 4) {
      return 0.45;
    }

    return 0.65;
  }

  float motionFactor() {
    return clamp(u_motionIntensity, 0.35, 2.5);
  }

  float effectiveSymmetry(float base) {
    float symmetryFactor = clamp(1.0 + u_symmetryBias * 0.65, 0.45, 1.85);
    return max(1.0, floor(base * symmetryFactor));
  }

  // A global camera envelope lets the UI slider influence every mode without breaking the calm pacing.
  float globalZoomEnvelope() {
    float speed = clamp(u_zoomMultiplier, 0.35, 2.5);
    float weight = zoomWeight();
    float settle = 1.0 - 0.22 * weight * (1.0 - exp(-0.035 * u_sceneTime * speed));
    float breath = 1.0 + 0.03 * weight * sin(u_sceneTime * 0.05 * speed + u_seed * 6.28318);
    return settle / breath;
  }

  vec3 renderMandelbrot(vec2 uv) {
    float motion = motionFactor();
    int iterations = int(clamp(u_detail, 48.0, 180.0));
    float zoom = u_scale * exp(-(u_zoomRate * u_zoomMultiplier) * u_sceneTime);
    vec2 wobble = vec2(
      sin(u_sceneTime * 0.028 * motion * u_motion.x + u_seed * 10.0),
      cos(u_sceneTime * 0.032 * motion * u_motion.y + u_seed * 7.0)
    );
    vec2 c = u_focus + rotate2d(u_rotation * 0.55) * (uv * zoom + (u_secondary + wobble * u_drift * motion) * zoom);
    vec2 z = vec2(0.0);
    float smoothIter = float(iterations);
    float orbit = 10.0;
    bool escaped = false;

    for (int iteration = 0; iteration < MAX_ITER; iteration++) {
      if (iteration >= iterations) {
        break;
      }

      z = complexSquare(z) + c;
      float magnitude = dot(z, z);
      orbit = min(orbit, abs(z.x * z.y) + 0.25 * abs(z.x + z.y));

      if (magnitude > 256.0) {
        escaped = true;
        smoothIter = float(iteration) + 1.0 - log2(log2(magnitude));
        break;
      }
    }

    if (!escaped) {
      vec3 interior = mix(u_palette0, u_palette1, 0.36 + 0.08 * sin(u_sceneTime * 0.04));
      return interior + u_palette3 * exp(-8.0 * orbit) * 0.35;
    }

    float normalized = smoothIter / float(iterations);
    vec3 color = mix(ambientBase(uv * 0.82), samplePalette(pow(normalized, 0.72)), 0.92);
    color += u_palette3 * exp(-8.0 * orbit) * 0.8;
    color += u_palette2 * 0.08 * fbm(c * 3.0);
    return color;
  }

  vec3 renderJulia(vec2 uv) {
    float motion = motionFactor();
    int iterations = int(clamp(u_detail, 56.0, 180.0));
    vec2 point = uv * (1.1 + u_scale * 0.55);
    point += u_drift * 0.4 * motion * vec2(
      sin(u_sceneTime * 0.11 * motion + u_seed * 4.0),
      cos(u_sceneTime * 0.09 * motion + u_seed * 5.0)
    );
    point = rotate2d(u_rotation * 0.55 + u_sceneTime * 0.014 * motion * u_motion.z) * point;

    vec2 c = 0.58 * u_focus +
      0.28 * vec2(
        sin(u_sceneTime * motion * u_motion.x * 0.19 + u_seed * 6.28318),
        cos(u_sceneTime * motion * u_motion.y * 0.16 + u_seed * 4.71238)
      ) +
      0.12 * u_secondary * sin(u_sceneTime * 0.07 * motion);

    vec2 z = point;
    float smoothIter = float(iterations);
    float orbit = 10.0;
    bool escaped = false;

    for (int iteration = 0; iteration < MAX_ITER; iteration++) {
      if (iteration >= iterations) {
        break;
      }

      orbit = min(orbit, length(z + c));
      z = complexSquare(z) + c;
      z += mix(
        0.04 * cos(vec2(z.y, z.x) * 1.9 - u_sceneTime * 0.06 * motion),
        0.06 * sin(vec2(z.y, z.x) * 2.2 + u_sceneTime * 0.08 * motion),
        step(1.5, u_formula)
      );

      float magnitude = dot(z, z);

      if (magnitude > 144.0) {
        escaped = true;
        smoothIter = float(iteration) + 1.0 - log2(log2(magnitude));
        break;
      }
    }

    float normalized = smoothIter / float(iterations);
    float ribbon = exp(-9.5 * orbit);
    vec3 color = mix(ambientBase(uv), samplePalette(pow(normalized, 0.78)), 0.9);
    color += u_palette3 * ribbon * 0.95;
    color += u_palette1 * 0.16 * exp(-5.0 * abs(length(point) - 1.1));

    if (!escaped) {
      color = mix(color, u_palette0, 0.35);
    }

    return color;
  }

  vec3 renderBloom(vec2 uv) {
    float motion = motionFactor();
    float symmetry = max(3.0, effectiveSymmetry(u_symmetry));
    vec2 point = rotate2d(u_rotation + u_sceneTime * 0.011 * motion) * uv * (1.0 + u_scale * 0.45);
    point = kaleido(point, symmetry);
    point *= 1.0 + 0.18 * sin(u_sceneTime * motion * (0.05 + u_motion.x * 0.02));

    float petals = 0.0;
    float halo = 0.0;
    vec2 fold = point;

    for (int index = 0; index < 7; index++) {
      float layer = float(index);
      fold = abs(fold) / clamp(dot(fold, fold), 0.18, 1.25) - (0.78 + 0.05 * sin(u_sceneTime * 0.08 * motion + layer + u_formula));
      fold *= rotate2d(0.35 + 0.08 * sin(u_sceneTime * 0.04 * motion + layer));
      float ring = exp(-10.0 * abs(length(fold) - (0.45 + 0.08 * sin(u_sceneTime * 0.03 * motion + layer))));
      petals += ring / (1.0 + layer * 0.5);
      halo += exp(-8.0 * dot(fold, fold)) / (1.4 + layer);
    }

    float field = petals * 0.88 + halo * 0.7 + 0.15 * fbm(point * 2.2 - u_sceneTime * 0.04 * motion);
    vec3 color = mix(ambientBase(uv), samplePalette(clamp(field * 0.64, 0.0, 1.0)), 0.92);
    color += u_palette3 * halo * 0.42;
    return color;
  }

  vec3 renderPlasma(vec2 uv) {
    float motion = motionFactor();
    vec2 point = rotate2d(u_rotation * 0.4) * uv * (0.9 + u_scale * 0.4);
    point += u_drift * u_sceneTime * 0.015 * motion;
    point = mix(point, kaleido(point, max(2.0, effectiveSymmetry(u_symmetry))), 0.28);

    vec2 q = vec2(
      fbm(point + vec2(0.0, 0.0) + u_sceneTime * 0.03 * motion),
      fbm(point + vec2(5.2, 1.3) - u_sceneTime * 0.025 * motion)
    );
    vec2 r = vec2(
      fbm(point + 3.8 * q + vec2(1.7, 9.2) + u_sceneTime * 0.02 * motion),
      fbm(point + 3.4 * q + vec2(8.3, 2.8) - u_sceneTime * 0.016 * motion)
    );

    float plasma = fbm(point + 4.0 * r);
    float mist = fbm(point * 0.5 - 2.0 * q + u_sceneTime * 0.01 * motion);
    float glow = smoothstep(0.3, 0.95, plasma + mist * 0.35);

    vec3 color = mix(u_palette0, u_palette1, mist);
    color = mix(color, samplePalette(plasma), 0.86);
    color += u_palette3 * glow * 0.34;
    return mix(ambientBase(uv), color, 0.95);
  }

  vec3 renderParticleField(vec2 uv) {
    float motion = motionFactor();
    vec2 point = rotate2d(u_rotation * 0.32) * uv * (1.1 + u_scale * 0.34);
    float trail = 0.0;
    float spark = 0.0;

    for (int particle = 0; particle < 14; particle++) {
      float id = float(particle);
      vec2 origin = (hash22(vec2(id + 1.1, u_seed * 97.3)) - 0.5) * 3.0;
      float phase = hash21(vec2(id * 2.7, u_seed * 31.2));
      vec2 position = origin + 0.35 * vec2(
        sin(u_sceneTime * 0.04 * motion + phase * 6.28318),
        cos(u_sceneTime * 0.05 * motion + phase * 4.71238)
      );
      vec2 previous = position;

      for (int stepIndex = 0; stepIndex < 6; stepIndex++) {
        float stepValue = float(stepIndex);
        vec2 velocity = fractalField(
          position * (0.8 + 0.18 * u_formula),
          u_sceneTime * motion + stepValue * 0.6 + phase * 3.0
        );
        position += velocity * (0.18 + 0.02 * sin(id + u_sceneTime * 0.03 * motion));
        float distanceToSegment = segmentDistance(point, previous, position);
        trail += exp(-42.0 * distanceToSegment) / (1.0 + stepValue * 0.55);
        spark += exp(-70.0 * length(point - position)) / (1.0 + stepValue * 0.7);
        previous = position;
      }
    }

    vec2 field = fractalField(point * 1.6, u_sceneTime * motion);
    float haze = 0.5 + 0.5 * dot(field, normalize(vec2(0.7, 0.35)));
    float density = clamp(trail * 0.72 + spark * 0.64 + haze * 0.22, 0.0, 1.35);

    vec3 color = mix(ambientBase(uv), samplePalette(clamp(density * 0.66, 0.0, 1.0)), 0.93);
    color += u_palette3 * trail * 0.18;
    color += u_palette2 * spark * 0.14;
    return color;
  }

  vec3 renderKaleidoscope(vec2 uv) {
    float motion = motionFactor();
    int iterations = int(clamp(u_detail, 48.0, 160.0));
    float symmetry = max(4.0, effectiveSymmetry(u_symmetry));
    vec2 point = kaleido(uv * (0.9 + u_scale * 0.42), symmetry);
    point = rotate2d(u_rotation * 0.5 + u_sceneTime * 0.012 * motion) * point;

    vec2 z = point;
    vec2 c = 0.42 * u_focus + 0.22 * vec2(
      sin(u_sceneTime * 0.07 * motion + u_seed * 5.0),
      cos(u_sceneTime * 0.09 * motion + u_seed * 3.0)
    );

    float smoothIter = float(iterations);
    float orbit = 10.0;
    bool escaped = false;

    for (int iteration = 0; iteration < MAX_ITER; iteration++) {
      if (iteration >= iterations) {
        break;
      }

      z = abs(z);
      z = complexSquare(z) + c;
      z += 0.08 * sin(vec2(z.y, z.x) * (1.8 + 0.2 * u_formula) + u_sceneTime * 0.05 * motion);
      float magnitude = dot(z, z);
      orbit = min(orbit, magnitude);

      if (magnitude > 100.0) {
        escaped = true;
        smoothIter = float(iteration) + 1.0 - log2(log2(magnitude));
        break;
      }
    }

    float normalized = smoothIter / float(iterations);
    float petalGlow = exp(-12.0 * orbit);
    vec3 color = mix(ambientBase(uv), samplePalette(pow(normalized, 0.74)), 0.92);
    color += u_palette3 * petalGlow * 0.9;
    color += u_palette1 * 0.11 * smoothstep(0.8, 0.0, abs(length(point) - 0.62));

    if (!escaped) {
      color = mix(color, u_palette0, 0.32);
    }

    return color;
  }

  float vignette(vec2 uv) {
    vec2 stretched = uv * vec2(0.92, 0.86);
    return smoothstep(1.55, 0.24, length(stretched));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    uv *= globalZoomEnvelope();

    vec3 color = ambientBase(uv * 0.9);

    if (u_mode == 0) {
      color = renderMandelbrot(uv);
    } else if (u_mode == 1) {
      color = renderJulia(uv);
    } else if (u_mode == 2) {
      color = renderBloom(uv);
    } else if (u_mode == 3) {
      color = renderPlasma(uv);
    } else if (u_mode == 4) {
      color = renderParticleField(uv);
    } else {
      color = renderKaleidoscope(uv);
    }

    color *= vignette(uv);
    color = pow(max(color, 0.0), vec3(0.92));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const compositeFragmentShader = `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D u_currentTexture;
  uniform sampler2D u_nextTexture;
  uniform vec2 u_resolution;
  uniform vec3 u_currentAccent;
  uniform vec3 u_nextAccent;
  uniform float u_progress;
  uniform float u_time;

  float hash21(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float smoothMix(float value) {
    return value * value * (3.0 - 2.0 * value);
  }

  void main() {
    float progress = smoothMix(clamp(u_progress, 0.0, 1.0));
    vec2 centered = vUv - 0.5;
    vec2 drift = 0.01 * vec2(
      sin(u_time * 0.07 + centered.y * 9.0),
      cos(u_time * 0.06 + centered.x * 8.0)
    ) * (0.3 + progress * (1.0 - progress) * 2.6);

    vec2 uvCurrent = 0.5 + centered * mix(1.0, 0.93, progress) + drift * (1.0 - progress);
    vec2 uvNext = 0.5 + centered * mix(1.07, 1.0, progress) - drift * progress;

    vec3 currentColor = texture2D(u_currentTexture, uvCurrent).rgb;
    vec3 nextColor = texture2D(u_nextTexture, uvNext).rgb;

    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 weighted = centered * vec2(aspect, 1.0);
    float veil = exp(-5.2 * dot(weighted, weighted));
    float grain = (hash21(gl_FragCoord.xy + u_time) - 0.5) / 255.0;
    vec3 mist = mix(u_currentAccent, u_nextAccent, progress) * veil * progress * (1.0 - progress) * 0.35;

    vec3 color = mix(currentColor, nextColor, progress);
    color += mist;
    color += grain;
    color *= 1.0 - 0.1 * smoothstep(0.55, 1.2, length(centered * vec2(1.1, 0.95)));
    color = color / (vec3(1.0) + color * 0.25);

    gl_FragColor = vec4(color, 1.0);
  }
`;
