# Living Fractal Atlas

Living Fractal Atlas is a browser-based autonomous generative art installation. Once launched, it continuously renders curated fractal scenes that evolve for 60 to 180 seconds and then transition slowly into the next scene without user input.

## Stack

- React + TypeScript + Vite for the application shell
- Three.js as the WebGL renderer
- GLSL fragment shaders for all visual modes
- `requestAnimationFrame` for the perpetual render loop

## Included Visual Modes

1. Mandelbrot Deep Zoom
2. Julia Flow
3. Fractal Bloom
4. Plasma Fractal Field
5. Particle Fractal Field
6. Kaleidoscopic Fractal Symmetry

Each generated scene carries a curated palette, motion profile, camera behavior, symmetry setting, and iteration depth. The transition system crossfades scenes with a soft zoom dissolve so the piece feels continuous and meditative rather than abrupt.

## Live Controls

The artwork still runs autonomously, but the overlay now includes a compact set of optional controls:

- Menu toggle to hide or restore the control panel
- Zoom pace slider for the global camera drift and deep-zoom speed
- Motion stillness slider for calmer or more active scene motion
- Transition length slider for shorter or longer dissolves
- Symmetry bias slider to nudge scenes toward organic or mirrored structure
- Palette temperature selector for warm, neutral, cool, or balanced curation
- Mode emphasis selector for gently biasing the scene generator toward one mode family

## Project Structure

- `src/art/render` contains the WebGL render engine, fullscreen passes, and GLSL shaders.
- `src/art/systems` contains the palette, scene generation, and scene transition logic.
- `src/art/AutonomousArtwork.ts` coordinates the systems and owns the perpetual animation loop.
- `src/components/InstallationView.tsx` mounts the renderer inside the React shell.

## Development

```bash
npm install
npm run dev
```

The app runs fullscreen in the browser at the local Vite URL.

## Production Build

```bash
npm test
npm run build
npm run preview
```

## Notes

- The render loop is GPU-driven and avoids per-frame React rerenders.
- Scene timing is intentionally long-form to support installation and screensaver-style runtime.
- Shader code in `src/art/render/shaders.ts` is commented around the major mathematical building blocks so the visual systems are easy to extend.
