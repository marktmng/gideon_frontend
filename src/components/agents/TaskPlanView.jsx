import React, { useState } from 'react';

export default function TaskPlanView({
  task,
  onCancel,
  onRequestApprovalReview,
}) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (!task) {
    return (
      <div className="task-plan-empty">
        <p>Select a task or deploy a directive from the Agent Directory to monitor execution.</p>
      </div>
    );
  }

  const steps = task.steps || [];
  const approvals = task.approvals || [];
  const pendingApproval = approvals.find((a) => a.decision === 'pending');

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'active';
      case 'awaiting_approval': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'neutral';
      case 'skipped': return 'neutral';
      default: return 'pending';
    }
  };

  return (
    <div className="task-plan-view">
      <div className="task-plan-header">
        <div className="header-info">
          <div className="title-row">
            <h3 className="task-title">{task.title}</h3>
            <span className={`status-badge status-${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="task-req"><strong>Directive:</strong> {task.user_request}</p>
        </div>

        <div className="header-actions">
          {task.status === 'awaiting_approval' && pendingApproval && (
            <button
              className="btn-review-approval animate-pulse"
              onClick={() => onRequestApprovalReview(pendingApproval)}
            >
              Authorization Required
            </button>
          )}

          {['queued', 'planning', 'running', 'awaiting_approval'].includes(task.status) && (
            <button
              className="btn-cancel-task"
              onClick={() => onCancel(task.id)}
            >
              Abort Directive
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="task-progress-section">
        <div className="progress-labels">
          <span>Execution Progress</span>
          <span>{task.progress_percent}%</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${task.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Pending Approval Notice if awaiting */}
      {task.status === 'awaiting_approval' && pendingApproval && (
        <div className="pending-approval-banner">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <h4>Consequential Action Awaiting Approval</h4>
            <p><strong>Action:</strong> {pendingApproval.action_type}</p>
            <p><strong>Proposed by:</strong> {pendingApproval.agent_id}</p>
            <p>{pendingApproval.consequences_summary}</p>
          </div>
          <button
            className="btn-resolve-approval"
            onClick={() => onRequestApprovalReview(pendingApproval)}
          >
            Review & Authorize
          </button>
        </div>
      )}

      {/* Result summary if completed or failed */}
      {task.result_summary && (
        <div className="task-result-box">
          <h4>Consolidated Execution Summary</h4>
          <pre className="summary-pre">{task.result_summary}</pre>
        </div>
      )}

      {task.error_message && (
        <div className="task-error-box">
          <h4>Execution Error</h4>
          <p>{task.error_message}</p>
        </div>
      )}

      {/* Plan Steps Pipeline */}
      <div className="steps-pipeline">
        <h4 className="pipeline-title">Plan Sequence ({steps.length} Steps)</h4>
        <div className="steps-list">
          {steps.map((step, idx) => {
            const isExpanded = expandedStep === step.id;
            const statusClass = getStatusColor(step.status);

            return (
              <div key={step.id} className={`step-card step-${statusClass}`}>
                <div
                  className="step-card-header"
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                >
                  <div className="step-idx">{idx + 1}</div>
                  <div className="step-main">
                    <span className="step-desc">{step.description}</span>
                    <div className="step-tags">
                      <span className="agent-badge">{step.assigned_agent_id.replace('agent_', '')}</span>
                      {step.tool_id && (
                        <span className="tool-badge">{step.tool_id.replace('tool_', '')}</span>
                      )}
                      {step.requires_approval && (
                        <span className="approval-badge">Approval Required</span>
                      )}
                    </div>
                  </div>
                  <div className="step-status-col">
                    <span className={`status-pill status-${statusClass}`}>
                      {step.status.replace('_', ' ')}
                    </span>
                    <button className="btn-toggle-details">
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="step-details-panel">
                    {step.dependencies && step.dependencies.length > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">Prerequisites:</span>
                        <span className="detail-val">{step.dependencies.join(', ')}</span>
                      </div>
                    )}
                    {step.retry_count > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">Retries:</span>
                        <span className="detail-val">{step.retry_count} / {step.max_retries}</span>
                      </div>
                    )}
                    {step.error_message && (
                      <div className="detail-item error-item">
                        <span className="detail-label">Error:</span>
                        <span className="detail-val">{step.error_message}</span>
                      </div>
                    )}
                    {step.input_data && Object.keys(step.input_data).length > 0 && (
                      <div className="detail-code-block">
                        <span className="detail-label">Inputs:</span>
                        <pre>{JSON.stringify(step.input_data, null, 2)}</pre>
                      </div>
                    )}
                    {step.output_data && (
                      <div className="detail-code-block">
                        <span className="detail-label">Output Data:</span>
                        <pre>{JSON.stringify(step.output_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

