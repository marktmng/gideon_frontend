import React from 'react';

const AGENT_ICONS = {
  agent_research: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  agent_productivity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  agent_coding: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  agent_marketing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  agent_email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  agent_business_ops: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
};

export default function AgentDirectory({ agents = [], onSelectAgent }) {
  return (
    <div className="agent-directory">
      <div className="agent-directory-header">
        <h3 className="section-title">Specialized Autonomous Agents</h3>
        <span className="agent-count-badge">{agents.length} Registered</span>
      </div>
      <div className="agent-cards-grid">
        {agents.map((agent) => (
          <div key={agent.agent_id} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-wrapper">
                {AGENT_ICONS[agent.agent_id] || (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>
              <div className="agent-title-group">
                <h4 className="agent-name">{agent.display_name}</h4>
                <span className={`agent-status-pill status-${agent.status}`}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
            </div>

            <p className="agent-desc">{agent.description}</p>

            <div className="agent-meta-block">
              <div className="meta-row">
                <span className="meta-label">Responsibility:</span>
                <span className="meta-val">{agent.responsibility}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Task Types:</span>
                <div className="tags-container">
                  {agent.supported_task_types.map((type) => (
                    <span key={type} className="tech-tag">{type}</span>
                  ))}
                </div>
              </div>
              <div className="meta-row">
                <span className="meta-label">Authorized Tools:</span>
                <div className="tags-container">
                  {agent.allowed_tools.map((tool) => (
                    <span key={tool} className="tool-tag">{tool.replace('tool_', '')}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="agent-card-footer">
              <button
                className="btn-assign-agent"
                onClick={() => onSelectAgent(agent.agent_id)}
                title={`Deploy ${agent.display_name}`}
              >
                Launch Directive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

