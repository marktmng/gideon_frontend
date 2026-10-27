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

  test('renders in listening state with active receptor label', () => {
    render(
      <GideonTechBrain
        state="listening"
        statusText="Listening to user..."
        audioLevel={0.65}
      />
    );

    expect(screen.getByText(/NEURAL AUDIO RECEPTOR ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Listening to user\.\.\./i)).toBeInTheDocument();
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
});
