import React from 'react';

export default function TaskItem({ task, onUpdateStatus, onDelete }) {
  const isCompleted = task.status === 'completed';

  const handleCheckboxToggle = () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    onUpdateStatus(task.id, newStatus);
  };

  const handleStatusChange = (e) => {
    onUpdateStatus(task.id, e.target.value);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`task-card ${isCompleted ? 'completed' : ''}`}>
      <div className="task-card-left">
        <label className="task-checkbox-label">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={handleCheckboxToggle}
            aria-label={`Mark task '${task.title}' as completed`}
          />
          <span className="task-custom-checkbox"></span>
        </label>
      </div>

      <div className="task-card-content">
        <div className="task-card-header">
          <h4 className={`task-title ${isCompleted ? 'line-through' : ''}`}>{task.title}</h4>
          <span className={`priority-tag priority-${task.priority}`}>
            {task.priority.toUpperCase()}
          </span>
        </div>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        <div className="task-card-meta">
          <span className="task-date">Created {formatDate(task.created_at)}</span>
          {task.completed_at && (
            <span className="task-completed-date">Completed {formatDate(task.completed_at)}</span>
          )}
        </div>
      </div>

      <div className="task-card-actions">
        <select
          className="task-status-select"
          value={task.status}
          onChange={handleStatusChange}
          aria-label="Change task status"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          className="task-delete-btn"
          onClick={() => onDelete(task.id)}
          title="Delete task"
          aria-label={`Delete task '${task.title}'`}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
