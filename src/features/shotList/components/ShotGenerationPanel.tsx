/**
 * Shot Generation Panel Component
 * Modal for configuring and triggering AI generation for a shot
 */

import { useState, useMemo } from 'react';
import { Sparkles, X, AlertCircle, Check } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot } from '../../../core/types/shotList';
import { useBrands } from '../../brands/store';
import { useTalents } from '../../talent/store';
import { useAssetStore } from '../../assets/store';
import type { Asset } from '../../../core/types/asset';
import {
  composeShotPrompt,
  validateShotForGeneration,
} from '../services/shotPromptService';

interface ShotGenerationPanelProps {
  shot: Shot;
  onClose: () => void;
  onGenerate: (shotId: UUID, config: GenerationConfig) => void;
}

interface GenerationConfig {
  prompt: string;
  negativePrompt: string;
  referenceAssetIds?: UUID[];
  brandId?: UUID;
  talentIds?: UUID[];
  aspectRatio: string;
}

type TabType = 'prompt' | 'references' | 'settings';

export function ShotGenerationPanel({ shot, onClose, onGenerate }: ShotGenerationPanelProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('prompt');
  const [selectedBrandId, setSelectedBrandId] = useState<UUID | undefined>(undefined);
  const [selectedTalentIds, setSelectedTalentIds] = useState<UUID[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<UUID[]>([]);

  // Data from stores
  const brands = useBrands();
  const talents = useTalents();
  const assets = useAssetStore((state) => state.assets);

  // Get all image assets
  const imageAssets = useMemo(() => {
    return Array.from(assets.values()).filter(
      (asset) => asset.type === 'image' && !asset.isArchived
    );
  }, [assets]);

  // Compose prompt with current selections
  const composedPrompt = useMemo(() => {
    const brand = selectedBrandId ? brands.find((b) => b.id === selectedBrandId) : undefined;
    const selectedTalents = talents.filter((t) => selectedTalentIds.includes(t.id));
    const referenceAssets = imageAssets.filter((a) => selectedReferenceIds.includes(a.id));

    return composeShotPrompt({
      shot,
      brand,
      talent: selectedTalents[0],
      referenceAssets,
    });
  }, [shot, brands, talents, imageAssets, selectedBrandId, selectedTalentIds, selectedReferenceIds]);

  // Validate shot
  const validation = useMemo(() => validateShotForGeneration(shot), [shot]);

  // Handle talent selection
  const toggleTalent = (talentId: UUID) => {
    setSelectedTalentIds((prev) =>
      prev.includes(talentId) ? prev.filter((id) => id !== talentId) : [...prev, talentId]
    );
  };

  // Handle reference selection
  const toggleReference = (assetId: UUID) => {
    setSelectedReferenceIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // Handle generate
  const handleGenerate = () => {
    const config: GenerationConfig = {
      prompt: composedPrompt.prompt,
      negativePrompt: composedPrompt.negativePrompt,
      referenceAssetIds: selectedReferenceIds.length > 0 ? selectedReferenceIds : undefined,
      brandId: selectedBrandId,
      talentIds: selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
      aspectRatio: shot.aspectRatio,
    };
    onGenerate(shot.id, config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-surface rounded-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Generate Shot</h2>
              <p className="text-sm text-text-secondary">
                Shot {shot.shotNumber}: {shot.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-2xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface">
          {(['prompt', 'references', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-6 py-3 text-sm font-medium capitalize transition-colors
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
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {activeTab === 'prompt' && (
            <PromptTab
              composedPrompt={composedPrompt}
              shot={shot}
              validation={validation}
            />
          )}

          {activeTab === 'references' && (
            <ReferencesTab
              brands={brands}
              talents={talents}
              imageAssets={imageAssets}
              selectedBrandId={selectedBrandId}
              selectedTalentIds={selectedTalentIds}
              selectedReferenceIds={selectedReferenceIds}
              onBrandChange={setSelectedBrandId}
              onTalentToggle={toggleTalent}
              onReferenceToggle={toggleReference}
            />
          )}

          {activeTab === 'settings' && <SettingsTab shot={shot} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface">
          <div className="text-sm text-text-secondary">
            {selectedReferenceIds.length > 0 && (
              <span>{selectedReferenceIds.length} reference(s) selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!validation.valid}
              className="px-6 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Prompt Tab
interface PromptTabProps {
  composedPrompt: ReturnType<typeof composeShotPrompt>;
  shot: Shot;
  validation: ReturnType<typeof validateShotForGeneration>;
}

function PromptTab({ composedPrompt, shot, validation }: PromptTabProps) {
  return (
    <div className="space-y-6">
      {/* Validation Error */}
      {!validation.valid && validation.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Validation Error</p>
            <p className="text-sm text-red-400/80">{validation.error}</p>
          </div>
        </div>
      )}

      {/* Shot Info */}
      <div className="flex gap-4 text-sm">
        <div className="px-3 py-1.5 bg-surface rounded-xl border border-border">
          <span className="text-text-secondary">Type:</span>{' '}
          <span className="text-text-primary capitalize">{shot.shotType.replace('-', ' ')}</span>
        </div>
        <div className="px-3 py-1.5 bg-surface rounded-xl border border-border">
          <span className="text-text-secondary">Aspect Ratio:</span>{' '}
          <span className="text-text-primary">{shot.aspectRatio}</span>
        </div>
      </div>

      {/* Main Prompt */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Generated Prompt
        </label>
        <textarea
          value={composedPrompt.prompt}
          readOnly
          rows={6}
          className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary text-sm resize-none focus:outline-none"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Negative Prompt
        </label>
        <textarea
          value={composedPrompt.negativePrompt}
          readOnly
          rows={3}
          className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-secondary text-sm resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}

// References Tab
interface ReferencesTabProps {
  brands: ReturnType<typeof useBrands>;
  talents: ReturnType<typeof useTalents>;
  imageAssets: Asset[];
  selectedBrandId: UUID | undefined;
  selectedTalentIds: UUID[];
  selectedReferenceIds: UUID[];
  onBrandChange: (brandId: UUID | undefined) => void;
  onTalentToggle: (talentId: UUID) => void;
  onReferenceToggle: (assetId: UUID) => void;
}

function ReferencesTab({
  brands,
  talents,
  imageAssets,
  selectedBrandId,
  selectedTalentIds,
  selectedReferenceIds,
  onBrandChange,
  onTalentToggle,
  onReferenceToggle,
}: ReferencesTabProps) {
  return (
    <div className="space-y-6">
      {/* Brand Selector */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Brand Style
        </label>
        <select
          value={selectedBrandId || ''}
          onChange={(e) => onBrandChange(e.target.value ? (e.target.value as UUID) : undefined)}
          className="w-full px-4 py-2.5 bg-surface border border-border rounded-2xl text-text-primary text-sm focus:outline-none focus:border-primary"
        >
          <option value="">No brand (use default style)</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-text-secondary">
          Select a brand to apply its visual style to the generation
        </p>
      </div>

      {/* Talent Multi-select */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Talent
        </label>
        {talents.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">No talents available</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-surface rounded-2xl border border-border">
            {talents.map((talent) => (
              <label
                key={talent.id}
                className="flex items-center gap-3 p-2 hover:bg-surface-hover rounded-xl cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTalentIds.includes(talent.id)}
                  onChange={() => onTalentToggle(talent.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{talent.name}</p>
                  <p className="text-xs text-text-secondary capitalize">{talent.type}</p>
                </div>
                {selectedTalentIds.includes(talent.id) && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Reference Images Grid */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Reference Images
        </label>
        {imageAssets.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">No image assets available</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {imageAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => onReferenceToggle(asset.id)}
                className={`
                  relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                  ${selectedReferenceIds.includes(asset.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                {selectedReferenceIds.includes(asset.id) && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-xs text-white truncate">{asset.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-text-secondary">
          Click images to select them as references for generation
        </p>
      </div>
    </div>
  );
}

// Settings Tab
interface SettingsTabProps {
  shot: Shot;
}

function SettingsTab({ shot }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Camera Movement */}
        <div className="p-4 bg-surface rounded-2xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Camera Movement</p>
          <p className="text-sm font-medium text-text-primary capitalize">
            {shot.cameraMovement.replace('-', ' ')}
          </p>
        </div>

        {/* Lighting */}
        <div className="p-4 bg-surface rounded-2xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Lighting</p>
          <p className="text-sm font-medium text-text-primary capitalize">
            {shot.lighting.replace('-', ' ')}
          </p>
        </div>

        {/* Location */}
        <div className="p-4 bg-surface rounded-2xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Location</p>
          <p className="text-sm font-medium text-text-primary">
            {shot.location || 'Not specified'}
          </p>
        </div>

        {/* Duration */}
        <div className="p-4 bg-surface rounded-2xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Duration</p>
          <p className="text-sm font-medium text-text-primary">
            {shot.duration ? `${shot.duration}s` : 'Not specified'}
          </p>
        </div>
      </div>

      {/* Subjects */}
      {shot.subjects && shot.subjects.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Subjects</p>
          <div className="flex flex-wrap gap-2">
            {shot.subjects.map((subject, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-surface rounded-xl text-sm text-text-primary border border-border"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Props */}
      {shot.props && shot.props.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Props</p>
          <div className="flex flex-wrap gap-2">
            {shot.props.map((prop, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-surface rounded-xl text-sm text-text-primary border border-border"
              >
                {prop}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShotGenerationPanel;
