import React, { useState } from 'react';

export default function CreateAgentTaskModal({
  isOpen,
  onClose,
  onSubmit,
  agents = [],
  initialAgentId = null,
}) {
  const [title, setTitle] = useState('');
  const [userRequest, setUserRequest] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(initialAgentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userRequest.trim()) {
      setError('Please provide a directive or task description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim() || undefined,
        user_request: userRequest.trim(),
        assigned_agent_id: selectedAgent || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to initialize agent task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container create-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Deploy Agent Directive</h3>
          <p className="modal-subtitle">Gideon will formulate a validated execution plan and coordinate specialized agents.</p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="directive-title" className="input-label">Task Title (Optional):</label>
            <input
              id="directive-title"
              type="text"
              className="text-input"
              placeholder="e.g. Research quantum breakthroughs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="agent-selector" className="input-label">Assigned Agent (Optional):</label>
            <select
              id="agent-selector"
              className="select-input"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Auto-Orchestrate (Gideon selects best agent)</option>
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.display_name} — {a.responsibility}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="directive-request" className="input-label">Directive Instructions (Required):</label>
            <textarea
              id="directive-request"
              className="textarea-input"
              rows={4}
              placeholder="Describe the objective in detail. For example: 'Inspect our python repository files, analyze current models, and propose an implementation plan.'"
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting || !userRequest.trim()}
            >
              {isSubmitting ? 'Planning Directive...' : 'Initiate Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

