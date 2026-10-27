import cameraService from '../cameraService';

describe('CameraService', () => {
  beforeEach(() => {
    const mockTrack = {
      stop: jest.fn(),
      kind: 'video',
      enabled: true,
    };
    navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      active: true,
    });
  });

  afterEach(() => {
    cameraService.stopCamera();
    jest.clearAllMocks();
  });

  test('reports whether camera is supported', () => {
    expect(cameraService.isSupported()).toBe(true);
  });

  test('starts camera stream and notifies subscribers', async () => {
    const listener = jest.fn();
    const unsubscribe = cameraService.subscribe(listener);

    await cameraService.startCamera();

    expect(cameraService.isActive).toBe(true);
    expect(cameraService.getStream()).not.toBeNull();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true })
    );

    unsubscribe();
  });

  test('stops camera, stops all tracks, and resets stream', async () => {
    await cameraService.startCamera();
    const stream = cameraService.getStream();
    const track = stream.getTracks()[0];

    cameraService.stopCamera();

    expect(track.stop).toHaveBeenCalled();
    expect(cameraService.isActive).toBe(false);
    expect(cameraService.getStream()).toBeNull();
  });

  test('handles camera permission denial gracefully', async () => {
    navigator.mediaDevices.getUserMedia = jest
      .fn()
      .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    await expect(cameraService.startCamera()).rejects.toThrow(
      /Camera permission was denied/i
    );
    expect(cameraService.isActive).toBe(false);
  });

  test('handles hardware unavailable error gracefully', async () => {
    navigator.mediaDevices.getUserMedia = jest
      .fn()
      .mockRejectedValue(new DOMException('No device', 'NotFoundError'));

    await expect(cameraService.startCamera()).rejects.toThrow(
      /No video input devices found/i
    );
    expect(cameraService.isActive).toBe(false);
  });
});
