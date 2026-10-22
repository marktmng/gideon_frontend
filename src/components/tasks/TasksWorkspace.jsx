import React, { useState } from 'react';
import TaskItem from './TaskItem';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export default function TasksWorkspace({
  tasks,
  loading,
  error,
  onCreateTask,
  onUpdateStatus,
  onDeleteTask,
  onRefresh,
}) {
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleCreateSubmit = async (taskData) => {
    try {
      setIsSubmitting(true);
      await onCreateTask(taskData);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tasks-workspace">
      <div className="tasks-header">
        <div>
          <h2 className="workspace-title">Directives & Missions</h2>
          <p className="workspace-subtitle">
            Manage your personal action items, background tasks, and active priorities.
          </p>
        </div>
        <button
          className="btn-primary-glow"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      </div>

      {/* Metrics Row */}
      <div className="tasks-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Directives</span>
          <span className="metric-value">{tasks.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pending</span>
          <span className="metric-value text-amber">{pendingCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">In Progress</span>
          <span className="metric-value text-blue">{inProgressCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Completed</span>
          <span className="metric-value text-emerald">{completedCount}</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="tasks-filter-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            type="button"
          >
            All ({tasks.length})
          </button>
          <button
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
            type="button"
          >
            Pending ({pendingCount})
          </button>
          <button
            className={`filter-tab ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
            type="button"
          >
            In Progress ({inProgressCount})
          </button>
          <button
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
            type="button"
          >
            Completed ({completedCount})
          </button>
        </div>

        <button
          className="btn-icon-subtle"
          onClick={onRefresh}
          title="Refresh task list"
          type="button"
          aria-label="Refresh tasks"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Tasks List */}
      <div className="tasks-content">
        {loading ? (
          <div className="tasks-loading">
            <LoadingSpinner text="Synchronizing directives..." />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={onRefresh} />
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty-state">
            <div className="empty-icon-shield">✓</div>
            <h3>No tasks found in this view</h3>
            <p>
              {filter === 'all'
                ? "You have no active directives. Add your first task to begin organizing your workflow."
                : `No directives currently marked as "${filter}".`}
            </p>
            {filter === 'all' && (
              <button
                className="btn-secondary"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                Create First Task
              </button>
            )}
          </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
