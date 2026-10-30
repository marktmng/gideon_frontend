import { render, screen, act, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/health')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy', database: 'connected', environment: 'development' }),
      });
    }
    if (url.includes('/assistant/status')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          name: 'Gideon',
          version: '2.0.0 (Phase 2)',
          provider: 'demo',
          is_demo: true,
          status: 'demo_mode',
          has_provider_credentials: false,
          streaming_supported: true,
          memory_enabled: true,
          database_connected: true,
          provider_initialized: true,
          capabilities: [
            'conversations_persistent',
            'message_history',
            'context_aware_generation',
            'streaming_responses',
            'persistent_memory_retrieval',
          ],
          unconfigured_features: ['real_time_voice_synthesis'],
        }),
      });
    }
    if (url.includes('/memories')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              key: 'user_response_format',
              content: 'User prefers concise, bulleted responses.',
              category: 'preference',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        }),
      });
    }
    if (url.includes('/conversations') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          id: '22222222-2222-2222-2222-222222222222',
          title: 'New Session',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders Gideon brand title and welcome state', async () => {
  await act(async () => {
    render(<App />);
  });

  const gideonElements = screen.getAllByText(/Gideon/i);
  expect(gideonElements.length).toBeGreaterThan(0);

  const commandCore = screen.getByText(/AI Command Core/i);
  expect(commandCore).toBeInTheDocument();

  const demoBadges = screen.getAllByText(/DEMO MODE/i);
  expect(demoBadges.length).toBeGreaterThan(0);
});

test('renders view navigation controls including Memory Archives', async () => {
  await act(async () => {
    render(<App />);
  });

  expect(screen.getByRole('button', { name: /Conversations/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Directives & Tasks/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Memory Archives/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Diagnostics/i })).toBeInTheDocument();
});

test('navigates to Memory Archives and renders saved memory item', async () => {
  await act(async () => {
    render(<App />);
  });

  const memoryNavBtn = screen.getByRole('button', { name: /Memory Archives/i });
  await act(async () => {
    fireEvent.click(memoryNavBtn);
  });

  expect(screen.getByRole('heading', { level: 2, name: /Neural Memory Archives/i })).toBeInTheDocument();
  expect(screen.getByText(/user_response_format/i)).toBeInTheDocument();
  expect(screen.getByText(/User prefers concise, bulleted responses\./i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /New Memory Directive/i })).toBeInTheDocument();
});

test('navigates to Diagnostics and renders Phase 2 provider status', async () => {
  await act(async () => {
    render(<App />);
  });

  const diagnosticsNavBtn = screen.getByRole('button', { name: /Diagnostics/i });
  await act(async () => {
    fireEvent.click(diagnosticsNavBtn);
  });

  expect(screen.getByText(/System Diagnostics & Settings/i)).toBeInTheDocument();
  expect(screen.getByText(/AI Provider Pipeline/i)).toBeInTheDocument();
  expect(screen.getByText(/Active Phase 1 & 2 Capabilities/i)).toBeInTheDocument();
});

test('distinguishes between Demo Mode and Real AI Mode badge', async () => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/assistant/status')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          provider: 'gemini',
          is_demo: false,
          model: 'gemini-2.5-flash',
          status: 'configured',
          has_provider_credentials: true,
          streaming_supported: true,
          capabilities: [],
          unconfigured_features: [],
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });
  });

  await act(async () => {
    render(<App />);
  });

  const geminiBadges = screen.getAllByText(/GEMINI ONLINE/i);
  expect(geminiBadges.length).toBeGreaterThan(0);
});
