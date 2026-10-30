import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentDirectory from '../AgentDirectory';
import TaskPlanView from '../TaskPlanView';
import ApprovalModal from '../ApprovalModal';
import CreateAgentTaskModal from '../CreateAgentTaskModal';
import AgentWorkspace from '../AgentWorkspace';
import DailySummaryView from '../DailySummaryView';
import * as agentsApi from '../../../services/agents';

// Mock agentsApi
jest.mock('../../../services/agents');

const mockAgents = [
  {
    agent_id: 'agent_research',
    display_name: 'Research Agent',
    description: 'Synthesizes targeted research and findings.',
    responsibility: 'Decompose inquiries and collect evidence.',
    status: 'ready',
    supported_task_types: ['research', 'investigation'],
    allowed_tools: ['tool_research_fetch', 'tool_workspace_read_file'],
  },
  {
    agent_id: 'agent_coding',
    display_name: 'Coding Agent',
    description: 'Inspects authorized project files and proposes code.',
    responsibility: 'Inspect workspace files and stage code diffs.',
    status: 'ready',
    supported_task_types: ['coding', 'code_review'],
    allowed_tools: ['tool_workspace_list_files', 'tool_workspace_propose_diff'],
  },
];

const mockTools = [
  {
    tool_id: 'tool_workspace_list_files',
    name: 'List Workspace Files',
    description: 'List project files in authorized workspace.',
    permission_level: 'read_only',
    requires_approval: false,
    timeout_seconds: 10,
  },
  {
    tool_id: 'tool_send_email',
    name: 'Send Email Message',
    description: 'Consequential action requiring human authorization.',
    permission_level: 'consequential',
    requires_approval: true,
    timeout_seconds: 30,
  },
];

const mockTask = {
  id: 'task-111-222',
  title: 'Research Quantum Tech',
  user_request: 'Research quantum computing breakthroughs',
  status: 'running',
  progress_percent: 50,
  steps: [
    {
      id: 'step-1',
      step_key: 'step_1_gather_evidence',
      step_order: 1,
      description: 'Gather evidence on quantum tech',
      assigned_agent_id: 'agent_research',
      tool_id: 'tool_research_fetch',
      status: 'completed',
      dependencies: [],
      retry_count: 0,
      max_retries: 2,
    },
    {
      id: 'step-2',
      step_key: 'step_2_synthesize_findings',
      step_order: 2,
      description: 'Synthesize quantum findings',
      assigned_agent_id: 'agent_research',
      tool_id: 'tool_research_fetch',
      status: 'running',
      dependencies: ['step_1_gather_evidence'],
      retry_count: 0,
      max_retries: 2,
    },
  ],
  approvals: [],
};

const mockSummary = {
  id: 'sum-123',
  summary_date: '2026-10-29',
  title: 'Daily Business Summary — 2026-10-29',
  marketing_activity: {
    leads_researched: [{ description: 'Tech leads', findings_preview: 'Found 4' }],
    drafts_prepared: [{ recipient: 'lead@example.com', subject: 'Partnership', requires_approval: true }],
    outreach_sent: [{ recipient: 'client@example.com', subject: 'Welcome', status: 'sent', sent_at: '2026-10-29T10:00:00Z' }],
    campaign_proposals: [],
  },
  customer_operations: {
    enquiries: [{ title: 'Billing enquiry', status: 'completed', summary: 'Resolved' }],
    call_summaries: [],
    unresolved_issues: [],
    follow_ups: [],
  },
  task_metrics: {
    total_tasks: 3,
    completed_tasks: 3,
    failed_tasks: 0,
    cancelled_tasks: 0,
    pending_tasks: 0,
    success_rate_percent: 100,
  },
  pending_approvals: [],
  recommended_priorities: ['Follow up with lead@example.com', 'System operational check'],
  raw_content: '# Daily Business Summary — 2026-10-29\nAll operations complete.',
  delivery_channel: 'local',
  delivery_status: 'stored_locally',
  delivery_error: null,
};

const mockSummaryConfig = {
  schedule_time: '18:00',
  timezone: 'UTC',
  delivery_channel: 'local',
  delivery_email: null,
  delivery_webhook: null,
  auto_schedule: true,
};

describe('Phase 5 Agent Workspace Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    agentsApi.listAgents.mockResolvedValue({ items: mockAgents, total: mockAgents.length });
    agentsApi.listTools.mockResolvedValue({ items: mockTools, total: mockTools.length });
    agentsApi.listAgentTasks.mockResolvedValue({ items: [mockTask], total: 1 });
    agentsApi.getAgentTask.mockResolvedValue(mockTask);
    agentsApi.listDailySummaries.mockResolvedValue({ items: [mockSummary], total: 1 });
    agentsApi.getSummaryConfig.mockResolvedValue(mockSummaryConfig);
    agentsApi.generateDailySummary.mockResolvedValue(mockSummary);
    agentsApi.subscribeTaskEvents.mockReturnValue(() => {});
  });

  test('AgentDirectory renders agent cards and handles selection', () => {
    const onSelectMock = jest.fn();
    render(<AgentDirectory agents={mockAgents} onSelectAgent={onSelectMock} />);

    expect(screen.getByText('Research Agent')).toBeInTheDocument();
    expect(screen.getByText('Coding Agent')).toBeInTheDocument();
    expect(screen.getByText('2 Registered')).toBeInTheDocument();

    const launchButtons = screen.getAllByRole('button', { name: /Launch Directive/i });
    expect(launchButtons.length).toBe(2);
    fireEvent.click(launchButtons[0]);
    expect(onSelectMock).toHaveBeenCalledWith('agent_research');
  });

  test('TaskPlanView renders task steps and progress bar', () => {
    const onCancelMock = jest.fn();
    render(
      <TaskPlanView
        task={mockTask}
        onCancel={onCancelMock}
        onRequestApprovalReview={jest.fn()}
      />
    );

    expect(screen.getByText('Research Quantum Tech')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Gather evidence on quantum tech')).toBeInTheDocument();
    expect(screen.getByText('Synthesize quantum findings')).toBeInTheDocument();

    const abortBtn = screen.getByRole('button', { name: /Abort Directive/i });
    fireEvent.click(abortBtn);
    expect(onCancelMock).toHaveBeenCalledWith('task-111-222');
  });

  test('ApprovalModal displays consequential details and handles approve', async () => {
    const mockApproval = {
      id: 'app-999',
      task_id: 'task-111-222',
      action_type: 'Send Email Message',
      agent_id: 'agent_email',
      target_resource: 'tool_send_email',
      consequences_summary: 'Will transmit email to client@example.com',
      parameters: { recipient: 'client@example.com', subject: 'Report' },
    };
    const onApproveMock = jest.fn().mockResolvedValue({});
    const onCloseMock = jest.fn();

    render(
      <ApprovalModal
        approval={mockApproval}
        onApprove={onApproveMock}
        onReject={jest.fn()}
        onClose={onCloseMock}
      />
    );

    expect(screen.getByText('Authorize Consequential Action')).toBeInTheDocument();
    expect(screen.getByText('Send Email Message')).toBeInTheDocument();
    expect(screen.getAllByText(/client@example.com/i).length).toBeGreaterThan(0);

    const approveBtn = screen.getByRole('button', { name: /Authorize & Execute/i });
    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(onApproveMock).toHaveBeenCalledWith('task-111-222', 'app-999', '');
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('ApprovalModal handles reject action', async () => {
    const mockApproval = {
      id: 'app-999',
      task_id: 'task-111-222',
      action_type: 'Send Email Message',
      agent_id: 'agent_email',
      target_resource: 'tool_send_email',
      consequences_summary: 'Will transmit email to client@example.com',
      parameters: { recipient: 'client@example.com', subject: 'Report' },
    };
    const onRejectMock = jest.fn().mockResolvedValue({});
    const onCloseMock = jest.fn();

    render(
      <ApprovalModal
        approval={mockApproval}
        onApprove={jest.fn()}
        onReject={onRejectMock}
        onClose={onCloseMock}
      />
    );

    const rejectBtn = screen.getByRole('button', { name: /Reject Directive/i });
    fireEvent.click(rejectBtn);
    await waitFor(() => {
      expect(onRejectMock).toHaveBeenCalledWith('task-111-222', 'app-999', 'Rejected by user');
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('CreateAgentTaskModal validates form input and submits', async () => {
    const onSubmitMock = jest.fn().mockResolvedValue({});
    const onCloseMock = jest.fn();

    render(
      <CreateAgentTaskModal
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        agents={mockAgents}
      />
    );

    expect(screen.getByText('Deploy Agent Directive')).toBeInTheDocument();

    const input = screen.getByLabelText(/Directive Instructions/i);
    fireEvent.change(input, { target: { value: 'Analyze codebase performance' } });

    const submitBtn = screen.getByRole('button', { name: /Initiate Task/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        title: undefined,
        user_request: 'Analyze codebase performance',
        assigned_agent_id: undefined,
      });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('AgentWorkspace loads and toggles between tabs including Daily Summaries', async () => {
    render(<AgentWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/AI AGENTS & ORCHESTRATION/i)).toBeInTheDocument();
    });

    // Switch to Agent Roster
    const rosterTab = screen.getByRole('button', { name: /Agent Roster/i });
    fireEvent.click(rosterTab);

    await waitFor(() => {
      expect(screen.getByText('Research Agent')).toBeInTheDocument();
    });

    // Switch to Tool Registry
    const toolsTab = screen.getByRole('button', { name: /Tool Registry/i });
    fireEvent.click(toolsTab);

    await waitFor(() => {
      expect(screen.getByText('List Workspace Files')).toBeInTheDocument();
      expect(screen.getByText('Send Email Message')).toBeInTheDocument();
    });

    // Switch to Daily Summaries
    const summariesTab = screen.getByRole('button', { name: /Daily Summaries/i });
    fireEvent.click(summariesTab);

    await waitFor(() => {
      expect(screen.getByText('Daily Business Summary — 2026-10-29')).toBeInTheDocument();
      expect(screen.getByText(/Approved Outreach Dispatched/i)).toBeInTheDocument();
      expect(screen.getByText(/Follow up with lead@example.com/i)).toBeInTheDocument();
    });
  });

  test('DailySummaryView triggers generate and toggles markdown view', async () => {
    const onGenerateMock = jest.fn();
    render(
      <DailySummaryView
        summaries={[mockSummary]}
        selectedSummary={mockSummary}
        onSelectSummary={jest.fn()}
        onGenerateSummary={onGenerateMock}
        config={mockSummaryConfig}
        isGenerating={false}
      />
    );

    expect(screen.getByText('Daily Business Summary — 2026-10-29')).toBeInTheDocument();
    expect(screen.getByText('TOTAL TASKS')).toBeInTheDocument();

    // Click Generate
    const genBtn = screen.getByTestId('generate-summary-button');
    fireEvent.click(genBtn);
    expect(onGenerateMock).toHaveBeenCalledWith({ force_regenerate: true });

    // Toggle Raw Markdown
    const mdBtn = screen.getByRole('button', { name: /Raw Markdown/i });
    fireEvent.click(mdBtn);
    expect(screen.getByText(/# Daily Business Summary — 2026-10-29/i)).toBeInTheDocument();
  });
});
