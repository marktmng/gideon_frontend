import React from 'react';

export default function DemoBadge({
  compact = false,
  isDemo = true,
  provider = 'demo',
  status = 'demo_mode',
  model = null,
}) {
  const isOllamaProvider = provider === 'ollama' || provider === 'local';
  const isOllamaOffline = status === 'ollama_offline' || status === 'provider_offline' || status === 'offline';

  if (isOllamaProvider && isOllamaOffline) {
    return (
      <span
        className={`demo-badge demo-badge-unconfigured ${compact ? 'demo-badge-compact' : ''}`}
        title={`Ollama is offline or unreachable at http://127.0.0.1:11434. Run 'ollama serve' to activate.`}
        style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
      >
        <span className="demo-badge-dot unconfigured" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span>
        OLLAMA OFFLINE
      </span>
    );
  }

  if (isOllamaProvider || status === 'local_ai_active') {
    return (
      <span
        className={`demo-badge demo-badge-online ${compact ? 'demo-badge-compact' : ''}`}
        title={`Active Local AI: Ollama (${model || 'llama3.2'}). On-device neural generation without cloud APIs.`}
        style={{ borderColor: 'rgba(56, 189, 248, 0.5)', color: '#38bdf8' }}
      >
        <span className="demo-badge-dot online" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
        LOCAL AI (OLLAMA)
      </span>
    );
  }

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
