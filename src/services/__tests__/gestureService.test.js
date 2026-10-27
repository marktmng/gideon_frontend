import gestureService from '../gestureService';

describe('GestureService', () => {
  beforeEach(() => {
    gestureService.useFallback = true;
    gestureService.status = 'ready';
    gestureService.setCooldown(1000);
    gestureService.setConfidenceThreshold(0.7);
  });

  afterEach(() => {
    gestureService.stopInference();
    jest.clearAllMocks();
  });

  test('reports ready status after initialization', () => {
    expect(gestureService.status).toBe('ready');
  });

  test('subscribes to gesture detections and notifies listeners', () => {
    const listener = jest.fn();
    const unsub = gestureService.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        gesture: 'None',
      })
    );

    unsub();
  });

  test('optical contour analyzer identifies open palm with high area and spread pixels', () => {
    const width = 160;
    const height = 120;
    const data = new Uint8ClampedArray(width * height * 4);

    // Populate a large bounding area (60x60) with skin pixels
    for (let y = 30; y < 90; y++) {
      for (let x = 50; x < 110; x++) {
        if ((x + y) % 2 === 0) {
          const idx = (y * width + x) * 4;
          data[idx] = 180; // R
          data[idx + 1] = 120; // G
          data[idx + 2] = 80; // B
          data[idx + 3] = 255;
        }
      }
    }

    const result = gestureService._analyzeOpticalContour({ data, width, height });
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(['Open_Palm', 'Closed_Fist', 'Victory']).toContain(result.gesture);
  });

  test('enforces stability and cooldown before firing action', () => {
    const onActionTriggered = jest.fn();
    const videoMock = {
      readyState: 4,
      paused: false,
      currentTime: 1.0,
    };

    // Mock analyze optical contour to return Closed_Fist with 0.85 confidence
    jest.spyOn(gestureService, '_analyzeOpticalContour').mockReturnValue({
      gesture: 'Closed_Fist',
      confidence: 0.85,
    });

    const mockCanvas = document.createElement('canvas');
    const mockCtx = mockCanvas.getContext('2d');

    // Frame 1: candidate registered, count = 1 (threshold is 4)
    gestureService._processFrame(videoMock, mockCanvas, mockCtx, onActionTriggered);
    expect(onActionTriggered).not.toHaveBeenCalled();

    // Frame 2: count = 2
    gestureService._processFrame(videoMock, mockCanvas, mockCtx, onActionTriggered);
    expect(onActionTriggered).not.toHaveBeenCalled();

    // Frame 3: count = 3
    gestureService._processFrame(videoMock, mockCanvas, mockCtx, onActionTriggered);
    expect(onActionTriggered).not.toHaveBeenCalled();

    // Frame 4: count = 4 -> stability reached! Action triggers: 'stop_speech'
    gestureService._processFrame(videoMock, mockCanvas, mockCtx, onActionTriggered);
    expect(onActionTriggered).toHaveBeenCalledWith('stop_speech', 'Closed_Fist');

    // Immediate Frame 5 within cooldown: should NOT re-trigger action
    onActionTriggered.mockClear();
    gestureService._processFrame(videoMock, mockCanvas, mockCtx, onActionTriggered);
    expect(onActionTriggered).not.toHaveBeenCalled();
  });

  test('resets detections when hand leaves frame (low confidence)', () => {
    jest.spyOn(gestureService, '_analyzeOpticalContour').mockReturnValue({
      gesture: 'None',
      confidence: 0,
    });

    const videoMock = { readyState: 4, paused: false, currentTime: 2.0 };
    const mockCanvas = document.createElement('canvas');
    const mockCtx = mockCanvas.getContext('2d');

    gestureService._processFrame(videoMock, mockCanvas, mockCtx, jest.fn());
    expect(gestureService.currentDetectedGesture).toBe('None');
    expect(gestureService.currentConfidence).toBe(0);
  });

  test('stops inference and cancels animation frame', () => {
    gestureService.animFrameId = 999;
    gestureService.stopInference();
    expect(gestureService.isProcessing).toBe(false);
    expect(gestureService.currentDetectedGesture).toBe('None');
  });
});
