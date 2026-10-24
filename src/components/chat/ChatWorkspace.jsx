import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import MessageComposer from './MessageComposer';
import GideonOrb from './GideonOrb';
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
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, streamingText]);

  const starterPrompts = [
    "What are your current operational capabilities?",
    "Remember that I prefer concise, bulleted responses.",
    "Calculate coordinates for a temporal jump.",
    "Help me design a software architecture."
  ];

  const isDemo = statusData ? statusData.is_demo : true;

  return (
    <div className="chat-workspace">
      <div className="chat-messages-container">
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
            <GideonOrb size="large" isProcessing={sending} />
            <h2 className="empty-title">Greetings. I am Gideon.</h2>
            <p className="empty-subtitle">
              Your personal artificial intelligence assistant. How may I assist you today?
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
              <MessageItem key={msg.id} message={msg} />
            ))}

            {streamingText ? (
              <div className="message-item assistant streaming-message">
                <div className="message-avatar">
                  <div className="gideon-avatar-dot pulse">
                    <span>G</span>
                  </div>
                </div>
                <div className="message-bubble-wrapper">
                  <div className="message-header">
                    <span className="message-sender">Gideon</span>
                    <span className="streaming-badge">Streaming</span>
                  </div>
                  <div className="message-body">
                    <p className="streaming-text">
                      {streamingText}
                      <span className="cursor-blink">▌</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : sending ? (
              <div className="assistant-typing-indicator">
                <div className="gideon-avatar-dot pulse">
                  <span>G</span>
                </div>
                <div className="typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            ) : null}

            {error && messages.length > 0 && (
              <div className="chat-inline-error">
                <ErrorMessage message={error} onRetry={onRetry} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-composer-section">
        {sending && onStopGeneration && (
          <div className="streaming-controls-bar">
            <button className="btn-stop-generation" onClick={onStopGeneration} type="button">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Halt Generation</span>
            </button>
          </div>
        )}
        <MessageComposer onSendMessage={onSendMessage} disabled={sending || loading} />
      </div>
    </div>
  );
}
