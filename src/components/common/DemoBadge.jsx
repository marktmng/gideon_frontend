import React from 'react';

export default function DemoBadge({ compact = false }) {
  return (
    <span
      className={`demo-badge ${compact ? 'demo-badge-compact' : ''}`}
      title="Gideon is currently running in local demo mode. No external API key is required."
    >
      <span className="demo-badge-dot"></span>
      DEMO MODE
    </span>
  );
}
