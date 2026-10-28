import React from 'react';
import DemoBadge from '../common/DemoBadge';

export default function Header({
  activeView,
  activeConversation,
  onNewConversation,
  onToggleSidebar,
  isSidebarOpen,
  statusData,
  onOpenCommandPalette = null,
  onGlobalStop = null,
}) {
  const getHeaderTitle = () => {
    if (activeView === 'desktop') return 'Windows Desktop Automation';
    if (activeView === 'tasks') return 'Mission Directives';
    if (activeView === 'memories') return 'Neural Memory Archives';
    if (activeView === 'settings') return 'System Diagnostics';
    return activeConversation?.title || 'Active Session';
  };

  return (
    <header className="app-header" aria-label="Main Command Header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-status-indicator" title="Gideon AI Core Online">
          <span className="pulse-dot"></span>
          <span className="status-label">ONLINE</span>
        </div>

        <h1 className="header-title">{getHeaderTitle()}</h1>
      </div>

      <div className="header-right">
        {/* Command Palette Trigger Button (21st.dev pattern) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="btn-command-palette-trigger"
            onClick={onOpenCommandPalette}
            title="Open Tactical Command Launcher (Ctrl+K)"
            aria-label="Open command palette"
          >
            <span className="palette-icon">⌘</span>
            <span className="palette-label">Commands</span>
            <kbd className="palette-kbd">Ctrl+K</kbd>
          </button>
        )}

        {/* Global Stop Button */}
        {onGlobalStop && (
          <button
            type="button"
            className="btn-header-stop"
            onClick={onGlobalStop}
            title="Emergency Global Stop (Ctrl+Shift+H): Halt speech, generation, and active desktop tasks"
            aria-label="Global Stop"
          >
            <span className="stop-square">■</span>
            <span className="stop-label">HALT</span>
            <kbd className="palette-kbd stop-kbd" style={{ marginLeft: '0.3rem', fontSize: '0.65rem' }}>Ctrl+Shift+H</kbd>
          </button>
        )}

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
