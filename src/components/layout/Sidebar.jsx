import React, { useState } from 'react';
import GideonOrb from '../chat/GideonOrb';

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  activeView,
  onViewChange,
  isOpen,
  onClose,
  backendConnected,
  loadingConversations = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const navItems = [
    {
      id: 'chat',
      label: 'Command Centre',
      ariaLabel: 'Command Centre & Conversations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      tooltip: 'Conversations & Neural Tech Brain',
    },
    {
      id: 'agents',
      label: 'Agent Engine',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 1 0-16 0" />
          <line x1="12" y1="3" x2="12" y2="1" />
          <line x1="8" y1="4" x2="7" y2="2.5" />
          <line x1="16" y1="4" x2="17" y2="2.5" />
        </svg>
      ),
      tooltip: 'AI Agents & Multi-Step Automation',
    },
    {
      id: 'desktop',
      label: 'Desktop Automation',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      tooltip: 'Windows Desktop Control Deck',
    },
    {
      id: 'tasks',
      label: 'Directives & Tasks',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      tooltip: 'Mission Directives Tracker',
    },
    {
      id: 'memories',
      label: 'Memory Archives',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M12 2a9 9 0 0 0-9 9c0 3.2 1.7 6 4.3 7.6L7 22l4-2h1a9 9 0 0 0 9-9 9 9 0 0 0-9-9z" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      tooltip: 'Neural Context Memory Archives',
    },
    {
      id: 'settings',
      label: 'Diagnostics',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      tooltip: 'Diagnostics & Sensory Settings',
    },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true"></div>}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} aria-label="Main Navigation">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrapper" onClick={() => onViewChange('chat')} title="Gideon AI Command Core">
            <GideonOrb size="small" isProcessing={false} />
            {!isCollapsed && (
              <div className="brand-text">
                <span className="brand-title">GIDEON</span>
                <span className="brand-subtitle">AI COMMAND CORE</span>
              </div>
            )}
          </div>

          <div className="sidebar-brand-controls">
            {/* Desktop Collapse Toggle */}
            <button
              className="sidebar-collapse-toggle"
              onClick={() => setIsCollapsed((prev) => !prev)}
              type="button"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                {isCollapsed ? (
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                ) : (
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                )}
              </svg>
            </button>

            {/* Mobile Close Button */}
            <button className="sidebar-close-mobile" onClick={onClose} type="button" aria-label="Close sidebar">
              &times;
            </button>
          </div>
        </div>

        {/* Workspace Navigation */}
        <nav className="sidebar-nav" aria-label="Workspaces">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                type="button"
                title={isCollapsed ? item.label : item.tooltip}
                aria-label={item.ariaLabel || item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                {isActive && <span className="nav-active-pip" aria-hidden="true"></span>}
              </button>
            );
          })}
        </nav>

        {/* Action Button: New Session */}
        <div className="sidebar-action-container">
          <button
            className="btn-new-session"
            onClick={() => {
              onNewConversation();
              if (activeView !== 'chat') onViewChange('chat');
              onClose();
            }}
            type="button"
            title="Start new conversation session"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {!isCollapsed && <span>New Session</span>}
          </button>
        </div>

        {/* Conversations History List */}
        {!isCollapsed && (
          <>
            <div className="sidebar-section-header">
              <span>Session Log</span>
              <span className="count-badge">{conversations.length}</span>
            </div>

            <div className="conversations-scroll-area">
              {conversations.length === 0 ? (
                <div className="sidebar-empty">
                  <span>No recorded sessions.</span>
                </div>
              ) : (
                <ul className="conversations-list">
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversationId && activeView === 'chat';
                    return (
                      <li key={conv.id} className={`conversation-item ${isActive ? 'active' : ''}`}>
                        <button
                          className="conversation-select-btn"
                          onClick={() => {
                            onSelectConversation(conv.id);
                            if (activeView !== 'chat') onViewChange('chat');
                            onClose();
                          }}
                          type="button"
                          title={conv.title || 'Untitled Session'}
                        >
                          <span className="conversation-title-text">{conv.title || 'Untitled Session'}</span>
                          <span className="conversation-date-text">{formatDate(conv.created_at)}</span>
                        </button>
                        <button
                          className="conversation-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          title="Delete session"
                          type="button"
                          aria-label={`Delete conversation ${conv.title || 'Untitled'}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="sidebar-footer">
          <div className="server-status-pill" title={backendConnected ? 'Connected to local FastAPI backend' : 'Backend is unreachable'}>
            <span className={`status-indicator-dot ${backendConnected ? 'connected' : 'disconnected'}`}></span>
            {!isCollapsed && (
              <span className="server-status-text">
                {backendConnected ? 'Core Connected' : 'Core Offline'}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
