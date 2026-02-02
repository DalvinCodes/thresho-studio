/**
 * Shot List View Component
 * Displays shots in table or storyboard view with filtering and sorting
 */

import { useState, useCallback } from 'react';
import { Film, ClipboardList, Sparkles } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot, ShotStatus, ShotType, CreateShotInput, AspectRatio } from '../../../core/types/shotList';
import { useGenerationStore } from '../../generation';
import { composeShotPrompt, validateShotForGeneration } from '../services/shotPromptService';
import {
  useShotListStore,
  useSelectedShotList,
  useFilteredShots,
  useViewMode,
  useFilterOptions,
  useListStats,
} from '../store';
import { EnhancedShotTable } from './EnhancedShotTable';
import { BatchCreateModal } from './BatchCreateModal';
import { BatchGenerationPanel } from './BatchGenerationPanel';

interface ShotListViewProps {
  shotListId: UUID;
  onEditShot?: (shotId: UUID) => void;
  onGenerateShot?: (shotId: UUID) => void;
}

export function ShotListView({ shotListId, onEditShot, onGenerateShot }: ShotListViewProps) {
  const shotList = useSelectedShotList();
  const shots = useFilteredShots(shotListId);
  const viewMode = useViewMode();
  const filterOptions = useFilterOptions();
  const stats = useListStats(shotListId);

  const store = useShotListStore();
  const setViewMode = store.setViewMode;
  const setFilterOptions = store.setFilterOptions;
  const clearFilters = store.clearFilters;
  const createShot = store.createShot;
  const deleteShot = store.deleteShot;
  const updateShotStatus = store.updateShotStatus;
  const duplicateShot = store.duplicateShot;
  const selectShot = store.selectShot;
  const openCreateShotModal = store.openCreateShotModal;
  const closeCreateShotModal = store.closeCreateShotModal;
  const isCreateShotModalOpen = store.isCreateShotModalOpen;
  const updateShot = store.updateShot;
  const createMultipleShots = store.createMultipleShots;
  const reorderShot = store.reorderShot;

  const { startGeneration } = useGenerationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchGenerationOpen, setIsBatchGenerationOpen] = useState(false);
  const [selectedShotIds, setSelectedShotIds] = useState<UUID[]>([]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilterOptions({ searchQuery: query || undefined });
  }, [setFilterOptions]);

  // Handle status filter
  const handleStatusFilter = useCallback((status: ShotStatus | '') => {
    setFilterOptions({
      status: status ? [status] : undefined,
    });
  }, [setFilterOptions]);

  // Handle shot type filter
  const handleShotTypeFilter = useCallback((type: ShotType | '') => {
    setFilterOptions({
      shotType: type ? [type] : undefined,
    });
  }, [setFilterOptions]);

  // Create new shot
  const handleCreateShot = useCallback((name: string, description: string) => {
    createShot({
      shotListId,
      name,
      description,
    });
    closeCreateShotModal();
  }, [shotListId, createShot, closeCreateShotModal]);

  // Handle batch creation
  const handleCreateMultipleShots = useCallback(async (shotInputs: CreateShotInput[]) => {
    await createMultipleShots(shotInputs);
    setIsBatchModalOpen(false);
  }, [createMultipleShots]);

  // Handle shot updates
  const handleUpdateShot = useCallback((shotId: UUID, updates: Partial<Shot>) => {
    updateShot(shotId, updates);
  }, [updateShot]);

  // Handle single shot generation
  const handleSingleGeneration = useCallback((shotId: UUID, config: { prompt: string; negativePrompt: string; aspectRatio: string; referenceAssetIds?: UUID[]; brandId?: UUID; talentIds?: UUID[] }) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    // Create generation request
    const request = {
      type: 'image' as const,
      customPrompt: config.prompt,
      parameters: {
        negativePrompt: config.negativePrompt,
        aspectRatio: config.aspectRatio,
      },
      brandId: config.brandId,
      talentIds: config.talentIds,
      metadata: {
        shotId: shot.id,
        shotNumber: shot.shotNumber,
        referenceAssetIds: config.referenceAssetIds,
      },
    };

    // Trigger generation
    startGeneration(request);

    // Update shot status to 'in-progress'
    updateShot(shotId, { status: 'in-progress' as ShotStatus });
  }, [shots, startGeneration, updateShot]);

  // Handle batch generation
  const handleBatchGeneration = useCallback((shotIds: UUID[]) => {
    shotIds.forEach(shotId => {
      const shot = shots.find(s => s.id === shotId);
      if (!shot) return;

      // Validate shot
      const validation = validateShotForGeneration(shot);
      if (!validation.valid) return;

      // Compose prompt
      const promptResult = composeShotPrompt({ shot });

      // Trigger generation
      startGeneration({
        type: 'image',
        customPrompt: promptResult.prompt,
        parameters: {
          negativePrompt: promptResult.negativePrompt,
          aspectRatio: shot.aspectRatio,
        },
        metadata: {
          shotId: shot.id,
          shotNumber: shot.shotNumber,
        },
      });

      // Update status
      updateShot(shotId, { status: 'in-progress' as ShotStatus });
    });
  }, [shots, startGeneration, updateShot]);

  if (!shotList) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Select a shot list to view</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{shotList.name}</h2>
            {stats && (
              <p className="text-sm text-text-secondary">
                {stats.total} shots • {stats.completed} completed
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateShotModal()}
              className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
            >
              + Add Shot
            </button>
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-4 py-2 border border-border text-text-primary rounded-3xl hover:bg-surface-raised transition-colors"
            >
              + Add Multiple
            </button>
            <button
              onClick={() => setIsBatchGenerationOpen(true)}
              disabled={selectedShotIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-border text-text-primary rounded-3xl hover:bg-surface-raised transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Generate Selected ({selectedShotIds.length})
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-background rounded-3xl p-1">
            {(['table', 'storyboard'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded capitalize transition-colors flex items-center gap-1.5
                  ${viewMode === mode
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {mode === 'table' ? <ClipboardList className="w-4 h-4" /> : <Film className="w-4 h-4" />} {mode}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search shots..."
            className="flex-1 max-w-xs px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />

          {/* Status Filter */}
          <select
            value={filterOptions.status?.[0] || ''}
            onChange={(e) => handleStatusFilter(e.target.value as ShotStatus | '')}
            className="px-3 py-2 bg-background border border-border rounded-3xl text-text-primary text-sm"
          >
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="scripted">Scripted</option>
            <option value="storyboarded">Storyboarded</option>
            <option value="approved">Approved</option>
            <option value="in-progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Shot Type Filter */}
          <select
            value={filterOptions.shotType?.[0] || ''}
            onChange={(e) => handleShotTypeFilter(e.target.value as ShotType | '')}
            className="px-3 py-2 bg-background border border-border rounded-3xl text-text-primary text-sm"
          >
            <option value="">All Types</option>
            <option value="wide">Wide</option>
            <option value="medium">Medium</option>
            <option value="close-up">Close-up</option>
            <option value="extreme-close">Extreme Close</option>
            <option value="aerial">Aerial</option>
            <option value="tracking">Tracking</option>
          </select>

          {/* Clear Filters */}
          {(filterOptions.status || filterOptions.shotType || filterOptions.searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
            {viewMode === 'table' ? (
          <div className="min-w-[1200px]">
            <EnhancedShotTable
              shots={shots}
              shotListId={shotListId}
              onSelect={selectShot}
              onEdit={onEditShot}
              onDelete={deleteShot}
              onDuplicate={duplicateShot}
              onStatusChange={updateShotStatus}
              onUpdateShot={handleUpdateShot}
              onCreateShot={createShot}
              onReorder={reorderShot}
              onGenerate={onGenerateShot}
              onSelectionChange={setSelectedShotIds}
            />
          </div>
        ) : shots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <p className="mb-4">No shots found</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => openCreateShotModal()}
                className="text-primary hover:underline"
              >
                Add your first shot
              </button>
              <span className="text-text-secondary">or</span>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="text-primary hover:underline"
              >
                Import multiple shots
              </button>
            </div>
          </div>
        ) : (
          <ShotStoryboard
            shots={shots}
            onSelect={selectShot}
            onEdit={onEditShot}
            onGenerate={onGenerateShot}
          />
        )}
      </div>

      {/* Create Modal */}
      {isCreateShotModalOpen && (
        <CreateShotModal
          onClose={() => closeCreateShotModal()}
          onCreate={handleCreateShot}
        />
      )}

      {/* Batch Create Modal */}
      {isBatchModalOpen && (
        <BatchCreateModal
          shotListId={shotListId}
          onClose={() => setIsBatchModalOpen(false)}
          onCreate={handleCreateMultipleShots}
        />
      )}

      {/* Batch Generation Panel */}
      {isBatchGenerationOpen && (
        <BatchGenerationPanel
          shots={shots}
          selectedShotIds={selectedShotIds}
          onClose={() => setIsBatchGenerationOpen(false)}
          onGenerateBatch={handleBatchGeneration}
        />
      )}
    </div>
  );
}

// Storyboard View Component
interface ShotStoryboardProps {
  shots: Shot[];
  onSelect: (id: UUID) => void;
  onEdit?: (id: UUID) => void;
  onGenerate?: (id: UUID) => void;
}

function ShotStoryboard({ shots, onSelect, onEdit, onGenerate }: ShotStoryboardProps) {
  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {shots.map((shot) => (
        <div
          key={shot.id}
          onClick={() => onSelect(shot.id)}
          className="bg-surface rounded-3xl border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
        >
          {/* Thumbnail */}
          <div className="aspect-video bg-background flex items-center justify-center relative">
            {shot.storyboardImageUrl ? (
              <img
                src={shot.storyboardImageUrl}
                alt={shot.name}
                className="w-full h-full object-cover"
              />
            ) : shot.generatedAssetId ? (
              <img
                src={`/assets/${shot.generatedAssetId}/thumbnail`}
                alt={shot.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="w-12 h-12 text-text-secondary opacity-30" />
            )}

            {/* Shot number badge */}
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded font-mono">
              {shot.shotNumber}
            </span>

            {/* Status badge */}
            <span className={`absolute top-2 right-2 px-2 py-0.5 text-white text-xs rounded ${
              shot.status === 'completed' ? 'bg-green-500' :
              shot.status === 'in-progress' ? 'bg-yellow-500' :
              shot.status === 'approved' ? 'bg-blue-500' :
              'bg-gray-500'
            }`}>
              {shot.status}
            </span>
          </div>

          {/* Info */}
          <div className="p-3">
            <h4 className="font-medium text-text-primary text-sm truncate">
              {shot.name}
            </h4>
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {shot.description}
            </p>

            {/* Meta */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-secondary capitalize">
                {shot.shotType.replace('-', ' ')}
              </span>
              {shot.duration && (
                <span className="text-xs text-text-secondary">{shot.duration}s</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(shot.id);
                }}
                className="flex-1 py-1.5 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate?.(shot.id);
                }}
                className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Create Shot Modal
interface CreateShotModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

function CreateShotModal({ onClose, onCreate }: CreateShotModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      onCreate(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-3xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Add New Shot
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Shot Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Opening Wide Shot"
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happens in this shot..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
              disabled={!name.trim() || !description.trim()}
              className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Shot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShotListView;
