# Shot List Table Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline batch creation row to the table, drag-and-drop reordering, drag-fill functionality, and a comprehensive CSV instructions modal.

**Architecture:** Extend EnhancedShotTable with inline creation capabilities, implement drag-and-drop using native HTML5 API with visual feedback, add drag-fill selection similar to Excel, and create a detailed CSV instructions modal with examples and valid values.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Zustand, PapaParse

---

## Task 1: Add Inline Batch Creation Row

**Files:**
- Create: `src/features/shotList/components/InlineBatchRow.tsx`
- Modify: `src/features/shotList/components/EnhancedShotTable.tsx`
- Modify: `src/features/shotList/index.ts`

**Step 1: Create InlineBatchRow component**

Create a component that renders as the last row of the table with empty editable cells:

```typescript
/**
 * Inline Batch Row Component
 * Allows creating new shots directly in the table
 */

import { useState, useCallback, useRef, KeyboardEvent } from 'react';
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

export function InlineBatchRow({ shotListId, nextShotNumber, onCreate }: InlineBatchRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shotType: 'medium' as ShotType,
    cameraMovement: 'static' as CameraMovement,
    lighting: 'natural' as LightingSetup,
    location: '',
    subjects: '',
    duration: '',
    priority: '3',
  });

  const nameRef = useRef<HTMLInputElement>(null);

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
    // Focus on name input after render
    setTimeout(() => nameRef.current?.focus(), 0);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.name.trim() || !formData.description.trim()) {
      return;
    }

    onCreate({
      shotListId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      shotType: formData.shotType,
      cameraMovement: formData.cameraMovement,
      lighting: formData.lighting,
      location: formData.location.trim() || undefined,
      subjects: formData.subjects.trim()
        ? formData.subjects.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      duration: formData.duration ? parseFloat(formData.duration) || undefined : undefined,
      priority: parseInt(formData.priority, 10),
    });

    // Reset form and stay in adding mode for rapid entry
    setFormData({
      name: '',
      description: '',
      shotType: 'medium',
      cameraMovement: 'static',
      lighting: 'natural',
      location: '',
      subjects: '',
      duration: '',
      priority: '3',
    });

    // Refocus on name input
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [formData, shotListId, onCreate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        setIsAdding(false);
        setFormData({
          name: '',
          description: '',
          shotType: 'medium',
          cameraMovement: 'static',
          lighting: 'natural',
          location: '',
          subjects: '',
          duration: '',
          priority: '3',
        });
      }
    },
    [handleSubmit]
  );

  if (!isAdding) {
    return (
      <tr className="border-t-2 border-dashed border-border">
        <td colSpan={14} className="px-4 py-3">
          <button
            onClick={handleStartAdding}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add new shot (or press 'a' to add)</span>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t-2 border-primary bg-primary/5">
      <td className="px-2 py-3"></td>
      <td className="px-2 py-3"></td>
      <td className="px-3 py-3 text-sm font-mono text-text-secondary">{nextShotNumber}</td>
      <td className="px-3 py-3">
        <input
          ref={nameRef}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Shot name"
          className="w-full px-2 py-1 bg-background border border-primary rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>
      <td className="px-3 py-3">
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Description"
          className="w-full px-2 py-1 bg-background border border-primary rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>
      <td className="px-3 py-3">
        <select
          value={formData.shotType}
          onChange={(e) => setFormData((prev) => ({ ...prev, shotType: e.target.value as ShotType }))}
          className="w-full px-2 py-1 bg-background border border-primary rounded text-xs text-text-primary"
        >
          <option value="wide">Wide</option>
          <option value="medium">Medium</option>
          <option value="close-up">Close-up</option>
          <option value="extreme-close">Extreme Close</option>
          <option value="over-shoulder">Over Shoulder</option>
          <option value="pov">POV</option>
          <option value="aerial">Aerial</option>
          <option value="tracking">Tracking</option>
          <option value="static">Static</option>
          <option value="handheld">Handheld</option>
          <option value="steadicam">Steadicam</option>
          <option value="crane">Crane</option>
          <option value="dolly">Dolly</option>
          <option value="custom">Custom</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={formData.cameraMovement}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, cameraMovement: e.target.value as CameraMovement }))
          }
          className="w-full px-2 py-1 bg-background border border-primary rounded text-xs text-text-primary"
        >
          <option value="static">Static</option>
          <option value="pan-left">Pan Left</option>
          <option value="pan-right">Pan Right</option>
          <option value="tilt-up">Tilt Up</option>
          <option value="tilt-down">Tilt Down</option>
          <option value="dolly-in">Dolly In</option>
          <option value="dolly-out">Dolly Out</option>
          <option value="push-in">Push In</option>
          <option value="pull-out">Pull Out</option>
          <option value="zoom-in">Zoom In</option>
          <option value="zoom-out">Zoom Out</option>
          <option value="follow">Follow</option>
          <option value="orbit">Orbit</option>
          <option value="whip-pan">Whip Pan</option>
          <option value="rack-focus">Rack Focus</option>
          <option value="custom">Custom</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={formData.lighting}
          onChange={(e) => setFormData((prev) => ({ ...prev, lighting: e.target.value as LightingSetup }))}
          className="w-full px-2 py-1 bg-background border border-primary rounded text-xs text-text-primary"
        >
          <option value="natural">Natural</option>
          <option value="golden-hour">Golden Hour</option>
          <option value="blue-hour">Blue Hour</option>
          <option value="studio-three-point">3-Point Studio</option>
          <option value="studio-rembrandt">Rembrandt</option>
          <option value="high-key">High Key</option>
          <option value="low-key">Low Key</option>
          <option value="silhouette">Silhouette</option>
          <option value="backlit">Backlit</option>
          <option value="neon">Neon</option>
          <option value="practical">Practical</option>
          <option value="mixed">Mixed</option>
          <option value="custom">Custom</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Location"
          className="w-full px-2 py-1 bg-background border border-primary rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>
      <td className="px-3 py-3">
        <input
          type="text"
          value={formData.subjects}
          onChange={(e) => setFormData((prev) => ({ ...prev, subjects: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Subject 1, Subject 2"
          className="w-full px-2 py-1 bg-background border border-primary rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>
      <td className="px-3 py-3">
        <select
          value="planned"
          disabled
          className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-text-secondary opacity-50"
        >
          <option value="planned">Planned</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={formData.priority}
          onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
          className="w-full px-2 py-1 bg-background border border-primary rounded text-xs text-text-primary"
        >
          <option value="1">Critical</option>
          <option value="2">High</option>
          <option value="3">Medium</option>
          <option value="4">Low</option>
          <option value="5">Optional</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="sec"
          className="w-full px-2 py-1 bg-background border border-primary rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.description.trim()}
            className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="px-3 py-1 text-text-secondary hover:text-text-primary text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export default InlineBatchRow;
```

**Step 2: Update EnhancedShotTable to include InlineBatchRow**

Modify EnhancedShotTable to:
- Accept `shotListId` and `onCreateShot` props
- Render InlineBatchRow as the last row
- Calculate next shot number

Add to EnhancedShotTableProps interface:
```typescript
interface EnhancedShotTableProps {
  shots: Shot[];
  shotListId: UUID;
  onCreateShot: (input: CreateShotInput) => void;
  // ... existing props
}
```

At the end of the tbody, before closing tag:
```tsx
<InlineBatchRow
  shotListId={shotListId}
  nextShotNumber={String(shots.length + 1)}
  onCreate={onCreateShot}
/>
```

**Step 3: Update exports**

Add to `src/features/shotList/index.ts`:
```typescript
export { InlineBatchRow } from './components/InlineBatchRow';
```

**Step 4: Update ShotListView**

Pass the new props to EnhancedShotTable:
```tsx
<EnhancedShotTable
  shots={shots}
  shotListId={shotListId}
  onCreateShot={createShot}
  // ... other props
/>
```

**Step 5: Run lint and commit**

```bash
npm run lint
```

Expected: No errors in new files.

```bash
git add src/features/shotList/components/InlineBatchRow.tsx
git add src/features/shotList/components/EnhancedShotTable.tsx
git add src/features/shotList/index.ts
git commit -m "feat: add inline batch creation row to shot table"
```

---

## Task 2: Implement Drag-and-Drop Reordering

**Files:**
- Modify: `src/features/shotList/components/EnhancedShotTable.tsx`

**Step 1: Add drag state management**

Add to component state:
```typescript
const [draggedId, setDraggedId] = useState<UUID | null>(null);
const [dragOverId, setDragOverId] = useState<UUID | null>(null);
const [isDragging, setIsDragging] = useState(false);
```

**Step 2: Implement drag handlers**

Add handler functions:
```typescript
const handleDragStart = useCallback((e: React.DragEvent, shotId: UUID) => {
  setDraggedId(shotId);
  setIsDragging(true);
  e.dataTransfer.effectAllowed = 'move';
  // Set drag image or data if needed
  e.dataTransfer.setData('text/plain', shotId);
}, []);

const handleDragOver = useCallback((e: React.DragEvent, shotId: UUID) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (draggedId && draggedId !== shotId) {
    setDragOverId(shotId);
  }
}, [draggedId]);

const handleDragLeave = useCallback(() => {
  setDragOverId(null);
}, []);

const handleDrop = useCallback(
  (e: React.DragEvent, targetId: UUID) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId || !onReorder) {
      setDraggedId(null);
      setDragOverId(null);
      setIsDragging(false);
      return;
    }

    const sourceIndex = shots.findIndex((s) => s.id === draggedId);
    const targetIndex = shots.findIndex((s) => s.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      // Calculate adjusted index based on drag direction
      const adjustedIndex = sourceIndex < targetIndex ? targetIndex : targetIndex;
      onReorder(draggedId, adjustedIndex);
    }

    setDraggedId(null);
    setDragOverId(null);
    setIsDragging(false);
  },
  [draggedId, shots, onReorder]
);

const handleDragEnd = useCallback(() => {
  setDraggedId(null);
  setDragOverId(null);
  setIsDragging(false);
}, []);
```

**Step 3: Update row rendering with drag attributes**

Modify each table row to include drag handlers:
```tsx
<tr
  key={shot.id}
  draggable={!!onReorder}
  onDragStart={(e) => handleDragStart(e, shot.id)}
  onDragOver={(e) => handleDragOver(e, shot.id)}
  onDragLeave={handleDragLeave}
  onDrop={(e) => handleDrop(e, shot.id)}
  onDragEnd={handleDragEnd}
  className={`
    border-t border-border cursor-pointer transition-all duration-200
    ${index % 2 === 0 ? 'bg-surface' : 'bg-bg-subtle'}
    ${selectedShots.has(shot.id) ? 'bg-primary/10' : 'hover:bg-surface-raised'}
    ${draggedId === shot.id ? 'opacity-40' : ''}
    ${dragOverId === shot.id ? 'border-t-2 border-primary bg-primary/5' : ''}
  `}
>
```

**Step 4: Update drag handle styling**

Make the drag handle more visible:
```tsx
<div
  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-background transition-colors"
  title="Drag to reorder"
>
  <GripVertical className="w-4 h-4 text-text-secondary" />
</div>
```

**Step 5: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/components/EnhancedShotTable.tsx
git commit -m "feat: implement drag-and-drop reordering for shot table"
```

---

## Task 3: Add Drag-Fill (Excel-style) Functionality

**Files:**
- Modify: `src/features/shotList/components/EnhancedShotTable.tsx`

**Step 1: Add drag-fill state**

Add to component state:
```typescript
const [isFillMode, setIsFillMode] = useState(false);
const [fillSourceId, setFillSourceId] = useState<UUID | null>(null);
const [fillField, setFillField] = useState<keyof Shot | null>(null);
const [fillTargetIds, setFillTargetIds] = useState<Set<UUID>>(new Set());
```

**Step 2: Create FillHandle component**

Add a small drag handle for each editable cell:
```typescript
interface FillHandleProps {
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}

const FillHandle: React.FC<FillHandleProps> = ({ onDragStart, onDragOver, onDragEnd }) => (
  <div
    draggable
    onDragStart={(e) => {
      e.stopPropagation();
      onDragStart();
    }}
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDragOver();
    }}
    onDragEnd={onDragEnd}
    className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-sm cursor-crosshair opacity-0 hover:opacity-100 transition-opacity"
    title="Drag to fill"
  />
);
```

**Step 3: Implement fill logic**

Add handler functions:
```typescript
const handleFillStart = useCallback((shotId: UUID, field: keyof Shot) => {
  setIsFillMode(true);
  setFillSourceId(shotId);
  setFillField(field);
  setFillTargetIds(new Set());
}, []);

const handleFillOver = useCallback(
  (shotId: UUID) => {
    if (!isFillMode || !fillSourceId || shotId === fillSourceId) return;

    const sourceIndex = shots.findIndex((s) => s.id === fillSourceId);
    const targetIndex = shots.findIndex((s) => s.id === shotId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Select all shots between source and target
    const startIdx = Math.min(sourceIndex, targetIndex);
    const endIdx = Math.max(sourceIndex, targetIndex);

    const newTargets = new Set<UUID>();
    for (let i = startIdx; i <= endIdx; i++) {
      if (shots[i].id !== fillSourceId) {
        newTargets.add(shots[i].id);
      }
    }
    setFillTargetIds(newTargets);
  },
  [isFillMode, fillSourceId, shots]
);

const handleFillEnd = useCallback(() => {
  if (!fillSourceId || !fillField || fillTargetIds.size === 0) {
    setIsFillMode(false);
    setFillSourceId(null);
    setFillField(null);
    setFillTargetIds(new Set());
    return;
  }

  // Get source value
  const sourceShot = shots.find((s) => s.id === fillSourceId);
  if (sourceShot) {
    const value = sourceShot[fillField];

    // Apply to all targets
    fillTargetIds.forEach((targetId) => {
      onUpdateShot(targetId, { [fillField]: value });
    });
  }

  setIsFillMode(false);
  setFillSourceId(null);
  setFillField(null);
  setFillTargetIds(new Set());
}, [fillSourceId, fillField, fillTargetIds, shots, onUpdateShot]);
```

**Step 4: Update cell rendering with fill handles**

Modify cells to include fill handles and highlight during fill mode:
```tsx
// For each editable cell, wrap in relative container with fill handle:
<td
  className={`
    px-3 py-3 relative
    ${fillTargetIds.has(shot.id) && fillField === 'name' ? 'bg-primary/20' : ''}
  `}
>
  {editingCell?.shotId === shot.id && editingCell.field === 'name' ? (
    <input ... />
  ) : (
    <div className="group relative">
      <span onClick={...}>{shot.name}</span>
      <FillHandle
        onDragStart={() => handleFillStart(shot.id, 'name')}
        onDragOver={() => handleFillOver(shot.id)}
        onDragEnd={handleFillEnd}
      />
    </div>
  )}
</td>
```

**Step 5: Add keyboard shortcut for fill-down**

Add Ctrl+D shortcut to fill down from the cell above:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'd' && editingCell) {
      e.preventDefault();
      
      const currentIndex = shots.findIndex((s) => s.id === editingCell.shotId);
      if (currentIndex > 0) {
        const aboveShot = shots[currentIndex - 1];
        const value = aboveShot[editingCell.field];
        onUpdateShot(editingCell.shotId, { [editingCell.field]: value });
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [editingCell, shots, onUpdateShot]);
```

**Step 6: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/components/EnhancedShotTable.tsx
git commit -m "feat: add drag-fill functionality to shot table cells"
```

---

## Task 4: Create CSV Instructions Modal

**Files:**
- Create: `src/features/shotList/components/CsvInstructionsModal.tsx`
- Modify: `src/features/shotList/components/BatchCreateModal.tsx`
- Modify: `src/features/shotList/index.ts`

**Step 1: Create CsvInstructionsModal component**

Create comprehensive documentation modal:

```typescript
/**
 * CSV Instructions Modal
 * Comprehensive guide for CSV import format
 */

import { X, FileText, Download, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { generateShotCsvTemplate } from '../services/csvImportService';

interface CsvInstructionsModalProps {
  onClose: () => void;
}

export function CsvInstructionsModal({ onClose }: CsvInstructionsModalProps) {
  const downloadTemplate = () => {
    const template = generateShotCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shot-list-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shotTypeExamples = [
    { value: 'wide', description: 'Wide establishing shot', aliases: 'wide shot, ws' },
    { value: 'medium', description: 'Medium shot', aliases: 'medium shot, ms' },
    { value: 'close-up', description: 'Close-up on subject', aliases: 'close up, cu, closeup' },
    { value: 'extreme-close', description: 'Extreme close-up', aliases: 'extreme close up, ecu' },
    { value: 'over-shoulder', description: 'Shot from behind subject', aliases: 'over shoulder, os, ots' },
    { value: 'pov', description: 'Point of view shot', aliases: 'point of view' },
    { value: 'aerial', description: 'From above/drone', aliases: 'drone, bird eye' },
    { value: 'tracking', description: 'Following movement', aliases: 'follow shot' },
    { value: 'static', description: 'No camera movement', aliases: 'still, locked off' },
    { value: 'handheld', description: 'Handheld camera', aliases: 'hand held' },
    { value: 'steadicam', description: 'Stabilized movement', aliases: 'gimbal, steady cam' },
    { value: 'crane', description: 'Crane/jib shot', aliases: 'jib' },
    { value: 'dolly', description: 'Dolly movement', aliases: 'dolly shot' },
  ];

  const movementExamples = [
    { value: 'static', description: 'Camera stays still' },
    { value: 'pan-left', description: 'Rotate left horizontally' },
    { value: 'pan-right', description: 'Rotate right horizontally' },
    { value: 'tilt-up', description: 'Tilt camera upward' },
    { value: 'tilt-down', description: 'Tilt camera downward' },
    { value: 'dolly-in', description: 'Move camera closer', aliases: 'push in' },
    { value: 'dolly-out', description: 'Move camera away', aliases: 'pull out' },
    { value: 'truck-left', description: 'Move camera left' },
    { value: 'truck-right', description: 'Move camera right' },
    { value: 'crane-up', description: 'Lift camera up' },
    { value: 'crane-down', description: 'Lower camera down' },
    { value: 'zoom-in', description: 'Zoom lens in', aliases: 'push in' },
    { value: 'zoom-out', description: 'Zoom lens out', aliases: 'pull out' },
    { value: 'follow', description: 'Follow subject movement' },
    { value: 'orbit', description: 'Circle around subject' },
    { value: 'whip-pan', description: 'Fast pan movement', aliases: 'swish pan' },
    { value: 'rack-focus', description: 'Change focus distance', aliases: 'pull focus' },
  ];

  const lightingExamples = [
    { value: 'natural', description: 'Available daylight' },
    { value: 'golden-hour', description: 'Sunrise/sunset light', aliases: 'golden hour, sunset, sunrise' },
    { value: 'blue-hour', description: 'Twilight lighting', aliases: 'blue hour, dusk' },
    { value: 'overcast', description: 'Cloudy day lighting' },
    { value: 'studio-three-point', description: 'Key, fill, back lighting', aliases: '3 point, three point' },
    { value: 'studio-rembrandt', description: 'Dramatic side lighting' },
    { value: 'studio-split', description: 'Half-lit face' },
    { value: 'studio-butterfly', description: 'Butterfly lighting setup' },
    { value: 'studio-loop', description: 'Loop lighting pattern' },
    { value: 'high-key', description: 'Bright, low contrast', aliases: 'high key' },
    { value: 'low-key', description: 'Dark, high contrast', aliases: 'low key' },
    { value: 'silhouette', description: 'Backlit silhouette' },
    { value: 'backlit', description: 'Light from behind', aliases: 'back lit' },
    { value: 'side-lit', description: 'Light from side', aliases: 'side lit' },
    { value: 'neon', description: 'Neon light sources' },
    { value: 'practical', description: 'In-scene light sources' },
    { value: 'mixed', description: 'Multiple light types' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-text-primary">
                CSV Import Guide
              </h3>
              <p className="text-sm text-text-secondary">
                Complete reference for importing shots via CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Quick Start */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h4 className="text-lg font-semibold text-text-primary">Quick Start</h4>
            </div>
            <div className="bg-background rounded-3xl p-4 space-y-3">
              <p className="text-text-primary">
                Your CSV file should have these columns:
              </p>
              <code className="block bg-surface p-3 rounded-3xl text-sm text-text-secondary font-mono">
                name, description, shotType, cameraMovement, lighting, location, subjects, talent, duration, priority, notes
              </code>
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template CSV
                </button>
              </div>
            </div>
          </section>

          {/* Required Fields */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h4 className="text-lg font-semibold text-text-primary">Required Fields</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">name</p>
                <p className="text-sm text-text-secondary">The name of the shot (e.g., "Opening Wide Shot")</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">description</p>
                <p className="text-sm text-text-secondary">Detailed description of what happens in the shot</p>
              </div>
            </div>
          </section>

          {/* Shot Types */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <h4 className="text-lg font-semibold text-text-primary">Shot Types</h4>
            </div>
            <p className="text-text-secondary mb-3">
              Use these exact values in the shotType column. Alternative spellings are automatically converted.
            </p>
            <div className="bg-background rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {shotTypeExamples.map((example) => (
                    <tr key={example.value} className="border-t border-border">
                      <td className="px-4 py-2">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                          {example.value}
                        </code>
                      </td>
                      <td className="px-4 py-2 text-text-secondary">{example.description}</td>
                      <td className="px-4 py-2 text-text-secondary text-xs">
                        {example.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Camera Movements */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <h4 className="text-lg font-semibold text-text-primary">Camera Movements</h4>
            </div>
            <p className="text-text-secondary mb-3">
              Use these values in the cameraMovement column.
            </p>
            <div className="bg-background rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {movementExamples.map((example) => (
                    <tr key={example.value} className="border-t border-border">
                      <td className="px-4 py-2">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                          {example.value}
                        </code>
                      </td>
                      <td className="px-4 py-2 text-text-secondary">{example.description}</td>
                      <td className="px-4 py-2 text-text-secondary text-xs">
                        {example.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lighting Setups */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <h4 className="text-lg font-semibold text-text-primary">Lighting Setups</h4>
            </div>
            <p className="text-text-secondary mb-3">
              Use these values in the lighting column.
            </p>
            <div className="bg-background rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {lightingExamples.map((example) => (
                    <tr key={example.value} className="border-t border-border">
                      <td className="px-4 py-2">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                          {example.value}
                        </code>
                      </td>
                      <td className="px-4 py-2 text-text-secondary">{example.description}</td>
                      <td className="px-4 py-2 text-text-secondary text-xs">
                        {example.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Other Fields */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <h4 className="text-lg font-semibold text-text-primary">Other Fields</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">location</p>
                <p className="text-sm text-text-secondary">Where the shot takes place (free text)</p>
              </div>
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">subjects</p>
                <p className="text-sm text-text-secondary">Comma-separated list (e.g., "person, car, building")</p>
              </div>
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">talent</p>
                <p className="text-sm text-text-secondary">Comma-separated talent names (currently added to subjects)</p>
              </div>
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">duration</p>
                <p className="text-sm text-text-secondary">Shot duration in seconds (number)</p>
              </div>
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">priority</p>
                <p className="text-sm text-text-secondary">1-5 where 1=Critical, 5=Optional (defaults to 3)</p>
              </div>
              <div className="bg-background rounded-3xl p-4">
                <p className="font-medium text-text-primary mb-1">notes</p>
                <p className="text-sm text-text-secondary">Additional notes (not currently imported)</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4">
            <h4 className="font-semibold text-text-primary mb-2">Pro Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
              <li>The first row of your CSV must be the header row with column names</li>
              <li>Values are case-insensitive and extra spaces are trimmed automatically</li>
              <li>Unknown values for shotType, cameraMovement, or lighting will use defaults</li>
              <li>Download the template CSV for a working example</li>
              <li>Only name and description are required - all other fields are optional</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-3xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvInstructionsModal;
```

**Step 2: Update BatchCreateModal to include instructions button**

Add instructions button to the CSV import tab:

```typescript
// Add import
import { CsvInstructionsModal } from './CsvInstructionsModal';

// Add state
const [showInstructions, setShowInstructions] = useState(false);

// In the CSV tab section, add instructions button:
<div className="flex items-center justify-between mb-4">
  <div>
    <h4 className="font-medium text-text-primary">Upload CSV File</h4>
    <p className="text-sm text-text-secondary">Import multiple shots at once</p>
  </div>
  <button
    onClick={() => setShowInstructions(true)}
    className="flex items-center gap-2 px-3 py-1.5 text-primary hover:bg-primary/10 rounded-3xl transition-colors text-sm"
  >
    <HelpCircle className="w-4 h-4" />
    Instructions
  </button>
</div>

// Render instructions modal:
{showInstructions && (
  <CsvInstructionsModal onClose={() => setShowInstructions(false)} />
)}
```

**Step 3: Update exports**

Add to `src/features/shotList/index.ts`:
```typescript
export { CsvInstructionsModal } from './components/CsvInstructionsModal';
```

**Step 4: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/components/CsvInstructionsModal.tsx
git add src/features/shotList/components/BatchCreateModal.tsx
git add src/features/shotList/index.ts
git commit -m "feat: add comprehensive CSV instructions modal with examples"
```

---

## Task 5: Run Final Verification

**Step 1: Run full lint check**

```bash
npm run lint
```

Expected: No errors in shotList components.

**Step 2: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Final commit summary**

```bash
git log --oneline -10
```

Expected: All 4 commits present:
- feat: add inline batch creation row to shot table
- feat: implement drag-and-drop reordering for shot table
- feat: add drag-fill functionality to shot table cells
- feat: add comprehensive CSV instructions modal with examples

---

## Summary

This implementation adds:

1. **Inline Batch Creation** - Add shots directly in the table with a "+ Add new shot" row at the bottom
2. **Drag-and-Drop Reordering** - Drag shot rows to reorder them with visual feedback
3. **Drag-Fill** - Excel-style cell dragging to copy values down (with Ctrl+D keyboard shortcut)
4. **CSV Instructions Modal** - Comprehensive guide with all valid values, examples, and tips

All features integrate seamlessly with the existing shot list functionality.
