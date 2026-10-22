import React, { useState, useRef, useEffect } from 'react';

export default function MessageComposer({ onSendMessage, disabled = false }) {
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
    }
  };

  const handleInput = (e) => {
    setContent(e.target.value);
    // Auto-adjust height
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
      <div className="composer-input-container">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Gideon is processing..." : "Message Gideon... (Enter to send, Shift+Enter for new line)"}
          rows={1}
          disabled={disabled}
          aria-label="Message content"
        />
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
      </div>
      <div className="composer-footer">
        <span>Gideon AI Core — Phase 1 Command Interface</span>
      </div>
    </form>
  );
}
