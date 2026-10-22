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
  return (
    <div className="settings-workspace">
      <div className="settings-header">
        <div>
          <h2 className="workspace-title">System Diagnostics & Settings</h2>
          <p className="workspace-subtitle">
            Inspect core architecture, active AI provider runtime, database status, and subsystem capabilities.
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
              <span className="system-pill-online">● Operational</span>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Assistant Identity</span>
                <span className="info-value font-mono">Gideon (Phase 1)</span>
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
              <DemoBadge />
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
              <div className="info-notice">
                <p>
                  <strong>Local Demo Mode Active:</strong> Gideon is generating simulated responses locally without making external billable API calls. No API credentials are required for local testing.
                </p>
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
                  <h4 className="subsystem-group-title text-emerald">Active Phase 1 Capabilities</h4>
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
                  <h4 className="subsystem-group-title text-muted">Planned Future Subsystems (Phase 2+)</h4>
                  <ul className="subsystem-list">
                    {statusData?.unconfigured_features?.map((feat, idx) => (
                      <li key={idx} className="subsystem-item unconfigured">
                        <span className="subsystem-icon">○</span>
                        <span className="subsystem-name">{feat.replace(/_/g, ' ')}</span>
                        <span className="subsystem-tag">Planned</span>
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
              <h3>Extending Gideon Architecture</h3>
            </div>
            <div className="card-body documentation-card">
              <div className="doc-section">
                <h4>Connecting PostgreSQL</h4>
                <p>
                  Configure <code>DATABASE_URL</code> in <code>backend/.env</code>:
                </p>
                <pre className="code-block">
                  DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/gideon
                </pre>
                <p>Then apply migrations: <code>alembic upgrade head</code>.</p>
              </div>

              <div className="doc-section">
                <h4>Connecting an External AI Provider</h4>
                <p>
                  Configure provider keys in <code>backend/.env</code>:
                </p>
                <pre className="code-block">
                  AI_PROVIDER=openai # or anthropic, gemini
                  AI_API_KEY=your_key_here
                  AI_MODEL=gpt-4o
                </pre>
                <p>
                  Implement the <code>BaseAIProvider</code> interface in <code>backend/app/ai/</code> without modifying route handlers or frontend components.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
