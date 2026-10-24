import React, { useState } from 'react';
import MemoryItem from './MemoryItem';
import MemoryModal from './MemoryModal';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export default function MemoryWorkspace({
  memories,
  loading,
  error,
  onCreateMemory,
  onUpdateMemory,
  onDeleteMemory,
  onRefresh,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', 'general', 'preference', 'directive', 'technical', 'mission'];

  const filteredMemories = memories.filter((mem) => {
    const matchesCategory =
      activeCategory === 'all' || (mem.category && mem.category.toLowerCase() === activeCategory.toLowerCase());
    const matchesSearch =
      !searchQuery.trim() ||
      mem.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenCreateModal = () => {
    setEditingMemory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (memory) => {
    setEditingMemory(memory);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingMemory) {
        await onUpdateMemory(editingMemory.id, formData);
      } else {
        await onCreateMemory(formData);
      }
      setIsModalOpen(false);
      setEditingMemory(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id, key) => {
    const confirmed = window.confirm(`Permanently remove memory directive '${key}' from Gideon neural archives?`);
    if (confirmed) {
      onDeleteMemory(id);
    }
  };

  return (
    <div className="tasks-workspace memory-workspace">
      <div className="tasks-header">
        <div>
          <h2 className="workspace-title">Neural Memory Archives</h2>
          <p className="workspace-subtitle">
            Persistent knowledge, operational directives, and user preferences automatically recalled during conversations.
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreateModal} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Memory Directive
        </button>
      </div>

      <div className="tasks-controls">
        <div className="search-filter-wrapper">
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search stored memory directives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-buttons-group">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              type="button"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="tasks-loading">
          <LoadingSpinner text="Scanning Gideon memory archives..." />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRefresh} />
      ) : filteredMemories.length === 0 ? (
        <div className="tasks-empty-state">
          <div className="empty-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M12 2a9 9 0 0 0-9 9c0 3.2 1.7 6 4.3 7.6L7 22l4-2h1a9 9 0 0 0 9-9 9 9 0 0 0-9-9z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3>No Persistent Memories Recorded</h3>
          <p>
            {searchQuery || activeCategory !== 'all'
              ? 'No memories matched the current search query or category filter.'
              : 'Add long-term directives or tell Gideon "Remember that..." in conversation to establish persistent context.'}
          </p>
          {!searchQuery && activeCategory === 'all' && (
            <button className="btn-secondary" onClick={handleOpenCreateModal} type="button">
              Add First Memory Directive
            </button>
          )}
        </div>
      ) : (
        <div className="tasks-list">
          {filteredMemories.map((mem) => (
            <MemoryItem
              key={mem.id}
              memory={mem}
              onEdit={handleOpenEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <MemoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMemory(null);
        }}
        onSubmit={handleModalSubmit}
        initialMemory={editingMemory}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
