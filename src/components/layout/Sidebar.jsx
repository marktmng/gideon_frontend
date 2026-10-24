import React from 'react';
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
  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true"></div>}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrapper">
            <GideonOrb size="small" isProcessing={false} />
            <div className="brand-text">
              <span className="brand-title">GIDEON</span>
              <span className="brand-subtitle">AI COMMAND CORE</span>
            </div>
          </div>
          <button className="sidebar-close-mobile" onClick={onClose} type="button" aria-label="Close sidebar">
            &times;
          </button>
        </div>

        {/* Workspace Navigation */}
        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => {
              onViewChange('chat');
              onClose();
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Conversations</span>
          </button>

          <button
            className={`nav-btn ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              onViewChange('tasks');
              onClose();
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Directives & Tasks</span>
          </button>

          <button
            className={`nav-btn ${activeView === 'memories' ? 'active' : ''}`}
            onClick={() => {
              onViewChange('memories');
              onClose();
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M12 2a9 9 0 0 0-9 9c0 3.2 1.7 6 4.3 7.6L7 22l4-2h1a9 9 0 0 0 9-9 9 9 0 0 0-9-9z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Memory Archives</span>
          </button>

          <button
            className={`nav-btn ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => {
              onViewChange('settings');
              onClose();
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Diagnostics</span>
          </button>
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
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Session
          </button>
        </div>

        {/* Conversations History List */}
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
                      aria-label="Delete conversation"
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

        {/* Footer info */}
        <div className="sidebar-footer">
          <div className="server-status-pill">
            <span className={`status-indicator-dot ${backendConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="server-status-text">
              {backendConnected ? 'Core Connected' : 'Core Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
