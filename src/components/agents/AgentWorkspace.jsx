import React, { useState, useEffect, useCallback, useRef } from 'react';
import AgentDirectory from './AgentDirectory';
import TaskPlanView from './TaskPlanView';
import ApprovalModal from './ApprovalModal';
import CreateAgentTaskModal from './CreateAgentTaskModal';
import DailySummaryView from './DailySummaryView';
import LoadingSpinner from '../common/LoadingSpinner';
import * as agentsApi from '../../services/agents';
import './AgentWorkspace.css';

export default function AgentWorkspace({ onTaskRunningChange }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'directory' | 'tools' | 'summaries'
  const [agents, setAgents] = useState([]);
  const [tools, setTools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Daily Summaries state
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [summaryConfig, setSummaryConfig] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialAgentForCreate, setInitialAgentForCreate] = useState(null);
  const [reviewingApproval, setReviewingApproval] = useState(null);

  const unsubscribeRef = useRef(null);

  // Fetch agents and tools
  const loadDirectory = useCallback(async () => {
    try {
      const [agentsRes, toolsRes] = await Promise.all([
        agentsApi.listAgents(),
        agentsApi.listTools(),
      ]);
      setAgents(agentsRes.items || []);
      setTools(toolsRes.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load agent directory.');
    }
  }, []);

  // Fetch tasks
  const loadTasks = useCallback(async () => {
    try {
      const res = await agentsApi.listAgentTasks(statusFilter, 1, 50);
      const items = res.items || [];
      setTasks(items);
      // Auto-select first task if none selected or not in list
      if (items.length > 0 && (!selectedTaskId || !items.some((t) => t.id === selectedTaskId))) {
        setSelectedTaskId(items[0].id);
      }
    } catch (err) {
      console.warn('Error loading agent tasks:', err);
    }
  }, [statusFilter, selectedTaskId]);

  // Fetch daily summaries
  const loadSummaries = useCallback(async () => {
    try {
      const [sumsRes, cfgRes] = await Promise.all([
        agentsApi.listDailySummaries(30),
        agentsApi.getSummaryConfig(),
      ]);
      const items = sumsRes.items || [];
      setSummaries(items);
      setSummaryConfig(cfgRes);
      if (items.length > 0 && !selectedSummary) {
        setSelectedSummary(items[0]);
      }
    } catch (err) {
      console.warn('Error loading daily summaries:', err);
    }
  }, [selectedSummary]);

  // Load detailed task record
  const loadTaskDetail = useCallback(async (taskId) => {
    if (!taskId) {
      setActiveTaskDetail(null);
      return;
    }
    try {
      const detail = await agentsApi.getAgentTask(taskId);
      setActiveTaskDetail(detail);

      // Check for pending approval
      const pending = detail.approvals?.find((a) => a.decision === 'pending');
      if (pending && detail.status === 'awaiting_approval') {
        setReviewingApproval(pending);
      }
    } catch (err) {
      console.warn('Error loading task detail:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([loadDirectory(), loadTasks(), loadSummaries()]).finally(() => setLoading(false));
  }, [loadDirectory, loadTasks, loadSummaries]);

  // Reload detail when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId);
    }
  }, [selectedTaskId, loadTaskDetail]);

  // Check if any task is actively running or coordinating
  useEffect(() => {
    const hasRunning = tasks.some((t) => ['planning', 'running', 'awaiting_approval'].includes(t.status));
    if (onTaskRunningChange) {
      onTaskRunningChange(hasRunning);
    }
  }, [tasks, onTaskRunningChange]);

  const activeTaskStatus = activeTaskDetail?.status;

  // SSE subscription for active task
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (selectedTaskId && ['queued', 'planning', 'running', 'awaiting_approval'].includes(activeTaskStatus)) {
      unsubscribeRef.current = agentsApi.subscribeTaskEvents(
        selectedTaskId,
        (eventType, data) => {
          loadTaskDetail(selectedTaskId);
          loadTasks();
        },
        (err) => {
          console.warn('SSE stream error for task:', err);
        }
      );
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedTaskId, activeTaskStatus, loadTaskDetail, loadTasks]);

  // Polling fallback every 3s for running tasks
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = tasks.some((t) => ['queued', 'planning', 'running', 'awaiting_approval'].includes(t.status));
      if (hasActive) {
        loadTasks();
        if (selectedTaskId) loadTaskDetail(selectedTaskId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [tasks, selectedTaskId, loadTasks, loadTaskDetail]);

  // Task Actions
  const handleCreateTask = async (taskData) => {
    const created = await agentsApi.createAgentTask(taskData);
    setTasks((prev) => [created, ...prev]);
    setSelectedTaskId(created.id);
    setActiveTab('tasks');
  };

  const handleCancelTask = async (taskId) => {
    await agentsApi.cancelAgentTask(taskId);
    loadTasks();
    if (selectedTaskId === taskId) {
      loadTaskDetail(taskId);
    }
  };

  const handleApprove = async (taskId, approvalId, reason) => {
    await agentsApi.decideApproval(taskId, approvalId, 'approved', reason);
    setReviewingApproval(null);
    loadTasks();
    loadTaskDetail(taskId);
  };

  const handleReject = async (taskId, approvalId, reason) => {
    await agentsApi.decideApproval(taskId, approvalId, 'rejected', reason);
    setReviewingApproval(null);
    loadTasks();
    loadTaskDetail(taskId);
  };

  const handleLaunchFromDirectory = (agentId) => {
    setInitialAgentForCreate(agentId);
    setIsCreateModalOpen(true);
  };

  // Daily Summary Actions
  const handleGenerateSummary = async (options = {}) => {
    try {
      setIsGeneratingSummary(true);
      const generated = await agentsApi.generateDailySummary(options);
      setSummaries((prev) => {
        const filtered = prev.filter((s) => s.id !== generated.id && s.summary_date !== generated.summary_date);
        return [generated, ...filtered];
      });
      setSelectedSummary(generated);
    } catch (err) {
      setError(err.message || 'Failed to generate daily business summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="agent-workspace">
      {/* Top Bar Navigation */}
      <div className="agent-top-bar">
        <div className="agent-top-left">
          <div className="agent-workspace-title">
            <span>AI AGENTS & ORCHESTRATION</span>
            <span className="workspace-badge">PHASE 5 ENGINE</span>
          </div>

          <div className="agent-nav-tabs">
            <button
              className={`agent-nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Directives ({tasks.length})
            </button>
            <button
              className={`agent-nav-tab ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => setActiveTab('directory')}
            >
              Agent Roster ({agents.length})
            </button>
            <button
              className={`agent-nav-tab ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              Tool Registry ({tools.length})
            </button>
            <button
              className={`agent-nav-tab ${activeTab === 'summaries' ? 'active' : ''}`}
              onClick={() => setActiveTab('summaries')}
            >
              Daily Summaries ({summaries.length})
            </button>
          </div>
        </div>

        <button
          className="btn-new-directive"
          onClick={() => {
            setInitialAgentForCreate(null);
            setIsCreateModalOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Deploy Directive
        </button>
      </div>

      {error && <div className="form-error-banner" style={{ margin: '0.5rem 1.5rem' }}>{error}</div>}

      {/* Main Content Area */}
      <div className="agent-workspace-body">
        {loading ? (
          <div className="workspace-loading-fallback">
            <LoadingSpinner text="Synchronizing Agent Engine..." />
          </div>
        ) : (
          <>
            {/* TAB 1: Tasks / Directives Master-Detail */}
            {activeTab === 'tasks' && (
              <div className="tasks-split-layout">
                <div className="tasks-sidebar-list">
                  <div className="filter-bar">
                    {['all', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled'].map((f) => (
                      <button
                        key={f}
                        className={`filter-pill ${statusFilter === f ? 'active' : ''}`}
                        onClick={() => setStatusFilter(f)}
                      >
                        {f.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="tasks-scroll-container">
                    {tasks.length === 0 ? (
                      <div className="empty-state-notice">
                        <p>No agent tasks found for filter '{statusFilter}'.</p>
                      </div>
                    ) : (
                      tasks.map((t) => (
                        <div
                          key={t.id}
                          className={`task-list-card ${selectedTaskId === t.id ? 'active' : ''}`}
                          onClick={() => setSelectedTaskId(t.id)}
                        >
                          <div className="task-card-row">
                            <span className="task-card-title">{t.title}</span>
                            <span className={`status-pill status-${t.status}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="task-card-req">{t.user_request}</p>
                          <div className="task-card-meta">
                            <span>{t.steps?.length || 0} Steps</span>
                            <span>{t.progress_percent}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="tasks-detail-container">
                  <TaskPlanView
                    task={activeTaskDetail}
                    onCancel={handleCancelTask}
                    onRequestApprovalReview={(approval) => setReviewingApproval(approval)}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Agent Directory */}
            {activeTab === 'directory' && (
              <AgentDirectory
                agents={agents}
                onSelectAgent={handleLaunchFromDirectory}
              />
            )}

            {/* TAB 3: Tool Registry */}
            {activeTab === 'tools' && (
              <div className="agent-directory">
                <div className="agent-directory-header">
                  <h3 className="section-title">Verified Agent Tools & Security Policies</h3>
                  <span className="agent-count-badge">{tools.length} Approved</span>
                </div>
                <div className="agent-cards-grid">
                  {tools.map((t) => (
                    <div key={t.tool_id} className="agent-card">
                      <div className="agent-card-header">
                        <div className="agent-icon-wrapper">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                          </svg>
                        </div>
                        <div className="agent-title-group">
                          <h4 className="agent-name">{t.name}</h4>
                          <span className={`agent-status-pill status-${t.permission_level === 'consequential' ? 'disabled' : 'ready'}`}>
                            {t.permission_level.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="agent-desc">{t.description}</p>
                      <div className="agent-meta-block">
                        <div className="meta-row">
                          <span className="meta-label">Approval Policy:</span>
                          <span className="meta-val">{t.requires_approval ? 'Explicit Approval Mandated' : 'Autonomous Within Policy'}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Timeout:</span>
                          <span className="meta-val">{t.timeout_seconds} seconds</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Daily Business Summaries */}
            {activeTab === 'summaries' && (
              <DailySummaryView
                summaries={summaries}
                selectedSummary={selectedSummary}
                onSelectSummary={(sum) => setSelectedSummary(sum)}
                onGenerateSummary={handleGenerateSummary}
                config={summaryConfig}
                isGenerating={isGeneratingSummary}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateAgentTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        agents={agents}
        initialAgentId={initialAgentForCreate}
      />

      {reviewingApproval && (
        <ApprovalModal
          approval={reviewingApproval}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReviewingApproval(null)}
        />
      )}
    </div>
  );
}
