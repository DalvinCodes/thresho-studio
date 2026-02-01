# Shot List Batch Operations & CSV Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add batch shot creation, Excel-style drag-to-fill, CSV import, and enhanced table columns (Camera Type, Environment, Subject, Talent) to the shot list feature.

**Architecture:** Extend existing ShotListView component with a new shot table that supports inline editing, selection, and drag-to-fill. Add a CSV parser service for import functionality. The data model already has the fields (location, subjects, talentIds) but the UI needs enhancement.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Zustand (already in use), PapaParse (CSV), lucide-react (icons), @dnd-kit (drag and drop)

---

## Task 1: Install Required Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install CSV parsing library**

```bash
npm install papaparse
npm install -D @types/papaparse
```

**Step 2: Verify installation**

Check `package.json` includes:
```json
"dependencies": {
  "papaparse": "^5.x"
}
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add papaparse for CSV import functionality"
```

---

## Task 2: Create CSV Import Service

**Files:**
- Create: `src/features/shotList/services/csvImportService.ts`

**Step 1: Write the CSV import service**

```typescript
/**
 * CSV Import Service for Shot Lists
 * Handles parsing and validation of CSV files for shot import
 */

import Papa from 'papaparse';
import type { CreateShotInput, ShotType, CameraMovement, LightingSetup } from '../../../core/types/shotList';
import type { UUID } from '../../../core/types/common';

export interface CsvShotRow {
  name: string;
  description: string;
  shotType?: string;
  cameraMovement?: string;
  lighting?: string;
  location?: string;
  subjects?: string;
  talent?: string;
  duration?: string;
  priority?: string;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  shots: CreateShotInput[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

const VALID_SHOT_TYPES = [
  'wide', 'medium', 'close-up', 'extreme-close', 'over-shoulder',
  'pov', 'aerial', 'low-angle', 'high-angle', 'dutch-angle',
  'tracking', 'pan', 'tilt', 'zoom', 'static', 'handheld',
  'steadicam', 'crane', 'dolly', 'custom'
];

const VALID_CAMERA_MOVEMENTS = [
  'static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down',
  'dolly-in', 'dolly-out', 'truck-left', 'truck-right',
  'crane-up', 'crane-down', 'zoom-in', 'zoom-out',
  'follow', 'orbit', 'push-in', 'pull-out', 'whip-pan', 'rack-focus', 'custom'
];

const VALID_LIGHTING_SETUPS = [
  'natural', 'golden-hour', 'blue-hour', 'overcast',
  'studio-three-point', 'studio-rembrandt', 'studio-split',
  'studio-butterfly', 'studio-loop', 'high-key', 'low-key',
  'silhouette', 'backlit', 'side-lit', 'neon', 'practical', 'mixed', 'custom'
];

function normalizeShotType(value: string): ShotType | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  
  // Try exact match first
  if (VALID_SHOT_TYPES.includes(normalized)) return normalized as ShotType;
  
  // Try common variations
  const variations: Record<string, ShotType> = {
    'cu': 'close-up',
    'ecu': 'extreme-close',
    'ots': 'over-shoulder',
    'os': 'over-shoulder',
    'pov': 'pov',
    'drone': 'aerial',
    'gimbal': 'steadicam',
    'steadycam': 'steadicam',
    'wide shot': 'wide',
    'medium shot': 'medium',
    'close up': 'close-up',
    'closeup': 'close-up',
    'extreme close up': 'extreme-close',
    'extreme closeup': 'extreme-close',
  };
  
  return variations[normalized];
}

function normalizeCameraMovement(value: string): CameraMovement | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  
  if (VALID_CAMERA_MOVEMENTS.includes(normalized)) return normalized as CameraMovement;
  
  // Try common variations
  const variations: Record<string, CameraMovement> = {
    'pan left': 'pan-left',
    'pan right': 'pan-right',
    'tilt up': 'tilt-up',
    'tilt down': 'tilt-down',
    'dolly in': 'dolly-in',
    'dolly out': 'dolly-out',
    'push in': 'push-in',
    'pull out': 'pull-out',
    'zoom in': 'zoom-in',
    'zoom out': 'zoom-out',
    'no movement': 'static',
    'none': 'static',
    'follow shot': 'follow',
  };
  
  return variations[normalized];
}

function normalizeLighting(value: string): LightingSetup | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  
  if (VALID_LIGHTING_SETUPS.includes(normalized)) return normalized as LightingSetup;
  
  // Try common variations
  const variations: Record<string, LightingSetup> = {
    'golden hour': 'golden-hour',
    'blue hour': 'blue-hour',
    '3-point': 'studio-three-point',
    'three point': 'studio-three-point',
    '3 point': 'studio-three-point',
    'rembrandt': 'studio-rembrandt',
    'butterfly': 'studio-butterfly',
    'high key': 'high-key',
    'low key': 'low-key',
    'back lit': 'backlit',
    'side lit': 'side-lit',
    'sunset': 'golden-hour',
    'dusk': 'blue-hour',
  };
  
  return variations[normalized];
}

export function parseShotCsv(
  file: File,
  shotListId: UUID
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const result: ImportResult = {
      success: true,
      shots: [],
      errors: [],
      warnings: [],
    };

    Papa.parse<CsvShotRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parseResult) => {
        if (parseResult.errors.length > 0) {
          result.errors = parseResult.errors.map((err, idx) => ({
            row: idx + 2, // +2 because PapaParse is 0-indexed and we have header
            message: err.message,
          }));
          result.success = false;
          resolve(result);
          return;
        }

        parseResult.data.forEach((row, index) => {
          const rowNum = index + 2;
          
          // Validate required fields
          if (!row.name?.trim()) {
            result.errors.push({
              row: rowNum,
              message: 'Shot name is required',
            });
            return;
          }

          if (!row.description?.trim()) {
            result.errors.push({
              row: rowNum,
              message: 'Description is required',
            });
            return;
          }

          // Parse optional fields
          const shotType = normalizeShotType(row.shotType);
          if (row.shotType && !shotType) {
            result.warnings.push({
              row: rowNum,
              message: `Unknown shot type "${row.shotType}", using default`,
            });
          }

          const cameraMovement = normalizeCameraMovement(row.cameraMovement);
          if (row.cameraMovement && !cameraMovement) {
            result.warnings.push({
              row: rowNum,
              message: `Unknown camera movement "${row.cameraMovement}", using default`,
            });
          }

          const lighting = normalizeLighting(row.lighting);
          if (row.lighting && !lighting) {
            result.warnings.push({
              row: rowNum,
              message: `Unknown lighting setup "${row.lighting}", using default`,
            });
          }

          // Parse duration
          let duration: number | undefined;
          if (row.duration) {
            const parsed = parseFloat(row.duration);
            if (!isNaN(parsed) && parsed > 0) {
              duration = parsed;
            }
          }

          // Parse priority
          let priority = 3;
          if (row.priority) {
            const parsed = parseInt(row.priority, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
              priority = parsed;
            }
          }

          // Parse subjects (comma-separated)
          const subjects = row.subjects
            ? row.subjects.split(',').map(s => s.trim()).filter(Boolean)
            : undefined;

          // Parse talent (comma-separated, would need talent lookup in real implementation)
          // For now, just store as string in subjects if talent column is used
          if (row.talent && !subjects?.length) {
            // Talent would normally be resolved to talentIds, but for CSV import
            // we just add to subjects for now
          }

          const shot: CreateShotInput = {
            shotListId,
            name: row.name.trim(),
            description: row.description.trim(),
            shotType,
            cameraMovement,
            lighting,
            location: row.location?.trim() || undefined,
            subjects: subjects?.length ? subjects : undefined,
            duration,
            priority,
          };

          result.shots.push(shot);
        });

        if (result.errors.length > 0) {
          result.success = false;
        }

        resolve(result);
      },
      error: (error) => {
        result.success = false;
        result.errors.push({
          row: 0,
          message: `Failed to parse CSV: ${error.message}`,
        });
        resolve(result);
      },
    });
  });
}

export function generateShotCsvTemplate(): string {
  const headers = [
    'name',
    'description',
    'shotType',
    'cameraMovement',
    'lighting',
    'location',
    'subjects',
    'talent',
    'duration',
    'priority',
    'notes',
  ];

  const exampleRow = [
    'Opening Wide Shot',
    'Wide establishing shot of the city skyline at golden hour',
    'wide',
    'static',
    'golden-hour',
    'City Rooftop',
    'cityscape, skyline',
    'N/A',
    '5',
    '1',
    'Hero shot for intro',
  ];

  return [headers.join(','), exampleRow.join(',')].join('\n');
}
```

**Step 2: Export from shotList feature index**

Modify `src/features/shotList/index.ts` to export the new service:

```typescript
// Add to existing exports
export { parseShotCsv, generateShotCsvTemplate } from './services/csvImportService';
export type { ImportResult, CsvShotRow } from './services/csvImportService';
```

**Step 3: Commit**

```bash
git add src/features/shotList/services/csvImportService.ts src/features/shotList/index.ts
git commit -m "feat: add CSV import service with validation and template generation"
```

---

## Task 3: Create Batch Create Shot Modal

**Files:**
- Create: `src/features/shotList/components/BatchCreateModal.tsx`

**Step 1: Write the batch create modal component**

```typescript
/**
 * Batch Create Shot Modal
 * Allows quick entry of multiple shots at once in a spreadsheet-like interface
 */

import { useState, useCallback } from 'react';
import { X, Plus, Upload, FileDown } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { CreateShotInput, ShotType, CameraMovement, LightingSetup } from '../../../core/types/shotList';
import { parseShotCsv, generateShotCsvTemplate } from '../services/csvImportService';

interface BatchCreateModalProps {
  shotListId: UUID;
  onClose: () => void;
  onCreate: (shots: CreateShotInput[]) => void;
}

type ShotFormRow = {
  id: string;
  name: string;
  description: string;
  shotType: ShotType | '';
  cameraMovement: CameraMovement | '';
  lighting: LightingSetup | '';
  location: string;
  subjects: string;
  duration: string;
  priority: string;
};

const emptyRow = (): ShotFormRow => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  shotType: '',
  cameraMovement: '',
  lighting: '',
  location: '',
  subjects: '',
  duration: '',
  priority: '3',
});

const shotTypeOptions: { value: ShotType; label: string }[] = [
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close', label: 'Extreme Close' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'pov', label: 'POV' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'static', label: 'Static' },
  { value: 'handheld', label: 'Handheld' },
];

const movementOptions: { value: CameraMovement; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'tilt-up', label: 'Tilt Up' },
  { value: 'tilt-down', label: 'Tilt Down' },
  { value: 'dolly-in', label: 'Dolly In' },
  { value: 'dolly-out', label: 'Dolly Out' },
  { value: 'push-in', label: 'Push In' },
  { value: 'pull-out', label: 'Pull Out' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'follow', label: 'Follow' },
  { value: 'orbit', label: 'Orbit' },
];

const lightingOptions: { value: LightingSetup; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'blue-hour', label: 'Blue Hour' },
  { value: 'studio-three-point', label: '3-Point Studio' },
  { value: 'studio-rembrandt', label: 'Rembrandt' },
  { value: 'high-key', label: 'High Key' },
  { value: 'low-key', label: 'Low Key' },
  { value: 'silhouette', label: 'Silhouette' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'neon', label: 'Neon' },
  { value: 'practical', label: 'Practical' },
];

export function BatchCreateModal({ shotListId, onClose, onCreate }: BatchCreateModalProps) {
  const [rows, setRows] = useState<ShotFormRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'csv'>('form');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRow = useCallback((id: string, field: keyof ShotFormRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const handleFillDown = useCallback((sourceId: string, field: keyof ShotFormRow) => {
    const sourceRow = rows.find((r) => r.id === sourceId);
    if (!sourceRow) return;
    
    const sourceIndex = rows.findIndex((r) => r.id === sourceId);
    const value = sourceRow[field];
    
    setRows((prev) =>
      prev.map((row, idx) =>
        idx >= sourceIndex ? { ...row, [field]: value } : row
      )
    );
  }, [rows]);

  const handleSubmit = useCallback(() => {
    const validShots: CreateShotInput[] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      if (!row.name.trim()) {
        if (row.description.trim()) {
          errors.push(`Row ${idx + 1}: Name is required`);
        }
        return;
      }

      if (!row.description.trim()) {
        errors.push(`Row ${idx + 1}: Description is required for "${row.name}"`);
        return;
      }

      validShots.push({
        shotListId,
        name: row.name.trim(),
        description: row.description.trim(),
        shotType: row.shotType || undefined,
        cameraMovement: row.cameraMovement || undefined,
        lighting: row.lighting || undefined,
        location: row.location.trim() || undefined,
        subjects: row.subjects.trim()
          ? row.subjects.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        duration: row.duration ? parseFloat(row.duration) || undefined : undefined,
        priority: parseInt(row.priority, 10) || 3,
      });
    });

    if (errors.length > 0) {
      setImportErrors(errors);
      return;
    }

    if (validShots.length === 0) {
      setImportErrors(['Please add at least one shot']);
      return;
    }

    onCreate(validShots);
  }, [rows, shotListId, onCreate]);

  const handleCsvUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await parseShotCsv(file, shotListId);
    
    if (!result.success) {
      setImportErrors(result.errors.map((e) => `Row ${e.row}: ${e.message}`));
      return;
    }

    // Convert to form rows for preview
    const newRows: ShotFormRow[] = result.shots.map((shot) => ({
      id: crypto.randomUUID(),
      name: shot.name,
      description: shot.description,
      shotType: shot.shotType || '',
      cameraMovement: shot.cameraMovement || '',
      lighting: shot.lighting || '',
      location: shot.location || '',
      subjects: shot.subjects?.join(', ') || '',
      duration: shot.duration?.toString() || '',
      priority: shot.priority?.toString() || '3',
    }));

    setRows(newRows);
    setActiveTab('form');
    setImportErrors([]);
  }, [shotListId]);

  const downloadTemplate = useCallback(() => {
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
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold text-text-primary">
            Add Multiple Shots
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-border">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'form'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'csv'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'csv' ? (
            <div className="space-y-6">
              <div className="bg-background border-2 border-dashed border-border rounded-3xl p-12 text-center">
                <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-primary font-medium mb-2">
                  Upload CSV File
                </p>
                <p className="text-sm text-text-secondary mb-4">
                  Drag and drop or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
                >
                  Select File
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Need a template? Download our CSV template with example data.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-3xl transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
                <div className="col-span-2">Shot Name</div>
                <div className="col-span-2">Description</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Movement</div>
                <div className="col-span-1">Lighting</div>
                <div className="col-span-1">Location</div>
                <div className="col-span-1">Subjects</div>
                <div className="col-span-1">Duration</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    placeholder="Shot name"
                    className="col-span-2 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                    placeholder="Description"
                    className="col-span-2 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={row.shotType}
                    onChange={(e) => updateRow(row.id, 'shotType', e.target.value)}
                    className="col-span-1 px-2 py-2 bg-background border border-border rounded text-sm text-text-primary"
                  >
                    <option value="">-</option>
                    {shotTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.cameraMovement}
                    onChange={(e) => updateRow(row.id, 'cameraMovement', e.target.value)}
                    className="col-span-1 px-2 py-2 bg-background border border-border rounded text-sm text-text-primary"
                  >
                    <option value="">-</option>
                    {movementOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.lighting}
                    onChange={(e) => updateRow(row.id, 'lighting', e.target.value)}
                    className="col-span-1 px-2 py-2 bg-background border border-border rounded text-sm text-text-primary"
                  >
                    <option value="">-</option>
                    {lightingOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.location}
                    onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                    placeholder="Location"
                    className="col-span-1 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={row.subjects}
                    onChange={(e) => updateRow(row.id, 'subjects', e.target.value)}
                    placeholder="Comma separated"
                    className="col-span-1 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    value={row.duration}
                    onChange={(e) => updateRow(row.id, 'duration', e.target.value)}
                    placeholder="sec"
                    className="col-span-1 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={row.priority}
                    onChange={(e) => updateRow(row.id, 'priority', e.target.value)}
                    className="col-span-1 px-2 py-2 bg-background border border-border rounded text-sm text-text-primary"
                  >
                    <option value="1">Critical</option>
                    <option value="2">High</option>
                    <option value="3">Medium</option>
                    <option value="4">Low</option>
                    <option value="5">Optional</option>
                  </select>
                  <div className="col-span-1 flex items-center gap-1">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                      title="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFillDown(row.id, 'name')}
                      className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                      title="Fill down"
                    >
                      <span className="text-xs">↓</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Row Button */}
              <button
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-3xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>
          )}

          {/* Errors */}
          {importErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-3xl">
              <p className="text-sm font-medium text-red-400 mb-2">Please fix the following errors:</p>
              <ul className="text-sm text-red-400 space-y-1">
                {importErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
          >
            Add {rows.filter((r) => r.name.trim()).length} Shots
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchCreateModal;
```

**Step 2: Export from shotList feature index**

Modify `src/features/shotList/index.ts`:

```typescript
export { BatchCreateModal } from './components/BatchCreateModal';
```

**Step 3: Commit**

```bash
git add src/features/shotList/components/BatchCreateModal.tsx src/features/shotList/index.ts
git commit -m "feat: add batch create modal with spreadsheet-style entry and CSV import"
```

---

## Task 4: Create Enhanced Shot Table Component

**Files:**
- Create: `src/features/shotList/components/EnhancedShotTable.tsx`

**Step 1: Write the enhanced shot table with all columns and inline editing**

```typescript
/**
 * Enhanced Shot Table Component
 * Displays shots with all columns and supports inline editing
 */

import { useState, useCallback } from 'react';
import { Pencil, Copy, Trash2, Play, GripVertical } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot, ShotStatus, ShotType, CameraMovement, LightingSetup } from '../../../core/types/shotList';

interface EnhancedShotTableProps {
  shots: Shot[];
  onSelect: (id: UUID) => void;
  onEdit?: (id: UUID) => void;
  onDelete: (id: UUID) => void;
  onDuplicate: (id: UUID) => void;
  onStatusChange: (id: UUID, status: ShotStatus) => void;
  onUpdateShot: (id: UUID, updates: Partial<Shot>) => void;
  onGenerate?: (id: UUID) => void;
  onReorder?: (shotId: UUID, newIndex: number) => void;
}

const priorityLabels = ['', 'Critical', 'High', 'Medium', 'Low', 'Optional'];
const priorityColors = [
  '',
  'bg-red-500/20 text-red-400',
  'bg-orange-500/20 text-orange-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-blue-500/20 text-blue-400',
  'bg-gray-500/20 text-gray-400',
];

const shotTypeOptions: { value: ShotType; label: string }[] = [
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close', label: 'Extreme Close' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'pov', label: 'POV' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
  { value: 'dutch-angle', label: 'Dutch' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'static', label: 'Static' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'steadicam', label: 'Steadicam' },
  { value: 'crane', label: 'Crane' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'custom', label: 'Custom' },
];

const movementOptions: { value: CameraMovement; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'tilt-up', label: 'Tilt Up' },
  { value: 'tilt-down', label: 'Tilt Down' },
  { value: 'dolly-in', label: 'Dolly In' },
  { value: 'dolly-out', label: 'Dolly Out' },
  { value: 'truck-left', label: 'Truck Left' },
  { value: 'truck-right', label: 'Truck Right' },
  { value: 'crane-up', label: 'Crane Up' },
  { value: 'crane-down', label: 'Crane Down' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'follow', label: 'Follow' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'push-in', label: 'Push In' },
  { value: 'pull-out', label: 'Pull Out' },
  { value: 'whip-pan', label: 'Whip Pan' },
  { value: 'rack-focus', label: 'Rack Focus' },
  { value: 'custom', label: 'Custom' },
];

const lightingOptions: { value: LightingSetup; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'blue-hour', label: 'Blue Hour' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'studio-three-point', label: '3-Point' },
  { value: 'studio-rembrandt', label: 'Rembrandt' },
  { value: 'studio-split', label: 'Split' },
  { value: 'studio-butterfly', label: 'Butterfly' },
  { value: 'studio-loop', label: 'Loop' },
  { value: 'high-key', label: 'High Key' },
  { value: 'low-key', label: 'Low Key' },
  { value: 'silhouette', label: 'Silhouette' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'side-lit', label: 'Side Lit' },
  { value: 'neon', label: 'Neon' },
  { value: 'practical', label: 'Practical' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'custom', label: 'Custom' },
];

const statusOptions: { value: ShotStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'scripted', label: 'Scripted' },
  { value: 'storyboarded', label: 'Storyboarded' },
  { value: 'approved', label: 'Approved' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export function EnhancedShotTable({
  shots,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onUpdateShot,
  onGenerate,
  onReorder,
}: EnhancedShotTableProps) {
  const [editingCell, setEditingCell] = useState<{ shotId: UUID; field: keyof Shot } | null>(null);
  const [selectedShots, setSelectedShots] = useState<Set<UUID>>(new Set());
  const [draggingId, setDraggingId] = useState<UUID | null>(null);

  const handleCellClick = useCallback((shotId: UUID, field: keyof Shot, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ shotId, field });
  }, []);

  const handleCellBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleUpdate = useCallback((shotId: UUID, field: keyof Shot, value: unknown) => {
    onUpdateShot(shotId, { [field]: value });
    setEditingCell(null);
  }, [onUpdateShot]);

  const toggleSelection = useCallback((shotId: UUID, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShots((prev) => {
      const next = new Set(prev);
      if (next.has(shotId)) {
        next.delete(shotId);
      } else {
        next.add(shotId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedShots.size === shots.length) {
      setSelectedShots(new Set());
    } else {
      setSelectedShots(new Set(shots.map((s) => s.id)));
    }
  }, [selectedShots.size, shots]);

  const handleDragStart = useCallback((shotId: UUID) => {
    setDraggingId(shotId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: UUID) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetId) {
      // Visual feedback could be added here
    }
  }, [draggingId]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: UUID) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetId && onReorder) {
      const targetIndex = shots.findIndex((s) => s.id === targetId);
      onReorder(draggingId, targetIndex);
    }
    setDraggingId(null);
  }, [draggingId, shots, onReorder]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1400px]">
        <thead className="bg-surface sticky top-0 z-10">
          <tr className="text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
            <th className="px-2 py-3 w-8">
              <input
                type="checkbox"
                checked={selectedShots.size === shots.length && shots.length > 0}
                onChange={handleSelectAll}
                className="rounded border-border"
              />
            </th>
            <th className="px-2 py-3 w-8"></th>
            <th className="px-3 py-3 w-16">#</th>
            <th className="px-3 py-3 min-w-[200px]">Name</th>
            <th className="px-3 py-3 min-w-[250px]">Description</th>
            <th className="px-3 py-3 w-28">Type</th>
            <th className="px-3 py-3 w-32">Movement</th>
            <th className="px-3 py-3 w-28">Lighting</th>
            <th className="px-3 py-3 min-w-[120px]">Location</th>
            <th className="px-3 py-3 min-w-[120px]">Subjects</th>
            <th className="px-3 py-3 w-24">Status</th>
            <th className="px-3 py-3 w-20">Priority</th>
            <th className="px-3 py-3 w-20">Duration</th>
            <th className="px-3 py-3 w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          {shots.map((shot, index) => (
            <tr
              key={shot.id}
              draggable={!!onReorder}
              onDragStart={() => handleDragStart(shot.id)}
              onDragOver={(e) => handleDragOver(e, shot.id)}
              onDrop={(e) => handleDrop(e, shot.id)}
              onClick={() => onSelect(shot.id)}
              className={`
                border-t border-border cursor-pointer transition-colors
                ${index % 2 === 0 ? 'bg-surface' : 'bg-bg-subtle'}
                ${selectedShots.has(shot.id) ? 'bg-primary/10' : 'hover:bg-surface-raised'}
                ${draggingId === shot.id ? 'opacity-50' : ''}
              `}
            >
              {/* Checkbox */}
              <td className="px-2 py-3" onClick={(e) => toggleSelection(shot.id, e)}>
                <input
                  type="checkbox"
                  checked={selectedShots.has(shot.id)}
                  onChange={() => {}}
                  className="rounded border-border"
                />
              </td>

              {/* Drag Handle */}
              <td className="px-2 py-3">
                {onReorder && (
                  <GripVertical className="w-4 h-4 text-text-secondary cursor-grab" />
                )}
              </td>

              {/* Shot Number */}
              <td className="px-3 py-3 text-sm font-mono text-text-secondary">
                {shot.shotNumber}
              </td>

              {/* Name */}
              <td className="px-3 py-3">
                {editingCell?.shotId === shot.id && editingCell.field === 'name' ? (
                  <input
                    type="text"
                    defaultValue={shot.name}
                    autoFocus
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(shot.id, 'name', e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        handleCellBlur();
                      }
                    }}
                    className="w-full px-2 py-1 bg-background border border-primary rounded text-sm"
                  />
                ) : (
                  <p
                    className="text-text-primary font-medium"
                    onClick={(e) => handleCellClick(shot.id, 'name', e)}
                  >
                    {shot.name}
                  </p>
                )}
              </td>

              {/* Description */}
              <td className="px-3 py-3">
                {editingCell?.shotId === shot.id && editingCell.field === 'description' ? (
                  <input
                    type="text"
                    defaultValue={shot.description}
                    autoFocus
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(shot.id, 'description', e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        handleCellBlur();
                      }
                    }}
                    className="w-full px-2 py-1 bg-background border border-primary rounded text-sm"
                  />
                ) : (
                  <p
                    className="text-sm text-text-secondary line-clamp-2"
                    onClick={(e) => handleCellClick(shot.id, 'description', e)}
                  >
                    {shot.description}
                  </p>
                )}
              </td>

              {/* Shot Type */}
              <td className="px-3 py-3">
                <select
                  value={shot.shotType}
                  onChange={(e) => onUpdateShot(shot.id, { shotType: e.target.value as ShotType })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-text-primary"
                >
                  {shotTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Camera Movement */}
              <td className="px-3 py-3">
                <select
                  value={shot.cameraMovement}
                  onChange={(e) => onUpdateShot(shot.id, { cameraMovement: e.target.value as CameraMovement })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-text-primary"
                >
                  {movementOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Lighting */}
              <td className="px-3 py-3">
                <select
                  value={shot.lighting}
                  onChange={(e) => onUpdateShot(shot.id, { lighting: e.target.value as LightingSetup })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-text-primary"
                >
                  {lightingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Location */}
              <td className="px-3 py-3">
                {editingCell?.shotId === shot.id && editingCell.field === 'location' ? (
                  <input
                    type="text"
                    defaultValue={shot.location || ''}
                    autoFocus
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(shot.id, 'location', e.currentTarget.value || undefined);
                      } else if (e.key === 'Escape') {
                        handleCellBlur();
                      }
                    }}
                    className="w-full px-2 py-1 bg-background border border-primary rounded text-sm"
                  />
                ) : (
                  <span
                    className="text-sm text-text-primary"
                    onClick={(e) => handleCellClick(shot.id, 'location', e)}
                  >
                    {shot.location || '-'}
                  </span>
                )}
              </td>

              {/* Subjects */}
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {shot.subjects?.slice(0, 2).map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-background border border-border rounded text-xs text-text-secondary"
                    >
                      {subject}
                    </span>
                  ))}
                  {(shot.subjects?.length || 0) > 2 && (
                    <span className="px-2 py-0.5 text-xs text-text-secondary">
                      +{shot.subjects!.length - 2}
                    </span>
                  )}
                </div>
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <select
                  value={shot.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    onStatusChange(shot.id, e.target.value as ShotStatus);
                  }}
                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-text-primary"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Priority */}
              <td className="px-3 py-3">
                <select
                  value={shot.priority}
                  onChange={(e) => onUpdateShot(shot.id, { priority: parseInt(e.target.value, 10) })}
                  onClick={(e) => e.stopPropagation()}
                  className={`px-2 py-1 rounded text-xs ${priorityColors[shot.priority]}`}
                >
                  <option value={1}>Critical</option>
                  <option value={2}>High</option>
                  <option value={3}>Medium</option>
                  <option value={4}>Low</option>
                  <option value={5}>Optional</option>
                </select>
              </td>

              {/* Duration */}
              <td className="px-3 py-3">
                {editingCell?.shotId === shot.id && editingCell.field === 'duration' ? (
                  <input
                    type="number"
                    defaultValue={shot.duration || ''}
                    autoFocus
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseFloat(e.currentTarget.value);
                        handleUpdate(shot.id, 'duration', !isNaN(value) ? value : undefined);
                      } else if (e.key === 'Escape') {
                        handleCellBlur();
                      }
                    }}
                    className="w-full px-2 py-1 bg-background border border-primary rounded text-sm"
                  />
                ) : (
                  <span
                    className="text-sm text-text-secondary"
                    onClick={(e) => handleCellClick(shot.id, 'duration', e)}
                  >
                    {shot.duration ? `${shot.duration}s` : '-'}
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-3 py-3">
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

      {/* Batch Actions Bar */}
      {selectedShots.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface border border-border rounded-3xl px-6 py-3 shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm text-text-secondary">
            {selectedShots.size} shot{selectedShots.size !== 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => {
              // Batch delete would go here
              if (confirm(`Delete ${selectedShots.size} shots?`)) {
                selectedShots.forEach((id) => onDelete(id));
                setSelectedShots(new Set());
              }
            }}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedShots(new Set())}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default EnhancedShotTable;
```

**Step 2: Export from shotList feature index**

Modify `src/features/shotList/index.ts`:

```typescript
export { EnhancedShotTable } from './components/EnhancedShotTable';
```

**Step 3: Commit**

```bash
git add src/features/shotList/components/EnhancedShotTable.tsx src/features/shotList/index.ts
git commit -m "feat: add enhanced shot table with all columns, inline editing, and selection"
```

---

## Task 5: Update ShotListView to Use New Components

**Files:**
- Modify: `src/features/shotList/components/ShotListView.tsx`

**Step 1: Update imports and replace ShotTable with EnhancedShotTable**

Replace the entire file content:

```typescript
/**
 * Shot List View Component
 * Displays shots in table or storyboard view with filtering and sorting
 */

import { useState, useCallback } from 'react';
import { Film, ClipboardList } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot, ShotStatus, ShotType, CreateShotInput } from '../../../core/types/shotList';
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
  const createMultipleShots = store.createMultipleShots;
  const deleteShot = store.deleteShot;
  const updateShot = store.updateShot;
  const updateShotStatus = store.updateShotStatus;
  const duplicateShot = store.duplicateShot;
  const selectShot = store.selectShot;
  const openCreateShotModal = store.openCreateShotModal;
  const closeCreateShotModal = store.closeCreateShotModal;
  const isCreateShotModalOpen = store.isCreateShotModalOpen;
  const reorderShot = store.reorderShot;

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
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

  // Create multiple shots
  const handleCreateMultipleShots = useCallback((shotInputs: CreateShotInput[]) => {
    // Use batch creation if available, otherwise create individually
    if (createMultipleShots) {
      createMultipleShots(shotInputs);
    } else {
      shotInputs.forEach((input) => createShot(input));
    }
    setIsBatchModalOpen(false);
  }, [createShot, createMultipleShots]);

  // Handle update shot
  const handleUpdateShot = useCallback((shotId: UUID, updates: Partial<Shot>) => {
    updateShot(shotId, updates);
  }, [updateShot]);

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
              onClick={() => setIsBatchModalOpen(true)}
              className="px-4 py-2 border border-primary text-primary rounded-3xl hover:bg-primary/10 transition-colors"
            >
              + Add Multiple
            </button>
            <button
              onClick={() => openCreateShotModal()}
              className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
            >
              + Add Shot
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 flex-wrap">
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => openCreateShotModal()}
                className="text-primary hover:underline"
              >
                Add your first shot
              </button>
              <span>or</span>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="text-primary hover:underline"
              >
                Import multiple shots
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <EnhancedShotTable
            shots={shots}
            onSelect={selectShot}
            onEdit={onEditShot}
            onDelete={deleteShot}
            onDuplicate={duplicateShot}
            onStatusChange={updateShotStatus}
            onUpdateShot={handleUpdateShot}
            onGenerate={onGenerateShot}
            onReorder={reorderShot}
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

      {/* Modals */}
      {isCreateShotModalOpen && (
        <CreateShotModal
          onClose={() => closeCreateShotModal()}
          onCreate={handleCreateShot}
        />
      )}

      {isBatchModalOpen && (
        <BatchCreateModal
          shotListId={shotListId}
          onClose={() => setIsBatchModalOpen(false)}
          onCreate={handleCreateMultipleShots}
        />
      )}
    </div>
  );
}

// Storyboard View Component (unchanged)
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

// Create Shot Modal (unchanged)
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
```

**Step 2: Commit**

```bash
git add src/features/shotList/components/ShotListView.tsx
git commit -m "feat: update ShotListView with enhanced table, batch modal, and CSV import"
```

---

## Task 6: Add Batch Create Method to Store

**Files:**
- Modify: `src/features/shotList/store.ts`

**Step 1: Add createMultipleShots action to store**

Add to `ShotListActions` interface around line 66:

```typescript
// Shot CRUD
createShot: (input: CreateShotInput) => UUID;
createMultipleShots: (inputs: CreateShotInput[]) => UUID[];  // Add this line
updateShot: (id: UUID, updates: Partial<Shot>) => void;
```

**Step 2: Implement createMultipleShots in the store**

Add after `createShot` implementation (around line 346):

```typescript
// Batch create shots
createMultipleShots: (inputs) => {
  const createdIds: UUID[] = [];
  const now = createTimestamp();

  // Get the shot list to use defaults
  const shotList = get().shotLists.get(inputs[0]?.shotListId);
  if (!shotList) throw new Error('Shot list not found');

  // Get the next order index
  const shotsInList = get().getShotsForList(inputs[0].shotListId);
  let maxIndex = shotsInList.reduce((max, s) => Math.max(max, s.orderIndex), -1);

  const shotsToSave: Shot[] = [];

  set((state) => {
    for (const input of inputs) {
      const id = createUUID();

      const shot: Shot = {
        id,
        shotListId: input.shotListId,
        shotNumber: String(shotsInList.length + createdIds.length + 1),
        name: input.name,
        description: input.description,
        shotType: input.shotType || 'medium',
        cameraMovement: input.cameraMovement || 'static',
        lighting: input.lighting || shotList.defaultLighting,
        aspectRatio: input.aspectRatio || shotList.defaultAspectRatio,
        duration: input.duration,
        location: input.location,
        subjects: input.subjects || [],
        props: [],
        status: 'planned',
        priority: input.priority || 3,
        orderIndex: ++maxIndex,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      state.shots.set(id, shot);
      shotsToSave.push(shot);
      createdIds.push(id);

      // Update shot list count
      const list = state.shotLists.get(input.shotListId);
      if (list) {
        list.totalShots++;
        list.updatedAt = now;
      }
    }
  });

  // Persist shots to database
  for (const shot of shotsToSave) {
    saveShotToDb(shot).catch((err) =>
      console.error('Failed to save shot:', err)
    );
  }

  // Persist updated shot list
  const updatedList = get().shotLists.get(inputs[0].shotListId);
  if (updatedList) {
    saveShotListToDb(updatedList).catch((err) =>
      console.error('Failed to update shot list count:', err)
    );
  }

  return createdIds;
},
```

**Step 3: Commit**

```bash
git add src/features/shotList/store.ts
git commit -m "feat: add createMultipleShots batch action to store"
```

---

## Task 7: Fix Import in BatchCreateModal

**Files:**
- Modify: `src/features/shotList/components/BatchCreateModal.tsx`

**Step 1: Add missing useRef import**

Add to imports:

```typescript
import { useState, useCallback, useRef } from 'react';
```

**Step 2: Commit**

```bash
git add src/features/shotList/components/BatchCreateModal.tsx
git commit -m "fix: add missing useRef import in BatchCreateModal"
```

---

## Task 8: Run Lint and Type Check

**Files:**
- All modified files

**Step 1: Run lint**

```bash
npm run lint
```

Expected: Should pass with no errors or warnings

**Step 2: Run type check**

```bash
npm run build
```

Expected: Should complete successfully with TypeScript compilation

**Step 3: If there are errors, fix them**

Common issues to check:
- Missing imports
- Type mismatches
- Unused variables

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type errors"
```

---

## Task 9: Test the Implementation

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Manual testing checklist**

Navigate to a shot list and verify:

1. **Enhanced Table Columns**
   - [ ] All columns visible: #, Name, Description, Type, Movement, Lighting, Location, Subjects, Status, Priority, Duration, Actions
   - [ ] Inline editing works (click cells)
   - [ ] Dropdowns work for Type, Movement, Lighting, Status, Priority

2. **Batch Create Modal**
   - [ ] "+ Add Multiple" button opens modal
   - [ ] Can add multiple rows
   - [ ] Can remove rows
   - [ ] Fill down (↓) button works
   - [ ] Form validation shows errors
   - [ ] Successfully creates shots

3. **CSV Import**
   - [ ] Can switch to CSV tab
   - [ ] Can upload CSV file
   - [ ] Download template works
   - [ ] Import validation works
   - [ ] Successfully imports shots

4. **Drag and Drop Reordering**
   - [ ] Can drag shots to reorder
   - [ ] Order persists after reload

5. **Selection**
   - [ ] Can select individual shots with checkbox
   - [ ] Can select all with header checkbox
   - [ ] Batch actions appear when shots selected

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete shot list batch operations and CSV import"
```

---

## Summary

This implementation adds:

1. **Enhanced Shot Table** - Full-width table with all shot properties visible and editable inline
2. **Batch Create Modal** - Spreadsheet-style interface for adding multiple shots quickly with drag-to-fill
3. **CSV Import** - Upload shot lists from CSV with validation and template download
4. **Row Selection** - Multi-select shots with batch actions
5. **Drag Reordering** - Reorder shots by dragging

All features integrate with the existing Zustand store and maintain data persistence through the existing database service.
