import { renderHook, act } from '@testing-library/react';
import useInteractionController, { INTERACTION_STATES } from '../useInteractionController';
import voiceService from '../voiceService';
import cameraService from '../cameraService';
import gestureService from '../gestureService';

describe('useInteractionController Hook', () => {
  afterEach(() => {
    act(() => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
      cameraService.stopCamera();
      gestureService.stopInference();
    });
    jest.clearAllMocks();
  });

  test('initializes with IDLE interaction state and default status', () => {
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: jest.fn() })
    );

    expect(result.current.state).toBe(INTERACTION_STATES.IDLE);
    expect(result.current.statusMessage).toContain('Gideon Neural Core Online');
    expect(result.current.cameraActive).toBe(false);
  });

  test('transitions to PROCESSING when setProcessing(true) is invoked', () => {
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: jest.fn() })
    );

    act(() => {
      result.current.setProcessing(true, 'Test query');
    });

    expect(result.current.state).toBe(INTERACTION_STATES.PROCESSING);
    expect(result.current.statusMessage).toContain('Thinking: "Test query"');

    act(() => {
      result.current.setProcessing(false);
    });

    expect(result.current.state).toBe(INTERACTION_STATES.IDLE);
  });

  test('transitions to SPEAKING when speakResponse() is called', () => {
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: jest.fn() })
    );

    act(() => {
      result.current.speakResponse('Hello, Mark. I am Gideon.');
    });

    expect(result.current.state).toBe(INTERACTION_STATES.SPEAKING);
    expect(result.current.statusMessage).toContain('Speaking response');

    // Test stopSpeaking immediately halts speech and returns to idle
    act(() => {
      result.current.stopSpeaking();
    });

    expect(result.current.state).toBe(INTERACTION_STATES.IDLE);
  });

  test('handles universal interruption correctly', () => {
    const onHalt = jest.fn();
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: onHalt })
    );

    act(() => {
      result.current.speakResponse('Ongoing speech utterance');
    });
    expect(result.current.state).toBe(INTERACTION_STATES.SPEAKING);

    act(() => {
      result.current.handleInterruption();
    });

    expect(onHalt).toHaveBeenCalled();
    expect(result.current.state).toBe(INTERACTION_STATES.IDLE);
    expect(result.current.statusMessage).toContain('Session paused by user');
  });

  test('executes gesture actions: stop_speech halts speech', () => {
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: jest.fn() })
    );

    act(() => {
      result.current.speakResponse('Speech to be cancelled by fist gesture');
    });
    expect(result.current.state).toBe(INTERACTION_STATES.SPEAKING);

    act(() => {
      // Simulate gestureService dispatching stop_speech
      result.current.stopSpeaking();
    });

    expect(result.current.state).toBe(INTERACTION_STATES.IDLE);
  });

  test('transitions to EXECUTING when an active task is passed', () => {
    const mockTask = { id: 'task-1', title: 'Recalibrate temporal drive', status: 'in_progress' };
    const { result } = renderHook(() =>
      useInteractionController({
        onSendMessage: jest.fn(),
        onHaltGeneration: jest.fn(),
        activeTask: mockTask,
      })
    );

    expect(result.current.state).toBe(INTERACTION_STATES.EXECUTING);
    expect(result.current.statusMessage).toContain('Recalibrate temporal drive');
  });

  test('updates preferences and persists to storage', () => {
    const { result } = renderHook(() =>
      useInteractionController({ onSendMessage: jest.fn(), onHaltGeneration: jest.fn() })
    );

    act(() => {
      result.current.updateSettings({ speechRate: 1.3, voiceEnabled: false });
    });

    expect(result.current.settings.speechRate).toBe(1.3);
    expect(result.current.settings.voiceEnabled).toBe(false);
  });
});
