import { request } from './api';

export async function listMemories(page = 1, limit = 50, category = null, search = null) {
  const params = new URLSearchParams({ page, limit });
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  return request(`/memories?${params.toString()}`);
}

export async function getMemory(memoryId) {
  return request(`/memories/${memoryId}`);
}

export async function createMemory(data) {
  return request('/memories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMemory(memoryId, data) {
  return request(`/memories/${memoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMemory(memoryId) {
  return request(`/memories/${memoryId}`, {
    method: 'DELETE',
  });
}
