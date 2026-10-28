/**
 * ChatWorkspace — Gideon Phase 4 Futuristic AI Command Centre.
 * Centers around the GideonTechBrain as the visual identity, flanked by
 * tactical telemetry status monitors, conversation stream feeds, voice/gesture controls,
 * and live desktop automation status panels.
 */
import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import MessageComposer from './MessageComposer';
import GideonTechBrain from '../brain/GideonTechBrain';
import DesktopTaskPanel from '../desktop/DesktopTaskPanel';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import DemoBadge from '../common/DemoBadge';

export default function ChatWorkspace({
  conversation,
  messages,
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
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, streamingText]);

  const starterPrompts = [
    "Gideon, open File Explorer.",
    "Open calculator.",
    "What are your current operational capabilities?",
    "Remember that I prefer concise, bulleted responses.",
  ];

  const isDemo = statusData ? statusData.is_demo : true;

  return (
    <div className="chat-workspace futuristic-command-centre" role="main">
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
            className={`telemetry-badge-btn ${isListening ? 'active' : ''}`}
            onClick={onToggleListening}
            title={isListening ? 'Microphone Active (Click to stop)' : 'Microphone Standby (Click to start)'}
            aria-label="Toggle voice input"
          >
            <span className={`telemetry-dot ${isListening ? 'listening' : ''}`}></span>
            <span>{isListening ? 'RECEPTOR LISTENING' : 'MIC READY'}</span>
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
      </header>

      {/* Hero GideonTechBrain Section */}
      <section className="tech-brain-hero-section" aria-label="Gideon Neural Brain Core">
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
      </section>

      {/* Live Desktop Automation Task Widget (if active) */}
      {activeDesktopTask && (
        <div className="chat-active-desktop-task-bar">
          <DesktopTaskPanel
            task={activeDesktopTask}
            onCancel={onCancelDesktopTask}
            onConfirmRequest={onConfirmDesktopTask}
            reducedMotion={reducedMotion}
            compact={true}
          />
        </div>
      )}

      {/* Central Conversation Stream Area */}
      <div className="chat-messages-container command-stream-container">
        {loading ? (
          <div className="chat-loading-state">
            <LoadingSpinner size="large" text="Accessing Gideon neural archives..." />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="chat-error-state">
            <ErrorMessage message={error} onRetry={onRetry} />
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="chat-empty-state">
            <h2 className="empty-title">Greetings. I am Gideon.</h2>
            <p className="empty-subtitle">
              Your personal artificial intelligence command core and Windows desktop automation assistant.
            </p>
            <div className="empty-badge-wrapper">
              <DemoBadge
                isDemo={isDemo}
                provider={statusData?.provider || 'demo'}
                status={statusData?.status || 'demo_mode'}
                model={statusData?.model}
              />
            </div>

            <div className="starter-prompts-grid">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className="starter-prompt-card"
                  onClick={() => onPromptSelect && onPromptSelect(prompt)}
                  type="button"
                >
                  <span className="starter-prompt-icon">›</span>
                  <span className="starter-prompt-text">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {recalledMemoriesCount > 0 && (
              <div className="memory-context-banner">
                <span className="memory-banner-icon">✦</span>
                <span className="memory-banner-text">
                  Gideon recalled {recalledMemoriesCount} relevant persistent memory context directive(s) for this session.
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

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Tactical Input Area */}
      <footer className="chat-composer-container command-composer-area">
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
    </div>
  );
}
