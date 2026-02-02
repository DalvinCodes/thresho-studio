/**
 * Enhanced Shot Table Component
 * Full-featured table with inline editing, selection, and batch operations
 */

import { useState, useCallback, useMemo } from 'react';
import { Pencil, Copy, Trash2, Play, GripVertical } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type {
  Shot,
  ShotStatus,
  ShotType,
  CameraMovement,
  LightingSetup,
  CreateShotInput,
} from '../../../core/types/shotList';
import { InlineBatchRow } from './InlineBatchRow';

interface EnhancedShotTableProps {
  shots: Shot[];
  shotListId: UUID;
  onSelect: (id: UUID) => void;
  onEdit?: (id: UUID) => void;
  onDelete: (id: UUID) => void;
  onDuplicate: (id: UUID) => void;
  onStatusChange: (id: UUID, status: ShotStatus) => void;
  onUpdateShot: (id: UUID, updates: Partial<Shot>) => void;
  onCreateShot: (input: CreateShotInput) => void;
  onGenerate?: (id: UUID) => void;
  onReorder?: (shotId: UUID, newIndex: number) => void;
}

// Dropdown options
const SHOT_TYPES: ShotType[] = [
  'wide',
  'medium',
  'close-up',
  'extreme-close',
  'over-shoulder',
  'pov',
  'aerial',
  'low-angle',
  'high-angle',
  'dutch-angle',
  'tracking',
  'pan',
  'tilt',
  'zoom',
  'static',
  'handheld',
  'steadicam',
  'crane',
  'dolly',
  'custom',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'static',
  'pan-left',
  'pan-right',
  'tilt-up',
  'tilt-down',
  'dolly-in',
  'dolly-out',
  'truck-left',
  'truck-right',
  'crane-up',
  'crane-down',
  'zoom-in',
  'zoom-out',
  'follow',
  'orbit',
  'push-in',
  'pull-out',
  'whip-pan',
  'rack-focus',
  'custom',
];

const LIGHTING_SETUPS: LightingSetup[] = [
  'natural',
  'golden-hour',
  'blue-hour',
  'overcast',
  'studio-three-point',
  'studio-rembrandt',
  'studio-split',
  'studio-butterfly',
  'studio-loop',
  'high-key',
  'low-key',
  'silhouette',
  'backlit',
  'side-lit',
  'neon',
  'practical',
  'mixed',
  'custom',
];

const STATUSES: ShotStatus[] = [
  'planned',
  'scripted',
  'storyboarded',
  'approved',
  'in-progress',
  'review',
  'completed',
  'rejected',
];

const PRIORITIES = [
  { value: 1, label: 'Critical', color: 'bg-red-500/20 text-red-400' },
  { value: 2, label: 'High', color: 'bg-orange-500/20 text-orange-400' },
  { value: 3, label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 4, label: 'Low', color: 'bg-blue-500/20 text-blue-400' },
  { value: 5, label: 'Optional', color: 'bg-gray-500/20 text-gray-400' },
];

// Format label for display
function formatLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Inline editable cell component
interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  className?: string;
}

function EditableCell({ value, onSave, multiline, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = useCallback(() => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel, multiline]
  );

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={2}
          className={`w-full px-2 py-1 bg-background border border-primary rounded text-text-primary text-sm resize-none focus:outline-none ${className}`}
        />
      );
    }

    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`w-full px-2 py-1 bg-background border border-primary rounded text-text-primary text-sm focus:outline-none ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-surface-raised rounded px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
    >
      {value || <span className="text-text-secondary italic">Click to edit</span>}
    </div>
  );
}

// Dropdown cell component
interface DropdownCellProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  className?: string;
}

function DropdownCell<T extends string>({
  value,
  options,
  onChange,
  className,
}: DropdownCellProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      onClick={(e) => e.stopPropagation()}
      className={`w-full px-2 py-1 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatLabel(opt)}
        </option>
      ))}
    </select>
  );
}

// Priority dropdown cell
interface PriorityCellProps {
  value: number;
  onChange: (value: number) => void;
}

function PriorityCell({ value, onChange }: PriorityCellProps) {
  const priority = PRIORITIES.find((p) => p.value === value) || PRIORITIES[2];

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className={`w-full px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${priority.color}`}
    >
      {PRIORITIES.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

// Subjects tags component
function SubjectsTags({ subjects }: { subjects?: string[] }) {
  if (!subjects || subjects.length === 0) {
    return <span className="text-text-secondary text-sm">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {subjects.slice(0, 3).map((subject, idx) => (
        <span
          key={idx}
          className="px-1.5 py-0.5 bg-surface-raised text-text-secondary text-xs rounded"
        >
          {subject}
        </span>
      ))}
      {subjects.length > 3 && (
        <span className="px-1.5 py-0.5 text-text-secondary text-xs">
          +{subjects.length - 3}
        </span>
      )}
    </div>
  );
}

// Duration cell with inline editing
interface DurationCellProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

function DurationCell({ value, onChange }: DurationCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');

  const handleSave = useCallback(() => {
    const num = editValue ? parseInt(editValue, 10) : undefined;
    if (!isNaN(num as number)) {
      onChange(num);
    }
    setIsEditing(false);
  }, [editValue, onChange]);

  const handleCancel = useCallback(() => {
    setEditValue(value?.toString() || '');
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (isEditing) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        min={0}
        className="w-16 px-2 py-1 bg-background border border-primary rounded text-text-primary text-sm text-center focus:outline-none"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-surface-raised rounded px-2 py-1 -mx-2 -my-1 transition-colors text-sm text-text-secondary text-center"
    >
      {value ? `${value}s` : '-'}
    </div>
  );
}

// Batch actions bar
interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
}

function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onDuplicateSelected,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-3xl shadow-lg px-4 py-3 flex items-center gap-4 z-50">
      <span className="text-sm text-text-primary font-medium">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <button
        onClick={onDuplicateSelected}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
      >
        <Copy className="w-4 h-4" />
        Duplicate
      </button>
      <button
        onClick={onDeleteSelected}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
      <div className="h-4 w-px bg-border" />
      <button
        onClick={onClearSelection}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

export function EnhancedShotTable({
  shots,
  shotListId,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onUpdateShot,
  onCreateShot,
  onGenerate,
  onReorder,
}: EnhancedShotTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());
  const [draggedId, setDraggedId] = useState<UUID | null>(null);
  const [dragOverId, setDragOverId] = useState<UUID | null>(null);
  const [, setIsDragging] = useState(false);

  // Selection handlers
  const toggleSelection = useCallback((id: UUID) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === shots.length) {
        return new Set();
      }
      return new Set(shots.map((s) => s.id));
    });
  }, [shots]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch action handlers
  const handleDeleteSelected = useCallback(() => {
    if (confirm(`Delete ${selectedIds.size} shots?`)) {
      selectedIds.forEach((id) => onDelete(id));
      clearSelection();
    }
  }, [selectedIds, onDelete, clearSelection]);

  const handleDuplicateSelected = useCallback(() => {
    selectedIds.forEach((id) => onDuplicate(id));
    clearSelection();
  }, [selectedIds, onDuplicate, clearSelection]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, shotId: UUID) => {
      if (!onReorder) return;
      setDraggedId(shotId);
      setIsDragging(true);
      e.dataTransfer.effectAllowed = 'move';
    },
    [onReorder]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, shotId: UUID) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedId !== shotId) {
        setDragOverId(shotId);
      }
    },
    [draggedId]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetShot: Shot, targetIndex: number) => {
      e.preventDefault();
      if (!onReorder || !draggedId || draggedId === targetShot.id) {
        setDragOverId(null);
        setDraggedId(null);
        setIsDragging(false);
        return;
      }

      // Find the index of the dragged shot
      const draggedIndex = shots.findIndex((s) => s.id === draggedId);
      if (draggedIndex === -1) {
        setDragOverId(null);
        setDraggedId(null);
        setIsDragging(false);
        return;
      }

      // Calculate new index based on drag direction
      let newIndex: number;
      if (draggedIndex < targetIndex) {
        // Dragging down: insert after target
        newIndex = targetIndex;
      } else {
        // Dragging up: insert before target
        newIndex = targetIndex;
      }

      onReorder(draggedId, newIndex);
      setDragOverId(null);
      setDraggedId(null);
      setIsDragging(false);
    },
    [onReorder, draggedId, shots]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    setIsDragging(false);
  }, []);

  // Memoized selection state
  const allSelected = useMemo(
    () => shots.length > 0 && selectedIds.size === shots.length,
    [shots.length, selectedIds.size]
  );

  const someSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < shots.length,
    [selectedIds.size, shots.length]
  );

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-surface sticky top-0 z-10">
            <tr className="text-left text-sm text-text-secondary border-b border-border">
              <th className="px-2 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="px-2 py-3 font-medium w-10">
                {onReorder && <span className="sr-only">Drag</span>}
              </th>
              <th className="px-3 py-3 font-medium w-16">#</th>
              <th className="px-3 py-3 font-medium min-w-[150px]">Name</th>
              <th className="px-3 py-3 font-medium min-w-[200px]">Description</th>
              <th className="px-3 py-3 font-medium w-32">Type</th>
              <th className="px-3 py-3 font-medium w-32">Movement</th>
              <th className="px-3 py-3 font-medium w-32">Lighting</th>
              <th className="px-3 py-3 font-medium min-w-[120px]">Location</th>
              <th className="px-3 py-3 font-medium w-32">Subjects</th>
              <th className="px-3 py-3 font-medium w-32">Status</th>
              <th className="px-3 py-3 font-medium w-28">Priority</th>
              <th className="px-3 py-3 font-medium w-20">Duration</th>
              <th className="px-3 py-3 font-medium w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((shot, index) => {
              const isSelected = selectedIds.has(shot.id);

              const isDragOver = dragOverId === shot.id;
              const isRowDragging = draggedId === shot.id;

              return (
                <tr
                  key={shot.id}
                  onClick={() => onSelect(shot.id)}
                  draggable={!!onReorder}
                  onDragStart={(e) => handleDragStart(e, shot.id)}
                  onDragOver={(e) => handleDragOver(e, shot.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, shot, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    border-t border-border cursor-pointer transition-colors
                    ${index % 2 === 0 ? 'bg-surface' : 'bg-bg-subtle'}
                    ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-raised'}
                    ${isRowDragging ? 'opacity-40' : ''}
                    ${isDragOver ? 'border-t-2 border-primary bg-primary/5' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(shot.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>

                  {/* Drag Handle */}
                  <td
                    className="px-2 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onReorder && (
                      <div className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary hover:bg-background rounded p-1 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                  </td>

                  {/* Shot Number */}
                  <td className="px-3 py-3 text-sm font-mono text-text-secondary">
                    {shot.shotNumber}
                  </td>

                  {/* Name */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EditableCell
                      value={shot.name}
                      onSave={(value) =>
                        onUpdateShot(shot.id, { name: value })
                      }
                      className="font-medium text-text-primary"
                    />
                  </td>

                  {/* Description */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EditableCell
                      value={shot.description}
                      onSave={(value) =>
                        onUpdateShot(shot.id, { description: value })
                      }
                      multiline
                      className="text-sm text-text-secondary line-clamp-2"
                    />
                  </td>

                  {/* Type */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownCell
                      value={shot.shotType}
                      options={SHOT_TYPES}
                      onChange={(value) =>
                        onUpdateShot(shot.id, { shotType: value })
                      }
                    />
                  </td>

                  {/* Movement */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownCell
                      value={shot.cameraMovement}
                      options={CAMERA_MOVEMENTS}
                      onChange={(value) =>
                        onUpdateShot(shot.id, { cameraMovement: value })
                      }
                    />
                  </td>

                  {/* Lighting */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownCell
                      value={shot.lighting}
                      options={LIGHTING_SETUPS}
                      onChange={(value) =>
                        onUpdateShot(shot.id, { lighting: value })
                      }
                    />
                  </td>

                  {/* Location */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EditableCell
                      value={shot.location || ''}
                      onSave={(value) =>
                        onUpdateShot(shot.id, { location: value || undefined })
                      }
                      className="text-sm text-text-primary"
                    />
                  </td>

                  {/* Subjects */}
                  <td className="px-3 py-3">
                    <SubjectsTags subjects={shot.subjects} />
                  </td>

                  {/* Status */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownCell
                      value={shot.status}
                      options={STATUSES}
                      onChange={(value) => onStatusChange(shot.id, value)}
                    />
                  </td>

                  {/* Priority */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PriorityCell
                      value={shot.priority}
                      onChange={(value) =>
                        onUpdateShot(shot.id, { priority: value })
                      }
                    />
                  </td>

                  {/* Duration */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DurationCell
                      value={shot.duration}
                      onChange={(value) =>
                        onUpdateShot(shot.id, { duration: value })
                      }
                    />
                  </td>

                  {/* Actions */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit?.(shot.id)}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onGenerate?.(shot.id)}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                        title="Generate"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicate(shot.id)}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
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
              );
            })}
            <InlineBatchRow
              shotListId={shotListId}
              nextShotNumber={String(shots.length + 1)}
              onCreate={onCreateShot}
            />
          </tbody>
        </table>
      </div>

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
      />
    </div>
  );
}

export default EnhancedShotTable;
