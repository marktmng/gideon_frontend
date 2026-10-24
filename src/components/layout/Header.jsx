import React from 'react';
import DemoBadge from '../common/DemoBadge';

export default function Header({
  activeView,
  activeConversation,
  onNewConversation,
  onToggleSidebar,
  isSidebarOpen,
  statusData,
}) {
  const getHeaderTitle = () => {
    if (activeView === 'tasks') return 'Mission Directives';
    if (activeView === 'memories') return 'Neural Memory Archives';
    if (activeView === 'settings') return 'System Diagnostics';
    return activeConversation?.title || 'Active Session';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-status-indicator">
          <span className="pulse-dot"></span>
          <span className="status-label">ONLINE</span>
        </div>

        <h1 className="header-title">{getHeaderTitle()}</h1>
      </div>

      <div className="header-right">
        <DemoBadge
          isDemo={statusData ? statusData.is_demo : true}
          provider={statusData?.provider || 'demo'}
          status={statusData?.status || 'demo_mode'}
          model={statusData?.model}
        />
        {activeView === 'chat' && (
          <button
            className="btn-header-new-chat"
            onClick={onNewConversation}
            type="button"
            title="Start new conversation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        )}
      </div>
    </header>
  );
}
