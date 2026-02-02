/**
 * Inline Batch Creation Row Component
 * Clean, polished inline shot creation form
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, X, Check } from 'lucide-react';
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

const SHOT_TYPES: ShotType[] = [
  'wide', 'medium', 'close-up', 'extreme-close', 'over-shoulder', 'pov',
  'aerial', 'low-angle', 'high-angle', 'dutch-angle', 'tracking', 'pan',
  'tilt', 'zoom', 'static', 'handheld', 'steadicam', 'crane', 'dolly', 'custom',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'dolly-in',
  'dolly-out', 'truck-left', 'truck-right', 'crane-up', 'crane-down',
  'zoom-in', 'zoom-out', 'follow', 'orbit', 'push-in', 'pull-out',
  'whip-pan', 'rack-focus', 'custom',
];

const LIGHTING_SETUPS: LightingSetup[] = [
  'natural', 'golden-hour', 'blue-hour', 'overcast', 'studio-three-point',
  'studio-rembrandt', 'studio-split', 'studio-butterfly', 'studio-loop',
  'high-key', 'low-key', 'silhouette', 'backlit', 'side-lit', 'neon',
  'practical', 'mixed', 'custom',
];

const PRIORITIES = [
  { value: 1, label: '1', title: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 2, label: '2', title: 'High', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 3, label: '3', title: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 4, label: '4', title: 'Low', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 5, label: '5', title: 'Optional', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

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

  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  // Keyboard shortcut 'a' to start adding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    // Reset but stay open
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

    setTimeout(() => nameInputRef.current?.focus(), 0);
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

  const handleSubjectsChange = useCallback((value: string) => {
    const subjects = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateField('subjects', subjects);
  }, [updateField]);

  if (!isAdding) {
    return (
      <tr className="border-t-2 border-dashed border-border/50">
        <td colSpan={14} className="px-4 py-4">
          <button
            onClick={() => setIsAdding(true)}
            className="group w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-text-secondary hover:text-primary bg-surface/50 hover:bg-surface rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span>Add new shot</span>
            <span className="text-text-muted">(or press 'a')</span>
          </button>
        </td>
      </tr>
    );
  }

  const priority = PRIORITIES.find((p) => p.value === formData.priority) || PRIORITIES[2];

  return (
    <tr className="bg-primary/[0.08] border-t-2 border-primary/30">
      {/* Checkbox spacer */}
      <td className="px-2 py-4">
        <div className="w-4" />
      </td>

      {/* Drag handle spacer */}
      <td className="px-2 py-4">
        <div className="w-4" />
      </td>

      {/* Shot Number */}
      <td className="px-3 py-4">
        <span className="text-sm font-mono text-text-secondary">{nextShotNumber}</span>
      </td>

      {/* Name - wider, more prominent */}
      <td className="px-3 py-4 min-w-[180px]">
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Shot name..."
          className="w-full px-3 py-2 bg-background border-2 border-primary/40 rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Description */}
      <td className="px-3 py-4 min-w-[200px]">
        <input
          type="text"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Type */}
      <td className="px-3 py-4 w-[100px]">
        <select
          value={formData.shotType}
          onChange={(e) => updateField('shotType', e.target.value as ShotType)}
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
        >
          {SHOT_TYPES.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Movement */}
      <td className="px-3 py-4 w-[110px]">
        <select
          value={formData.cameraMovement}
          onChange={(e) => updateField('cameraMovement', e.target.value as CameraMovement)}
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
        >
          {CAMERA_MOVEMENTS.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Lighting */}
      <td className="px-3 py-4 w-[130px]">
        <select
          value={formData.lighting}
          onChange={(e) => updateField('lighting', e.target.value as LightingSetup)}
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
        >
          {LIGHTING_SETUPS.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Location */}
      <td className="px-3 py-4 w-[140px]">
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => updateField('location', e.target.value || undefined)}
          onKeyDown={handleKeyDown}
          placeholder="Location..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Subjects */}
      <td className="px-3 py-4 w-[150px]">
        <input
          type="text"
          value={formData.subjects?.join(', ') || ''}
          onChange={(e) => handleSubjectsChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Subject1, Subject2"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Status */}
      <td className="px-3 py-4">
        <span className="inline-flex items-center px-2.5 py-1 bg-gray-500/15 text-gray-400 text-xs font-medium rounded-md border border-gray-500/20">
          Planned
        </span>
      </td>

      {/* Priority */}
      <td className="px-3 py-4 w-[80px]">
        <select
          value={formData.priority}
          onChange={(e) => updateField('priority', Number(e.target.value))}
          title={priority.title}
          className={`w-full px-2 py-1.5 rounded-md text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${priority.className}`}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </td>

      {/* Duration */}
      <td className="px-3 py-4 w-[70px]">
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
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-text-primary text-sm text-center placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Actions */}
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Check className="w-3 h-3" />
            Add
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1.5 text-text-secondary hover:text-text-primary text-xs transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default InlineBatchRow;
