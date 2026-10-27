/**
 * Modular Camera Service for Gideon.
 * Manages explicit webcam activation, stream sharing across vision features,
 * permission status, and complete hardware resource cleanup.
 */

class CameraService {
  constructor() {
    this.stream = null;
    this.isActive = false;
    this.error = null;
    this.listeners = new Set();
  }

  isSupported() {
    return (
      typeof window !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  isSecureContext() {
    return typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately emit current state
    listener({
      isActive: this.isActive,
      stream: this.stream,
      error: this.error,
    });
    return () => this.listeners.delete(listener);
  }

  _notify() {
    const state = {
      isActive: this.isActive,
      stream: this.stream,
      error: this.error,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Camera listener error:', err);
      }
    });
  }

  async startCamera(constraints = { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } }) {
    if (!this.isSupported()) {
      this.error = 'Webcam access is not supported by your browser.';
      this.isActive = false;
      this._notify();
      throw new Error(this.error);
    }

    if (!this.isSecureContext()) {
      this.error = 'Webcam requires a secure context (HTTPS or localhost).';
      this.isActive = false;
      this._notify();
      throw new Error(this.error);
    }

    // Reuse active stream if tracks are live
    if (this.stream && this.stream.active) {
      this.isActive = true;
      this.error = null;
      this._notify();
      return this.stream;
    }

    try {
      this.error = null;
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = mediaStream;
      this.isActive = true;

      // Handle external termination (e.g. user revoked permission in browser bar)
      if (mediaStream && typeof mediaStream.getVideoTracks === 'function') {
        mediaStream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            this.stopCamera();
          };
        });
      }

      this._notify();
      return mediaStream;
    } catch (err) {
      let friendlyMsg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No video input devices found on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMsg = 'Webcam is currently in use by another application.';
      } else {
        friendlyMsg = `Camera error: ${err.message || err.name}`;
      }
      this.error = friendlyMsg;
      this.isActive = false;
      this._notify();
      throw new Error(friendlyMsg);
    }
  }

  stopCamera() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping camera tracks:', err);
      }
      this.stream = null;
    }
    this.isActive = false;
    this.error = null;
    this._notify();
  }

  getStream() {
    return this.stream;
  }
}

export const cameraService = new CameraService();
export default cameraService;
