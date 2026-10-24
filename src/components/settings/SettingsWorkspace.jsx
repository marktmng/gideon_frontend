import React from 'react';
import DemoBadge from '../common/DemoBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { BASE_URL } from '../../services/api';

export default function SettingsWorkspace({
  statusData,
  healthData,
  loading,
  error,
  onRefresh,
}) {
  const isDemo = statusData ? statusData.is_demo : true;

  return (
    <div className="settings-workspace">
      <div className="settings-header">
        <div>
          <h2 className="workspace-title">System Diagnostics & Settings</h2>
          <p className="workspace-subtitle">
            Inspect core architecture, active AI provider runtime, persistent memory subsystems, and database status.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh Diagnostics
        </button>
      </div>

      {loading ? (
        <div className="settings-loading">
          <LoadingSpinner text="Querying Gideon system diagnostics..." />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRefresh} />
      ) : (
        <div className="settings-grid">
          {/* Card 1: Core System Status */}
          <div className="settings-card">
            <div className="card-header">
              <h3>Core System Status</h3>
              <span className={statusData?.database_connected ? "system-pill-online" : "system-pill-offline"}>
                {statusData?.database_connected ? "● Operational" : "○ Disconnected"}
              </span>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Assistant Identity</span>
                <span className="info-value font-mono">Gideon (Phase 2)</span>
              </div>
              <div className="info-row">
                <span className="info-label">Architecture Core</span>
                <span className="info-value font-mono">FastAPI + React 19 + SQLAlchemy 2.0</span>
              </div>
              <div className="info-row">
                <span className="info-label">API Endpoint</span>
                <span className="info-value font-mono">{BASE_URL}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Environment</span>
                <span className="info-value">{healthData?.environment || 'development'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Database Engine</span>
                <span className="info-value font-mono">
                  {healthData?.database_type ? healthData.database_type.toUpperCase() : 'SQLITE'} ({healthData?.database || 'connected'})
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: AI Provider Pipeline */}
          <div className="settings-card">
            <div className="card-header">
              <h3>AI Provider Pipeline</h3>
              <DemoBadge
                isDemo={isDemo}
                provider={statusData?.provider || 'demo'}
                status={statusData?.status || 'demo_mode'}
                model={statusData?.model}
              />
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Active Provider</span>
                <span className="info-value font-mono">{statusData?.provider || 'demo'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Active Model</span>
                <span className="info-value font-mono">{statusData?.model || 'local-demo-engine'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Streaming Response</span>
                <span className="info-value font-mono text-emerald">
                  {statusData?.streaming_supported ? 'Enabled (SSE)' : 'Disabled'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Provider Credentials</span>
                <span className="info-value font-mono">
                  {statusData?.has_provider_credentials ? 'Configured (Secure)' : 'Not Configured (Demo Mode Active)'}
                </span>
              </div>
              <div className="info-notice">
                {isDemo ? (
                  <p>
                    <strong>Local Demo Mode Active:</strong> Gideon is generating simulated responses locally without making external billable API calls. To enable real generative responses, configure <code>AI_PROVIDER=gemini</code> and <code>GEMINI_API_KEY</code> in <code>backend/.env</code>.
                  </p>
                ) : statusData?.has_provider_credentials ? (
                  <p>
                    <strong>Real AI Brain Active:</strong> Gideon is powered by Google Gemini (<code>{statusData?.model}</code>) with real-time progressive streaming and bounded memory context.
                  </p>
                ) : (
                  <p>
                    <strong>Credentials Missing:</strong> Provider is set to <code>{statusData?.provider}</code>, but no API key was found. Configure <code>GEMINI_API_KEY</code> to activate real AI generation.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Operational Subsystems */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Subsystem Capabilities</h3>
            </div>
            <div className="card-body">
              <div className="subsystems-grid">
                <div>
                  <h4 className="subsystem-group-title text-emerald">Active Phase 1 & 2 Capabilities</h4>
                  <ul className="subsystem-list">
                    {statusData?.capabilities?.map((cap, idx) => (
                      <li key={idx} className="subsystem-item active">
                        <span className="subsystem-icon">✓</span>
                        <span className="subsystem-name">{cap.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="subsystem-group-title text-muted">Planned Future Subsystems (Phase 3+)</h4>
                  <ul className="subsystem-list">
                    {statusData?.unconfigured_features?.map((feat, idx) => (
                      <li key={idx} className="subsystem-item unconfigured">
                        <span className="subsystem-icon">○</span>
                        <span className="subsystem-name">{feat.replace(/_/g, ' ')}</span>
                        <span className="subsystem-tag">Phase 3</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Architecture Integration Guide */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Configuring Google Gemini AI Provider</h3>
            </div>
            <div className="card-body documentation-card">
              <div className="doc-section">
                <h4>1. Obtaining API Credentials</h4>
                <p>
                  Acquire an API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5ff' }}>Google AI Studio</a>. Note that an Antigravity IDE subscription does not automatically grant API keys; dedicated API credentials are required for backend model invocation.
                </p>
              </div>

              <div className="doc-section">
                <h4>2. Setting Backend Configuration</h4>
                <p>
                  In <code>gideon-backend/.env</code>:
                </p>
                <pre className="code-block">
                  AI_PROVIDER=gemini{'\n'}
                  AI_MODEL=gemini-2.5-flash{'\n'}
                  GEMINI_API_KEY=your_actual_gemini_api_key_here{'\n'}
                  AI_TEMPERATURE=0.7{'\n'}
                  AI_MAX_OUTPUT_TOKENS=1024
                </pre>
                <p>
                  Restart the backend service. Gideon will immediately transition from Demo Mode to Real AI Generation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
