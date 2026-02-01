/**
 * TalentLibrary Component
 * Main library view for browsing and managing talents
 */

import { useState } from 'react';
import type { UUID } from '../../../core/types/common';
import type { TalentType } from '../../../core/types/talent';
import {
  useTalentStore,
  useFilteredTalents,
  useTalentTags,
} from '../store';
import { TalentCard } from './TalentCard';

interface TalentLibraryProps {
  onSelectTalent?: (talentId: UUID) => void;
  onEditTalent?: (talentId: UUID) => void;
}

const TALENT_TYPES: Array<{ value: TalentType; label: string; icon: string }> = [
  { value: 'character', label: 'Character', icon: '👤' },
  { value: 'person', label: 'Person', icon: '🧑' },
  { value: 'creature', label: 'Creature', icon: '🦄' },
  { value: 'object', label: 'Object', icon: '📦' },
  { value: 'environment', label: 'Environment', icon: '🏞️' },
  { value: 'style', label: 'Style', icon: '🎨' },
];

export function TalentLibrary({ onSelectTalent, onEditTalent }: TalentLibraryProps) {
  const talents = useFilteredTalents();
  const allTags = useTalentTags();
  const {
    createTalent,
    deleteTalent,
    duplicateTalent,
    toggleFavorite,
    setSelectedTalent,
    setSearchQuery,
    setFilters,
    clearFilters,
  } = useTalentStore();

  const searchQuery = useTalentStore((state) => state.searchQuery);
  const filters = useTalentStore((state) => state.filters);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSelect = (talentId: UUID) => {
    setSelectedTalent(talentId);
    onSelectTalent?.(talentId);
  };

  const handleEdit = (talentId: UUID) => {
    onEditTalent?.(talentId);
  };

  const handleCreate = (name: string, type: TalentType) => {
    const id = createTalent(name, type);
    setShowCreateModal(false);
    onEditTalent?.(id);
  };

  const handleDuplicate = (talentId: UUID) => {
    const talent = useTalentStore.getState().talents.get(talentId);
    if (talent) {
      const newId = duplicateTalent(talentId, `${talent.name} (Copy)`);
      onEditTalent?.(newId);
    }
  };

  const handleDelete = (talentId: UUID) => {
    const talent = useTalentStore.getState().talents.get(talentId);
    if (talent && confirm(`Delete "${talent.name}"? This action cannot be undone.`)) {
      deleteTalent(talentId);
    }
  };

  const activeFilterCount =
    (filters.type ? 1 : 0) +
    (filters.isFavorite !== undefined ? 1 : 0) +
    (filters.tags && filters.tags.length > 0 ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Talent Library</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            + New Talent
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search talents..."
              className="w-full px-3 py-2 pl-9 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              🔍
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            ⚙️ {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="mb-3">
              <label className="block text-xs text-text-secondary mb-2">Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ type: null })}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    !filters.type
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All
                </button>
                {TALENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilters({ type: type.value })}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      filters.type === type.value
                        ? 'bg-primary text-white'
                        : 'bg-surface text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites Filter */}
            <div className="mb-3">
              <label className="block text-xs text-text-secondary mb-2">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ isFavorite: undefined })}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    filters.isFavorite === undefined
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ isFavorite: true })}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    filters.isFavorite === true
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ★ Favorites
                </button>
              </div>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-xs text-text-secondary mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = filters.tags || [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter((t) => t !== tag)
                          : [...currentTags, tag];
                        setFilters({ tags: newTags.length > 0 ? newTags : undefined });
                      }}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        filters.tags?.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Talent Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {talents.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery || activeFilterCount > 0 ? (
              <>
                <p className="text-text-secondary mb-2">No talents match your search</p>
                <button
                  onClick={clearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">👤</div>
                <p className="text-text-secondary mb-4">No talent profiles yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Create your first talent
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {talents.map((talent) => (
              <TalentCard
                key={talent.id}
                talent={talent}
                onSelect={() => handleSelect(talent.id)}
                onEdit={() => handleEdit(talent.id)}
                onFavorite={() => toggleFavorite(talent.id)}
                onDuplicate={() => handleDuplicate(talent.id)}
                onDelete={() => handleDelete(talent.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTalentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// Create Talent Modal
interface CreateTalentModalProps {
  onClose: () => void;
  onCreate: (name: string, type: TalentType) => void;
}

function CreateTalentModal({ onClose, onCreate }: CreateTalentModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TalentType>('character');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), type);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Create New Talent
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter talent name"
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TALENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    type === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:text-text-primary hover:border-primary/50'
                  }`}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-xs">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TalentLibrary;
