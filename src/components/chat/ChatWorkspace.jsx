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
  error,
  onSendMessage,
  onRetry,
  onPromptSelect,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const starterPrompts = [
    "What are your current operational capabilities?",
    "Show me my pending tasks and priorities.",
    "Calculate coordinates for a temporal jump.",
    "Help me design a software architecture."
  ];

  return (
    <div className="chat-workspace">
      <div className="chat-messages-container">
        {loading ? (
          <div className="chat-loading-state">
            <LoadingSpinner size="large" text="Accessing Gideon neural archives..." />
          </div>
        ) : error ? (
          <div className="chat-error-state">
            <ErrorMessage message={error} onRetry={onRetry} />
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <GideonOrb size="large" isProcessing={sending} />
            <h2 className="empty-title">Greetings. I am Gideon.</h2>
            <p className="empty-subtitle">
              Your personal artificial intelligence assistant. How may I assist you today?
            </p>
            <div className="empty-badge-wrapper">
              <DemoBadge />
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
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {sending && (
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
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-composer-section">
        <MessageComposer onSendMessage={onSendMessage} disabled={sending || loading} />
      </div>
    </div>
  );
}
