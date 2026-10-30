import { request } from './api';

export async function getAssistantStatus() {
  return request('/assistant/status');
}

export async function getHealth() {
  return request('/health');
}

export async function switchAIProvider(provider, model = null, ollamaBaseUrl = null, validateConnection = true, apiKey = null) {
  return request('/assistant/provider', {
    method: 'POST',
    body: JSON.stringify({
      provider,
      model,
      ollama_base_url: ollamaBaseUrl,
      validate_connection: validateConnection,
      api_key: apiKey,
    }),
  });
}

export async function getOllamaStatus(baseUrl = null, model = null) {
  const query = new URLSearchParams();
  if (baseUrl) query.set('base_url', baseUrl);
  if (model) query.set('model', model);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/assistant/ollama/status${qStr}`);
}

export async function getLocalWindows() {
  return request('/local-context/windows');
}

export async function getActiveWindow() {
  return request('/local-context/active-window');
}

export async function getLocalTasksSummary() {
  return request('/local-context/tasks');
}

export async function getDirectorySummary(path = null) {
  const q = path ? `?path=${encodeURIComponent(path)}` : '';
  return request(`/local-context/directory${q}`);
}

export async function getLocalMonitoringStatus() {
  return request('/local-context/monitoring');
}

export async function toggleLocalMonitoring(enabled = null) {
  return request('/local-context/monitoring/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export async function captureScreenOcr(reason = 'ui_request') {
  return request('/local-context/ocr', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
