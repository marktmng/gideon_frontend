import React, { useState } from 'react';

export default function ApprovalModal({
  approval,
  onApprove,
  onReject,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!approval) return null;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(approval.task_id, approval.id, reason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await onReject(approval.task_id, approval.id, reason || 'Rejected by user');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container approval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-badge-row">
            <span className="warning-pill">SECURITY POLICY: APPROVAL REQUIRED</span>
          </div>
          <h3 className="modal-title">Authorize Consequential Action</h3>
          <p className="modal-subtitle">Gideon paused this task pending explicit user verification.</p>
        </div>

        <div className="modal-body">
          <div className="approval-card">
            <div className="field-row">
              <span className="field-label">Action Proposed:</span>
              <span className="field-val highlight">{approval.action_type}</span>
            </div>
            <div className="field-row">
              <span className="field-label">Requesting Agent:</span>
              <span className="field-val">{approval.agent_id}</span>
            </div>
            <div className="field-row">
              <span className="field-label">Target Resource:</span>
              <span className="field-val code-font">{approval.target_resource || 'System / Network'}</span>
            </div>
            <div className="field-row">
              <span className="field-label">Consequence:</span>
              <span className="field-val">{approval.consequences_summary}</span>
            </div>

            {approval.parameters && Object.keys(approval.parameters).length > 0 && (
              <div className="field-block">
                <span className="field-label">Material Parameters:</span>
                <pre className="param-preview">{JSON.stringify(approval.parameters, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="reason-input-group">
            <label htmlFor="approval-reason-input" className="input-label">
              Decision Notes or Reason (Optional):
            </label>
            <input
              id="approval-reason-input"
              type="text"
              className="text-input"
              placeholder="e.g. Approved for internal team review"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-reject"
            onClick={handleReject}
            disabled={submitting}
          >
            Reject Directive
          </button>
          <button
            type="button"
            className="btn-approve"
            onClick={handleApprove}
            disabled={submitting}
          >
            Authorize & Execute
          </button>
        </div>
      </div>
    </div>
  );
}

