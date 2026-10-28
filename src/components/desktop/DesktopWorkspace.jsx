/**
 * DesktopWorkspace — Futuristic Windows Desktop Automation Command Deck for Gideon Phase 4.
 * Integrates active window telemetry, allowlisted application launchers,
 * controlled input dispatchers, and task lifecycle history.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DesktopTaskPanel from './DesktopTaskPanel';
import TaskConfirmationModal from './TaskConfirmationModal';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import * as desktopApi from '../../services/desktop';
import { animatePanelEntrance, cleanupAnimations } from '../../services/animationService';

export default function DesktopWorkspace({
  reducedMotion = false,
  onGlobalStop = null,
}) {
  const [activeWindow, setActiveWindow] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectingWindow, setInspectingWindow] = useState(false);
  const [error, setError] = useState(null);

  // Controlled input states
  const [typeTarget, setTypeTarget] = useState('');
  const [typeText, setTypeText] = useState('');
  const [selectedShortcut, setSelectedShortcut] = useState('Ctrl+C');

  // Confirmation modal state
  const [confirmingTask, setConfirmingTask] = useState(null);

  const containerRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const el = containerRef.current;
    animatePanelEntrance(el, reducedMotion);
    return () => {
      cleanupAnimations(el);
    };
  }, [reducedMotion]);

  // Load recent tasks and active window
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, winRes] = await Promise.all([
        desktopApi.listDesktopTasks(50).catch(() => ({ items: [] })),
        desktopApi.getActiveWindow().catch(() => null),
      ]);
      setTasks(tasksRes.items || []);
      setActiveWindow(winRes);
    } catch (err) {
      setError(err.message || 'Failed to communicate with desktop automation service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Inspect active window on demand
  const handleInspectWindow = async () => {
    try {
      setInspectingWindow(true);
      const win = await desktopApi.getActiveWindow();
      setActiveWindow(win);
      if (win?.title) {
        setTypeTarget(win.title);
      }
    } catch (err) {
      setError(err.message || 'Failed to inspect active window.');
    } finally {
      setInspectingWindow(false);
    }
  };

  // Launch allowlisted app
  const handleLaunchApp = async (appName) => {
    try {
      setError(null);
      const task = await desktopApi.createDesktopTask('open_application', { app_name: appName });
      setTasks((prev) => [task, ...prev]);
      if (task.requires_confirmation && task.status === 'awaiting_confirmation') {
        setConfirmingTask(task);
      }
    } catch (err) {
      setError(err.message || `Failed to launch application '${appName}'.`);
    }
  };

  // Open directory
  const handleOpenDirectory = async (dirPath) => {
    try {
      setError(null);
      const task = await desktopApi.createDesktopTask('open_directory', { path: dirPath });
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to open directory.');
    }
  };

  // Open File Explorer
  const handleOpenFileExplorer = async () => {
    try {
      setError(null);
      const task = await desktopApi.createDesktopTask('open_file_explorer', {});
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to open File Explorer.');
    }
  };

  // Capture Screenshot
  const handleCaptureScreenshot = async () => {
    try {
      setError(null);
      const task = await desktopApi.captureScreenshot(true);
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to capture screenshot.');
    }
  };

  // Submit Text Input Directive (Requires Confirmation)
  const handleSubmitTypeText = async (e) => {
    e.preventDefault();
    if (!typeText.trim()) return;

    try {
      setError(null);
      const task = await desktopApi.createDesktopTask('type_text', {
        target_window: typeTarget || activeWindow?.title || 'Active Window',
        text: typeText,
      });
      setTasks((prev) => [task, ...prev]);
      setTypeText('');
      if (task.status === 'awaiting_confirmation') {
        setConfirmingTask(task);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch text typing directive.');
    }
  };

  // Submit Shortcut Directive (Requires Confirmation)
  const handleSubmitShortcut = async () => {
    try {
      setError(null);
      const task = await desktopApi.createDesktopTask('press_shortcut', {
        target_window: typeTarget || activeWindow?.title || 'Active Window',
        shortcut: selectedShortcut,
      });
      setTasks((prev) => [task, ...prev]);
      if (task.status === 'awaiting_confirmation') {
        setConfirmingTask(task);
      }
    } catch (err) {
      setError(err.message || 'Failed to trigger keyboard shortcut.');
    }
  };

  // Confirm Task
  const handleConfirmTask = async (taskId) => {
    try {
      const taskObj = tasks.find((t) => t.id === taskId) || confirmingTask;
      const updated = await desktopApi.confirmDesktopTask(
        taskId,
        true,
        null,
        taskObj?.action,
        taskObj?.target_app
      );
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setConfirmingTask(null);
    } catch (err) {
      setError(err.message || 'Failed to authorize task.');
      setConfirmingTask(null);
    }
  };

  // Reject / Cancel Task
  const handleRejectTask = async (taskId, reason) => {
    try {
      const updated = await desktopApi.confirmDesktopTask(taskId, false, reason);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setConfirmingTask(null);
    } catch (err) {
      setError(err.message || 'Failed to reject task.');
      setConfirmingTask(null);
    }
  };

  // Cancel Task
  const handleCancelTask = async (taskId) => {
    try {
      const cancelled = await desktopApi.cancelDesktopTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? cancelled : t)));
    } catch (err) {
      setError(err.message || 'Failed to cancel task.');
    }
  };

  // Global Emergency Stop
  const handleEmergencyStop = async () => {
    try {
      setConfirmingTask(null);
      if (onGlobalStop) onGlobalStop();
      await desktopApi.stopAllDesktopTasks();
      loadData();
    } catch (err) {
      setError(err.message || 'Emergency stop failed.');
    }
  };

  return (
    <div className="desktop-workspace-container" ref={containerRef}>
      {/* Workspace Header */}
      <div className="workspace-header-bar">
        <div>
          <h1 className="workspace-title">WINDOWS DESKTOP AUTOMATION</h1>
          <p className="workspace-subtitle">
            Modular, verified operating-system interaction with strict allowlist enforcement.
          </p>
        </div>

        <div className="workspace-header-actions">
          <button
            type="button"
            className="btn-emergency-stop"
            onClick={handleEmergencyStop}
            title="Emergency Stop (Ctrl+Shift+H): Immediately cancel all running and queued tasks"
          >
            <span className="stop-icon">🛑</span>
            <span>EMERGENCY STOP</span>
            <kbd className="stop-kbd" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>Ctrl+Shift+H</kbd>
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="desktop-grid-layout">
        {/* Left Column: Telemetry & Controls */}
        <div className="desktop-controls-column">
          {/* Active Foreground Window Card */}
          <div className="tactical-deck-card">
            <div className="deck-card-header">
              <span className="deck-icon">🖥️</span>
              <span className="deck-title">ACTIVE FOREGROUND WINDOW TELEMETRY</span>
              <button
                type="button"
                className="btn-deck-refresh"
                onClick={handleInspectWindow}
                disabled={inspectingWindow}
                title="Refresh active window info"
              >
                {inspectingWindow ? 'SCANNING...' : 'SCAN'}
              </button>
            </div>

            <div className="deck-card-body">
              {activeWindow ? (
                <div className="window-telemetry-grid">
                  <div className="telemetry-row">
                    <span className="telemetry-key">WINDOW TITLE:</span>
                    <span className="telemetry-val font-mono highlight-cyan">
                      {activeWindow.title || 'Desktop'}
                    </span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-key">PROCESS:</span>
                    <span className="telemetry-val font-mono">
                      {activeWindow.process_name} (PID: {activeWindow.pid})
                    </span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-key">SECURITY CLASS:</span>
                    <span className="telemetry-val font-mono">
                      {activeWindow.is_sensitive ? (
                        <span className="badge-danger">RESTRICTED SENSITIVE</span>
                      ) : (
                        <span className="badge-emerald">VERIFIED INTERACTION READY</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-muted font-mono">No foreground window data available.</div>
              )}
            </div>
          </div>

          {/* Quick Allowlisted Launchers */}
          <div className="tactical-deck-card">
            <div className="deck-card-header">
              <span className="deck-icon">⚡</span>
              <span className="deck-title">ALLOWLISTED APPLICATION LAUNCHERS</span>
            </div>

            <div className="deck-card-body">
              <div className="quick-launchers-grid">
                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={() => handleLaunchApp('notepad')}
                >
                  <span className="btn-icon">📝</span>
                  <span className="btn-label">Notepad</span>
                </button>

                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={() => handleLaunchApp('calculator')}
                >
                  <span className="btn-icon">🔢</span>
                  <span className="btn-label">Calculator</span>
                </button>

                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={handleOpenFileExplorer}
                >
                  <span className="btn-icon">📁</span>
                  <span className="btn-label">File Explorer</span>
                </button>

                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={() => handleLaunchApp('browser')}
                >
                  <span className="btn-icon">🌐</span>
                  <span className="btn-label">Web Browser</span>
                </button>

                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={() => handleOpenDirectory('C:/Mark/Gideon')}
                >
                  <span className="btn-icon">📂</span>
                  <span className="btn-label">Gideon Project</span>
                </button>

                <button
                  type="button"
                  className="quick-launcher-btn"
                  onClick={handleCaptureScreenshot}
                >
                  <span className="btn-icon">📷</span>
                  <span className="btn-label">Screenshot</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controlled Input Dispatcher (Stage 2) */}
          <div className="tactical-deck-card">
            <div className="deck-card-header">
              <span className="deck-icon">⌨️</span>
              <span className="deck-title">CONTROLLED TEXT INPUT & SHORTCUTS</span>
            </div>

            <div className="deck-card-body">
              <form onSubmit={handleSubmitTypeText} className="controlled-input-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="type-target-input">
                    Target Window (Title Substring):
                  </label>
                  <input
                    id="type-target-input"
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. 'Notepad' or leave empty for active window"
                    value={typeTarget}
                    onChange={(e) => setTypeTarget(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="type-text-input">
                    Text to Inject:
                  </label>
                  <input
                    id="type-text-input"
                    type="text"
                    className="form-input font-mono"
                    placeholder="Enter text payload..."
                    value={typeText}
                    onChange={(e) => setTypeText(e.target.value)}
                  />
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-primary-action" disabled={!typeText.trim()}>
                    Dispatch Text Directive
                  </button>
                </div>
              </form>

              <div className="shortcut-picker-section">
                <label className="form-label" htmlFor="shortcut-select">
                  Allowlisted Shortcut Combination:
                </label>
                <div className="shortcut-controls-row">
                  <select
                    id="shortcut-select"
                    className="form-select font-mono"
                    value={selectedShortcut}
                    onChange={(e) => setSelectedShortcut(e.target.value)}
                  >
                    <option value="Ctrl+C">Ctrl+C (Copy)</option>
                    <option value="Ctrl+V">Ctrl+V (Paste)</option>
                    <option value="Ctrl+S">Ctrl+S (Save)</option>
                    <option value="Ctrl+Z">Ctrl+Z (Undo)</option>
                    <option value="Ctrl+A">Ctrl+A (Select All)</option>
                    <option value="Enter">Enter (Submit)</option>
                    <option value="Escape">Escape (Dismiss)</option>
                    <option value="Tab">Tab (Next field)</option>
                    <option value="F5">F5 (Refresh)</option>
                  </select>

                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={handleSubmitShortcut}
                  >
                    Trigger Shortcut
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Task Lifecycle Monitor */}
        <div className="desktop-tasks-column">
          <div className="tactical-deck-card h-full">
            <div className="deck-card-header">
              <span className="deck-icon">📜</span>
              <span className="deck-title">AUTOMATION DIRECTIVE AUDIT TRAIL</span>
              <span className="count-badge">{tasks.length}</span>
            </div>

            <div className="deck-card-body tasks-scroll-body">
              {loading && tasks.length === 0 ? (
                <LoadingSpinner text="Retrieving task audit log..." />
              ) : tasks.length === 0 ? (
                <div className="empty-tasks-state">
                  <span className="empty-icon">✧</span>
                  <p>No desktop automation directives have been executed yet.</p>
                  <span className="text-muted">Directives triggered via chat, voice, or quick launchers appear here.</span>
                </div>
              ) : (
                <div className="task-panels-feed">
                  {tasks.map((task) => (
                    <DesktopTaskPanel
                      key={task.id}
                      task={task}
                      onCancel={handleCancelTask}
                      onConfirmRequest={(t) => setConfirmingTask(t)}
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <TaskConfirmationModal
        task={confirmingTask}
        isOpen={Boolean(confirmingTask)}
        onConfirm={handleConfirmTask}
        onReject={handleRejectTask}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
