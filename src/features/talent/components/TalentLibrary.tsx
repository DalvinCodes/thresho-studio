/**
 * TalentLibrary Component
 * Main library view for browsing and managing talents
 * Redesigned with cinematic editorial aesthetic
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UUID } from '../../../core/types/common';
import type { TalentType } from '../../../core/types/talent';
import {
  useTalentStore,
  useFilteredTalents,
  useTalentTags,
} from '../store';
import { TalentCard } from './TalentCard';
import { User, Palette, Search, Settings2, Cat, Package, Mountain, Sparkles, Plus } from 'lucide-react';

interface TalentLibraryProps {
  onSelectTalent?: (talentId: UUID) => void;
}

const TALENT_TYPES: Array<{ value: TalentType; label: string; icon: React.ReactNode }> = [
  { value: 'character', label: 'Character', icon: <User className="w-4 h-4" /> },
  { value: 'person', label: 'Person', icon: <User className="w-4 h-4" /> },
  { value: 'creature', label: 'Creature', icon: <Cat className="w-4 h-4" /> },
  { value: 'object', label: 'Object', icon: <Package className="w-4 h-4" /> },
  { value: 'environment', label: 'Environment', icon: <Mountain className="w-4 h-4" /> },
  { value: 'style', label: 'Style', icon: <Palette className="w-4 h-4" /> },
];

// Skeleton card component for loading state
function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden border border-[var(--color-border)]">
      {/* Image skeleton */}
      <div className="aspect-square bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-text)]/[0.05] to-transparent animate-shimmer"
             style={{
               backgroundSize: '200% 100%',
               animation: 'shimmer 1.5s infinite'
             }}
        />
      </div>
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-5 bg-[var(--color-text)]/10 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-[var(--color-text)]/5 rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-[var(--color-text)]/5 rounded w-full animate-pulse" />
      </div>
    </div>
  );
}

export function TalentLibrary({ onSelectTalent }: TalentLibraryProps) {
  const navigate = useNavigate();
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
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Simulate loading and trigger mount animation
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = (talentId: UUID) => {
    setSelectedTalent(talentId);
    onSelectTalent?.(talentId);
    navigate(`/talent/${talentId}`);
  };

  const handleEdit = (talentId: UUID) => {
    navigate(`/talent/${talentId}/edit`);
  };

  const handleCreate = (name: string, type: TalentType) => {
    const id = createTalent(name, type);
    setShowCreateModal(false);
    navigate(`/talent/${id}/edit`);
  };

  const handleDuplicate = (talentId: UUID) => {
    const talent = useTalentStore.getState().talents.get(talentId);
    if (talent) {
      const newId = duplicateTalent(talentId, `${talent.name} (Copy)`);
      navigate(`/talent/${newId}/edit`);
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
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-text)] via-[var(--color-text)] to-[var(--color-primary)] bg-clip-text text-transparent tracking-tight">
              Talent Library
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {talents.length} talent{talents.length !== 1 ? 's' : ''} in your library
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-3xl overflow-hidden transition-all duration-250 hover:shadow-[0_0_30px_rgba(var(--color-primary),0.4)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Talent
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-hover)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or tags..."
              className="w-full px-4 py-3 pl-11 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-250"
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)] group-focus-within:text-[var(--color-primary)] transition-colors duration-250" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`group px-4 py-3 border rounded-3xl transition-all duration-250 flex items-center gap-2 ${
              showFilters || activeFilterCount > 0
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]/[0.1]'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <Settings2 className="w-4 h-4 transition-transform duration-250 group-hover:rotate-90" />
            <span className="text-sm font-medium hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showFilters ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div className="p-5 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[var(--color-text)]">Filter Options</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider font-medium">Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ type: null })}
                  className={`px-3 py-1.5 text-sm rounded-3xl transition-all duration-200 ${
                    !filters.type
                      ? 'bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                      : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  All Types
                </button>
                {TALENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilters({ type: type.value })}
                    className={`px-3 py-1.5 text-sm rounded-3xl transition-all duration-200 flex items-center gap-1.5 ${
                      filters.type === type.value
                        ? 'bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                        : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites Filter */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider font-medium">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ isFavorite: undefined })}
                  className={`px-3 py-1.5 text-sm rounded-3xl transition-all duration-200 ${
                    filters.isFavorite === undefined
                      ? 'bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                      : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ isFavorite: true })}
                  className={`px-3 py-1.5 text-sm rounded-3xl transition-all duration-200 flex items-center gap-1.5 ${
                    filters.isFavorite === true
                      ? 'bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                      : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  <span className="text-yellow-400">★</span> Favorites
                </button>
              </div>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 15).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = filters.tags || [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter((t) => t !== tag)
                          : [...currentTags, tag];
                        setFilters({ tags: newTags.length > 0 ? newTags : undefined });
                      }}
                      className={`px-3 py-1.5 text-sm rounded-3xl transition-all duration-200 ${
                        filters.tags?.includes(tag)
                          ? 'bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                          : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Talent Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          // Loading state with skeleton cards
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : talents.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            {searchQuery || activeFilterCount > 0 ? (
              <>
                <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-6 border border-[var(--color-border)]">
                  <Search className="w-10 h-10 text-[var(--color-text-subtle)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">No talents found</h3>
                <p className="text-[var(--color-text-muted)] mb-6 max-w-sm">
                  No talents match your current search or filter criteria. Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-5 py-2.5 bg-[var(--color-surface)] text-[var(--color-text)] rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-all duration-250 font-medium"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 flex items-center justify-center mb-6 border border-[var(--color-primary)]/20">
                  <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">Your talent library is empty</h3>
                <p className="text-[var(--color-text-muted)] mb-8 max-w-md leading-relaxed">
                  Create your first talent to start building your creative library. Talents help you maintain consistent characters, styles, and more across your projects.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-3xl overflow-hidden transition-all duration-250 hover:shadow-[0_0_30px_rgba(var(--color-primary),0.4)] hover:scale-[1.02] active:scale-[0.98]"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create your first talent
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-hover)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {talents.map((talent, index) => (
              <div
                key={talent.id}
                className={`transition-all duration-500 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{
                  transitionDelay: `${Math.min(index * 50, 500)}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <TalentCard
                  talent={talent}
                  onSelect={() => handleSelect(talent.id)}
                  onEdit={() => handleEdit(talent.id)}
                  onFavorite={() => toggleFavorite(talent.id)}
                  onDuplicate={() => handleDuplicate(talent.id)}
                  onDelete={() => handleDelete(talent.id)}
                />
              </div>
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

      {/* Add shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--color-surface)] rounded-3xl p-6 max-w-md w-full border border-[var(--color-border)] shadow-2xl"
        style={{
          animation: 'modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">
          Create New Talent
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">
          Add a new talent to your library
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter talent name"
              autoFocus
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-250"
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TALENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-3 rounded-3xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                    type === t.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]/[0.1]'
                  }`}
                >
                  <div className="text-lg">{t.icon}</div>
                  <div className="text-xs font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-3xl hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-250 font-medium"
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              Create Talent
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default TalentLibrary;
