import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DesktopTaskPanel from '../DesktopTaskPanel';
import TaskConfirmationModal from '../TaskConfirmationModal';
import CommandPalette from '../../common/CommandPalette';
import {
  getActiveWindow,
  createDesktopTask,
  cancelDesktopTask,
  confirmDesktopTask,
  stopAllDesktopTasks,
} from '../../../services/desktop';

// Mock anime.js in tests
jest.mock('animejs', () => {
  const anime = jest.fn(() => ({ pause: jest.fn() }));
  anime.remove = jest.fn();
  return {
    __esModule: true,
    default: anime,
  };
});

describe('DesktopTaskPanel Component', () => {
  test('returns null when task is null', () => {
    const { container } = render(<DesktopTaskPanel task={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders executing task with cancel button and target info', () => {
    const mockTask = {
      id: 'task-12345',
      action: 'open_application',
      status: 'executing',
      parameters: { app_name: 'notepad' },
      requires_confirmation: false,
    };
    const onCancelMock = jest.fn();

    render(<DesktopTaskPanel task={mockTask} onCancel={onCancelMock} />);

    expect(screen.getByText(/Launch Application/i)).toBeInTheDocument();
    expect(screen.getByText(/EXECUTING/i)).toBeInTheDocument();
    expect(screen.getByText(/notepad/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel Directive/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(onCancelMock).toHaveBeenCalledWith('task-12345');
  });

  test('renders verified success result on completed status', () => {
    const mockTask = {
      id: 'task-67890',
      action: 'open_file_explorer',
      status: 'completed',
      parameters: {},
      result: {
        verified: true,
        message: 'File Explorer launched successfully',
      },
    };

    render(<DesktopTaskPanel task={mockTask} />);

    expect(screen.getByText(/VERIFIED SUCCESS/i)).toBeInTheDocument();
    expect(screen.getByText(/File Explorer launched successfully/i)).toBeInTheDocument();
  });

  test('renders authorization button when awaiting confirmation', () => {
    const mockTask = {
      id: 'task-confirm-1',
      action: 'type_text',
      status: 'awaiting_confirmation',
      parameters: { text: 'Hello World', target_window_title: 'Untitled - Notepad' },
    };
    const onConfirmRequestMock = jest.fn();

    render(
      <DesktopTaskPanel
        task={mockTask}
        onConfirmRequest={onConfirmRequestMock}
      />
    );

    expect(screen.getByText(/AWAITING AUTHORIZATION/i)).toBeInTheDocument();
    const reviewBtn = screen.getByRole('button', { name: /Review Authorization/i });
    fireEvent.click(reviewBtn);
    expect(onConfirmRequestMock).toHaveBeenCalledWith(mockTask);
  });
});

describe('TaskConfirmationModal Component', () => {
  const sampleTask = {
    id: 'task-999',
    action: 'type_text',
    status: 'awaiting_confirmation',
    target: 'Untitled - Notepad',
    parameters: {
      text: 'Verified System Input',
      target_window_title: 'Untitled - Notepad',
    },
  };

  test('returns null when isOpen is false', () => {
    const { container } = render(
      <TaskConfirmationModal
        isOpen={false}
        task={sampleTask}
        onConfirm={jest.fn()}
        onReject={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders authorization prompt and executes confirm and reject handlers', () => {
    const onConfirmMock = jest.fn();
    const onRejectMock = jest.fn();

    render(
      <TaskConfirmationModal
        isOpen={true}
        task={sampleTask}
        onConfirm={onConfirmMock}
        onReject={onRejectMock}
      />
    );

    expect(screen.getByText(/DIRECTIVE AUTHORIZATION REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified System Input/i)).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: /Abort Directive/i });
    fireEvent.click(rejectBtn);
    expect(onRejectMock).toHaveBeenCalledWith('task-999', 'User rejected authorization');

    const approveBtn = screen.getByRole('button', { name: /Authorize & Execute/i });
    fireEvent.click(approveBtn);
    expect(onConfirmMock).toHaveBeenCalledWith('task-999', 'type_text', 'Untitled - Notepad');
  });
});

describe('CommandPalette Component', () => {
  test('returns null when isOpen is false', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders search input, filters commands, and handles selection', () => {
    const onCloseMock = jest.fn();
    const onExecuteActionMock = jest.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onCloseMock}
        onExecuteDesktopAction={onExecuteActionMock}
        onViewChange={jest.fn()}
        onGlobalStop={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/Search available commands/i)).toBeInTheDocument();
    expect(screen.getByText(/Open File Explorer/i)).toBeInTheDocument();

    // Filter by 'Notepad'
    const searchInput = screen.getByLabelText(/Search available commands/i);
    fireEvent.change(searchInput, { target: { value: 'Notepad' } });

    expect(screen.getByText(/Open Notepad/i)).toBeInTheDocument();
    expect(screen.queryByText(/Open Calculator/i)).not.toBeInTheDocument();

    // Click command
    fireEvent.click(screen.getByText(/Open Notepad/i));
    expect(onExecuteActionMock).toHaveBeenCalledWith('open_application', { app_name: 'notepad' });
    expect(onCloseMock).toHaveBeenCalled();
  });

  test('closes on Escape key press', () => {
    const onCloseMock = jest.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onCloseMock}
        onExecuteDesktopAction={jest.fn()}
        onViewChange={jest.fn()}
        onGlobalStop={jest.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onCloseMock).toHaveBeenCalled();
  });
});

describe('desktop API service helper', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getActiveWindow makes GET request to /desktop/active-window', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'Visual Studio Code', process_name: 'Code.exe' }),
    });

    const result = await getActiveWindow();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/desktop/active-window'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.process_name).toBe('Code.exe');
  });

  test('createDesktopTask makes POST request with action and parameters', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'task-abc', status: 'executing' }),
    });

    const result = await createDesktopTask('open_application', { app_name: 'calc' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/desktop/tasks'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'open_application', params: { app_name: 'calc' }, requires_confirmation: null }),
      })
    );
    expect(result.id).toBe('task-abc');
  });

  test('stopAllDesktopTasks makes POST request to /desktop/stop', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stopped: true, tasks_cancelled: 1 }),
    });

    const result = await stopAllDesktopTasks();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/desktop/stop'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.stopped).toBe(true);
  });

  test('confirmDesktopTask sends action and target binding in request body', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'task-999', status: 'executing' }),
    });

    const result = await confirmDesktopTask('task-999', true, 'User approved', 'type_text', 'notepad.exe');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/desktop/tasks/task-999/confirm'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          confirmed: true,
          reason: 'User approved',
          action: 'type_text',
          target: 'notepad.exe',
        }),
      })
    );
    expect(result.id).toBe('task-999');
  });
});
