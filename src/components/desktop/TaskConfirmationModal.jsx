/**
 * TaskConfirmationModal — 21st.dev inspired Tactical Confirmation Interface.
 * Used for medium-risk desktop operations (e.g. typing text, activating windows, clicking controls)
 * to prevent accidental execution and ensure verified user authorization.
 */
import React, { useEffect, useRef } from 'react';
import { animateConfirmationModal, cleanupAnimations } from '../../services/animationService';

export default function TaskConfirmationModal({
  task,
  isOpen,
  onConfirm,
  onReject,
  reducedMotion = false,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const el = modalRef.current;
    if (isOpen) {
      animateConfirmationModal(el, reducedMotion);
    }
    return () => {
      cleanupAnimations(el);
    };
  }, [isOpen, reducedMotion]);

  if (!isOpen || !task) return null;

  const actionLabels = {
    type_text: 'Text Input Injection',
    press_shortcut: 'Keyboard Shortcut Trigger',
    click_accessible_element: 'UI Element Click',
    activate_application: 'Application Window Activation',
    open_application: 'Application Launch',
  };

  const params = task.params || task.parameters || {};

  return (
    <div
      className="task-confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="task-confirm-card" ref={modalRef}>
        <div className="task-confirm-header">
          <div className="confirm-header-icon">⚠️</div>
          <div>
            <h3 id="confirm-modal-title" className="confirm-title">
              DIRECTIVE AUTHORIZATION REQUIRED
            </h3>
            <span className="confirm-subtitle">Medium-Risk Desktop Control Operation</span>
          </div>
        </div>

        <div className="confirm-body">
          <p className="confirm-prompt-text">
            Gideon requires your explicit approval to execute this desktop directive.
          </p>

          <div className="confirm-details-grid">
            <div className="confirm-detail-row">
              <span className="detail-label">ACTION PROTOCOL:</span>
              <span className="detail-value font-mono">
                {actionLabels[task.action] || task.action}
              </span>
            </div>

            <div className="confirm-detail-row">
              <span className="detail-label">TARGET WINDOW:</span>
              <span className="detail-value font-mono highlight-cyan">
                {task.target_app || params.target_window || params.target_window_title || 'Foreground Window'}
              </span>
            </div>

            {params.text && (
              <div className="confirm-detail-row full-width">
                <span className="detail-label">PAYLOAD TEXT:</span>
                <div className="detail-code-block font-mono">
                  {params.text}
                </div>
              </div>
            )}

            {params.shortcut && (
              <div className="confirm-detail-row">
                <span className="detail-label">KEY COMBINATION:</span>
                <span className="detail-value font-mono highlight-amber">
                  {params.shortcut}
                </span>
              </div>
            )}

            {params.element_name && (
              <div className="confirm-detail-row">
                <span className="detail-label">ELEMENT NAME:</span>
                <span className="detail-value font-mono">
                  {params.element_name}
                </span>
              </div>
            )}
          </div>

          <div className="confirm-security-notice">
            <span className="notice-icon">🛡️</span>
            <span className="notice-text">
              Notice: Verified execution will only inject keystrokes if the active foreground window strictly matches the verified target above.
            </span>
          </div>
        </div>

        <div className="confirm-footer">
          <button
            type="button"
            className="btn-confirm-reject"
            onClick={() => onReject(task.id, 'User rejected authorization')}
          >
            Abort Directive (Esc)
          </button>
          <button
            type="button"
            className="btn-confirm-approve"
            onClick={() => onConfirm(task.id, task.action, task.target_app || task.target || params.target_window_title)}
            autoFocus
          >
            Authorize & Execute ↵
          </button>
        </div>
      </div>
    </div>
  );
}
