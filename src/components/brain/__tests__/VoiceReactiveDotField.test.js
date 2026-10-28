import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import VoiceReactiveDotField, {
  createHalftoneGrid,
  injectSpeechWaveEnergy,
  stepDotFieldPhysics,
  seededGradientNoise2D,
  PHYSICS_CONSTANTS,
} from '../VoiceReactiveDotField';
import GideonTechBrain from '../GideonTechBrain';

describe('VoiceReactiveDotField Component & Physics Engine', () => {
  test('1. renders successfully in the existing JSX application and inside GideonTechBrain', () => {
    const { getByTestId } = render(
      <VoiceReactiveDotField width={640} height={640} isSpeaking={false} state="idle" />
    );
    const canvas = getByTestId('voice-reactive-dot-field');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-speaking', 'false');

    const brainRender = render(<GideonTechBrain state="idle" statusText="Ready" />);
    expect(brainRender.getAllByTestId('voice-reactive-dot-field').length).toBeGreaterThan(0);
  });

  test('2. particle grid initializes with seeded halftone variation and resizes across small, medium, and large dimensions', () => {
    const smallGrid = createHalftoneGrid(360, 360, 4207);
    const medGrid = createHalftoneGrid(520, 520, 4207);
    const largeGrid = createHalftoneGrid(640, 640, 4207);

    expect(smallGrid.width).toBe(360);
    expect(medGrid.width).toBe(520);
    expect(largeGrid.width).toBe(640);
    expect(largeGrid.count).toBeGreaterThan(medGrid.count);
    expect(medGrid.count).toBeGreaterThan(smallGrid.count);

    // Deterministic seeded gradient noise
    const nA = seededGradientNoise2D(1.25, 3.75);
    const nB = seededGradientNoise2D(1.25, 3.75);
    expect(nA).toBeCloseTo(nB, 6);

    // Verify inner facial clearance protects central facial landmarks (center point is masked out)
    const centerRow = Math.floor(largeGrid.rows / 2);
    const centerCol = Math.floor(largeGrid.cols / 2);
    const centerIdx = centerRow * largeGrid.cols + centerCol;
    expect(largeGrid.activeMask[centerIdx]).toBe(0);

    // Verify component updates dimensions on resize re-render
    const { getByTestId, rerender } = render(
      <VoiceReactiveDotField width={360} height={360} isSpeaking={false} />
    );
    expect(getByTestId('voice-reactive-dot-field')).toHaveStyle({ width: '360px', height: '360px' });

    rerender(<VoiceReactiveDotField width={640} height={640} isSpeaking={false} />);
    expect(getByTestId('voice-reactive-dot-field')).toHaveStyle({ width: '640px', height: '640px' });
  });

  test('3. outgoing speech activity activates the field and propagates waves via neighbour coupling', () => {
    const grid = createHalftoneGrid(520, 520, 4207);
    expect(grid.totalEnergy).toBe(0);

    const injected = injectSpeechWaveEnergy(grid, {
      isSpeaking: true,
      speechLevel: 0.75,
      speechPulse: 0.5,
      isInitialBurst: true,
    });
    expect(injected).toBeGreaterThan(0);

    const energyStep1 = stepDotFieldPhysics(grid);
    expect(energyStep1).toBeGreaterThan(0);

    // Step multiple frames and verify outer ring particles (rn > 0.70) receive wave energy via neighbour coupling
    for (let s = 0; s < 12; s++) {
      stepDotFieldPhysics(grid);
    }
    let outerDisplacedCount = 0;
    for (let i = 0; i < grid.count; i++) {
      if (grid.activeMask[i] && grid.radialNorm[i] > 0.70) {
        if (Math.hypot(grid.dispX[i], grid.dispY[i]) > 0.0001) {
          outerDisplacedCount++;
        }
      }
    }
    expect(outerDisplacedCount).toBeGreaterThan(0);
  });

  test('4. higher outgoing speech activity produces stronger yet strictly bounded visual intensity', () => {
    const lowGrid = createHalftoneGrid(520, 520, 4207);
    const highGrid = createHalftoneGrid(520, 520, 4207);
    const extremeGrid = createHalftoneGrid(520, 520, 4207);

    injectSpeechWaveEnergy(lowGrid, { isSpeaking: true, speechLevel: 0.2, speechPulse: 0.0 });
    stepDotFieldPhysics(lowGrid);

    injectSpeechWaveEnergy(highGrid, { isSpeaking: true, speechLevel: 0.9, speechPulse: 0.8 });
    stepDotFieldPhysics(highGrid);

    expect(highGrid.totalEnergy).toBeGreaterThan(lowGrid.totalEnergy);

    // Verify extreme input remains strictly clamped within MAX_DISPLACEMENT
    for (let step = 0; step < 30; step++) {
      injectSpeechWaveEnergy(extremeGrid, {
        isSpeaking: true,
        speechLevel: 10.0,
        speechPulse: 10.0,
        isInitialBurst: true,
      });
      stepDotFieldPhysics(extremeGrid);
    }

    for (let i = 0; i < extremeGrid.count; i++) {
      const mag = Math.hypot(extremeGrid.dispX[i], extremeGrid.dispY[i]);
      expect(mag).toBeLessThanOrEqual(PHYSICS_CONSTANTS.MAX_DISPLACEMENT + 0.001);
    }
  });

  test('5. speech pauses stop new energy injection and allow existing disturbances to decay', () => {
    const grid = createHalftoneGrid(520, 520, 4207);

    // Active speech builds wave energy
    for (let i = 0; i < 6; i++) {
      injectSpeechWaveEnergy(grid, { isSpeaking: true, speechLevel: 0.8, speechPulse: 0.6 });
      stepDotFieldPhysics(grid);
    }
    const peakEnergy = grid.totalEnergy;
    expect(peakEnergy).toBeGreaterThan(0);

    // Pause during speech (speechLevel = 0, speechPulse = 0)
    const injectedDuringPause = injectSpeechWaveEnergy(grid, {
      isSpeaking: true,
      speechLevel: 0,
      speechPulse: 0,
    });
    expect(injectedDuringPause).toBe(0);

    for (let i = 0; i < 20; i++) {
      stepDotFieldPhysics(grid);
    }
    expect(grid.totalEnergy).toBeLessThan(peakEnergy);
  });

  test('6 & 7. speech end stops energy injection and field settles back to idle sleep threshold', () => {
    const grid = createHalftoneGrid(360, 360, 4207);

    injectSpeechWaveEnergy(grid, { isSpeaking: true, speechLevel: 0.6, speechPulse: 0.4 });
    stepDotFieldPhysics(grid);
    expect(grid.totalEnergy).toBeGreaterThan(0);

    // Speech ends: isSpeaking = false
    const injectedAfterEnd = injectSpeechWaveEnergy(grid, {
      isSpeaking: false,
      speechLevel: 0.9,
      speechPulse: 0.9,
    });
    expect(injectedAfterEnd).toBe(0);

    // Run damping steps until settled below SLEEP_ENERGY_EPSILON
    for (let step = 0; step < 180; step++) {
      stepDotFieldPhysics(grid);
      if (grid.totalEnergy < PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON) break;
    }
    expect(grid.totalEnergy).toBeLessThan(PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON);
  });

  test('8 & 9. mouse movement and mouse clicks have zero effect on particles or shockwaves', () => {
    const ref = React.createRef();
    const { getByTestId } = render(
      <VoiceReactiveDotField
        ref={ref}
        width={520}
        height={520}
        isSpeaking={false}
        speechLevel={0}
        state="idle"
      />
    );

    const canvas = getByTestId('voice-reactive-dot-field');
    const grid = ref.current.getGrid();

    // Fire mousemove, pointermove, mousedown, pointerdown, click across the canvas
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 250 });
    fireEvent.pointerMove(canvas, { clientX: 260, clientY: 260 });
    fireEvent.mouseDown(canvas, { clientX: 260, clientY: 260 });
    fireEvent.pointerDown(canvas, { clientX: 260, clientY: 260 });
    fireEvent.click(canvas, { clientX: 260, clientY: 260 });

    expect(grid.totalEnergy).toBe(0);
    let maxDisp = 0;
    for (let i = 0; i < grid.count; i++) {
      maxDisp = Math.max(maxDisp, Math.hypot(grid.dispX[i], grid.dispY[i]));
    }
    expect(maxDisp).toBe(0);
  });

  test('10. microphone activity alone (listening state + high audioLevel) does NOT activate AI speaking mouth or dot field', () => {
    const { container, getByTestId } = render(
      <GideonTechBrain
        state="listening"
        audioLevel={0.95}
        speechLevel={0}
        isSpeaking={false}
        statusText="Listening to user..."
      />
    );

    const brainContainer = container.querySelector('.gideon-tech-brain-container');
    expect(brainContainer).toHaveAttribute('data-viseme', 'REST');
    expect(brainContainer).toHaveAttribute('data-mouth-closed', 'true');

    const dotField = getByTestId('voice-reactive-dot-field');
    expect(dotField).toHaveAttribute('data-speaking', 'false');
  });

  test('11. reduced-motion preferences are respected', () => {
    const { getByTestId } = render(
      <VoiceReactiveDotField
        width={520}
        height={520}
        isSpeaking={true}
        speechLevel={0.85}
        reducedMotion={true}
      />
    );

    const canvas = getByTestId('voice-reactive-dot-field');
    expect(canvas).toHaveAttribute('data-reduced-motion', 'true');
  });

  test('12. animation loops and event listeners are cleaned up on unmount', () => {
    const removeDocSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <VoiceReactiveDotField width={520} height={520} isSpeaking={true} speechLevel={0.7} />
    );

    act(() => {
      unmount();
    });

    expect(removeDocSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeDocSpy.mockRestore();
  });

  test('13. in non-fullscreen fullBleed mode with a sidebar, centers the wave exactly on headCanvasRef rather than window.innerWidth', () => {
    const fieldRef = React.createRef();
    const headCanvasEl = document.createElement('canvas');
    // Simulate a 1920x1080 window with a 260px left sidebar:
    // workspace starts at left=260, width=1660; head is centered in workspace (left=260+460=720, width=740 => center=1090 screen X, which is 830 inside the 1660px workspace)
    headCanvasEl.getBoundingClientRect = () => ({
      left: 720,
      top: 110,
      width: 740,
      height: 540,
      right: 1460,
      bottom: 650,
    });
    const headCanvasRef = { current: headCanvasEl };

    const origGetBCR = HTMLCanvasElement.prototype.getBoundingClientRect;
    HTMLCanvasElement.prototype.getBoundingClientRect = function () {
      if (this === headCanvasEl) {
        return { left: 720, top: 110, width: 740, height: 540 };
      }
      return { left: 260, top: 64, width: 1660, height: 1016 };
    };

    try {
      render(
        <VoiceReactiveDotField
          ref={fieldRef}
          width={740}
          height={640}
          fullBleed={true}
          headCanvasRef={headCanvasRef}
          isSpeaking={true}
          speechLevel={0.8}
          speechPulse={0.6}
          state="speaking"
        />
      );

      const grid = fieldRef.current.getGrid();
      expect(grid.width).toBe(1660);
      expect(grid.height).toBe(1016);
      expect(grid.cx).toBeCloseTo(830, 1);
      expect(grid.shocks.length).toBeGreaterThan(0);
      expect(grid.cx + (grid.shocks[0].offsetX || 0)).toBeCloseTo(830, 1);
    } finally {
      HTMLCanvasElement.prototype.getBoundingClientRect = origGetBCR;
    }
  });
});

