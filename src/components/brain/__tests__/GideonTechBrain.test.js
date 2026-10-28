import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GideonTechBrain from '../GideonTechBrain';

describe('GideonTechBrain Component', () => {
  test('renders in idle state with correct status readout', () => {
    render(
      <GideonTechBrain
        state="idle"
        statusText="Ready for input"
      />
    );

    expect(screen.getByText(/GIDEON CORE STANDBY/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for input/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Gideon Artificial Intelligence Neural Brain in state: idle/i })).toBeInTheDocument();
  });

  test('renders in listening state with active receptor label and keeps AI mouth at REST', () => {
    const { container } = render(
      <GideonTechBrain
        state="listening"
        statusText="Listening to user..."
        audioLevel={0.65}
      />
    );

    expect(screen.getByText(/NEURAL AUDIO RECEPTOR ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Listening to user\.\.\./i)).toBeInTheDocument();

    const brainElem = container.querySelector('.gideon-tech-brain-container');
    expect(brainElem).toHaveAttribute('data-viseme', 'REST');
    expect(brainElem).toHaveAttribute('data-mouth-closed', 'true');
  });

  test('renders in speaking state and provides working interrupt button', () => {
    const handleInterrupt = jest.fn();
    render(
      <GideonTechBrain
        state="speaking"
        statusText="Vocalizing synthesized response..."
        onInterrupt={handleInterrupt}
      />
    );

    expect(screen.getByText(/VOCAL SYNTHESIZER TRANSMITTING/i)).toBeInTheDocument();
    const interruptBtn = screen.getByRole('button', { name: /Interrupt Gideon/i });
    expect(interruptBtn).toBeInTheDocument();

    fireEvent.click(interruptBtn);
    expect(handleInterrupt).toHaveBeenCalledTimes(1);
  });

  test('renders distinguishable mouth configurations across viseme classes during speaking state', () => {
    const { container, rerender } = render(
      <GideonTechBrain
        state="speaking"
        isSpeaking={true}
        viseme="MBP"
        speechLevel={0.5}
      />
    );

    const brainElem = container.querySelector('.gideon-tech-brain-container');
    expect(brainElem).toHaveAttribute('data-viseme', 'MBP');
    expect(brainElem).toHaveAttribute('data-mouth-closed', 'true');

    rerender(
      <GideonTechBrain
        state="speaking"
        isSpeaking={true}
        viseme="A"
        speechLevel={0.9}
      />
    );
    expect(brainElem).toHaveAttribute('data-viseme', 'A');
    expect(brainElem).toHaveAttribute('data-mouth-closed', 'false');
    const openA = parseFloat(brainElem.getAttribute('data-mouth-open'));

    rerender(
      <GideonTechBrain
        state="speaking"
        isSpeaking={true}
        viseme="I"
        speechLevel={0.7}
      />
    );
    expect(brainElem).toHaveAttribute('data-viseme', 'I');
    const openI = parseFloat(brainElem.getAttribute('data-mouth-open'));
    const widthI = parseFloat(brainElem.getAttribute('data-mouth-width'));

    rerender(
      <GideonTechBrain
        state="speaking"
        isSpeaking={true}
        viseme="U"
        speechLevel={0.7}
      />
    );
    expect(brainElem).toHaveAttribute('data-viseme', 'U');
    const widthU = parseFloat(brainElem.getAttribute('data-mouth-width'));

    expect(openA).toBeGreaterThan(openI);
    expect(widthI).toBeGreaterThan(widthU);
  });

  test('renders in processing state with synapse processing label', () => {
    render(
      <GideonTechBrain
        state="processing"
        statusText="Thinking..."
      />
    );

    expect(screen.getByText(/SYNAPSE PROCESSING/i)).toBeInTheDocument();
  });

  test('renders in executing state with task description banner', () => {
    render(
      <GideonTechBrain
        state="executing"
        statusText="Executing mission directive"
        taskDescription="Calculate coordinates for temporal jump"
      />
    );

    expect(screen.getByText(/DIRECTIVE IN PROGRESS/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculate coordinates for temporal jump/i)).toBeInTheDocument();
  });

  test('renders in error state with anomaly label', () => {
    render(
      <GideonTechBrain
        state="error"
        statusText="Audio connection lost"
      />
    );

    expect(screen.getByText(/ANOMALY DETECTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio connection lost/i)).toBeInTheDocument();
  });

  test('applies reduced-motion class when reducedMotion is true', () => {
    const { container } = render(
      <GideonTechBrain
        state="idle"
        reducedMotion={true}
      />
    );

    const brainElem = container.querySelector('.gideon-tech-brain-container');
    expect(brainElem).toHaveClass('reduced-motion');
  });

  test('removes red, orange, and green SVG HUD circles while preserving embossed female head canvas and halftone dot field', () => {
    const { container, getByTestId } = render(
      <GideonTechBrain
        state="speaking"
        isSpeaking={true}
        viseme="O"
        speechLevel={0.8}
        statusText="Speaking..."
      />
    );

    expect(container.querySelector('.tech-brain-svg-overlay')).toBeNull();
    expect(container.querySelector('.hud-arc-red')).toBeNull();
    expect(container.querySelector('.hud-arc-amber')).toBeNull();
    expect(container.querySelector('.hud-arc-lime')).toBeNull();
    expect(container.querySelector('.hud-arc-emerald-1')).toBeNull();

    expect(getByTestId('voice-reactive-dot-field')).toBeInTheDocument();
    expect(getByTestId('tech-brain-face-canvas')).toBeInTheDocument();
  });

  test('supports toggling full screen hologram mode', () => {
    const { container, getByRole } = render(
      <GideonTechBrain
        state="idle"
        statusText="Ready"
      />
    );

    const brainElem = container.querySelector('.gideon-tech-brain-container');
    expect(brainElem).toHaveAttribute('data-fullscreen', 'false');

    const fsBtn = getByRole('button', { name: /Enter Full Screen/i });
    fireEvent.click(fsBtn);

    expect(brainElem).toHaveAttribute('data-fullscreen', 'true');
    expect(brainElem).toHaveClass('is-fullscreen');

    const exitBtn = getByRole('button', { name: /Exit Full Screen/i });
    fireEvent.click(exitBtn);

    expect(brainElem).toHaveAttribute('data-fullscreen', 'false');
  });
});
