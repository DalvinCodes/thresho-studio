/**
 * Shot Editor Component
 * Full-featured editor for individual shot details
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UUID } from '../../../core/types/common';
import type {
  Shot,
  ShotType,
  CameraMovement,
  LightingSetup,
  AspectRatio,
  ShotStatus,
} from '../../../core/types/shotList';
import {
  useShotListStore,
  useSelectedShot,
  useSelectedShotList,
  useEquipmentPresets,
} from '../store';
import {
  composeShotPrompt,
  validateShotForGeneration,
  suggestShotType,
  suggestLighting,
} from '../services/shotPromptService';
import { useProvidersForType } from '../../providers/store';
import { useActiveGeneration } from '../../generation/store';

interface ShotEditorProps {
  shotId: UUID;
  onClose?: () => void;
  onGenerate?: (shotId: UUID) => void;
}

export function ShotEditor({ shotId: _shotId, onClose, onGenerate }: ShotEditorProps) {
  const shot = useSelectedShot();
  const shotList = useSelectedShotList();
  const presets = useEquipmentPresets();
  const { updateShot, applyPresetToShot, generateShot, updateShotFromGeneration } = useShotListStore();

  const [activeTab, setActiveTab] = useState<'details' | 'technical' | 'prompt' | 'audio'>('details');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRequestId, setGenerationRequestId] = useState<UUID | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Check if provider is configured for the content type
  const contentType = shotList?.contentType || 'image';
  const availableProviders = useProvidersForType(contentType);
  const activeProviders = availableProviders.filter((p) => p.status === 'active');
  const hasActiveProvider = activeProviders.length > 0;

  // Track active generation status
  const activeGeneration = useActiveGeneration(generationRequestId);

  // Watch for generation completion
  useEffect(() => {
    if (!generationRequestId || !shot) return;

    if (activeGeneration) {
      // Update based on generation status
      if (activeGeneration.status === 'completed') {
        setIsGenerating(false);
        setGenerationSuccess(true);
        setGenerationError(null);
        // Get asset ID from generation result if available
        // For now, mark the shot as completed
        updateShotFromGeneration(shot.id, generationRequestId, undefined);
        setGenerationRequestId(null);
      } else if (activeGeneration.status === 'failed' || activeGeneration.status === 'cancelled') {
        setIsGenerating(false);
        setGenerationSuccess(false);
        setGenerationError('Generation failed. Please try again.');
        updateShotFromGeneration(shot.id, generationRequestId, undefined, 'Generation failed');
        setGenerationRequestId(null);
      }
    }
  }, [activeGeneration, generationRequestId, shot, updateShotFromGeneration]);

  // Clear success/error messages after a delay
  useEffect(() => {
    if (generationSuccess) {
      const timer = setTimeout(() => setGenerationSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [generationSuccess]);

  useEffect(() => {
    if (generationError) {
      const timer = setTimeout(() => setGenerationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [generationError]);

  // Local form state
  const [formData, setFormData] = useState<Partial<Shot>>({});

  // Initialize form data
  useEffect(() => {
    if (shot) {
      setFormData({ ...shot });
    }
  }, [shot?.id]);

  // Validation
  const validation = useMemo(() => {
    if (!shot) return null;
    return validateShotForGeneration({ ...shot, ...formData } as Shot);
  }, [shot, formData]);

  // Generated prompt preview
  const promptPreview = useMemo(() => {
    if (!shot || !shotList) return null;
    return composeShotPrompt({
      shot: { ...shot, ...formData } as Shot,
      shotList,
    });
  }, [shot, shotList, formData]);

  // Shot type suggestions based on description
  const shotTypeSuggestions = useMemo(() => {
    const desc = formData.description || shot?.description || '';
    return suggestShotType(desc);
  }, [formData.description, shot?.description]);

  // Lighting suggestions
  const lightingSuggestions = useMemo(() => {
    const desc = formData.description || shot?.description || '';
    return suggestLighting(desc);
  }, [formData.description, shot?.description]);

  const handleChange = useCallback(<K extends keyof Shot>(key: K, value: Shot[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (shot && Object.keys(formData).length > 0) {
      updateShot(shot.id, formData);
    }
    onClose?.();
  }, [shot, formData, updateShot, onClose]);

  const handleApplyPreset = useCallback((presetId: UUID) => {
    if (shot) {
      applyPresetToShot(shot.id, presetId);
    }
  }, [shot, applyPresetToShot]);

  // Handle generate click
  const handleGenerate = useCallback(async () => {
    if (!shot) return;

    // Save any pending changes first
    if (Object.keys(formData).length > 0) {
      updateShot(shot.id, formData);
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);

    try {
      const requestId = await generateShot(shot.id);
      if (requestId) {
        setGenerationRequestId(requestId);
        // Also call the external handler if provided
        onGenerate?.(shot.id);
      } else {
        setGenerationError('Failed to start generation. Check provider configuration.');
        setIsGenerating(false);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
      setIsGenerating(false);
    }
  }, [shot, formData, updateShot, generateShot, onGenerate]);

  // Determine if generate button should be disabled
  const canGenerate = validation?.isReady && hasActiveProvider && !isGenerating;
  const generateButtonTitle = !validation?.isReady
    ? 'Shot description is required (min 10 characters)'
    : !hasActiveProvider
    ? `No ${contentType} provider configured`
    : isGenerating
    ? 'Generation in progress...'
    : 'Generate content for this shot';

  if (!shot) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Select a shot to edit</p>
      </div>
    );
  }

  const currentData = { ...shot, ...formData };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Shot {shot.shotNumber}: {currentData.name}
            </h2>
            <p className="text-sm text-text-secondary">
              {currentData.shotType} • {currentData.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Generation feedback */}
          {generationSuccess && (
            <span className="text-sm text-green-400">Generation complete!</span>
          )}
          {generationError && (
            <span className="text-sm text-red-400">{generationError}</span>
          )}
          
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            title={generateButtonTitle}
            className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">&#8987;</span>
                Generating...
              </>
            ) : (
              <>Generate</>
            )}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Validation Messages */}
      {validation && (validation.issues.length > 0 || validation.warnings.length > 0) && (
        <div className="px-4 pt-4 space-y-2">
          {validation.issues.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                {validation.issues.map((issue, i) => (
                  <span key={i}>• {issue}<br /></span>
                ))}
              </p>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                {validation.warnings.map((warning, i) => (
                  <span key={i}>• {warning}<br /></span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface">
        {(['details', 'technical', 'prompt', 'audio'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium capitalize transition-colors
              ${activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <DetailsTab
            data={currentData}
            onChange={handleChange}
            shotTypeSuggestions={shotTypeSuggestions}
          />
        )}

        {activeTab === 'technical' && (
          <TechnicalTab
            data={currentData}
            onChange={handleChange}
            presets={presets}
            onApplyPreset={handleApplyPreset}
            lightingSuggestions={lightingSuggestions}
          />
        )}

        {activeTab === 'prompt' && (
          <PromptTab
            promptPreview={promptPreview}
            shot={currentData as Shot}
          />
        )}

        {activeTab === 'audio' && (
          <AudioTab
            data={currentData}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}

// Details Tab
interface DetailsTabProps {
  data: Partial<Shot>;
  onChange: <K extends keyof Shot>(key: K, value: Shot[K]) => void;
  shotTypeSuggestions: ShotType[];
}

function DetailsTab({ data, onChange, shotTypeSuggestions }: DetailsTabProps) {
  const [newSubject, setNewSubject] = useState('');
  const [newProp, setNewProp] = useState('');

  const addSubject = () => {
    if (newSubject.trim()) {
      onChange('subjects', [...(data.subjects || []), newSubject.trim()]);
      setNewSubject('');
    }
  };

  const removeSubject = (index: number) => {
    onChange('subjects', (data.subjects || []).filter((_, i) => i !== index));
  };

  const addProp = () => {
    if (newProp.trim()) {
      onChange('props', [...(data.props || []), newProp.trim()]);
      setNewProp('');
    }
  };

  const removeProp = (index: number) => {
    onChange('props', (data.props || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Shot Number
          </label>
          <input
            type="text"
            value={data.shotNumber || ''}
            onChange={(e) => onChange('shotNumber', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Shot Name
          </label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Description
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe what happens in this shot..."
          rows={4}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary resize-none"
        />
      </div>

      {/* Shot Type with Suggestions */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Shot Type
        </label>
        <select
          value={data.shotType || 'medium'}
          onChange={(e) => onChange('shotType', e.target.value as ShotType)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value="wide">Wide/Establishing</option>
          <option value="medium">Medium</option>
          <option value="close-up">Close-up</option>
          <option value="extreme-close">Extreme Close-up</option>
          <option value="over-shoulder">Over-the-Shoulder</option>
          <option value="pov">Point of View</option>
          <option value="aerial">Aerial/Drone</option>
          <option value="low-angle">Low Angle</option>
          <option value="high-angle">High Angle</option>
          <option value="dutch-angle">Dutch Angle</option>
          <option value="tracking">Tracking</option>
          <option value="steadicam">Steadicam</option>
          <option value="crane">Crane</option>
          <option value="dolly">Dolly</option>
          <option value="static">Static</option>
          <option value="handheld">Handheld</option>
        </select>
        {shotTypeSuggestions.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            <span className="text-xs text-text-secondary">Suggestions:</span>
            {shotTypeSuggestions.map((type) => (
              <button
                key={type}
                onClick={() => onChange('shotType', type)}
                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Location
        </label>
        <input
          type="text"
          value={data.location || ''}
          onChange={(e) => onChange('location', e.target.value)}
          placeholder="Where does this shot take place?"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary"
        />
      </div>

      {/* Subjects */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Subjects (people, objects)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(data.subjects || []).map((subject, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-1"
            >
              {subject}
              <button onClick={() => removeSubject(i)} className="hover:text-red-400">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubject()}
            placeholder="Add subject..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary"
          />
          <button
            onClick={addSubject}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Props */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Props
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(data.props || []).map((prop, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-1"
            >
              {prop}
              <button onClick={() => removeProp(i)} className="hover:text-red-400">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newProp}
            onChange={(e) => setNewProp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProp()}
            placeholder="Add prop..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary"
          />
          <button
            onClick={addProp}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Production Notes
        </label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Additional notes for production..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary resize-none"
        />
      </div>

      {/* Priority and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Priority
          </label>
          <select
            value={data.priority || 3}
            onChange={(e) => onChange('priority', Number(e.target.value))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          >
            <option value={1}>1 - Critical</option>
            <option value={2}>2 - High</option>
            <option value={3}>3 - Medium</option>
            <option value={4}>4 - Low</option>
            <option value={5}>5 - Optional</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Status
          </label>
          <select
            value={data.status || 'planned'}
            onChange={(e) => onChange('status', e.target.value as ShotStatus)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
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
        </div>
      </div>
    </div>
  );
}

// Technical Tab
interface TechnicalTabProps {
  data: Partial<Shot>;
  onChange: <K extends keyof Shot>(key: K, value: Shot[K]) => void;
  presets: ReturnType<typeof useEquipmentPresets>;
  onApplyPreset: (presetId: UUID) => void;
  lightingSuggestions: LightingSetup[];
}

function TechnicalTab({
  data,
  onChange,
  presets,
  onApplyPreset,
  lightingSuggestions,
}: TechnicalTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Equipment Presets */}
      {presets.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Apply Equipment Preset
          </label>
          <div className="flex gap-2 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.id)}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:border-primary transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Movement */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Camera Movement
        </label>
        <select
          value={data.cameraMovement || 'static'}
          onChange={(e) => onChange('cameraMovement', e.target.value as CameraMovement)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value="static">Static</option>
          <option value="pan-left">Pan Left</option>
          <option value="pan-right">Pan Right</option>
          <option value="tilt-up">Tilt Up</option>
          <option value="tilt-down">Tilt Down</option>
          <option value="dolly-in">Dolly In</option>
          <option value="dolly-out">Dolly Out</option>
          <option value="truck-left">Truck Left</option>
          <option value="truck-right">Truck Right</option>
          <option value="crane-up">Crane Up</option>
          <option value="crane-down">Crane Down</option>
          <option value="zoom-in">Zoom In</option>
          <option value="zoom-out">Zoom Out</option>
          <option value="follow">Follow</option>
          <option value="orbit">Orbit</option>
          <option value="push-in">Push In</option>
          <option value="pull-out">Pull Out</option>
          <option value="whip-pan">Whip Pan</option>
          <option value="rack-focus">Rack Focus</option>
        </select>
      </div>

      {/* Lighting */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Lighting Setup
        </label>
        <select
          value={data.lighting || 'natural'}
          onChange={(e) => onChange('lighting', e.target.value as LightingSetup)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value="natural">Natural</option>
          <option value="golden-hour">Golden Hour</option>
          <option value="blue-hour">Blue Hour</option>
          <option value="overcast">Overcast</option>
          <option value="studio-three-point">Studio Three-Point</option>
          <option value="studio-rembrandt">Studio Rembrandt</option>
          <option value="studio-split">Studio Split</option>
          <option value="studio-butterfly">Studio Butterfly</option>
          <option value="studio-loop">Studio Loop</option>
          <option value="high-key">High Key</option>
          <option value="low-key">Low Key</option>
          <option value="silhouette">Silhouette</option>
          <option value="backlit">Backlit</option>
          <option value="side-lit">Side Lit</option>
          <option value="neon">Neon</option>
          <option value="practical">Practical</option>
          <option value="mixed">Mixed</option>
        </select>
        {lightingSuggestions.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            <span className="text-xs text-text-secondary">Suggestions:</span>
            {lightingSuggestions.map((lighting) => (
              <button
                key={lighting}
                onClick={() => onChange('lighting', lighting)}
                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
              >
                {lighting.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Aspect Ratio
        </label>
        <select
          value={data.aspectRatio || '16:9'}
          onChange={(e) => onChange('aspectRatio', e.target.value as AspectRatio)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value="16:9">16:9 (Widescreen)</option>
          <option value="9:16">9:16 (Vertical)</option>
          <option value="4:3">4:3 (Standard)</option>
          <option value="1:1">1:1 (Square)</option>
          <option value="21:9">21:9 (Ultra-wide)</option>
          <option value="2.39:1">2.39:1 (Anamorphic)</option>
          <option value="4:5">4:5 (Portrait)</option>
        </select>
      </div>

      {/* Duration and FPS */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={data.duration || ''}
            onChange={(e) => onChange('duration', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="5"
            min={1}
            max={60}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Frame Rate (FPS)
          </label>
          <select
            value={data.fps || ''}
            onChange={(e) => onChange('fps', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          >
            <option value="">Default</option>
            <option value={24}>24 fps (Film)</option>
            <option value={25}>25 fps (PAL)</option>
            <option value={30}>30 fps (NTSC)</option>
            <option value={60}>60 fps (Smooth)</option>
            <option value={120}>120 fps (Slow-mo)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Prompt Tab
interface PromptTabProps {
  promptPreview: ReturnType<typeof composeShotPrompt> | null;
  shot: Shot;
}

function PromptTab({ promptPreview, shot: _shot }: PromptTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {promptPreview ? (
        <>
          {/* System Prompt */}
          {promptPreview.systemPrompt && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                System Prompt
              </label>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                  {promptPreview.systemPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* User Prompt */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Generated Prompt
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                {promptPreview.userPrompt}
              </pre>
            </div>
          </div>

          {/* Negative Prompt */}
          {promptPreview.negativePrompt && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Negative Prompt
              </label>
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono">
                  {promptPreview.negativePrompt}
                </pre>
              </div>
            </div>
          )}

          {/* Technical Parameters */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Technical Parameters
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(promptPreview.technicalParameters)
                  .filter(([_, v]) => v)
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}:</dt>
                      <dd className="text-text-primary">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </>
      ) : (
        <p className="text-text-secondary">No prompt preview available</p>
      )}
    </div>
  );
}

// Audio Tab
interface AudioTabProps {
  data: Partial<Shot>;
  onChange: <K extends keyof Shot>(key: K, value: Shot[K]) => void;
}

function AudioTab({ data, onChange }: AudioTabProps) {
  const [newSfx, setNewSfx] = useState('');

  const addSfx = () => {
    if (newSfx.trim()) {
      onChange('soundEffects', [...(data.soundEffects || []), newSfx.trim()]);
      setNewSfx('');
    }
  };

  const removeSfx = (index: number) => {
    onChange('soundEffects', (data.soundEffects || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Dialogue */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Dialogue
        </label>
        <textarea
          value={data.dialogue || ''}
          onChange={(e) => onChange('dialogue', e.target.value)}
          placeholder="Enter any dialogue for this shot..."
          rows={4}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary resize-none font-mono"
        />
      </div>

      {/* Sound Effects */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Sound Effects
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(data.soundEffects || []).map((sfx, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm flex items-center gap-1"
            >
              🔊 {sfx}
              <button onClick={() => removeSfx(i)} className="hover:text-red-400">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSfx}
            onChange={(e) => setNewSfx(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSfx()}
            placeholder="Add sound effect..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary"
          />
          <button
            onClick={addSfx}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* Music Cue */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Music Cue
        </label>
        <input
          type="text"
          value={data.musicCue || ''}
          onChange={(e) => onChange('musicCue', e.target.value)}
          placeholder="e.g., Upbeat corporate track, builds tension..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary"
        />
      </div>
    </div>
  );
}

export default ShotEditor;
