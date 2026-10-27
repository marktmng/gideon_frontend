import React, { useState, useEffect } from 'react';
import DemoBadge from '../common/DemoBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { BASE_URL } from '../../services/api';
import voiceService from '../../services/voiceService';

export default function SettingsWorkspace({
  statusData,
  healthData,
  loading,
  error,
  onRefresh,

  // Phase 3 preferences & controls
  settings = {},
  onUpdateSettings = null,
  cameraActive = false,
  onToggleCamera = null,
}) {
  const isDemo = statusData ? statusData.is_demo : true;
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const v = voiceService.getVoices();
      setAvailableVoices(v || []);
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleVoiceToggle = (e) => {
    if (onUpdateSettings) {
      onUpdateSettings({ voiceEnabled: e.target.checked });
    }
  };

  const handleRateChange = (e) => {
    if (onUpdateSettings) {
      onUpdateSettings({ speechRate: parseFloat(e.target.value) });
    }
  };

  const handleVoiceSelect = (e) => {
    if (onUpdateSettings) {
      onUpdateSettings({ selectedVoiceURI: e.target.value });
    }
  };

  const handleReducedMotionToggle = (e) => {
    if (onUpdateSettings) {
      onUpdateSettings({ reducedMotion: e.target.checked });
    }
  };

  const handleThresholdChange = (e) => {
    if (onUpdateSettings) {
      onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) });
    }
  };

  return (
    <div className="settings-workspace" role="region" aria-label="System Diagnostics and Settings">
      <div className="settings-header">
        <div>
          <h2 className="workspace-title">System Diagnostics & Settings</h2>
          <p className="workspace-subtitle">
            Inspect core architecture, active AI provider runtime, persistent memory subsystems, and Phase 3 voice & gesture controls.
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
                <span className="info-value font-mono">Gideon (Phase 3)</span>
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

          {/* Card 3: Phase 3 Voice, Optical & Gesture Preferences */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Phase 3 Voice, Optical & Hand Gesture Preferences</h3>
              <span className="system-pill-online">● Phase 3 Active</span>
            </div>
            <div className="card-body settings-controls-grid">
              {/* Voice Settings */}
              <div className="settings-subcard">
                <h4 className="subcard-title">Vocal Interface (Speech Output & Synthesis)</h4>
                
                <div className="setting-toggle-row">
                  <label htmlFor="voice-output-toggle">Spoken Voice Responses</label>
                  <input
                    id="voice-output-toggle"
                    type="checkbox"
                    checked={!!settings.voiceEnabled}
                    onChange={handleVoiceToggle}
                  />
                </div>

                <div className="setting-control-row">
                  <label htmlFor="speech-rate-slider">
                    Speech Rate: <span className="font-mono">{settings.speechRate || 1.0}x</span>
                  </label>
                  <input
                    id="speech-rate-slider"
                    type="range"
                    min="0.7"
                    max="1.6"
                    step="0.1"
                    value={settings.speechRate || 1.0}
                    onChange={handleRateChange}
                  />
                </div>

                <div className="setting-control-row">
                  <label htmlFor="voice-select">Synthesizer Voice</label>
                  <select
                    id="voice-select"
                    value={settings.selectedVoiceURI || ''}
                    onChange={handleVoiceSelect}
                    className="settings-select"
                  >
                    <option value="">Default Browser Voice</option>
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optical & Gesture Settings */}
              <div className="settings-subcard">
                <h4 className="subcard-title">Optical Sensors & Hand Gesture Recognition</h4>

                <div className="setting-toggle-row">
                  <label htmlFor="camera-toggle">Optical Webcam Sensor</label>
                  <button
                    id="camera-toggle"
                    type="button"
                    className={`btn-small ${cameraActive ? 'btn-danger' : 'btn-primary'}`}
                    onClick={onToggleCamera}
                  >
                    {cameraActive ? 'Stop Webcam' : 'Activate Webcam'}
                  </button>
                </div>

                <div className="setting-control-row">
                  <label htmlFor="gesture-threshold-slider">
                    Confidence Threshold: <span className="font-mono">{Math.round((settings.confidenceThreshold || 0.70) * 100)}%</span>
                  </label>
                  <input
                    id="gesture-threshold-slider"
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={settings.confidenceThreshold || 0.70}
                    onChange={handleThresholdChange}
                  />
                </div>

                <div className="setting-toggle-row">
                  <label htmlFor="reduced-motion-toggle">Reduced Motion (Low GPU/CPU Mode)</label>
                  <input
                    id="reduced-motion-toggle"
                    type="checkbox"
                    checked={!!settings.reducedMotion}
                    onChange={handleReducedMotionToggle}
                  />
                </div>
              </div>
            </div>

            {/* Gesture Mapping Reference Table */}
            <div className="gesture-mapping-section">
              <h4 className="subcard-title">Configured Hand Gesture Mappings</h4>
              <div className="gesture-table-wrapper">
                <table className="gesture-table">
                  <thead>
                    <tr>
                      <th>Hand Gesture</th>
                      <th>Mapped Action</th>
                      <th>Safety & Cooldown</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="gesture-code">Open Palm</span></td>
                      <td>Toggle Voice Recognition (Pause / Resume listening)</td>
                      <td>1.5s Cooldown, 4-frame stability</td>
                    </tr>
                    <tr>
                      <td><span className="gesture-code">Closed Fist</span></td>
                      <td>Stop Speech (Immediate vocal cancellation)</td>
                      <td>Instant interruption</td>
                    </tr>
                    <tr>
                      <td><span className="gesture-code">Thumbs Up</span></td>
                      <td>Confirm supported action</td>
                      <td>Explicit confirmation only</td>
                    </tr>
                    <tr>
                      <td><span className="gesture-code">Thumbs Down</span></td>
                      <td>Halt / Cancel active generation</td>
                      <td>Safe generation abort</td>
                    </tr>
                    <tr>
                      <td><span className="gesture-code">Peace Sign (Victory)</span></td>
                      <td>Toggle Optical HUD Monitor Preview</td>
                      <td>1.5s Cooldown</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 4: Operational Subsystems */}
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
                  <h4 className="subsystem-group-title text-muted">Planned Future Subsystems (Phase 4+)</h4>
                  <ul className="subsystem-list">
                    {statusData?.unconfigured_features?.map((feat, idx) => (
                      <li key={idx} className="subsystem-item unconfigured">
                        <span className="subsystem-icon">○</span>
                        <span className="subsystem-name">{feat.replace(/_/g, ' ')}</span>
                        <span className="subsystem-tag">Future</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Architecture Integration Guide */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Configuring Google Gemini AI Provider</h3>
            </div>
            <div className="card-body documentation-card">
              <div className="doc-section">
                <h4>1. Obtaining API Credentials</h4>
                <p>
                  Acquire an API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5ff' }}>Google AI Studio</a>. Dedicated API credentials are required for backend model invocation.
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
