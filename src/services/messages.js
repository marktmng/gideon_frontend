import { request } from './api';

export async function listMessages(conversationId, page = 1, limit = 100) {
  return request(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
}

export async function submitMessage(conversationId, content) {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
