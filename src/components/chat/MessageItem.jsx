import React from 'react';

export default function MessageItem({ message }) {
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`message-item ${isAssistant ? 'assistant' : isSystem ? 'system' : 'user'}`}>
      <div className="message-avatar">
        {isAssistant ? (
          <div className="gideon-avatar-dot">
            <span>G</span>
          </div>
        ) : (
          <div className="user-avatar-dot">
            <span>U</span>
          </div>
        )}
      </div>

      <div className="message-bubble-wrapper">
        <div className="message-header">
          <span className="message-sender">{isAssistant ? 'Gideon' : 'You'}</span>
          <span className="message-timestamp">{formatTime(message.created_at)}</span>
        </div>

        <div className="message-body">
          <p>{message.content}</p>
        </div>
      </div>
    </div>
  );
}
