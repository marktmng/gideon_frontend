import { render, screen, act } from '@testing-library/react';
import App from './App';

// Mock fetch for tests
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/health')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy', database: 'connected' }),
      });
    }
    if (url.includes('/assistant/status')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ provider: 'demo', is_demo: true, capabilities: [] }),
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

  const welcomeHeading = screen.getByText(/Greetings\. I am Gideon\./i);
  expect(welcomeHeading).toBeInTheDocument();

  const demoBadges = screen.getAllByText(/DEMO MODE/i);
  expect(demoBadges.length).toBeGreaterThan(0);
});

test('renders view navigation controls', async () => {
  await act(async () => {
    render(<App />);
  });

  expect(screen.getByRole('button', { name: /Conversations/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Directives & Tasks/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Diagnostics/i })).toBeInTheDocument();
});
