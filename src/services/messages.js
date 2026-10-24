import { request, BASE_URL } from './api';

export async function listMessages(conversationId, page = 1, limit = 100) {
  return request(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
}

export async function submitMessage(conversationId, content) {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/**
 * Stream an assistant response using Server-Sent Events (SSE) over HTTP POST.
 * Correctly parses multi-event and split chunks, handles Unicode, and supports AbortSignal cancellation.
 */
export async function streamMessage(conversationId, content, {
  onStart,
  onDelta,
  onComplete,
  onError,
  signal,
} = {}) {
  const url = `${BASE_URL}/conversations/${conversationId}/messages/stream`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) {
      return;
    }
    const netErr = new Error(err.message || 'Cannot reach Gideon backend server.');
    netErr.isNetworkError = true;
    if (onError) onError(netErr);
    else throw netErr;
    return;
  }

  // Handle HTTP errors before streaming begins (e.g. 404 conversation not found, 400 invalid content, 503 unconfigured)
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && (errJson.detail || errJson.message)) {
        errorDetail = errJson.detail || errJson.message;
      }
    } catch {
      // response was not JSON
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    if (onError) onError(error);
    else throw error;
    return;
  }

  if (!response.body) {
    const error = new Error('ReadableStream not supported by this browser environment.');
    if (onError) onError(error);
    else throw error;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // ignore reader cancel errors
        }
        break;
      }

      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split SSE event blocks on double newline (handles both CRLF and LF)
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let eventType = 'message';
        let dataStr = '';

        const lines = trimmed.split(/\r?\n/);
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        if (!dataStr) continue;

        let payload = null;
        try {
          payload = JSON.parse(dataStr);
        } catch {
          payload = { raw: dataStr };
        }

        if (eventType === 'start') {
          if (onStart) onStart(payload);
        } else if (eventType === 'delta') {
          if (onDelta) onDelta(payload.delta || '');
        } else if (eventType === 'complete') {
          if (onComplete) onComplete(payload.assistant_message);
        } else if (eventType === 'error') {
          const err = new Error(payload.detail || 'Streaming generation error occurred.');
          err.errorType = payload.error_type;
          if (onError) onError(err);
        }
      }
    }
  } catch (streamErr) {
    if (signal?.aborted) {
      return;
    }
    if (onError) onError(streamErr);
    else throw streamErr;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}
