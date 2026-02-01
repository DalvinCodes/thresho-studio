/**
 * Shot List View Component
 * Displays shots in table or storyboard view with filtering and sorting
 */

import { useState, useCallback } from 'react';
import { Film, ClipboardList, Play, Copy, Pencil, Trash2 } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot, ShotStatus, ShotType } from '../../../core/types/shotList';
import {
  useShotListStore,
  useSelectedShotList,
  useFilteredShots,
  useViewMode,
  useFilterOptions,
  useListStats,
} from '../store';

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

  const [searchQuery, setSearchQuery] = useState('');

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
          <button
            onClick={() => openCreateShotModal()}
            className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
          >
            + Add Shot
          </button>
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
      <div className="flex-1 overflow-auto">
        {shots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <p className="mb-4">No shots found</p>
            <button
              onClick={() => openCreateShotModal()}
              className="text-primary hover:underline"
            >
              Add your first shot
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <ShotTable
            shots={shots}
            onSelect={selectShot}
            onEdit={onEditShot}
            onDelete={deleteShot}
            onDuplicate={duplicateShot}
            onStatusChange={updateShotStatus}
            onGenerate={onGenerateShot}
          />
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
    </div>
  );
}

// Shot Table Component
interface ShotTableProps {
  shots: Shot[];
  onSelect: (id: UUID) => void;
  onEdit?: (id: UUID) => void;
  onDelete: (id: UUID) => void;
  onDuplicate: (id: UUID) => void;
  onStatusChange: (id: UUID, status: ShotStatus) => void;
  onGenerate?: (id: UUID) => void;
}

function ShotTable({
  shots,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onGenerate,
}: ShotTableProps) {
  const priorityLabels = ['', 'Critical', 'High', 'Medium', 'Low', 'Optional'];

  return (
    <table className="w-full">
      <thead className="bg-surface sticky top-0">
        <tr className="text-left text-sm text-text-secondary">
          <th className="px-4 py-3 font-medium w-16">#</th>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Type</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Priority</th>
          <th className="px-4 py-3 font-medium w-24">Duration</th>
          <th className="px-4 py-3 font-medium w-32">Actions</th>
        </tr>
      </thead>
      <tbody>
        {shots.map((shot, index) => (
          <tr
            key={shot.id}
            onClick={() => onSelect(shot.id)}
            className={`
              border-t border-border cursor-pointer transition-colors
              ${index % 2 === 0 ? 'bg-surface' : 'bg-bg-subtle'}
              hover:bg-surface-raised
            `}
          >
            <td className="px-4 py-3 text-sm font-mono text-text-secondary">
              {shot.shotNumber}
            </td>
            <td className="px-4 py-3">
              <div>
                <p className="text-text-primary font-medium">{shot.name}</p>
                <p className="text-sm text-text-secondary line-clamp-1">
                  {shot.description}
                </p>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-text-primary capitalize">
              {shot.shotType.replace('-', ' ')}
            </td>
            <td className="px-4 py-3">
              <select
                value={shot.status}
                onChange={(e) => {
                  e.stopPropagation();
                  onStatusChange(shot.id, e.target.value as ShotStatus);
                }}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 bg-background border border-border rounded text-sm text-text-primary"
              >
                <option value="planned">Planned</option>
                <option value="scripted">Scripted</option>
                <option value="storyboarded">Storyboarded</option>
                <option value="approved">Approved</option>
                <option value="in-progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </td>
            <td className="px-4 py-3 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs ${
                shot.priority === 1 ? 'bg-red-500/20 text-red-400' :
                shot.priority === 2 ? 'bg-orange-500/20 text-orange-400' :
                shot.priority === 3 ? 'bg-yellow-500/20 text-yellow-400' :
                shot.priority === 4 ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {priorityLabels[shot.priority]}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-text-secondary">
              {shot.duration ? `${shot.duration}s` : '-'}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(shot.id);
                  }}
                  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate?.(shot.id);
                  }}
                  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  title="Generate"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(shot.id);
                  }}
                  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete shot "${shot.name}"?`)) {
                      onDelete(shot.id);
                    }
                  }}
                  className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
