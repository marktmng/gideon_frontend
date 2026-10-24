import React from 'react';

export default function MemoryItem({ memory, onEdit, onDelete }) {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="task-card memory-card">
      <div className="task-card-content">
        <div className="task-card-header">
          <h4 className="task-title memory-key font-mono">{memory.key}</h4>
          <span className="priority-tag memory-category-tag">
            {memory.category.toUpperCase()}
          </span>
        </div>

        <p className="task-description memory-content">{memory.content}</p>

        <div className="task-card-meta">
          <span className="task-date">Saved {formatDate(memory.created_at)}</span>
          {memory.updated_at && memory.updated_at !== memory.created_at && (
            <span className="task-completed-date">Updated {formatDate(memory.updated_at)}</span>
          )}
        </div>
      </div>

      <div className="task-card-actions memory-card-actions">
        <button
          className="btn-secondary memory-action-btn"
          onClick={() => onEdit(memory)}
          title="Edit memory"
          aria-label={`Edit memory '${memory.key}'`}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit</span>
        </button>

        <button
          className="task-delete-btn"
          onClick={() => onDelete(memory.id, memory.key)}
          title="Delete memory"
          aria-label={`Delete memory '${memory.key}'`}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
