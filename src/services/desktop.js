/**
 * Windows Desktop Automation and Task Lifecycle API Service for Gideon Phase 4.
 */
import { request } from './api';

export async function listSupportedActions() {
  return request('/desktop/actions', { method: 'GET' });
}

export async function getActiveWindow() {
  return request('/desktop/active-window', { method: 'GET' });
}

export async function createDesktopTask(action, params = {}, requiresConfirmation = null) {
  return request('/desktop/tasks', {
    method: 'POST',
    body: JSON.stringify({
      action,
      params,
      requires_confirmation: requiresConfirmation,
    }),
  });
}

export async function listDesktopTasks(limit = 50) {
  return request(`/desktop/tasks?limit=${limit}`, { method: 'GET' });
}

export async function getDesktopTask(taskId) {
  return request(`/desktop/tasks/${taskId}`, { method: 'GET' });
}

export async function confirmDesktopTask(taskId, confirmed, reason = null, action = null, target = null) {
  return request(`/desktop/tasks/${taskId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({
      confirmed,
      reason,
      action: action || undefined,
      target: target || undefined,
    }),
  });
}

export async function cancelDesktopTask(taskId) {
  return request(`/desktop/tasks/${taskId}/cancel`, {
    method: 'POST',
  });
}

export async function stopAllDesktopTasks() {
  return request('/desktop/stop', {
    method: 'POST',
  });
}

export async function captureScreenshot(localOnly = true, target = null) {
  return request('/desktop/screenshot', {
    method: 'POST',
    body: JSON.stringify({ local_only: localOnly, target }),
  });
}
