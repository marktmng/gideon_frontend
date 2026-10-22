import React from 'react';

export default function LoadingSpinner({ size = 'medium', text = '' }) {
  return (
    <div className={`loading-spinner-wrapper ${size}`} role="status" aria-label="Loading">
      <div className="spinner-ring"></div>
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
}
