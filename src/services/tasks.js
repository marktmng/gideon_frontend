import { request } from './api';

export async function listTasks(status = null, page = 1, limit = 50) {
  const query = new URLSearchParams();
  if (status) query.append('status', status);
  query.append('page', page);
  query.append('limit', limit);

  return request(`/tasks?${query.toString()}`);
}

export async function createTask({ title, description, priority = 'medium' }) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, priority }),
  });
}

export async function getTask(taskId) {
  return request(`/tasks/${taskId}`);
}

export async function updateTask(taskId, data) {
  return request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}
