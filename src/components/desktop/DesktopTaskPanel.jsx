/**
 * DesktopTaskPanel — 21st.dev inspired Tactical Task Status Panel for Gideon.
 * Displays accurate real-time lifecycle states, verified results, and interactive controls.
 */
import React, { useRef, useEffect } from 'react';
import { animateTaskStatusChange, cleanupAnimations } from '../../services/animationService';

export default function DesktopTaskPanel({
  task,
  onCancel,
  onConfirmRequest,
  reducedMotion = false,
  compact = false,
}) {
  const statusPillRef = useRef(null);

  useEffect(() => {
    const pill = statusPillRef.current;
    if (pill) {
      animateTaskStatusChange(pill, reducedMotion);
    }
    return () => {
      cleanupAnimations(pill);
    };
  }, [task?.status, reducedMotion]);

  if (!task) return null;

  const stateConfigs = {
    idle: { label: 'STANDBY', class: 'state-idle', icon: '○' },
    planning: { label: 'PLANNING', class: 'state-planning', icon: '◐' },
    awaiting_confirmation: { label: 'AWAITING AUTHORIZATION', class: 'state-confirm', icon: '⚠️' },
    executing: { label: 'EXECUTING', class: 'state-executing', icon: '⚡' },
    completed: { label: 'VERIFIED SUCCESS', class: 'state-completed', icon: '✓' },
    cancelled: { label: 'CANCELLED', class: 'state-cancelled', icon: '✕' },
    error: { label: 'EXECUTION FAILED', class: 'state-error', icon: '⚠' },
  };

  const statusMeta = stateConfigs[task.status] || stateConfigs.idle;

  const actionTitles = {
    open_application: 'Launch Application',
    activate_application: 'Activate Window',
    open_url: 'Open URL',
    open_directory: 'Open Directory',
    open_file_explorer: 'Open File Explorer',
    inspect_active_window: 'Inspect Active Window',
    type_text: 'Type Text Input',
    press_shortcut: 'Press Keyboard Shortcut',
    capture_screenshot: 'Capture Screenshot',
    click_accessible_element: 'Click Accessible Control',
  };

  const canCancel = ['planning', 'awaiting_confirmation', 'executing'].includes(task.status);
  const isAwaiting = task.status === 'awaiting_confirmation';

  const formatTimestamp = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`desktop-task-card ${task.status} ${compact ? 'compact' : ''}`}>
      <div className="task-card-header">
        <div className="task-card-identity">
          <span className="task-action-badge">{actionTitles[task.action] || task.action}</span>
          <span className="task-id-mono font-mono">ID: {String(task.id || task.task_id || '').slice(0, 8)}</span>
        </div>

        <div className={`task-status-pill ${statusMeta.class}`} ref={statusPillRef}>
          <span className="status-pill-icon">{statusMeta.icon}</span>
          <span className="status-pill-label">{statusMeta.label}</span>
        </div>
      </div>

      <div className="task-card-body">
        {(task.target_app || task.params?.app_name || task.parameters?.app_name) && (
          <div className="task-meta-row">
            <span className="meta-label">TARGET:</span>
            <span className="meta-value font-mono highlight-cyan">
              {task.target_app || task.params?.app_name || task.parameters?.app_name}
            </span>
          </div>
        )}

        {task.created_at && (
          <div className="task-meta-row">
            <span className="meta-label">TIMESTAMP:</span>
            <span className="meta-value font-mono">{formatTimestamp(task.created_at)}</span>
          </div>
        )}

        {/* Structured Results Display */}
        {task.result && (
          <div className="task-result-box">
            <div className="result-box-header">VERIFIED EXECUTION RESULT</div>
            <div className="result-box-content font-mono">
              {task.result.message && (
                <div>• Status: <span>{task.result.message}</span></div>
              )}
              {task.result.pid && (
                <div>• Process ID: <span className="highlight-cyan">{task.result.pid}</span></div>
              )}
              {task.result.binary_path && (
                <div>• Binary: <span>{task.result.binary_path}</span></div>
              )}
              {task.result.characters_typed && (
                <div>• Characters Injected: <span className="highlight-emerald">{task.result.characters_typed}</span></div>
              )}
              {task.result.file_path && (
                <div>• File Stored: <span className="text-muted">{task.result.file_path}</span></div>
              )}
              {task.result.title && (
                <div>• Window: <span>{task.result.title}</span></div>
              )}
              {task.result.details && (
                <div>• Info: <span>{task.result.details}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {task.error && (
          <div className="task-error-box">
            <span className="error-icon">✕</span>
            <span className="error-message">{task.error}</span>
          </div>
        )}
      </div>

      {/* Interactive Controls */}
      {(canCancel || isAwaiting) && (
        <div className="task-card-footer">
          {isAwaiting && onConfirmRequest && (
            <button
              type="button"
              className="btn-task-review"
              onClick={() => onConfirmRequest(task)}
            >
              Review Authorization
            </button>
          )}

          {canCancel && onCancel && (
            <button
              type="button"
              className="btn-task-cancel"
              onClick={() => onCancel(task.id || task.task_id)}
            >
              Cancel Directive
            </button>
          )}
        </div>
      )}
    </div>
  );
}
