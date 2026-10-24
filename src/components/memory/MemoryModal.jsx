import React, { useState, useEffect } from 'react';

export default function MemoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialMemory = null,
  isSubmitting = false,
}) {
  const [key, setKey] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');

  useEffect(() => {
    if (initialMemory) {
      setKey(initialMemory.key || '');
      setContent(initialMemory.content || '');
      setCategory(initialMemory.category || 'general');
    } else {
      setKey('');
      setContent('');
      setCategory('general');
    }
  }, [initialMemory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!key.trim() || !content.trim() || isSubmitting) return;

    onSubmit({
      key: key.trim(),
      content: content.trim(),
      category: category.trim().toLowerCase(),
    });
  };

  const isEditing = Boolean(initialMemory);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Modify Memory Directive' : 'Commit New Memory Directive'}</h3>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="memory-key">Directive Key / Title *</label>
            <input
              id="memory-key"
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. user_preferred_response_style"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="memory-category">Category</label>
            <select
              id="memory-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="general">General Context</option>
              <option value="preference">User Preference</option>
              <option value="directive">Operational Directive</option>
              <option value="technical">Technical Architecture</option>
              <option value="mission">Mission History</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="memory-content">Memory Content *</label>
            <textarea
              id="memory-content"
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. User prefers concise, bulleted technical answers by default and appreciates Star Wars or DC Easter eggs when appropriate."
            />
            <small className="form-hint">
              Security note: Saved memories are injected into model context as untrusted reference data. Do not store sensitive secrets or credentials here.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !key.trim() || !content.trim()}
            >
              {isSubmitting ? 'Archiving...' : isEditing ? 'Update Memory' : 'Commit Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
