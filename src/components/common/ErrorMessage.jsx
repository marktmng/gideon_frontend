import React from 'react';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-content">
        <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="error-text">{message}</span>
      </div>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry} type="button">
          Retry
        </button>
      )}
    </div>
  );
}
