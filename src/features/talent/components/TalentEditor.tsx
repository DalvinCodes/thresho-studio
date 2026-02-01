/**
 * TalentEditor Component
 * Full editor panel for talent profiles
 */

import { useState, useEffect, useCallback } from 'react';
import type { UUID } from '../../../core/types/common';
import type {
  TalentProfile,
  TalentType,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
  TalentReferenceImage,
} from '../../../core/types/talent';
import {
  useTalentStore,
  useSelectedTalent,
  useTalentEditor,
} from '../store';
import { composeTalentPrompt } from '../services/talentPromptService';

interface TalentEditorProps {
  talentId: UUID;
  onClose?: () => void;
}

const TALENT_TYPES: Array<{ value: TalentType; label: string; icon: string }> = [
  { value: 'character', label: 'Character', icon: '👤' },
  { value: 'person', label: 'Person', icon: '🧑' },
  { value: 'creature', label: 'Creature', icon: '🦄' },
  { value: 'object', label: 'Object', icon: '📦' },
  { value: 'environment', label: 'Environment', icon: '🏞️' },
  { value: 'style', label: 'Style', icon: '🎨' },
];

export function TalentEditor({ talentId, onClose }: TalentEditorProps) {
  const talent = useSelectedTalent();
  const { draft, isDirty } = useTalentEditor();
  const {
    startEditing,
    updateDraft,
    saveDraft,
    discardDraft,
    validateTalent,
    addReferenceImage,
    removeReferenceImage,
    setPrimaryImage,
    addTag,
    removeTag,
  } = useTalentStore();

  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'personality' | 'images' | 'prompts'
  >('general');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateTalent> | null>(null);
  const [promptPreview, setPromptPreview] = useState('');

  // Initialize editor
  useEffect(() => {
    startEditing(talentId);
    return () => discardDraft();
  }, [talentId]);

  // Validate on changes
  useEffect(() => {
    if (draft) {
      setValidationResult(validateTalent(talentId));
    }
  }, [draft, talentId]);

  // Update prompt preview
  useEffect(() => {
    if (talent) {
      setPromptPreview(composeTalentPrompt(talent));
    }
  }, [talent]);

  const handleSave = useCallback(() => {
    saveDraft();
    onClose?.();
  }, [saveDraft, onClose]);

  const handleDiscard = useCallback(() => {
    discardDraft();
    onClose?.();
  }, [discardDraft, onClose]);

  if (!talent || !draft) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Loading talent...</p>
      </div>
    );
  }

  const showPersonalityTab = talent.type === 'character' || talent.type === 'person';

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
              {talent.name}
            </h2>
            <p className="text-sm text-text-secondary">
              {TALENT_TYPES.find((t) => t.value === talent.type)?.icon}{' '}
              {TALENT_TYPES.find((t) => t.value === talent.type)?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-sm text-yellow-500">Unsaved changes</span>
          )}
          <button
            onClick={handleDiscard}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || (validationResult && !validationResult.isValid)}
            className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface overflow-x-auto">
        {[
          { key: 'general', label: 'General', icon: '📋' },
          { key: 'appearance', label: 'Appearance', icon: '👁️' },
          ...(showPersonalityTab ? [{ key: 'personality', label: 'Personality', icon: '🧠' }] : []),
          { key: 'images', label: 'Reference Images', icon: '🖼️' },
          { key: 'prompts', label: 'Prompt Fragments', icon: '✏️' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && (
          <GeneralTab
            draft={draft as TalentProfile}
            onUpdate={updateDraft}
            onAddTag={(tag) => addTag(talentId, tag)}
            onRemoveTag={(tag) => removeTag(talentId, tag)}
          />
        )}

        {activeTab === 'appearance' && (
          <AppearanceTab
            appearance={draft.appearance || {}}
            onUpdate={(appearance) => updateDraft({ appearance })}
          />
        )}

        {activeTab === 'personality' && showPersonalityTab && (
          <PersonalityTab
            personality={draft.personality || {}}
            onUpdate={(personality) => updateDraft({ personality })}
          />
        )}

        {activeTab === 'images' && (
          <ReferenceImagesTab
            talentId={talentId}
            images={talent.referenceImages}
            primaryImageId={talent.primaryImageId}
            onAddImage={(url, caption) => addReferenceImage(talentId, url, caption)}
            onRemoveImage={(imageId) => removeReferenceImage(talentId, imageId)}
            onSetPrimary={(imageId) => setPrimaryImage(talentId, imageId)}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptFragmentsTab
            promptFragments={draft.promptFragments || { default: '' }}
            onUpdate={(promptFragments) => updateDraft({ promptFragments })}
            preview={promptPreview}
          />
        )}

        {/* Validation Messages */}
        {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
          <div className="mt-6 space-y-3">
            {validationResult.errors.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-medium text-red-400 mb-2">Errors</p>
                <ul className="text-sm text-red-400 space-y-1">
                  {validationResult.errors.map((error, i) => (
                    <li key={i}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-400 mb-2">Suggestions</p>
                <ul className="text-sm text-yellow-400 space-y-1">
                  {validationResult.warnings.map((warning, i) => (
                    <li key={i}>• {warning.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// General Tab
interface GeneralTabProps {
  draft: TalentProfile;
  onUpdate: (updates: Partial<TalentProfile>) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

function GeneralTab({ draft, onUpdate, onAddTag, onRemoveTag }: GeneralTabProps) {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !draft.tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag('');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TALENT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onUpdate({ type: t.value })}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                draft.type === t.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:text-text-primary hover:border-primary/50'
              }`}
            >
              <div className="text-lg mb-1">{t.icon}</div>
              <div className="text-xs">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Description
        </label>
        <textarea
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe your talent..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Appearance Tab
interface AppearanceTabProps {
  appearance: TalentAppearance;
  onUpdate: (appearance: TalentAppearance) => void;
}

function AppearanceTab({ appearance, onUpdate }: AppearanceTabProps) {
  const [newFeature, setNewFeature] = useState('');
  const [newAccessory, setNewAccessory] = useState('');

  const updateField = (field: keyof TalentAppearance, value: any) => {
    onUpdate({ ...appearance, [field]: value });
  };

  const updateNested = (field: 'hair' | 'eyes' | 'skin', subfield: string, value: string) => {
    onUpdate({
      ...appearance,
      [field]: { ...appearance[field], [subfield]: value || undefined },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic Attributes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Age</label>
          <input
            type="text"
            value={appearance.age || ''}
            onChange={(e) => updateField('age', e.target.value || undefined)}
            placeholder="e.g., mid-20s, elderly"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Gender</label>
          <input
            type="text"
            value={appearance.gender || ''}
            onChange={(e) => updateField('gender', e.target.value || undefined)}
            placeholder="e.g., female, male, non-binary"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Ethnicity</label>
          <input
            type="text"
            value={appearance.ethnicity || ''}
            onChange={(e) => updateField('ethnicity', e.target.value || undefined)}
            placeholder="e.g., East Asian, Mediterranean"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Body Type</label>
          <input
            type="text"
            value={appearance.bodyType || ''}
            onChange={(e) => updateField('bodyType', e.target.value || undefined)}
            placeholder="e.g., athletic, slender, muscular"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Height</label>
          <input
            type="text"
            value={appearance.height || ''}
            onChange={(e) => updateField('height', e.target.value || undefined)}
            placeholder="e.g., tall, average, petite"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Hair */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3">Hair</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Color</label>
            <input
              type="text"
              value={appearance.hair?.color || ''}
              onChange={(e) => updateNested('hair', 'color', e.target.value)}
              placeholder="e.g., dark brown"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Length</label>
            <input
              type="text"
              value={appearance.hair?.length || ''}
              onChange={(e) => updateNested('hair', 'length', e.target.value)}
              placeholder="e.g., shoulder-length"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Style</label>
            <input
              type="text"
              value={appearance.hair?.style || ''}
              onChange={(e) => updateNested('hair', 'style', e.target.value)}
              placeholder="e.g., wavy, straight"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Eyes */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3">Eyes</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Color</label>
            <input
              type="text"
              value={appearance.eyes?.color || ''}
              onChange={(e) => updateNested('eyes', 'color', e.target.value)}
              placeholder="e.g., hazel, deep blue"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Shape</label>
            <input
              type="text"
              value={appearance.eyes?.shape || ''}
              onChange={(e) => updateNested('eyes', 'shape', e.target.value)}
              placeholder="e.g., almond, round"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Skin */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3">Skin</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Tone</label>
            <input
              type="text"
              value={appearance.skin?.tone || ''}
              onChange={(e) => updateNested('skin', 'tone', e.target.value)}
              placeholder="e.g., olive, fair, dark"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Texture</label>
            <input
              type="text"
              value={appearance.skin?.texture || ''}
              onChange={(e) => updateNested('skin', 'texture', e.target.value)}
              placeholder="e.g., smooth, freckled"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Clothing */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Clothing</label>
        <input
          type="text"
          value={appearance.clothing || ''}
          onChange={(e) => updateField('clothing', e.target.value || undefined)}
          placeholder="Describe typical clothing/outfit"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Distinguishing Features */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Distinguishing Features
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(appearance.distinguishingFeatures || []).map((feature, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-1"
            >
              {feature}
              <button
                onClick={() =>
                  updateField(
                    'distinguishingFeatures',
                    (appearance.distinguishingFeatures || []).filter((_, idx) => idx !== i)
                  )
                }
                className="hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFeature.trim()) {
                updateField('distinguishingFeatures', [
                  ...(appearance.distinguishingFeatures || []),
                  newFeature.trim(),
                ]);
                setNewFeature('');
              }
            }}
            placeholder="e.g., scar on left cheek"
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => {
              if (newFeature.trim()) {
                updateField('distinguishingFeatures', [
                  ...(appearance.distinguishingFeatures || []),
                  newFeature.trim(),
                ]);
                setNewFeature('');
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Accessories
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(appearance.accessories || []).map((accessory, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm flex items-center gap-1"
            >
              {accessory}
              <button
                onClick={() =>
                  updateField(
                    'accessories',
                    (appearance.accessories || []).filter((_, idx) => idx !== i)
                  )
                }
                className="hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAccessory}
            onChange={(e) => setNewAccessory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newAccessory.trim()) {
                updateField('accessories', [
                  ...(appearance.accessories || []),
                  newAccessory.trim(),
                ]);
                setNewAccessory('');
              }
            }}
            placeholder="e.g., silver necklace, glasses"
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => {
              if (newAccessory.trim()) {
                updateField('accessories', [
                  ...(appearance.accessories || []),
                  newAccessory.trim(),
                ]);
                setNewAccessory('');
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Personality Tab
interface PersonalityTabProps {
  personality: TalentPersonality;
  onUpdate: (personality: TalentPersonality) => void;
}

function PersonalityTab({ personality, onUpdate }: PersonalityTabProps) {
  const [newTrait, setNewTrait] = useState('');

  const updateField = (field: keyof TalentPersonality, value: any) => {
    onUpdate({ ...personality, [field]: value });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Traits */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Personality Traits
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(personality.traits || []).map((trait, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm flex items-center gap-1"
            >
              {trait}
              <button
                onClick={() =>
                  updateField(
                    'traits',
                    (personality.traits || []).filter((_, idx) => idx !== i)
                  )
                }
                className="hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTrait}
            onChange={(e) => setNewTrait(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTrait.trim()) {
                updateField('traits', [...(personality.traits || []), newTrait.trim()]);
                setNewTrait('');
              }
            }}
            placeholder="e.g., confident, introverted, curious"
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => {
              if (newTrait.trim()) {
                updateField('traits', [...(personality.traits || []), newTrait.trim()]);
                setNewTrait('');
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Default Mood
        </label>
        <input
          type="text"
          value={personality.mood || ''}
          onChange={(e) => updateField('mood', e.target.value || undefined)}
          placeholder="e.g., contemplative, joyful, melancholic"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Expression */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Typical Expression
        </label>
        <input
          type="text"
          value={personality.expression || ''}
          onChange={(e) => updateField('expression', e.target.value || undefined)}
          placeholder="e.g., warm smile, thoughtful frown, neutral"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Posture */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Body Language / Posture
        </label>
        <input
          type="text"
          value={personality.posture || ''}
          onChange={(e) => updateField('posture', e.target.value || undefined)}
          placeholder="e.g., confident stance, relaxed, defensive"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

// Reference Images Tab
interface ReferenceImagesTabProps {
  talentId: UUID;
  images: TalentReferenceImage[];
  primaryImageId?: UUID;
  onAddImage: (url: string, caption?: string) => void;
  onRemoveImage: (imageId: UUID) => void;
  onSetPrimary: (imageId: UUID) => void;
}

function ReferenceImagesTab({
  images,
  primaryImageId,
  onAddImage,
  onRemoveImage,
  onSetPrimary,
}: ReferenceImagesTabProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');

  const handleAdd = () => {
    if (newUrl.trim()) {
      onAddImage(newUrl.trim(), newCaption.trim() || undefined);
      setNewUrl('');
      setNewCaption('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Image */}
      <div className="p-4 bg-surface rounded-lg border-2 border-dashed border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3">Add Reference Image</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Image URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Caption (optional)</label>
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Describe this reference..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Image
          </button>
        </div>
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4 opacity-30">🖼️</div>
          <p className="text-text-secondary">No reference images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.id === primaryImageId
                  ? 'border-primary'
                  : 'border-border'
              }`}
            >
              <img
                src={image.thumbnailUrl || image.url}
                alt={image.caption || 'Reference image'}
                className="w-full aspect-square object-cover"
              />
              
              {/* Primary badge */}
              {image.id === primaryImageId && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-xs rounded">
                  Primary
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {image.id !== primaryImageId && (
                  <button
                    onClick={() => onSetPrimary(image.id)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                    title="Set as primary"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={() => onRemoveImage(image.id)}
                  className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500"
                  title="Remove"
                >
                  🗑️
                </button>
              </div>

              {/* Caption */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70">
                  <p className="text-xs text-white truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Prompt Fragments Tab
interface PromptFragmentsTabProps {
  promptFragments: TalentPromptFragments;
  onUpdate: (promptFragments: TalentPromptFragments) => void;
  preview: string;
}

function PromptFragmentsTab({ promptFragments, onUpdate, preview }: PromptFragmentsTabProps) {
  const updateFragment = (key: keyof TalentPromptFragments, value: string) => {
    onUpdate({ ...promptFragments, [key]: value || undefined });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-text-secondary">
        Define how this talent should be described in prompts. You can create provider-specific
        fragments for optimal results with different AI models.
      </p>

      {/* Default Fragment */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Default Prompt Fragment
        </label>
        <textarea
          value={promptFragments.default}
          onChange={(e) => updateFragment('default', e.target.value)}
          placeholder="Write a description for this talent that will be inserted into prompts..."
          rows={4}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="mt-1 text-xs text-text-secondary">
          This is used when no provider-specific fragment is defined.
        </p>
      </div>

      {/* Provider-specific fragments */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Midjourney
          </label>
          <textarea
            value={promptFragments.midjourney || ''}
            onChange={(e) => updateFragment('midjourney', e.target.value)}
            placeholder="Optimized for Midjourney..."
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            DALL-E
          </label>
          <textarea
            value={promptFragments.dalle || ''}
            onChange={(e) => updateFragment('dalle', e.target.value)}
            placeholder="Optimized for DALL-E..."
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Flux
          </label>
          <textarea
            value={promptFragments.flux || ''}
            onChange={(e) => updateFragment('flux', e.target.value)}
            placeholder="Optimized for Flux..."
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Runway
          </label>
          <textarea
            value={promptFragments.runway || ''}
            onChange={(e) => updateFragment('runway', e.target.value)}
            placeholder="Optimized for Runway..."
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          Auto-generated Preview
        </h4>
        <p className="text-xs text-text-secondary mb-2">
          This preview is generated from the talent&apos;s attributes when no custom fragment is provided.
        </p>
        <pre className="p-3 bg-background rounded text-sm text-text-secondary whitespace-pre-wrap">
          {preview || 'No preview available'}
        </pre>
      </div>
    </div>
  );
}

export default TalentEditor;
