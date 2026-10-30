/**
 * ChatWorkspace — Gideon Phase 5 Voice-First Personal AI Assistant & Command Core.
 * Centers entirely around the holographic GideonTechBrain as the visual identity,
 * featuring real-time audio-reactive animation, lipsync articulation, hands-free
 * wake-word activation, Siri-style vocal triggers, and live speech subtitles.
 *
 * Text chat input is hidden by default to prioritize true voice-first interaction,
 * accessible on-demand via a secondary "Keyboard Mode" toggle.
 */
import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import MessageComposer from './MessageComposer';
import GideonTechBrain from '../brain/GideonTechBrain';
import DesktopTaskPanel from '../desktop/DesktopTaskPanel';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import DemoBadge from '../common/DemoBadge';

export default function ChatWorkspace({
  conversation,
  messages = [],
  loading,
  sending,
  streamingText,
  recalledMemoriesCount = 0,
  error,
  statusData,
  onSendMessage,
  onStopGeneration,
  onRetry,
  onPromptSelect,

  // Phase 3 & 4 Interaction Controller props
  interactionState = 'idle',
  audioLevel = 0,
  speechLevel = 0,
  speechPulse = 0,
  currentViseme = null,
  visemePose = null,
  visemeTimeline = null,
  utteranceId = null,
  statusMessage = 'Gideon Neural Core Online. Standing by.',
  interimTranscript = '',
  currentSpokenText = '',
  isListening = false,
  isSpeaking = false,
  onToggleListening = null,
  onStopSpeaking = null,
  onInterruption = null,
  cameraActive = false,
  onToggleCamera = null,
  gestureStatus = 'disabled',
  detectedGesture = 'None',
  reducedMotion = false,
  voiceEnabled = true,
  onToggleVoice = null,
  activeTask = null,

  // Phase 4 Desktop Task props
  activeDesktopTask = null,
  onCancelDesktopTask = null,
  onConfirmDesktopTask = null,

  // Wake word settings
  wakeWordEnabled = true,
}) {
  const messagesEndRef = useRef(null);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);

  const getMicrophoneHud = () => {
    if (interactionState === 'permission_needed') {
      return {
        label: 'MIC PERMISSION NEEDED',
        dotClass: 'warning',
        btnClass: 'warning',
        title: 'Microphone permission required. Click to authorize microphone access.',
      };
    }
    if (interactionState === 'mic_unavailable') {
      return {
        label: 'MIC OFFLINE / DENIED',
        dotClass: 'offline',
        btnClass: 'offline',
        title: 'Microphone receptor unavailable or permission denied.',
      };
    }
    if (isListening || interactionState === 'listening') {
      return {
        label: 'RECEPTOR LISTENING',
        dotClass: 'listening',
        btnClass: 'active',
        title: 'Microphone Active (Click to finish speaking)',
      };
    }
    if (interactionState === 'wake_detected') {
      return {
        label: 'WAKE ACKNOWLEDGED',
        dotClass: 'listening',
        btnClass: 'active',
        title: 'Wake phrase recognized. Speak directive now.',
      };
    }
    if (interactionState === 'processing' || sending) {
      return {
        label: 'SYNAPSE PROCESSING',
        dotClass: 'processing',
        btnClass: 'processing',
        title: 'Gideon is synthesizing directive...',
      };
    }
    if (isSpeaking || interactionState === 'speaking') {
      return {
        label: 'GIDEON TRANSMITTING',
        dotClass: 'transmitting',
        btnClass: 'active',
        title: 'Gideon is speaking response.',
      };
    }
    if (interactionState === 'standby') {
      return {
        label: 'WAKE STANDBY ("HEY GIDEON")',
        dotClass: 'online',
        btnClass: 'active',
        title: 'Hands-Free Wake Standby Active ("Hey Gideon") - Speak phrase or tap to talk',
      };
    }
    if (!wakeWordEnabled) {
      return {
        label: 'MIC READY (TAP TO SPEAK)',
        dotClass: '',
        btnClass: '',
        title: 'Wake word standby disabled. Tap to talk.',
      };
    }
    return {
      label: 'MIC READY',
      dotClass: '',
      btnClass: '',
      title: 'Microphone Ready (Tap to speak)',
    };
  };

  const micHud = getMicrophoneHud();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (showKeyboardInput) {
      scrollToBottom();
    }
  }, [messages, sending, streamingText, showKeyboardInput]);

  const isDemo = statusData ? statusData.is_demo : true;

  return (
    <div className="chat-workspace futuristic-command-centre voice-first-command-centre" role="main">
      {/* Top Tactical Telemetry HUD Bar */}
      <header className="tactical-telemetry-bar" aria-label="Tactical telemetry status">
        <div className="telemetry-item">
          <span className="telemetry-label">AI CORE:</span>
          <DemoBadge
            isDemo={isDemo}
            provider={statusData?.provider || 'demo'}
            status={statusData?.status || 'demo_mode'}
            model={statusData?.model}
          />
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">AUDIO RECEPTOR:</span>
          <button
            type="button"
            className={`telemetry-badge-btn ${micHud.btnClass}`}
            onClick={onToggleListening}
            title={micHud.title}
            aria-label="Toggle voice input"
          >
            <span className={`telemetry-dot ${micHud.dotClass}`}></span>
            <span>{micHud.label}</span>
          </button>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">OPTICAL SENSOR:</span>
          <button
            type="button"
            className={`telemetry-badge-btn ${cameraActive ? 'active' : ''}`}
            onClick={onToggleCamera}
            title={cameraActive ? 'Camera Online' : 'Camera Standby'}
            aria-label="Toggle camera"
          >
            <span className={`telemetry-dot ${cameraActive ? 'online' : ''}`}></span>
            <span>{cameraActive ? 'CAMERA ONLINE' : 'OPTICAL STANDBY'}</span>
          </button>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">GESTURE ENGINE:</span>
          <span className="telemetry-value font-mono">
            {gestureStatus === 'ready' ? (
              <span className="text-emerald">ACTIVE ({detectedGesture !== 'None' ? detectedGesture : 'READY'})</span>
            ) : (
              <span className="text-muted">STANDBY</span>
            )}
          </span>
        </div>

        {onToggleVoice && (
          <div className="telemetry-item">
            <button
              type="button"
              className={`telemetry-badge-btn ${voiceEnabled ? 'active' : ''}`}
              onClick={onToggleVoice}
              title={voiceEnabled ? 'Spoken Voice Output Enabled' : 'Spoken Voice Output Muted'}
              aria-label="Toggle voice output"
            >
              <span>{voiceEnabled ? '🔊 VOICE OUTPUT' : '🔇 VOICE MUTED'}</span>
            </button>
          </div>
        )}

        {/* Secondary Toggle for Text Keyboard Mode */}
        <div className="telemetry-item" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={`telemetry-badge-btn ${showKeyboardInput ? 'active' : ''}`}
            onClick={() => setShowKeyboardInput((prev) => !prev)}
            title="Toggle Keyboard Input Mode (Optional text chat drawer)"
            aria-label="Toggle keyboard input mode"
          >
            <span>{showKeyboardInput ? '✕ CLOSE KEYBOARD' : '⌨️ KEYBOARD INPUT'}</span>
          </button>
        </div>
      </header>

      {/* Hero GideonTechBrain Centerpiece (Full Width Edge-to-Edge) */}
      <section className="tech-brain-hero-section voice-first-hero" aria-label="Gideon Neural Brain Core">
        <GideonTechBrain
          state={
            activeDesktopTask && ['planning', 'awaiting_confirmation', 'executing'].includes(activeDesktopTask.status)
              ? 'executing'
              : sending
              ? 'processing'
              : isSpeaking
              ? 'speaking'
              : isListening
              ? 'listening'
              : interactionState
          }
          audioLevel={audioLevel}
          speechLevel={speechLevel}
          speechPulse={speechPulse}
          isSpeaking={isSpeaking}
          viseme={currentViseme}
          visemePose={visemePose}
          visemeTimeline={visemeTimeline}
          utteranceId={utteranceId}
          statusText={
            activeDesktopTask && activeDesktopTask.status === 'executing'
              ? `Executing Desktop Action: ${activeDesktopTask.action}`
              : statusMessage
          }
          taskDescription={
            activeDesktopTask
              ? `Desktop Task: ${activeDesktopTask.action}`
              : activeTask
              ? activeTask.title
              : null
          }
          reducedMotion={reducedMotion}
          size="large"
          onInterrupt={sending ? onStopGeneration : isSpeaking ? onStopSpeaking : onInterruption}
        />

        {/* Ambient Siri-Style Live Status HUD (Voice-First Hands-Free Indicator) */}
        <div className="siri-voice-trigger-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', gap: '8px', zIndex: 10 }}>
          <button
            type="button"
            className={`btn-siri-voice-trigger ${isListening ? 'listening' : isSpeaking ? 'speaking' : sending ? 'processing' : ''}`}
            onClick={onToggleListening}
            title={isListening ? 'Microphone Active — Click to finish speaking' : isSpeaking ? 'Speaking Response — Click to halt' : 'Hands-Free Voice Active — Speak "Hey Gideon" or your command'}
            style={{
              padding: '10px 28px',
              borderRadius: '9999px',
              border: isListening
                ? '2px solid #ef4444'
                : isSpeaking
                ? '2px solid #10b981'
                : sending
                ? '2px solid #00e5ff'
                : '1px solid rgba(0, 229, 255, 0.4)',
              background: isListening
                ? 'rgba(239, 68, 68, 0.16)'
                : isSpeaking
                ? 'rgba(16, 185, 129, 0.16)'
                : sending
                ? 'rgba(0, 229, 255, 0.16)'
                : 'rgba(8, 16, 30, 0.75)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: '600',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              boxShadow: isListening
                ? '0 0 24px rgba(239, 68, 68, 0.45)'
                : isSpeaking
                ? '0 0 24px rgba(16, 185, 129, 0.45)'
                : sending
                ? '0 0 24px rgba(0, 229, 255, 0.45)'
                : '0 0 16px rgba(0, 229, 255, 0.18)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.25s ease',
            }}
          >
            <span className="siri-mic-icon" style={{ fontSize: '1.15rem' }}>
              {isListening ? '🔴' : isSpeaking ? '🗣️' : sending ? '⚙️' : '🎙️'}
            </span>
            <span className="siri-label" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>
              {isListening
                ? (interimTranscript ? `"${interimTranscript}"` : 'LISTENING... SPEAK COMMAND')
                : isSpeaking
                ? 'GIDEON TRANSMITTING RESPONSE'
                : sending
                ? 'SYNAPSE PROCESSING DIRECTIVE...'
                : interactionState === 'wake_detected'
                ? 'WAKE ACKNOWLEDGED'
                : 'STANDBY • LISTENING ("HEY GIDEON")'}
            </span>
          </button>
        </div>
      </section>

      {/* Live Desktop Automation Task Widget (if active) */}
      {activeDesktopTask && (
        <div className="chat-active-desktop-task-bar" style={{ padding: '0 20px', margin: '10px auto', maxWidth: '860px', width: '100%' }}>
          <DesktopTaskPanel
            task={activeDesktopTask}
            onCancel={onCancelDesktopTask}
            onConfirmRequest={onConfirmDesktopTask}
            reducedMotion={reducedMotion}
            compact={true}
          />
        </div>
      )}

      {/* Optional Secondary Text Chat Drawer (Toggled by "Keyboard Input") */}
      {showKeyboardInput && (
        <section
          className="keyboard-chat-drawer"
          aria-label="Keyboard Input Drawer"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '45vh',
            background: 'rgba(10, 18, 32, 0.96)',
            borderTop: '1px solid rgba(0, 229, 255, 0.3)',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⌨️ Keyboard Interaction Mode
            </span>
            <button
              type="button"
              onClick={() => setShowKeyboardInput(false)}
              className="btn-small btn-secondary"
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              ✕ Close Drawer
            </button>
          </div>

          <div className="chat-messages-container command-stream-container" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loading ? (
              <div className="chat-loading-state">
                <LoadingSpinner size="small" text="Accessing neural archives..." />
              </div>
            ) : error && messages.length === 0 ? (
              <div className="chat-error-state">
                <ErrorMessage message={error} onRetry={onRetry} />
              </div>
            ) : (
              <div className="messages-list">
                {recalledMemoriesCount > 0 && (
                  <div className="memory-context-banner">
                    <span className="memory-banner-icon">✦</span>
                    <span className="memory-banner-text">
                      Recalled {recalledMemoriesCount} relevant persistent memory context directive(s).
                    </span>
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} reducedMotion={reducedMotion} />
                ))}

                {streamingText ? (
                  <div className="message-item assistant streaming-message">
                    <div className="message-avatar">
                      <span className="avatar-core">✦</span>
                    </div>
                    <div className="message-content">
                      <div className="message-bubble">
                        <p className="message-text">
                          {streamingText}
                          <span className="streaming-cursor" aria-hidden="true">▍</span>
                        </p>
                      </div>
                      <div className="streaming-indicator">
                        <span className="streaming-dot"></span>
                        <span>Gideon is responding...</span>
                        {onStopGeneration && (
                          <button
                            className="btn-halt-inline"
                            onClick={onStopGeneration}
                            type="button"
                            title="Halt generation"
                          >
                            Halt (Esc)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {error && (
                  <div className="message-item assistant message-error-banner" role="alert">
                    <div className="message-avatar">
                      <span className="avatar-core" style={{ color: '#ef4444' }}>⚠</span>
                    </div>
                    <div className="message-content">
                      <div
                        className="message-bubble"
                        style={{
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#f87171', marginBottom: '4px', fontSize: '0.85rem' }}>
                          AI Brain Notice
                        </div>
                        <div className="message-text" style={{ color: '#fca5a5', fontSize: '0.8rem' }}>
                          {error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Tactical Composer */}
          <footer className="chat-composer-container command-composer-area" style={{ padding: '8px 16px' }}>
            <MessageComposer
              onSendMessage={onSendMessage}
              disabled={loading || sending}
              isListening={isListening}
              interimTranscript={interimTranscript}
              onToggleListening={onToggleListening}
              onStopGeneration={onStopGeneration}
              sending={sending}
            />
          </footer>
        </section>
      )}
    </div>
  );
}
