import { request } from './api';

export async function getAssistantStatus() {
  return request('/assistant/status');
}

export async function getHealth() {
  return request('/health');
}
