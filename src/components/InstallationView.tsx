import { useEffect, useRef, useState } from 'react';
import { AutonomousArtwork } from '../art/AutonomousArtwork';
import {
  defaultArtworkControls,
  MODE_EMPHASIS_LABELS,
  PALETTE_TEMPERATURE_LABELS,
  VISUAL_MODES,
  type ArtworkControls,
  type ArtworkStatus,
} from '../art/types';

const initialStatus: ArtworkStatus = {
  currentTitle: 'Preparing the first field',
  currentModeLabel: 'Shader orchestra',
  paletteName: 'Curated palette',
  phase: 'evolving',
  upcomingTitle: null,
};

const modeEmphasisOptions = ['balanced', ...VISUAL_MODES] as const;

export function InstallationView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const artworkRef = useRef<AutonomousArtwork | null>(null);
  const [status, setStatus] = useState<ArtworkStatus>(initialStatus);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [controls, setControls] = useState<ArtworkControls>(defaultArtworkControls);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const artwork = new AutonomousArtwork(containerRef.current, setStatus);
    artworkRef.current = artwork;
    artwork.setControls(controls);
    artwork.start();

    return () => {
      artworkRef.current = null;
      artwork.dispose();
    };
  }, []);

  useEffect(() => {
    artworkRef.current?.setControls(controls);
  }, [controls]);

  const phaseCopy =
    status.phase === 'transitioning' && status.upcomingTitle
      ? `Transitioning toward ${status.upcomingTitle}`
      : 'Evolving continuously without user input';

  const updateControls = <K extends keyof ArtworkControls>(key: K, value: ArtworkControls[K]) => {
    setControls((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="installation-shell">
      <div ref={containerRef} className="installation-canvas" aria-hidden="true" />
      <button
        type="button"
        className="menu-toggle"
        aria-controls="installation-menu"
        aria-expanded={isMenuVisible}
        aria-label={isMenuVisible ? 'Hide menu' : 'Show menu'}
        onClick={() => setIsMenuVisible((visible) => !visible)}
      >
        {isMenuVisible ? 'Hide' : 'Menu'}
      </button>
      {isMenuVisible ? (
        <div id="installation-menu" className="installation-overlay">
          <p className="eyebrow">Autonomous Generative Installation</p>
          <h1>Living Fractal Atlas</h1>
          <p className="scene-label">{status.currentTitle}</p>
          <p className="scene-meta">
            {status.currentModeLabel} / {status.paletteName}
          </p>
          <p className="scene-phase">{phaseCopy}</p>
          <div className="control-panel">
            <div className="control-grid">
              <label className="control-block" htmlFor="zoom-speed">
                <span className="control-label">Zoom pace</span>
                <div className="control-row">
                  <input
                    id="zoom-speed"
                    className="control-slider"
                    type="range"
                    min="0.35"
                    max="2.5"
                    step="0.05"
                    value={controls.zoomMultiplier}
                    onChange={(event) => updateControls('zoomMultiplier', Number(event.target.value))}
                  />
                  <span className="control-value">{controls.zoomMultiplier.toFixed(2)}x</span>
                </div>
              </label>

              <label className="control-block" htmlFor="motion-intensity">
                <span className="control-label">Motion stillness</span>
                <div className="control-row">
                  <input
                    id="motion-intensity"
                    className="control-slider"
                    type="range"
                    min="0.35"
                    max="2.2"
                    step="0.05"
                    value={controls.motionIntensity}
                    onChange={(event) => updateControls('motionIntensity', Number(event.target.value))}
                  />
                  <span className="control-value">{describeMotion(controls.motionIntensity)}</span>
                </div>
              </label>

              <label className="control-block" htmlFor="transition-length">
                <span className="control-label">Transition length</span>
                <div className="control-row">
                  <input
                    id="transition-length"
                    className="control-slider"
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.05"
                    value={controls.transitionLengthMultiplier}
                    onChange={(event) =>
                      updateControls('transitionLengthMultiplier', Number(event.target.value))
                    }
                  />
                  <span className="control-value">
                    {controls.transitionLengthMultiplier.toFixed(2)}x
                  </span>
                </div>
              </label>

              <label className="control-block" htmlFor="symmetry-bias">
                <span className="control-label">Symmetry bias</span>
                <div className="control-row">
                  <input
                    id="symmetry-bias"
                    className="control-slider"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={controls.symmetryBias}
                    onChange={(event) => updateControls('symmetryBias', Number(event.target.value))}
                  />
                  <span className="control-value">{describeSymmetry(controls.symmetryBias)}</span>
                </div>
              </label>

              <label className="control-block" htmlFor="palette-temperature">
                <span className="control-label">Palette temperature</span>
                <select
                  id="palette-temperature"
                  className="control-select"
                  value={controls.paletteTemperature}
                  onChange={(event) =>
                    updateControls(
                      'paletteTemperature',
                      event.target.value as ArtworkControls['paletteTemperature'],
                    )
                  }
                >
                  {Object.entries(PALETTE_TEMPERATURE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="control-block" htmlFor="mode-emphasis">
                <span className="control-label">Mode emphasis</span>
                <select
                  id="mode-emphasis"
                  className="control-select"
                  value={controls.modeEmphasis}
                  onChange={(event) =>
                    updateControls('modeEmphasis', event.target.value as ArtworkControls['modeEmphasis'])
                  }
                >
                  {modeEmphasisOptions.map((option) => (
                    <option key={option} value={option}>
                      {MODE_EMPHASIS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function describeMotion(value: number) {
  if (value < 0.8) {
    return 'Still';
  }

  if (value > 1.25) {
    return 'Active';
  }

  return 'Balanced';
}

function describeSymmetry(value: number) {
  if (value < -0.2) {
    return 'Organic';
  }

  if (value > 0.2) {
    return 'Mirrored';
  }

  return 'Balanced';
}
