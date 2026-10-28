/**
 * CommandPalette — 21st.dev inspired Tactical Command Launcher for Gideon.
 * Triggered via Ctrl+K or header icon. Provides keyboard-driven execution
 * of allowlisted desktop actions, view switching, and emergency controls.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { animateCommandPaletteOpen, cleanupAnimations } from '../../services/animationService';

export default function CommandPalette({
  isOpen,
  onClose,
  onViewChange,
  onExecuteDesktopAction,
  onGlobalStop,
  onToggleVoice,
  onToggleListening,
  onToggleCamera,
  onNewConversation,
  reducedMotion = false,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Command items catalog
  const commands = useMemo(() => [
    // Desktop Actions
    {
      id: 'open_file_explorer',
      category: 'Desktop Action',
      title: 'Open File Explorer',
      description: 'Launch Windows Explorer at project workspace',
      icon: '📁',
      action: () => onExecuteDesktopAction('open_file_explorer', {}),
    },
    {
      id: 'open_project_dir',
      category: 'Desktop Action',
      title: 'Open Project Directory',
      description: 'Open configured Gideon repository in Explorer',
      icon: '📂',
      action: () => onExecuteDesktopAction('open_directory', { path: 'C:/Mark/Gideon' }),
    },
    {
      id: 'open_notepad',
      category: 'Desktop Action',
      title: 'Open Notepad',
      description: 'Launch allowlisted Windows text editor',
      icon: '📝',
      action: () => onExecuteDesktopAction('open_application', { app_name: 'notepad' }),
    },
    {
      id: 'open_calculator',
      category: 'Desktop Action',
      title: 'Open Calculator',
      description: 'Launch allowlisted Windows calculator utility',
      icon: '🔢',
      action: () => onExecuteDesktopAction('open_application', { app_name: 'calculator' }),
    },
    {
      id: 'open_browser',
      category: 'Desktop Action',
      title: 'Open Web Browser',
      description: 'Open default web browser',
      icon: '🌐',
      action: () => onExecuteDesktopAction('open_application', { app_name: 'browser' }),
    },
    {
      id: 'capture_screenshot',
      category: 'Desktop Action',
      title: 'Capture Screenshot',
      description: 'Capture desktop screenshot stored strictly locally',
      icon: '📷',
      action: () => onExecuteDesktopAction('capture_screenshot', { local_only: true }),
    },
    {
      id: 'inspect_active_window',
      category: 'Desktop Action',
      title: 'Inspect Active Window',
      description: 'View current foreground window title and process',
      icon: '🔍',
      action: () => onExecuteDesktopAction('inspect_active_window', {}),
    },

    // Navigation
    {
      id: 'nav_command_centre',
      category: 'Navigation',
      title: 'Command Centre',
      description: 'Switch to central Tech Brain & conversation feed',
      icon: '⚡',
      action: () => onViewChange('chat'),
    },
    {
      id: 'nav_desktop_tasks',
      category: 'Navigation',
      title: 'Desktop Automation',
      description: 'Switch to Windows desktop task deck and window monitor',
      icon: '🖥️',
      action: () => onViewChange('desktop'),
    },
    {
      id: 'nav_directives',
      category: 'Navigation',
      title: 'Directives & Tasks',
      description: 'View mission task directives archive',
      icon: '📋',
      action: () => onViewChange('tasks'),
    },
    {
      id: 'nav_memories',
      category: 'Navigation',
      title: 'Memory Archives',
      description: 'Inspect saved neural memory directives',
      icon: '🧠',
      action: () => onViewChange('memories'),
    },
    {
      id: 'nav_settings',
      category: 'Navigation',
      title: 'System Diagnostics',
      description: 'Check AI status, voice settings, and telemetry',
      icon: '⚙️',
      action: () => onViewChange('settings'),
    },

    // System Controls
    {
      id: 'global_stop',
      category: 'System Control',
      title: 'EMERGENCY GLOBAL STOP',
      description: 'Instantly halt speech, generation, and active desktop tasks (Shortcut: Ctrl+Shift+H)',
      icon: '🛑',
      isDanger: true,
      action: () => onGlobalStop(),
    },
    {
      id: 'toggle_mic',
      category: 'System Control',
      title: 'Toggle Microphone Input',
      description: 'Start or stop voice recognition listener',
      icon: '🎙️',
      action: () => onToggleListening && onToggleListening(),
    },
    {
      id: 'toggle_voice',
      category: 'System Control',
      title: 'Toggle Spoken Voice Output',
      description: 'Mute or unmute synthesized speech audio',
      icon: '🔊',
      action: () => onToggleVoice && onToggleVoice(),
    },
    {
      id: 'toggle_camera',
      category: 'System Control',
      title: 'Toggle Optical Camera',
      description: 'Enable or disable webcam optical sensor',
      icon: '👁️',
      action: () => onToggleCamera && onToggleCamera(),
    },
    {
      id: 'new_session',
      category: 'System Control',
      title: 'New Conversation Session',
      description: 'Initialize a clean conversation thread',
      icon: '✦',
      action: () => {
        onNewConversation();
        onViewChange('chat');
      },
    },
  ], [
    onExecuteDesktopAction,
    onViewChange,
    onGlobalStop,
    onToggleListening,
    onToggleVoice,
    onToggleCamera,
    onNewConversation,
  ]);

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Anime.js entrance reveal and escape key listener
  useEffect(() => {
    const overlay = overlayRef.current;
    const modal = modalRef.current;
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const handleGlobalKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);

      setTimeout(() => {
        inputRef.current?.focus();
        animateCommandPaletteOpen(overlay, modal, reducedMotion);
      }, 10);

      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown);
        cleanupAnimations([overlay, modal]);
      };
    }
  }, [isOpen, onClose, reducedMotion]);

  // Reset selected index if search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      ref={overlayRef}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tactical Command Launcher"
    >
      <div
        className="command-palette-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="palette-input-wrapper">
          <span className="palette-search-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            className="palette-search-input"
            placeholder="Type a command or action (e.g. 'open explorer', 'calculator', 'stop')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search available commands"
          />
          <kbd className="palette-esc-badge" onClick={onClose}>ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="palette-results-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="palette-no-results">
              <span>No matching tactical commands found for "{query}".</span>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'selected' : ''} ${item.isDanger ? 'danger' : ''}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="palette-item-icon">{item.icon}</span>
                  <div className="palette-item-text">
                    <div className="palette-item-header">
                      <span className="palette-item-title">{item.title}</span>
                      <span className="palette-item-category">{item.category}</span>
                    </div>
                    <span className="palette-item-desc">{item.description}</span>
                  </div>
                  {isSelected && <span className="palette-item-enter">↵ Execute</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="palette-footer">
          <div className="palette-footer-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
            <span><kbd>Ctrl+Shift+H</kbd> Global Halt</span>
          </div>
          <span className="palette-footer-brand">GIDEON TACTICAL LAUNCHER // 21ST.DEV PATTERN</span>
        </div>
      </div>
    </div>
  );
}
