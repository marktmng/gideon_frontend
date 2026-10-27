/**
 * CameraGestureMonitor — Futuristic Tactical Vision & Gesture Monitor HUD.
 * Renders local camera video stream, gesture recognition status,
 * confidence meters, and action feedback without external frame transmission.
 */

import React, { useEffect, useRef, useState } from 'react';
import './CameraGestureMonitor.css';

export default function CameraGestureMonitor({
  cameraActive,
  cameraStream,
  cameraError,
  onToggleCamera,
  gestureStatus,
  detectedGesture,
  gestureConfidence,
  lastGestureAction,
  onStartGestureRecognition,
  onStopGestureRecognition,
  showPreview,
  onClosePreview,
}) {
  const videoRef = useRef(null);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Attach active camera stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && cameraStream) {
      video.srcObject = cameraStream;
      video.play().catch(() => {
        // Autoplay may be blocked if unmuted, but video is muted
      });
    }
  }, [cameraStream, showPreview]);

  // Handle gesture recognition toggle
  const handleToggleGesture = async () => {
    if (gestureEnabled) {
      setGestureEnabled(false);
      onStopGestureRecognition();
    } else {
      setGestureEnabled(true);
      if (videoRef.current) {
        await onStartGestureRecognition(videoRef.current);
      }
    }
  };

  // If camera turns off, disable gesture recognition
  useEffect(() => {
    if (!cameraActive) {
      setGestureEnabled(false);
      onStopGestureRecognition();
    }
  }, [cameraActive, onStopGestureRecognition]);

  if (!showPreview && !cameraActive) {
    return null;
  }

  const formatGestureLabel = (gesture) => {
    if (!gesture || gesture === 'None') return 'Waiting for hand...';
    return gesture.replace(/_/g, ' ');
  };

  return (
    <div
      className={`camera-gesture-monitor-hud ${isMinimized ? 'minimized' : ''}`}
      role="region"
      aria-label="Gideon Tactical Vision and Gesture Monitor"
    >
      <div className="monitor-header">
        <div className="monitor-title-wrapper">
          <span className={`status-beacon ${cameraActive ? 'online' : 'offline'}`}></span>
          <span className="monitor-title">OPTICAL TELEMETRY</span>
        </div>
        <div className="monitor-actions">
          <button
            type="button"
            className="monitor-action-btn"
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? 'Expand Monitor' : 'Minimize Monitor'}
            aria-label={isMinimized ? 'Expand Monitor' : 'Minimize Monitor'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            type="button"
            className="monitor-action-btn close"
            onClick={onClosePreview || onToggleCamera}
            title="Close Camera Monitor"
            aria-label="Close Camera Monitor"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="monitor-body">
          {cameraError ? (
            <div className="monitor-error-card">
              <span className="error-icon">⚠</span>
              <p>{cameraError}</p>
            </div>
          ) : (
            <div className="monitor-viewport-container">
              {/* Local Video Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="monitor-video-feed"
              />

              {/* HUD Target Reticle Overlay */}
              <div className="viewport-hud-reticle">
                <div className="reticle-corner top-left"></div>
                <div className="reticle-corner top-right"></div>
                <div className="reticle-corner bottom-left"></div>
                <div className="reticle-corner bottom-right"></div>
                <div className="reticle-scanline"></div>
              </div>

              {/* Detected Gesture Feedback Badge */}
              {gestureEnabled && (
                <div className={`gesture-readout-pill ${detectedGesture !== 'None' ? 'detected' : ''}`}>
                  <span className="gesture-name">{formatGestureLabel(detectedGesture)}</span>
                  {gestureConfidence > 0 && (
                    <span className="gesture-score">{(gestureConfidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Alert */}
          {lastGestureAction && (
            <div className="gesture-action-alert">
              <span className="action-tag">ACTION DISPATCHED</span>
              <span className="action-label">{lastGestureAction.replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Telemetry Controls & Status */}
          <div className="monitor-footer">
            <div className="monitor-controls-row">
              <button
                type="button"
                className={`btn-hud-toggle ${cameraActive ? 'active' : ''}`}
                onClick={onToggleCamera}
              >
                {cameraActive ? 'Camera Active' : 'Start Camera'}
              </button>
              <button
                type="button"
                className={`btn-hud-toggle ${gestureEnabled ? 'active' : ''}`}
                onClick={handleToggleGesture}
                disabled={!cameraActive}
                title={!cameraActive ? 'Activate camera first' : 'Toggle Hand Gesture Engine'}
              >
                {gestureEnabled ? 'Gestures Active' : 'Enable Gestures'}
              </button>
            </div>

            <div className="privacy-guarantee-note">
              <span className="privacy-lock-icon">🔒</span>
              <span>Local processing only — frames never leave this browser</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
