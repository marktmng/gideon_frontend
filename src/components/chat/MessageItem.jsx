/**
 * MessageItem — 21st.dev inspired Futuristic Message Card for Gideon.
 * Features clean code block presentation with copy-to-clipboard,
 * Markdown-style bullet formatting, and smooth arrival micro-transitions.
 */
import React, { useState, useRef, useEffect } from 'react';
import { animateMessageArrival, cleanupAnimations } from '../../services/animationService';

export default function MessageItem({ message, reducedMotion = false }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const elementRef = useRef(null);

  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  useEffect(() => {
    const el = elementRef.current;
    if (el) {
      animateMessageArrival(el, reducedMotion);
    }
    return () => {
      cleanupAnimations(el);
    };
  }, [reducedMotion]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopyCode = (codeText, index) => {
    navigator.clipboard.writeText(codeText).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Lightweight, dependency-free Markdown & Code block parser
  const renderFormattedContent = (content) => {
    if (!content) return null;

    // Check for fenced code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Preceding text
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      // Code block
      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        code: match[2].trim(),
        index: blockIndex++,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return parts.map((part, pIdx) => {
      if (part.type === 'code') {
        const isCopied = copiedIndex === part.index;
        return (
          <div key={`code-${pIdx}`} className="code-block-wrapper">
            <div className="code-block-header">
              <span className="code-lang-label">{part.language.toUpperCase()}</span>
              <button
                type="button"
                className="btn-copy-code"
                onClick={() => handleCopyCode(part.code, part.index)}
                title="Copy code to clipboard"
                aria-label="Copy code to clipboard"
              >
                {isCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="code-block-pre font-mono">
              <code>{part.code}</code>
            </pre>
          </div>
        );
      }

      // Regular paragraph text with inline code and bullets
      const lines = part.content.split('\n');
      return (
        <div key={`text-${pIdx}`} className="message-paragraph-group">
          {lines.map((line, lIdx) => {
            if (!line.trim()) {
              return <div key={lIdx} className="line-break-spacer" />;
            }

            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ');
            const lineContent = isBullet ? line.trim().slice(2) : line;

            // Simple inline code highlight: `code`
            const inlineSegments = lineContent.split(/(`[^`]+`)/g);

            return (
              <p key={lIdx} className={`message-text-line ${isBullet ? 'bullet-line' : ''}`}>
                {isBullet && <span className="bullet-pip" aria-hidden="true">›</span>}
                {inlineSegments.map((seg, sIdx) => {
                  if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
                    return (
                      <code key={sIdx} className="inline-code font-mono">
                        {seg.slice(1, -1)}
                      </code>
                    );
                  }
                  return seg;
                })}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div
      ref={elementRef}
      className={`message-item ${isAssistant ? 'assistant' : isSystem ? 'system' : 'user'}`}
      role="article"
      aria-label={`${isAssistant ? 'Gideon' : 'User'} message at ${formatTime(message.created_at)}`}
    >
      <div className="message-avatar">
        {isAssistant ? (
          <div className="gideon-avatar-dot" title="Gideon AI Core">
            <span>G</span>
          </div>
        ) : (
          <div className="user-avatar-dot" title="User">
            <span>U</span>
          </div>
        )}
      </div>

      <div className="message-bubble-wrapper">
        <div className="message-header">
          <span className="message-sender">{isAssistant ? 'Gideon' : 'You'}</span>
          <span className="message-timestamp">{formatTime(message.created_at)}</span>
        </div>

        <div className="message-body">
          {renderFormattedContent(message.content)}
        </div>
      </div>
    </div>
  );
}
