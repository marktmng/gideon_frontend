/**
 * Modular Hand Gesture Recognition Service for Gideon.
 * Processes video frames locally with zero cloud transmission.
 * Supports MediaPipe Tasks Vision with a zero-dependency fallback analyzer.
 * Features confidence thresholding, temporal stability filtering, and action cooldowns.
 */

class GestureService {
  constructor() {
    this.status = 'uninitialized'; // 'uninitialized' | 'loading' | 'ready' | 'error' | 'disabled'
    this.recognizer = null;
    this.useFallback = false;
    this.isProcessing = false;
    this.lastVideoTime = -1;
    this.animFrameId = null;

    // Filters and limits
    this.confidenceThreshold = 0.70;
    this.cooldownMs = 1500;
    this.minConsecutiveFrames = 4;

    // Tracking state
    this.lastTriggeredTimestamp = 0;
    this.lastTriggeredAction = null;
    this.consecutiveFrameCount = 0;
    this.candidateGesture = null;
    this.currentDetectedGesture = 'None';
    this.currentConfidence = 0;

    // Listeners
    this.listeners = new Set();

    // Default gesture to action mappings
    this.mappings = {
      Open_Palm: 'toggle_listening',
      Thumb_Up: 'confirm',
      Thumb_Down: 'reject',
      Closed_Fist: 'stop_speech',
      Victory: 'toggle_camera_preview',
      Pointing_Up: 'read_active_window',
      ILoveYou: 'greet_gideon',
    };
  }

  setMappings(newMappings) {
    this.mappings = { ...this.mappings, ...newMappings };
  }

  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0.4, Math.min(threshold, 0.95));
  }

  setCooldown(ms) {
    this.cooldownMs = Math.max(500, ms);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      status: this.status,
      gesture: this.currentDetectedGesture,
      confidence: this.currentConfidence,
      lastAction: this.lastTriggeredAction,
    });
    return () => this.listeners.delete(listener);
  }

  _notify(action = null) {
    const data = {
      status: this.status,
      gesture: this.currentDetectedGesture,
      confidence: this.currentConfidence,
      action: action,
      lastAction: this.lastTriggeredAction,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Gesture listener error:', err);
      }
    });
  }

  /**
   * Lazily initialize gesture recognition engine.
   */
  async initRecognizer() {
    if (this.status === 'ready') return true;
    this.status = 'loading';
    this._notify();

    try {
      // Dynamic import of MediaPipe to avoid blocking initial bundle load
      const vision = await import('@mediapipe/tasks-vision');
      const { FilesetResolver, GestureRecognizer } = vision;

      const wasmFileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.recognizer = await GestureRecognizer.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });

      this.status = 'ready';
      this.useFallback = false;
      this._notify();
      return true;
    } catch (err) {
      console.warn('MediaPipe model load failed or offline. Activating built-in contour vision engine:', err);
      // Fallback to local geometric hand analyzer
      this.useFallback = true;
      this.status = 'ready';
      this._notify();
      return true;
    }
  }

  /**
   * Start processing frames from a live <video> element.
   */
  startInference(videoElement, onActionTriggered) {
    if (!videoElement) return;
    this.isProcessing = true;

    // Off-screen canvas for fallback frame analysis
    let canvas = null;
    let ctx = null;
    if (this.useFallback) {
      canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }

    let lastFrameTime = 0;
    const FRAME_INTERVAL_MS = 80; // ~12 fps is optimal for vision performance without CPU drain

    const processLoop = (now) => {
      if (!this.isProcessing) return;

      if (now - lastFrameTime >= FRAME_INTERVAL_MS) {
        lastFrameTime = now;
        if (videoElement.readyState >= 2 && !videoElement.paused) {
          this._processFrame(videoElement, canvas, ctx, onActionTriggered);
        }
      }

      this.animFrameId = requestAnimationFrame(processLoop);
    };

    this.animFrameId = requestAnimationFrame(processLoop);
  }

  /**
   * Stop processing loop and clear detections.
   */
  stopInference() {
    this.isProcessing = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.currentDetectedGesture = 'None';
    this.currentConfidence = 0;
    this.candidateGesture = null;
    this.consecutiveFrameCount = 0;
    this._notify();
  }

  _processFrame(videoElement, canvas, ctx, onActionTriggered) {
    let detectedGesture = 'None';
    let confidence = 0;

    if (!this.useFallback && this.recognizer) {
      try {
        if (videoElement.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = videoElement.currentTime;
          const results = this.recognizer.recognizeForVideo(videoElement, Date.now());
          if (results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
            const top = results.gestures[0][0];
            detectedGesture = top.categoryName;
            confidence = top.score;
          }
        }
      } catch {
        // Switch to fallback if recognizer encounters runtime error
        this.useFallback = true;
      }
    }

    if (this.useFallback && ctx && canvas) {
      // Local geometric analysis
      try {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const analysis = this._analyzeOpticalContour(frameData);
        detectedGesture = analysis.gesture;
        confidence = analysis.confidence;
      } catch {
        detectedGesture = 'None';
        confidence = 0;
      }
    }

    // Hand left frame / poor confidence
    if (confidence < this.confidenceThreshold || detectedGesture === 'None') {
      this.currentDetectedGesture = 'None';
      this.currentConfidence = 0;
      this.candidateGesture = null;
      this.consecutiveFrameCount = 0;
      this._notify();
      return;
    }

    // Temporal stability filter (require N consecutive identical detections)
    if (detectedGesture === this.candidateGesture) {
      this.consecutiveFrameCount++;
    } else {
      this.candidateGesture = detectedGesture;
      this.consecutiveFrameCount = 1;
    }

    this.currentDetectedGesture = detectedGesture;
    this.currentConfidence = confidence;

    // Check if stability condition met
    if (this.consecutiveFrameCount >= this.minConsecutiveFrames) {
      const now = Date.now();
      const mappedAction = this.mappings[detectedGesture];

      // Check cooldown
      if (mappedAction && (now - this.lastTriggeredTimestamp >= this.cooldownMs)) {
        this.lastTriggeredTimestamp = now;
        this.lastTriggeredAction = mappedAction;
        this._notify(mappedAction);
        if (onActionTriggered) {
          onActionTriggered(mappedAction, detectedGesture);
        }
      } else {
        this._notify();
      }
    } else {
      this._notify();
    }
  }

  /**
   * Built-in Optical / Geometric Contour Analyzer for zero-dependency offline recognition.
   */
  _analyzeOpticalContour(imageData) {
    const { data, width, height } = imageData;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let skinPixelCount = 0;

    // Detect skin/foreground silhouette
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for speed
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Simple heuristic for hand color in common lighting
      const isSkin = (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 12);
      if (isSkin) {
        skinPixelCount++;
        const pixelIdx = i / 4;
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (skinPixelCount < 120) {
      return { gesture: 'None', confidence: 0 };
    }

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const boxArea = boxW * boxH;
    const fillRatio = (skinPixelCount * 4) / boxArea; // Density of hand inside bounding box
    const aspectRatio = boxW / boxH;

    // Gesture classifications:
    // Closed Fist: High fill density (~0.75+), aspect ratio near 0.8-1.2
    if (fillRatio > 0.65 && aspectRatio > 0.7 && aspectRatio < 1.3) {
      return { gesture: 'Closed_Fist', confidence: 0.85 };
    }

    // Pointing Up: Index finger extended vertically (narrow aspect ratio, tip high)
    if (aspectRatio < 0.52 && minY < height * 0.28 && fillRatio > 0.40) {
      return { gesture: 'Pointing_Up', confidence: 0.81 };
    }

    // Open Palm: Large bounding area, lower fill density (fingers spread)
    if (fillRatio <= 0.60 && boxArea > 1500) {
      return { gesture: 'Open_Palm', confidence: 0.82 };
    }

    // Thumbs Up / Down: Vertical elongation
    if (aspectRatio < 0.65) {
      if (minY < height * 0.3) {
        return { gesture: 'Thumb_Up', confidence: 0.78 };
      }
      return { gesture: 'Thumb_Down', confidence: 0.75 };
    }

    // Victory / Peace: Moderate fill, high vertical aspect
    if (fillRatio >= 0.45 && fillRatio <= 0.60 && boxH > boxW * 1.2) {
      return { gesture: 'Victory', confidence: 0.79 };
    }

    // I Love You / Horns: Wide bounding box, medium-low fill ratio
    if (aspectRatio > 0.82 && aspectRatio < 1.4 && fillRatio >= 0.35 && fillRatio <= 0.52) {
      return { gesture: 'ILoveYou', confidence: 0.78 };
    }

    return { gesture: 'None', confidence: 0 };
  }

  getDiagnostics() {
    return {
      status: this.status,
      useFallback: this.useFallback,
      isProcessing: this.isProcessing,
      detectedGesture: this.currentDetectedGesture,
      confidence: this.currentConfidence,
      lastTriggeredAction: this.lastTriggeredAction,
      mappings: { ...this.mappings },
    };
  }
}

export const gestureService = new GestureService();
export default gestureService;
