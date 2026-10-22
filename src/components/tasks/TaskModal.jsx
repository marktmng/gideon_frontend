import React, { useState } from 'react';

export default function TaskModal({ isOpen, onClose, onSubmit, isSubmitting = false }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
    });

    setTitle('');
    setDescription('');
    setPriority('medium');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Direct Directive / Task</h3>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="task-title">Task Title *</label>
            <input
              id="task-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Recalibrate Waverider Temporal Drive"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="task-desc">Description (Optional)</label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional mission parameters or details..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Recording...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
