import React, { useState, useRef, useEffect } from 'react';

export default function MessageComposer({
  onSendMessage,
  disabled = false,
  isListening = false,
  interimTranscript = '',
  onToggleListening = null,
  onStopGeneration = null,
  sending = false,
}) {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (sending && onStopGeneration) {
        onStopGeneration();
      } else if (isListening && onToggleListening) {
        onToggleListening();
      }
    }
  };

  const handleInput = (e) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      {/* Interim live speech feedback */}
      {isListening && interimTranscript && (
        <div className="interim-transcript-banner" aria-live="polite">
          <span className="interim-icon">🎙</span>
          <span className="interim-text">"{interimTranscript}"</span>
        </div>
      )}

      <div className="composer-input-container">
        {/* Voice Push-to-Talk Button */}
        {onToggleListening && (
          <button
            type="button"
            className={`composer-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={onToggleListening}
            title={isListening ? 'Click to stop listening' : 'Push-to-talk voice input'}
            aria-label={isListening ? 'Stop voice recognition' : 'Activate microphone voice input'}
          >
            {isListening ? (
              <span className="mic-pulse-ring"></span>
            ) : null}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "Listening to your voice... (Speak now)"
              : disabled
              ? "Gideon is processing neural query..."
              : "Message Gideon... (Enter to send, Shift+Enter for new line)"
          }
          rows={1}
          disabled={disabled || isListening}
          aria-label="Message content"
        />

        {/* Halt/Stop Generation Button if sending */}
        {sending && onStopGeneration ? (
          <button
            type="button"
            className="composer-halt-btn"
            onClick={onStopGeneration}
            title="Halt generation (Esc)"
            aria-label="Halt generation"
          >
            <span className="halt-icon">■</span>
          </button>
        ) : (
          <button
            type="submit"
            className="composer-send-btn"
            disabled={disabled || !content.trim()}
            title="Send message"
            aria-label="Send message"
          >
            {disabled ? (
              <span className="composer-spinner"></span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="composer-footer">
        <span>Gideon AI Core — Phase 3 Command Centre</span>
      </div>
    </form>
  );
}
