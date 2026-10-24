import React from 'react';

export default function DemoBadge({
  compact = false,
  isDemo = true,
  provider = 'demo',
  status = 'demo_mode',
  model = null,
}) {
  if (isDemo) {
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

  if (status === 'unconfigured') {
    return (
      <span
        className={`demo-badge demo-badge-unconfigured ${compact ? 'demo-badge-compact' : ''}`}
        title="Selected AI provider lacks valid API credentials. Check GEMINI_API_KEY in backend/.env."
      >
        <span className="demo-badge-dot unconfigured"></span>
        API KEY REQUIRED
      </span>
    );
  }

  return (
    <span
      className={`demo-badge demo-badge-online ${compact ? 'demo-badge-compact' : ''}`}
      title={`Active AI Provider: ${provider.toUpperCase()}${model ? ` (${model})` : ''}. Powered by real neural generation.`}
    >
      <span className="demo-badge-dot online"></span>
      {provider.toUpperCase()} ONLINE
    </span>
  );
}
