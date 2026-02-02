/**
 * Inline Batch Creation Row Component
 * Allows rapid inline shot creation at the bottom of the shot table
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type {
  CreateShotInput,
  ShotType,
  CameraMovement,
  LightingSetup,
} from '../../../core/types/shotList';

interface InlineBatchRowProps {
  shotListId: UUID;
  nextShotNumber: string;
  onCreate: (input: CreateShotInput) => void;
}

// Dropdown options (same as EnhancedShotTable)
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

export function InlineBatchRow({ shotListId, nextShotNumber, onCreate }: InlineBatchRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<CreateShotInput>({
    shotListId,
    name: '',
    description: '',
    shotType: 'medium',
    cameraMovement: 'static',
    lighting: 'natural',
    location: '',
    subjects: [],
    duration: undefined,
    priority: 3,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when entering add mode
  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  // Global keyboard shortcut to start adding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not already adding and not typing in an input
      if (isAdding) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setIsAdding(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding]);

  const handleSubmit = useCallback(() => {
    if (!formData.name.trim()) return;

    onCreate({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });

    // Reset form but stay in add mode for rapid entry
    setFormData({
      shotListId,
      name: '',
      description: '',
      shotType: 'medium',
      cameraMovement: 'static',
      lighting: 'natural',
      location: '',
      subjects: [],
      duration: undefined,
      priority: 3,
    });

    // Refocus name input
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
  }, [formData, onCreate, shotListId]);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setFormData({
      shotListId,
      name: '',
      description: '',
      shotType: 'medium',
      cameraMovement: 'static',
      lighting: 'natural',
      location: '',
      subjects: [],
      duration: undefined,
      priority: 3,
    });
  }, [shotListId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSubmit, handleCancel]);

  const updateField = useCallback(<K extends keyof CreateShotInput>(
    field: K,
    value: CreateShotInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Parse subjects from comma-separated string
  const handleSubjectsChange = useCallback((value: string) => {
    const subjects = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateField('subjects', subjects);
  }, [updateField]);

  if (!isAdding) {
    return (
      <tr className="border-t border-border border-dashed">
        <td colSpan={14} className="px-3 py-3">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-primary hover:bg-surface-raised rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add new shot (or press 'a' to add)</span>
          </button>
        </td>
      </tr>
    );
  }

  const priority = PRIORITIES.find((p) => p.value === formData.priority) || PRIORITIES[2];

  return (
    <tr className="border-t-2 border-primary bg-primary/5">
      {/* Checkbox - empty for new row */}
      <td className="px-2 py-3">
        <div className="w-4 h-4" />
      </td>

      {/* Drag Handle - empty for new row */}
      <td className="px-2 py-3">
        <div className="w-4 h-4" />
      </td>

      {/* Shot Number */}
      <td className="px-3 py-3 text-sm font-mono text-text-secondary">
        {nextShotNumber}
      </td>

      {/* Name */}
      <td className="px-3 py-2">
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Shot name..."
          className="w-full px-2 py-1 bg-background border border-primary rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>

      {/* Description */}
      <td className="px-3 py-2">
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description..."
          rows={1}
          className="w-full px-2 py-1 bg-background border border-border rounded text-text-primary text-sm resize-none focus:outline-none focus:border-primary"
        />
      </td>

      {/* Type */}
      <td className="px-3 py-2">
        <select
          value={formData.shotType}
          onChange={(e) => updateField('shotType', e.target.value as ShotType)}
          className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer"
        >
          {SHOT_TYPES.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Movement */}
      <td className="px-3 py-2">
        <select
          value={formData.cameraMovement}
          onChange={(e) => updateField('cameraMovement', e.target.value as CameraMovement)}
          className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer"
        >
          {CAMERA_MOVEMENTS.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Lighting */}
      <td className="px-3 py-2">
        <select
          value={formData.lighting}
          onChange={(e) => updateField('lighting', e.target.value as LightingSetup)}
          className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer"
        >
          {LIGHTING_SETUPS.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Location */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => updateField('location', e.target.value || undefined)}
          onKeyDown={handleKeyDown}
          placeholder="Location..."
          className="w-full px-2 py-1 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-primary"
        />
      </td>

      {/* Subjects */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={formData.subjects?.join(', ') || ''}
          onChange={(e) => handleSubjectsChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Subject1, Subject2..."
          className="w-full px-2 py-1 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-primary"
        />
      </td>

      {/* Status - always planned for new shots */}
      <td className="px-3 py-2">
        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
          Planned
        </span>
      </td>

      {/* Priority */}
      <td className="px-3 py-2">
        <select
          value={formData.priority}
          onChange={(e) => updateField('priority', Number(e.target.value))}
          className={`w-full px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${priority.color}`}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </td>

      {/* Duration */}
      <td className="px-3 py-2">
        <input
          type="number"
          value={formData.duration || ''}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
            updateField('duration', val);
          }}
          onKeyDown={handleKeyDown}
          placeholder="sec"
          min={0}
          className="w-16 px-2 py-1 bg-background border border-border rounded text-text-primary text-sm text-center focus:outline-none focus:border-primary"
        />
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-text-secondary text-xs hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export default InlineBatchRow;
