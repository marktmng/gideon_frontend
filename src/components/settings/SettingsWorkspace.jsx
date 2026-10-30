import React, { useState, useEffect, useCallback } from 'react';
import DemoBadge from '../common/DemoBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { BASE_URL } from '../../services/api';
import voiceService from '../../services/voiceService';
import {
  switchAIProvider,
  getOllamaStatus,
  getLocalWindows,
  getLocalMonitoringStatus,
  toggleLocalMonitoring,
} from '../../services/assistant';

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
  interaction = null,
}) {
  const isDemo = statusData ? statusData.is_demo : true;
  const currentProvider = (statusData?.provider || 'demo').toLowerCase();
  const [availableVoices, setAvailableVoices] = useState([]);
  const [availableMicrophones, setAvailableMicrophones] = useState([]);

  // Local AI (Ollama) & Provider Switching State
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState(statusData?.model || 'llama3.2');
  const [ollamaBaseUrl] = useState('http://127.0.0.1:11434');
  const [ollamaStatus, setOllamaStatus] = useState({
    checking: false,
    checked: false,
    connected: false,
    available_models: [],
    error: null,
    setup_instructions: [],
  });
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Local PC Context & Live Window Inspection State
  const [inspectingWindows, setInspectingWindows] = useState(false);
  const [openWindowsData, setOpenWindowsData] = useState(null);
  const [windowsError, setWindowsError] = useState(null);

  // Local Monitoring State
  const [monitoringState, setMonitoringState] = useState({
    is_enabled: false,
    poll_interval_seconds: 5,
    recent_events_count: 0,
    recent_events: [],
  });
  const [togglingMonitor, setTogglingMonitor] = useState(false);

  useEffect(() => {
    if (statusData?.provider) {
      setSelectedProvider(statusData.provider.toLowerCase());
      if (statusData.model) {
        setSelectedModel(statusData.model || 'llama3.2');
      }
    }
  }, [statusData]);

  // Load synth voices
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

  // Load available microphone input devices
  useEffect(() => {
    async function loadMics() {
      try {
        const mics = await voiceService.getAudioInputDevices();
        setAvailableMicrophones(mics || []);
      } catch (e) {
        // Non-fatal
      }
    }
    loadMics();
  }, []);

  // Check Ollama status
  const checkOllama = useCallback(async () => {
    setOllamaStatus((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const data = await getOllamaStatus(ollamaBaseUrl, selectedModel);
      setOllamaStatus({
        checking: false,
        checked: true,
        connected: !!data.connected,
        available_models: data.available_models || [],
        error: data.error || null,
        setup_instructions: data.setup_instructions || [],
      });
      if (data.available_models && data.available_models.length > 0 && !data.has_active_model) {
        setSelectedModel(data.available_models[0]);
      }
    } catch (err) {
      setOllamaStatus({
        checking: false,
        checked: true,
        connected: false,
        available_models: [],
        error: err.message || 'Cannot reach Ollama',
        setup_instructions: [
          '1. Install Ollama from https://ollama.com/download',
          '2. Run `ollama serve` in a terminal or start the Ollama desktop app.',
          `3. Pull your desired model: ollama pull ${selectedModel || 'llama3.2'}`,
        ],
      });
    }
  }, [ollamaBaseUrl, selectedModel]);

  // Load monitoring status on mount
  useEffect(() => {
    async function loadMonitor() {
      try {
        const data = await getLocalMonitoringStatus();
        setMonitoringState(data);
      } catch (e) {
        // Fail silently if monitoring endpoint isn't ready
      }
    }
    loadMonitor();
  }, []);

  // Handle provider switch
  const handleApplyProvider = async (e) => {
    e.preventDefault();
    setSwitchingProvider(true);
    setSwitchFeedback(null);
    try {
      const res = await switchAIProvider(selectedProvider, selectedModel, ollamaBaseUrl, true, geminiApiKey);
      setSwitchFeedback({
        type: 'success',
        message: res.message || `Switched to ${selectedProvider}.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setSwitchFeedback({
        type: 'error',
        message: err.message || 'Failed to switch AI provider.',
      });
    } finally {
      setSwitchingProvider(false);
    }
  };

  // Inspect live open windows
  const handleInspectWindows = async () => {
    setInspectingWindows(true);
    setWindowsError(null);
    try {
      const data = await getLocalWindows();
      setOpenWindowsData(data);
    } catch (err) {
      setWindowsError(err.message || 'Failed to query open windows.');
    } finally {
      setInspectingWindows(false);
    }
  };

  // Toggle local monitoring
  const handleToggleMonitoring = async () => {
    setTogglingMonitor(true);
    try {
      const res = await toggleLocalMonitoring();
      setMonitoringState((prev) => ({ ...prev, is_enabled: res.is_enabled }));
    } catch (err) {
      // ignore
    } finally {
      setTogglingMonitor(false);
    }
  };

  const handleVoiceToggle = (e) => {
    if (onUpdateSettings) onUpdateSettings({ voiceEnabled: e.target.checked });
  };

  const handleRateChange = (e) => {
    if (onUpdateSettings) onUpdateSettings({ speechRate: parseFloat(e.target.value) });
  };

  const handleVoiceSelect = (e) => {
    if (onUpdateSettings) onUpdateSettings({ selectedVoiceURI: e.target.value });
  };

  const handleReducedMotionToggle = (e) => {
    if (onUpdateSettings) onUpdateSettings({ reducedMotion: e.target.checked });
  };

  const handleThresholdChange = (e) => {
    if (onUpdateSettings) onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) });
  };

  const handleWakeWordToggle = (e) => {
    if (onUpdateSettings) onUpdateSettings({ wakeWordEnabled: e.target.checked });
  };

  const handleWakePhraseChange = (e) => {
    if (onUpdateSettings) onUpdateSettings({ wakeWordPhrase: e.target.value });
  };

  const handleAudioCueToggle = (e) => {
    if (onUpdateSettings) onUpdateSettings({ audioCueEnabled: e.target.checked });
  };

  const handleMicrophoneSelect = (e) => {
    if (onUpdateSettings) onUpdateSettings({ selectedMicrophoneId: e.target.value });
  };

  const handleMuteMicrophone = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ wakeWordEnabled: false });
    }
  };

  return (
    <div className="settings-workspace" role="region" aria-label="System Diagnostics and Settings">
      <div className="settings-header">
        <div>
          <h2 className="workspace-title">System Diagnostics & Settings</h2>
          <p className="workspace-subtitle">
            Inspect core architecture, configure Local-First AI (Ollama) or Cloud Gemini, and manage local PC context & privacy controls.
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
              <span className={statusData?.database_connected ? 'system-pill-online' : 'system-pill-offline'}>
                {statusData?.database_connected ? '● Operational' : '○ Disconnected'}
              </span>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Assistant Identity</span>
                <span className="info-value font-mono">Gideon (Phase 5.1 Local Awareness)</span>
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

          {/* Card 2: AI Provider Pipeline & Local Runtime Switcher */}
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
                <span className="info-value font-mono">{statusData?.model || 'qwen2.5:3b'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Streaming Response</span>
                <span className="info-value font-mono text-emerald">
                  {statusData?.streaming_supported ? 'Enabled (SSE)' : 'Disabled'}
                </span>
              </div>

              {/* Provider Selection Form */}
              <div className="provider-selector-box" style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 229, 255, 0.04)', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Active AI Brain Runtime
                </h4>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn-small ${selectedProvider === 'ollama' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setSelectedProvider('ollama');
                      checkOllama();
                    }}
                    style={{ flex: 1, minWidth: '110px' }}
                  >
                    💻 Local AI (Ollama)
                  </button>
                  <button
                    type="button"
                    className={`btn-small ${selectedProvider === 'gemini' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedProvider('gemini')}
                    style={{ flex: 1, minWidth: '110px' }}
                  >
                    ☁️ Google Gemini
                  </button>
                  <button
                    type="button"
                    className={`btn-small ${selectedProvider === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedProvider('demo')}
                    style={{ flex: 1, minWidth: '110px' }}
                  >
                    🛡️ Demo Mode (Offline)
                  </button>
                </div>

                {selectedProvider === 'ollama' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="setting-control-row" style={{ marginBottom: '8px' }}>
                      <label htmlFor="ollama-model-input" style={{ fontSize: '0.8rem' }}>Local Model Name:</label>
                      <input
                        id="ollama-model-input"
                        type="text"
                        value={selectedModel || ''}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        placeholder="e.g. llama3.2, mistral, qwen2.5"
                        className="settings-input"
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={checkOllama}
                        disabled={ollamaStatus.checking}
                        className="btn-small btn-secondary"
                        style={{ fontSize: '0.75rem' }}
                      >
                        {ollamaStatus.checking ? 'Probing Ollama...' : '🔍 Probe Ollama Service'}
                      </button>

                      {ollamaStatus.checked && (
                        <span style={{ fontSize: '0.75rem', color: ollamaStatus.connected ? '#10b981' : '#f87171' }}>
                          {ollamaStatus.connected ? '● Ollama Reachable' : '○ Ollama Offline'}
                        </span>
                      )}
                    </div>

                    {ollamaStatus.checked && !ollamaStatus.connected && (
                      <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.75rem', color: '#fca5a5' }}>
                        <strong>Ollama is not running at {ollamaBaseUrl}</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {ollamaStatus.setup_instructions.map((ins, i) => (
                            <li key={i}>{ins}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedProvider === 'gemini' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="setting-control-row" style={{ marginBottom: '8px' }}>
                      <label htmlFor="gemini-api-key-input" style={{ fontSize: '0.8rem' }}>Google Gemini API Key:</label>
                      <input
                        id="gemini-api-key-input"
                        type="password"
                        value={geminiApiKey || ''}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Enter AIzaSy... key from Google AI Studio"
                        className="settings-input"
                        style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Required for Google Gemini. Keys are saved securely to your local configuration (.env).
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleApplyProvider}
                    disabled={switchingProvider}
                    className="btn-small btn-primary"
                  >
                    {switchingProvider ? 'Activating...' : `Activate ${selectedProvider.toUpperCase()}`}
                  </button>
                </div>

                {switchFeedback && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: switchFeedback.type === 'success' ? '#10b981' : '#f87171' }}>
                    {switchFeedback.message}
                  </div>
                )}
              </div>

              <div className="info-notice" style={{ marginTop: '14px' }}>
                {statusData?.provider === 'ollama' ? (
                  <p>
                    <strong>Local AI Active (Ollama):</strong> Gideon is generating responses on-device using <code>{statusData?.model}</code>. No billable cloud calls, zero data leaves your PC.
                  </p>
                ) : isDemo ? (
                  <p>
                    <strong>Local Offline Demo Active:</strong> Gideon answers local PC context questions and performs trusted desktop actions locally. Switch to <em>Local AI (Ollama)</em> above for private on-device LLM chat.
                  </p>
                ) : (
                  <p>
                    <strong>Real Cloud AI Active:</strong> Gideon is powered by Google Gemini (<code>{statusData?.model}</code>) with real-time progressive streaming.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Local PC Context & Privacy Safeguards */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Local PC Context & Privacy Safeguards</h3>
              <span className="system-pill-online">● 100% On-Device Processing</span>
            </div>
            <div className="card-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Gideon inspects running windows, extracts screen OCR, and summarizes workspace directories strictly locally on your Windows PC. 
                <strong> No screenshots, window titles, or file contents are ever transmitted to external cloud endpoints.</strong>
              </p>

              <div className="settings-controls-grid">
                {/* Local Awareness Toggles */}
                <div className="settings-subcard">
                  <h4 className="subcard-title">Local Context Permissions</h4>
                  
                  <div className="setting-toggle-row">
                    <label htmlFor="screen-inspection-toggle">Desktop Window & Screen Awareness</label>
                    <input
                      id="screen-inspection-toggle"
                      type="checkbox"
                      checked={true}
                      readOnly
                      title="Screen and active window inspection is handled strictly on-device."
                    />
                  </div>

                  <div className="setting-toggle-row">
                    <label htmlFor="ocr-engine-toggle">Windows Native WinRT OCR Engine</label>
                    <input
                      id="ocr-engine-toggle"
                      type="checkbox"
                      checked={true}
                      readOnly
                      title="Hardware-accelerated native Windows OCR without external internet access."
                    />
                  </div>

                  <div className="setting-toggle-row">
                    <label htmlFor="monitoring-toggle">
                      Opt-In Change Monitoring (Active app switches & workspace edits)
                    </label>
                    <input
                      id="monitoring-toggle"
                      type="checkbox"
                      checked={!!monitoringState?.is_enabled}
                      onChange={handleToggleMonitoring}
                      disabled={togglingMonitor}
                    />
                  </div>
                </div>

                {/* Live Window Inspection Diagnostic */}
                <div className="settings-subcard">
                  <h4 className="subcard-title">Live Window Awareness Diagnostic</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px 0' }}>
                    Verify that Gideon can observe open application windows and foreground focus without cloud dependencies.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleInspectWindows}
                    disabled={inspectingWindows}
                    className="btn-small btn-secondary"
                  >
                    {inspectingWindows ? 'Enumerating Windows...' : '🔍 Inspect Visible Windows Now'}
                  </button>

                  {windowsError && (
                    <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '6px' }}>{windowsError}</div>
                  )}

                  {openWindowsData && (
                    <div style={{ marginTop: '10px', maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <div style={{ color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>
                        Active: {openWindowsData.active_window ? `"${openWindowsData.active_window.title}" (${openWindowsData.active_window.process_name})` : 'None'}
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        Total Detected Visible Windows: {openWindowsData.count}
                      </div>
                      <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
                        {(openWindowsData.windows || []).slice(0, 6).map((win, idx) => (
                          <li key={idx} style={{ color: win.is_active ? '#38bdf8' : '#cbd5e1' }}>
                            {win.title} <span style={{ color: '#64748b' }}>({win.process_name})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Hands-Free Wake Word & Vocal Activation (Phase 5) */}
          <div className="settings-card full-width">
            <div className="card-header">
              <h3>Hands-Free Wake Word & Vocal Activation</h3>
              <span className={settings.wakeWordEnabled ? 'system-pill-online' : 'system-pill-offline'}>
                {settings.wakeWordEnabled ? '● Standby Active ("Hey Gideon")' : '○ Disabled (Push-to-Talk Only)'}
              </span>
            </div>
            <div className="card-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Activate Gideon hands-free by speaking the wake phrase <strong>"Hey Gideon"</strong> (default) or <strong>"Gideon"</strong> into your PC microphone.
                Gideon acknowledges activation via the holographic face and audio chime, captures your request, synthesizes the response with lipsync articulation, and automatically returns to standby listening.
              </p>

              <div className="settings-controls-grid">
                {/* Subcard 1: Activation Controls */}
                <div className="settings-subcard">
                  <h4 className="subcard-title">Wake Word Configuration</h4>

                  <div className="setting-toggle-row">
                    <label htmlFor="wake-word-toggle">
                      <strong>Enable Hands-Free Wake Word</strong>
                    </label>
                    <input
                      id="wake-word-toggle"
                      type="checkbox"
                      checked={!!settings.wakeWordEnabled}
                      onChange={handleWakeWordToggle}
                    />
                  </div>

                  <div className="setting-control-row">
                    <label htmlFor="wake-phrase-select">Wake Word Phrase</label>
                    <select
                      id="wake-phrase-select"
                      value={settings.wakeWordPhrase || 'hey_gideon'}
                      onChange={handleWakePhraseChange}
                      className="settings-select"
                      disabled={!settings.wakeWordEnabled}
                    >
                      <option value="hey_gideon">"Hey Gideon" (Recommended Default)</option>
                      <option value="gideon">"Gideon" (Single-Word Alternative)</option>
                      <option value="both">Both ("Hey Gideon" & "Gideon")</option>
                    </select>
                  </div>

                  <div className="setting-toggle-row">
                    <label htmlFor="audio-cue-toggle">Audio Acknowledgment Chime (Web Audio Synth C5→E5)</label>
                    <input
                      id="audio-cue-toggle"
                      type="checkbox"
                      checked={settings.audioCueEnabled !== false}
                      onChange={handleAudioCueToggle}
                      disabled={!settings.wakeWordEnabled}
                    />
                  </div>

                  <div className="setting-control-row">
                    <label htmlFor="mic-select">Audio Input Receptor (Microphone)</label>
                    <select
                      id="mic-select"
                      value={settings.selectedMicrophoneId || ''}
                      onChange={handleMicrophoneSelect}
                      className="settings-select"
                    >
                      <option value="">Default System Microphone</option>
                      {availableMicrophones.map((m, idx) => (
                        <option key={m.deviceId || idx} value={m.deviceId}>
                          🎤 {m.label || `Microphone ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-small btn-danger"
                      onClick={handleMuteMicrophone}
                      title="Instantly stop wake word listening and release microphone"
                    >
                      🛑 Disable Microphone Receptor (Instant Mute)
                    </button>
                  </div>
                </div>

                {/* Subcard 2: Architecture & Security Policy */}
                <div className="settings-subcard">
                  <h4 className="subcard-title">Local-First Engine & Security Architecture</h4>
                  
                  <div className="info-notice" style={{ margin: 0, padding: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>
                      ⚡ Client-Side Acoustic & Speech Engine
                    </div>
                    <ul style={{ margin: '4px 0 8px 16px', padding: 0, fontSize: '0.75rem', color: '#cbd5e1' }}>
                      <li><strong>Zero Cloud Costs:</strong> Runs 100% on-device in Chromium/Edge on Windows without cloud billing.</li>
                      <li><strong>Zero External Keys:</strong> No third-party AI or wake-word API keys required.</li>
                      <li><strong>Single-Breath Extraction:</strong> <em>"Hey Gideon, what is open on my screen?"</em> triggers immediately without pausing.</li>
                      <li><strong>Acoustic Echo Suppression:</strong> Automatically prevents self-activation while Gideon speaks.</li>
                      <li><strong>Vocal Interruption:</strong> Say <em>"Stop"</em> or <em>"Halt"</em> anytime during speech to cancel playback instantly.</li>
                    </ul>

                    <div style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '0.75rem', marginTop: '6px' }}>
                      🛡️ Strict Safety Boundaries
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Wake word activation NEVER bypasses Phase 4 security policies or Phase 5 human approvals. Dangerous commands cannot be triggered hands-free without explicit human confirmation.
                    </p>
                  </div>
                </div>

                {/* Subcard 3: Real-Time Voice Pipeline & Receptor Diagnostics */}
                <div className="settings-subcard" style={{ gridColumn: 'span 2' }}>
                  <h4 className="subcard-title">Live Voice & Acoustic Receptor Diagnostics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Receptor Mode</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: interaction?.isListening ? '#10b981' : '#38bdf8' }}>
                        {interaction?.isListening ? '🎤 Listening (Receptor Active)' : interaction?.wakeWordActive ? '👂 Standby ("Hey Gideon")' : '○ Standby Inactive'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Microphone Signal (RMS)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((interaction?.audioLevel || 0) * 100)}%`, height: '100%', background: '#00e5ff', transition: 'width 0.1s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#00e5ff' }}>
                          {Math.round((interaction?.audioLevel || 0) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Speech Queue / TTS</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: interaction?.isSpeaking ? '#a855f7' : '#94a3b8' }}>
                        {interaction?.isSpeaking ? '🗣️ Streaming Speech Active' : 'Idle (FIFO Queue Ready)'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>3D Viseme Lipsync</div>
                      <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#f59e0b' }}>
                        Code: {interaction?.currentViseme || 'REST'} {interaction?.isSpeaking ? '● Articulating' : '○ Neutral'}
                      </div>
                    </div>
                  </div>

                  {interaction?.interimTranscript && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.25)', fontSize: '0.8rem' }}>
                      <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>Live Interim Transcript: </span>
                      <span style={{ color: '#f1f5f9', fontStyle: 'italic' }}>"{interaction.interimTranscript}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Phase 3 Voice, Optical & Gesture Preferences */}
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
                    <option value="">✨ Amy Louise Pemberton (Gideon AI - British Female) [Auto]</option>
                    {availableVoices.map((v) => {
                      const isBritish = (v.lang || '').toLowerCase().includes('gb') || (v.lang || '').toLowerCase().includes('uk');
                      const name = (v.name || '').toLowerCase();
                      const isRecommended = isBritish && (name.includes('libby') || name.includes('mia') || name.includes('hazel') || name.includes('female') || name.includes('amy'));
                      return (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {isRecommended ? '🇬🇧 [Amy Louise Pemberton match] ' : isBritish ? '🇬🇧 ' : ''}
                          {v.name} ({v.lang})
                        </option>
                      );
                    })}
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
                    <tr>
                      <td><span className="gesture-code">Pointing Up</span></td>
                      <td>Inspect Active Window (Foreground app & window title)</td>
                      <td>1.5s Cooldown, local inspection only</td>
                    </tr>
                    <tr>
                      <td><span className="gesture-code">I Love You / Horns</span></td>
                      <td>Greet Gideon ("Hello Gideon!")</td>
                      <td>1.5s Cooldown</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 5: Operational Subsystems */}
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

          {/* Card 6: Architecture Integration Guide */}
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
