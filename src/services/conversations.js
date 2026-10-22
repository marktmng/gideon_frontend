import { request } from './api';

export async function listConversations(page = 1, limit = 50) {
  return request(`/conversations?page=${page}&limit=${limit}`);
}

export async function createConversation(title = null) {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function getConversation(conversationId) {
  return request(`/conversations/${conversationId}`);
}

export async function updateConversation(conversationId, title) {
  return request(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(conversationId) {
  return request(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}
