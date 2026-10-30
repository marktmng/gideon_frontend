/**
 * Agent Orchestration and Automation API client service for Gideon Phase 5
 */
import { request } from './api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * List all registered specialized agents
 */
export async function listAgents() {
  return request('/agents');
}

/**
 * List all registered tools and their schemas
 */
export async function listTools() {
  return request('/agents/tools');
}

/**
 * Create and initiate an orchestrated task
 */
export async function createAgentTask(taskData) {
  return request('/agents/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

/**
 * List orchestrated tasks with optional status filter and pagination
 */
export async function listAgentTasks(status = null, page = 1, limit = 50) {
  let endpoint = `/agents/tasks?page=${page}&limit=${limit}`;
  if (status && status !== 'all') {
    endpoint += `&status=${encodeURIComponent(status)}`;
  }
  return request(endpoint);
}

/**
 * Retrieve complete task details, steps, approvals, and logs
 */
export async function getAgentTask(taskId) {
  return request(`/agents/tasks/${taskId}`);
}

/**
 * Retrieve live task execution progress
 */
export async function getAgentTaskProgress(taskId) {
  return request(`/agents/tasks/${taskId}/progress`);
}

/**
 * Cancel an active task
 */
export async function cancelAgentTask(taskId) {
  return request(`/agents/tasks/${taskId}/cancel`, {
    method: 'POST',
  });
}

/**
 * Submit approval or rejection for a consequential action
 */
export async function decideApproval(taskId, approvalId, decision, reason = null, boundAction = null, boundTarget = null) {
  return request(`/agents/tasks/${taskId}/approvals/${approvalId}`, {
    method: 'POST',
    body: JSON.stringify({
      decision,
      reason,
      bound_action: boundAction,
      bound_target: boundTarget,
    }),
  });
}

/**
 * Shortcut: Approve active pending action
 */
export async function approveTaskAction(taskId, reason = null) {
  return request(`/agents/tasks/${taskId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'approved',
      reason,
    }),
  });
}

/**
 * Shortcut: Reject active pending action
 */
export async function rejectTaskAction(taskId, reason = 'Rejected by user') {
  return request(`/agents/tasks/${taskId}/reject`, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'rejected',
      reason,
    }),
  });
}

/**
 * Subscribe to real-time Server-Sent Events (SSE) for task execution progress
 */
export function subscribeTaskEvents(taskId, onEvent, onError) {
  const url = `${BASE_URL}/agents/tasks/${taskId}/events`;
  try {
    const eventSource = new EventSource(url);

    const eventTypes = [
      'agent.task.started',
      'agent.task.planning',
      'agent.step.started',
      'agent.step.completed',
      'agent.step.failed',
      'agent.approval.required',
      'agent.approval.granted',
      'agent.approval.rejected',
      'agent.task.progress',
      'agent.task.completed',
      'agent.task.failed',
      'agent.task.cancelled',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (onEvent) onEvent(type, parsed);
        } catch {
          if (onEvent) onEvent(type, e.data);
        }
      });
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Daily Business Summary API client methods
 */
export async function generateDailySummary(data = {}) {
  return request('/agents/summaries/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listDailySummaries(limit = 30) {
  return request(`/agents/summaries?limit=${limit}`);
}

export async function getDailySummaryByDate(dateStr) {
  return request(`/agents/summaries/date/${encodeURIComponent(dateStr)}`);
}

export async function getSummaryConfig() {
  return request('/agents/summaries/config');
}
