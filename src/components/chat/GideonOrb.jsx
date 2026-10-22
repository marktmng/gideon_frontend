import React from 'react';

export default function GideonOrb({ isProcessing = false, size = 'normal' }) {
  return (
    <div className={`gideon-orb-container ${size} ${isProcessing ? 'active' : ''}`} aria-hidden="true">
      <div className="orb-ring ring-outer"></div>
      <div className="orb-ring ring-mid"></div>
      <div className="orb-ring ring-inner"></div>
      <div className="orb-core">
        <div className="orb-pulse"></div>
      </div>
    </div>
  );
}
