import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DailySummaryView({
  summaries = [],
  selectedSummary = null,
  onSelectSummary,
  onGenerateSummary,
  config = null,
  isGenerating = false,
}) {
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'markdown'
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    if (!selectedSummary?.raw_content) return;
    navigator.clipboard.writeText(selectedSummary.raw_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = selectedSummary?.task_metrics || {
    total_tasks: 0,
    completed_tasks: 0,
    failed_tasks: 0,
    pending_tasks: 0,
    success_rate_percent: 100,
  };

  const marketing = selectedSummary?.marketing_activity || {
    leads_researched: [],
    drafts_prepared: [],
    outreach_sent: [],
    campaign_proposals: [],
  };

  const customerOps = selectedSummary?.customer_operations || {
    enquiries: [],
    call_summaries: [],
    unresolved_issues: [],
    follow_ups: [],
  };

  const pendingApprovals = selectedSummary?.pending_approvals || [];
  const priorities = selectedSummary?.recommended_priorities || [];

  return (
    <div className="daily-summaries-container" data-testid="daily-summary-view">
      {/* Subheader & Config Bar */}
      <div className="summary-controls-bar">
        <div className="summary-config-info">
          <div className="config-item">
            <span className="config-label">⏰ Auto Schedule:</span>
            <span className="config-val">
              {config ? `${config.schedule_time} (${config.timezone})` : '18:00 (UTC)'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">📡 Delivery Channel:</span>
            <span className="config-val channel-pill">
              {config?.delivery_channel || 'local'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">⚡ Workflow:</span>
            <span className="config-val">n8n Webhook Ready</span>
          </div>
        </div>

        <button
          className="btn-generate-summary"
          disabled={isGenerating}
          onClick={() => onGenerateSummary && onGenerateSummary({ force_regenerate: true })}
          data-testid="generate-summary-button"
        >
          {isGenerating ? (
            <LoadingSpinner size="sm" text="Synthesizing Report..." />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              Generate Daily Summary Now
            </>
          )}
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="summary-split-layout">
        {/* Left Sidebar: Historical Dates */}
        <div className="summary-history-sidebar">
          <div className="sidebar-header">
            <h4>Summary Archive</h4>
            <span className="count-tag">{summaries.length} Records</span>
          </div>

          <div className="summary-history-list">
            {summaries.length === 0 ? (
              <div className="empty-history-notice">
                <p>No historical summaries recorded.</p>
                <small>Click "Generate Daily Summary Now" to generate today's business report.</small>
              </div>
            ) : (
              summaries.map((s) => {
                const isSelected = selectedSummary?.id === s.id;
                const statusClass = `delivery-pill status-${s.delivery_status}`;
                return (
                  <div
                    key={s.id}
                    className={`summary-card-item ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectSummary && onSelectSummary(s)}
                    data-testid={`summary-item-${s.summary_date}`}
                  >
                    <div className="summary-card-header">
                      <span className="summary-card-date">{s.summary_date}</span>
                      <span className={statusClass}>
                        {s.delivery_status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="summary-card-chips">
                      <span className="chip-metric">
                        {s.task_metrics?.total_tasks || 0} tasks
                      </span>
                      {s.pending_approvals?.length > 0 && (
                        <span className="chip-warning">
                          {s.pending_approvals.length} approvals
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Content: Selected Summary Details */}
        <div className="summary-detail-pane">
          {!selectedSummary ? (
            <div className="no-summary-selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>No Summary Selected</h3>
              <p>Select a daily report from the archive or click "Generate Daily Summary Now".</p>
            </div>
          ) : (
            <div className="summary-detail-content">
              {/* Header Title & Actions */}
              <div className="summary-detail-header">
                <div>
                  <h2 className="summary-title">{selectedSummary.title}</h2>
                  <div className="summary-meta-sub">
                    <span>Date: <strong>{selectedSummary.summary_date}</strong></span>
                    <span>•</span>
                    <span>Channel: <strong>{selectedSummary.delivery_channel}</strong></span>
                    <span>•</span>
                    <span className={`status-pill status-${selectedSummary.delivery_status}`}>
                      {selectedSummary.delivery_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="summary-view-toggle">
                  <button
                    className={`toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setViewMode('dashboard')}
                  >
                    Executive Dashboard
                  </button>
                  <button
                    className={`toggle-btn ${viewMode === 'markdown' ? 'active' : ''}`}
                    onClick={() => setViewMode('markdown')}
                  >
                    Raw Markdown
                  </button>
                  <button
                    className="copy-btn"
                    onClick={handleCopyMarkdown}
                    title="Copy Markdown Report to Clipboard"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Delivery Warning Banner if Unconfigured or Failed */}
              {selectedSummary.delivery_status === 'delivery_unconfigured' && (
                <div className="delivery-warning-banner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    <strong>Delivery Channel Notice:</strong> {selectedSummary.delivery_error || 'Delivery channel is not configured. Report is safely retained in local storage.'}
                  </span>
                </div>
              )}

              {/* View Mode 1: Executive Dashboard */}
              {viewMode === 'dashboard' ? (
                <div className="dashboard-content-scroll">
                  {/* Metrics KPI Cards */}
                  <div className="metrics-cards-grid">
                    <div className="metric-kpi-card">
                      <span className="kpi-label">TOTAL TASKS</span>
                      <span className="kpi-val">{metrics.total_tasks}</span>
                      <span className="kpi-sub">Evaluated today</span>
                    </div>
                    <div className="metric-kpi-card highlight-success">
                      <span className="kpi-label">COMPLETED</span>
                      <span className="kpi-val">{metrics.completed_tasks}</span>
                      <span className="kpi-sub">{metrics.success_rate_percent}% success rate</span>
                    </div>
                    <div className="metric-kpi-card highlight-danger">
                      <span className="kpi-label">FAILED / ISSUES</span>
                      <span className="kpi-val">{metrics.failed_tasks}</span>
                      <span className="kpi-sub">Tasks requiring attention</span>
                    </div>
                    <div className="metric-kpi-card highlight-warning">
                      <span className="kpi-label">PENDING APPROVALS</span>
                      <span className="kpi-val">{pendingApprovals.length}</span>
                      <span className="kpi-sub">Actions awaiting consent</span>
                    </div>
                  </div>

                  {/* Section 1: Marketing & Outreach */}
                  <div className="summary-section-box">
                    <div className="section-box-header">
                      <h3>📣 Marketing & Outreach Activity</h3>
                      <span className="section-tag">
                        {marketing.outreach_sent.length} Sent • {marketing.drafts_prepared.length} Drafts
                      </span>
                    </div>

                    <div className="section-box-body">
                      {/* Outreach Dispatched */}
                      <div className="sub-section-group">
                        <h4 className="sub-section-title">
                          ✅ Approved Outreach Dispatched ({marketing.outreach_sent.length})
                        </h4>
                        {marketing.outreach_sent.length === 0 ? (
                          <p className="empty-sub-text">No outreach or emails were dispatched externally today.</p>
                        ) : (
                          <div className="card-item-list">
                            {marketing.outreach_sent.map((item, idx) => (
                              <div key={idx} className="outreach-item-card">
                                <div className="card-top-line">
                                  <span className="recipient-tag">To: {item.recipient}</span>
                                  <span className="badge-sent">Dispatched</span>
                                </div>
                                <div className="card-subj">{item.subject}</div>
                                {item.sent_at && <div className="card-time">Sent at: {item.sent_at}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Drafts Prepared */}
                      <div className="sub-section-group">
                        <h4 className="sub-section-title">
                          📝 Drafts Prepared for Review ({marketing.drafts_prepared.length})
                        </h4>
                        {marketing.drafts_prepared.length === 0 ? (
                          <p className="empty-sub-text">No new email or outreach drafts prepared today.</p>
                        ) : (
                          <div className="card-item-list">
                            {marketing.drafts_prepared.map((draft, idx) => (
                              <div key={idx} className="draft-item-card">
                                <div className="card-top-line">
                                  <span className="recipient-tag">To: {draft.recipient}</span>
                                  <span className="badge-draft">
                                    {draft.requires_approval ? 'Requires Approval' : 'Draft'}
                                  </span>
                                </div>
                                <div className="card-subj">{draft.subject}</div>
                                {draft.draft_preview && (
                                  <blockquote className="draft-preview">
                                    "{draft.draft_preview}..."
                                  </blockquote>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Leads Researched */}
                      {marketing.leads_researched.length > 0 && (
                        <div className="sub-section-group">
                          <h4 className="sub-section-title">
                            🔍 Leads & Market Research ({marketing.leads_researched.length})
                          </h4>
                          <div className="card-item-list">
                            {marketing.leads_researched.map((lead, idx) => (
                              <div key={idx} className="lead-item-card">
                                <strong>{lead.description}</strong>
                                <p>{lead.findings_preview}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Customer Operations */}
                  <div className="summary-section-box">
                    <div className="section-box-header">
                      <h3>🤝 Customer Operations & Enquiries</h3>
                      <span className="section-tag">
                        {customerOps.enquiries.length} Enquiries • {customerOps.unresolved_issues.length} Unresolved Issues
                      </span>
                    </div>

                    <div className="section-box-body">
                      {customerOps.enquiries.length === 0 && customerOps.unresolved_issues.length === 0 ? (
                        <p className="empty-sub-text">No customer enquiries, logged calls, or operational issues recorded.</p>
                      ) : (
                        <>
                          {/* Enquiries */}
                          {customerOps.enquiries.length > 0 && (
                            <div className="sub-section-group">
                              <h4 className="sub-section-title">💬 Customer Enquiries</h4>
                              <div className="card-item-list">
                                {customerOps.enquiries.map((enq, idx) => (
                                  <div key={idx} className="enquiry-item-card">
                                    <div className="card-top-line">
                                      <span className="enquiry-title">{enq.title}</span>
                                      <span className={`status-pill status-${enq.status}`}>{enq.status}</span>
                                    </div>
                                    <p className="enquiry-summary">{enq.summary || enq.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unresolved Issues */}
                          {customerOps.unresolved_issues.length > 0 && (
                            <div className="sub-section-group">
                              <h4 className="sub-section-title text-danger">⚠️ Unresolved Issues & Failures</h4>
                              <div className="card-item-list">
                                {customerOps.unresolved_issues.map((iss, idx) => (
                                  <div key={idx} className="failure-item-card">
                                    <strong>[{iss.type.toUpperCase()}] {iss.title || iss.description}</strong>
                                    <p className="error-text">{iss.error}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Pending Approvals */}
                  {pendingApprovals.length > 0 && (
                    <div className="summary-section-box highlight-box-warning">
                      <div className="section-box-header">
                        <h3>🛡️ Actions Awaiting Human Approval</h3>
                        <span className="badge-warning">{pendingApprovals.length} Pending</span>
                      </div>
                      <div className="section-box-body">
                        <div className="card-item-list">
                          {pendingApprovals.map((apprv, idx) => (
                            <div key={idx} className="approval-alert-card">
                              <div className="card-top-line">
                                <span className="action-tag">{apprv.action_type}</span>
                                <span className="agent-tag">by {apprv.agent_id}</span>
                              </div>
                              <div className="card-target">Target: <code>{apprv.target_resource}</code></div>
                              <p className="card-desc">{apprv.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Recommended Priorities for Tomorrow */}
                  <div className="summary-section-box">
                    <div className="section-box-header">
                      <h3>🎯 Recommended Priorities for Tomorrow</h3>
                    </div>
                    <div className="section-box-body">
                      <ol className="priorities-list">
                        {priorities.map((prio, idx) => (
                          <li key={idx} className="priority-item">
                            {prio}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode 2: Raw Markdown View */
                <div className="markdown-report-pane">
                  <pre className="markdown-code-block">{selectedSummary.raw_content}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

