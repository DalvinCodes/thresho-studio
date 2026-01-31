/**
 * Brand Editor Component
 * Full-featured brand profile editor with token management
 */

import { useState, useEffect, useCallback } from 'react';
import type { UUID } from '../../../core/types/common';
import type {
  BrandProfile,
  BrandToken,
  ColorTokens,
  TypographyTokens,
  VisualStyleTokens,
  VoiceTokens,
  TokenCategory,
} from '../../../core/types/brand';
import {
  useBrandStore,
  useSelectedBrand,
  useBrandEditor,
} from '../store';
import { getAvailableTokenNames } from '../../../core/utils/tokenInjection';

interface BrandEditorProps {
  brandId: UUID;
  onClose?: () => void;
}

export function BrandEditor({ brandId, onClose }: BrandEditorProps) {
  const brand = useSelectedBrand();
  const { isEditing, draft, isDirty } = useBrandEditor();
  const {
    startEditing,
    updateDraft,
    saveDraft,
    discardDraft,
    validateBrand,
    updateColorTokens,
    updateTypographyTokens,
    updateVisualStyleTokens,
    updateVoiceTokens,
    updateAssetTokens,
    addCustomToken,
    removeCustomToken,
    updateCustomToken,
  } = useBrandStore();

  const [activeTab, setActiveTab] = useState<
    'general' | 'colors' | 'typography' | 'visual' | 'voice' | 'custom'
  >('general');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateBrand> | null>(null);

  // Initialize editor
  useEffect(() => {
    startEditing(brandId);
    return () => discardDraft();
  }, [brandId]);

  // Validate on changes
  useEffect(() => {
    if (draft) {
      setValidationResult(validateBrand(brandId));
    }
  }, [draft, brandId]);

  const handleSave = useCallback(() => {
    saveDraft();
    onClose?.();
  }, [saveDraft, onClose]);

  const handleDiscard = useCallback(() => {
    discardDraft();
    onClose?.();
  }, [discardDraft, onClose]);

  if (!brand || !draft) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Loading brand...</p>
      </div>
    );
  }

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
              {brand.name}
            </h2>
            <p className="text-sm text-text-secondary">
              {brand.isDefault ? 'Default Brand' : 'Brand Profile'}
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
          { key: 'colors', label: 'Colors', icon: '🎨' },
          { key: 'typography', label: 'Typography', icon: '🔤' },
          { key: 'visual', label: 'Visual Style', icon: '✨' },
          { key: 'voice', label: 'Voice', icon: '🗣️' },
          { key: 'custom', label: 'Custom Tokens', icon: '⚙️' },
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
            draft={draft as BrandProfile}
            onUpdate={updateDraft}
          />
        )}

        {activeTab === 'colors' && (
          <ColorsTab
            colors={draft.tokens?.colors as ColorTokens}
            brandId={brandId}
            onUpdate={(colors) => updateColorTokens(brandId, colors)}
          />
        )}

        {activeTab === 'typography' && (
          <TypographyTab
            typography={draft.tokens?.typography as TypographyTokens}
            brandId={brandId}
            onUpdate={(typography) => updateTypographyTokens(brandId, typography)}
          />
        )}

        {activeTab === 'visual' && (
          <VisualStyleTab
            visualStyle={draft.tokens?.visualStyle as VisualStyleTokens}
            brandId={brandId}
            onUpdate={(visualStyle) => updateVisualStyleTokens(brandId, visualStyle)}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceTab
            voice={draft.tokens?.voice as VoiceTokens}
            brandId={brandId}
            onUpdate={(voice) => updateVoiceTokens(brandId, voice)}
          />
        )}

        {activeTab === 'custom' && (
          <CustomTokensTab
            tokens={draft.tokens?.customTokens || []}
            brandId={brandId}
            onAdd={(token) => addCustomToken(brandId, token)}
            onRemove={(key) => removeCustomToken(brandId, key)}
            onUpdate={(key, value) => updateCustomToken(brandId, key, value)}
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

      {/* Token Reference */}
      <div className="border-t border-border bg-surface p-4">
        <details className="text-sm">
          <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
            Token Reference Guide
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-secondary">
            {getAvailableTokenNames().slice(0, 12).map((token) => (
              <code key={token} className="px-2 py-1 bg-background rounded">
                {`{{${token}}}`}
              </code>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

// General Tab
interface GeneralTabProps {
  draft: BrandProfile;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

function GeneralTab({ draft, onUpdate }: GeneralTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Brand Name
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
          Description
        </label>
        <textarea
          value={draft.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe your brand..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Logo URL
        </label>
        <input
          type="url"
          value={draft.logoUrl || ''}
          onChange={(e) => onUpdate({ logoUrl: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {draft.logoUrl && (
          <div className="mt-2 p-4 bg-surface rounded-lg border border-border">
            <img
              src={draft.logoUrl}
              alt="Brand logo preview"
              className="max-h-20 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Colors Tab
interface ColorsTabProps {
  colors: ColorTokens;
  brandId: UUID;
  onUpdate: (colors: Partial<ColorTokens>) => void;
}

function ColorsTab({ colors, onUpdate }: ColorsTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <ColorInput
          label="Primary Color"
          value={colors.primary}
          onChange={(primary) => onUpdate({ primary })}
          required
        />
        <ColorInput
          label="Secondary Color"
          value={colors.secondary}
          onChange={(secondary) => onUpdate({ secondary })}
          required
        />
        <ColorInput
          label="Accent Color"
          value={colors.accent || ''}
          onChange={(accent) => onUpdate({ accent: accent || undefined })}
        />
        <ColorInput
          label="Neutral Dark"
          value={colors.neutralDark}
          onChange={(neutralDark) => onUpdate({ neutralDark })}
          required
        />
        <ColorInput
          label="Neutral Light"
          value={colors.neutralLight}
          onChange={(neutralLight) => onUpdate({ neutralLight })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Palette Description
        </label>
        <textarea
          value={colors.paletteDescription}
          onChange={(e) => onUpdate({ paletteDescription: e.target.value })}
          placeholder="Describe your color palette in words..."
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="mt-1 text-xs text-text-secondary">
          This description is used when generating AI content with your brand colors.
        </p>
      </div>

      {/* Color Preview */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <p className="text-sm font-medium text-text-primary mb-3">Preview</p>
        <div className="flex gap-2">
          {[colors.primary, colors.secondary, colors.accent, colors.neutralDark, colors.neutralLight]
            .filter(Boolean)
            .map((color, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-lg border border-border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// Color Input Component
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function ColorInput({ label, value, onChange, required }: ColorInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border border-border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

// Typography Tab
interface TypographyTabProps {
  typography: TypographyTokens;
  brandId: UUID;
  onUpdate: (typography: Partial<TypographyTokens>) => void;
}

function TypographyTab({ typography, onUpdate }: TypographyTabProps) {
  const fontOptions = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Source Sans Pro', 'Poppins', 'Playfair Display', 'Merriweather',
    'Georgia', 'Times New Roman', 'Arial', 'Helvetica',
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Primary Font <span className="text-red-400">*</span>
        </label>
        <select
          value={typography.primaryFont}
          onChange={(e) => onUpdate({ primaryFont: e.target.value })}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {fontOptions.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Secondary Font
        </label>
        <select
          value={typography.secondaryFont || ''}
          onChange={(e) => onUpdate({ secondaryFont: e.target.value || undefined })}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">None</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Typography Style Description
        </label>
        <textarea
          value={typography.styleDescriptor}
          onChange={(e) => onUpdate({ styleDescriptor: e.target.value })}
          placeholder="Describe your typography style..."
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Typography Preview */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <p className="text-sm font-medium text-text-primary mb-3">Preview</p>
        <div style={{ fontFamily: typography.primaryFont }}>
          <p className="text-2xl mb-2">The quick brown fox jumps over the lazy dog</p>
          <p className="text-base">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</p>
        </div>
      </div>
    </div>
  );
}

// Visual Style Tab
interface VisualStyleTabProps {
  visualStyle: VisualStyleTokens;
  brandId: UUID;
  onUpdate: (visualStyle: Partial<VisualStyleTokens>) => void;
}

function VisualStyleTab({ visualStyle, onUpdate }: VisualStyleTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Aesthetic
        </label>
        <input
          type="text"
          value={visualStyle.aesthetic}
          onChange={(e) => onUpdate({ aesthetic: e.target.value })}
          placeholder="e.g., Premium editorial, modern minimalist"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Photography Style
        </label>
        <textarea
          value={visualStyle.photographyStyle}
          onChange={(e) => onUpdate({ photographyStyle: e.target.value })}
          placeholder="Describe the photography style for your brand..."
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Mood
        </label>
        <input
          type="text"
          value={visualStyle.mood}
          onChange={(e) => onUpdate({ mood: e.target.value })}
          placeholder="e.g., Professional yet approachable, energetic"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Art Direction Notes
        </label>
        <textarea
          value={visualStyle.artDirection || ''}
          onChange={(e) => onUpdate({ artDirection: e.target.value || undefined })}
          placeholder="Additional art direction guidelines..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}

// Voice Tab
interface VoiceTabProps {
  voice: VoiceTokens;
  brandId: UUID;
  onUpdate: (voice: Partial<VoiceTokens>) => void;
}

function VoiceTab({ voice, onUpdate }: VoiceTabProps) {
  const [newTone, setNewTone] = useState('');
  const [newForbiddenTerm, setNewForbiddenTerm] = useState('');
  const [newForbiddenElement, setNewForbiddenElement] = useState('');

  const addTone = () => {
    if (newTone.trim()) {
      onUpdate({ tone: [...voice.tone, newTone.trim()] });
      setNewTone('');
    }
  };

  const removeTone = (index: number) => {
    onUpdate({ tone: voice.tone.filter((_, i) => i !== index) });
  };

  const addForbiddenTerm = () => {
    if (newForbiddenTerm.trim()) {
      onUpdate({ forbiddenTerms: [...voice.forbiddenTerms, newForbiddenTerm.trim()] });
      setNewForbiddenTerm('');
    }
  };

  const removeForbiddenTerm = (index: number) => {
    onUpdate({ forbiddenTerms: voice.forbiddenTerms.filter((_, i) => i !== index) });
  };

  const addForbiddenElement = () => {
    if (newForbiddenElement.trim()) {
      onUpdate({ forbiddenElements: [...voice.forbiddenElements, newForbiddenElement.trim()] });
      setNewForbiddenElement('');
    }
  };

  const removeForbiddenElement = (index: number) => {
    onUpdate({ forbiddenElements: voice.forbiddenElements.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Tone of Voice
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {voice.tone.map((tone, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-1"
            >
              {tone}
              <button
                onClick={() => removeTone(i)}
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
            value={newTone}
            onChange={(e) => setNewTone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTone()}
            placeholder="Add tone descriptor..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addTone}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Writing Style */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Writing Style
        </label>
        <textarea
          value={voice.writingStyle || ''}
          onChange={(e) => onUpdate({ writingStyle: e.target.value || undefined })}
          placeholder="Describe your writing style..."
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Forbidden Terms */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Forbidden Terms
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Words and phrases to avoid in your content
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {voice.forbiddenTerms.map((term, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-1"
            >
              {term}
              <button
                onClick={() => removeForbiddenTerm(i)}
                className="hover:text-red-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newForbiddenTerm}
            onChange={(e) => setNewForbiddenTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addForbiddenTerm()}
            placeholder="Add forbidden term..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addForbiddenTerm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* Forbidden Elements */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Forbidden Elements
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Content elements to avoid (e.g., emojis, hashtags)
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {voice.forbiddenElements.map((element, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-1"
            >
              {element}
              <button
                onClick={() => removeForbiddenElement(i)}
                className="hover:text-yellow-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newForbiddenElement}
            onChange={(e) => setNewForbiddenElement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addForbiddenElement()}
            placeholder="Add forbidden element..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addForbiddenElement}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom Tokens Tab
interface CustomTokensTabProps {
  tokens: BrandToken[];
  brandId: UUID;
  onAdd: (token: BrandToken) => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, value: string) => void;
}

function CustomTokensTab({ tokens, onAdd, onRemove, onUpdate }: CustomTokensTabProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<TokenCategory>('custom');

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      onAdd({
        key: newKey.trim().toUpperCase().replace(/\s+/g, '_'),
        value: newValue.trim(),
        category: newCategory,
        isRequired: false,
      });
      setNewKey('');
      setNewValue('');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-text-secondary">
        Add custom tokens for brand-specific values that aren&apos;t covered by the standard categories.
        Use them in your prompts with <code className="text-primary">{`{{TOKEN_KEY}}`}</code>.
      </p>

      {/* Existing Tokens */}
      {tokens.length > 0 && (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div
              key={token.key}
              className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border"
            >
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Key</p>
                  <code className="text-sm text-primary">{`{{${token.key}}}`}</code>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Value</p>
                  <input
                    type="text"
                    value={token.value}
                    onChange={(e) => onUpdate(token.key, e.target.value)}
                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-text-primary"
                  />
                </div>
              </div>
              <button
                onClick={() => onRemove(token.key)}
                className="p-2 text-text-secondary hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Token */}
      <div className="p-4 bg-surface rounded-lg border-2 border-dashed border-border">
        <p className="text-sm font-medium text-text-primary mb-3">Add Custom Token</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Token Key</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder="CUSTOM_TOKEN_NAME"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Value</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Token value..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newKey.trim() || !newValue.trim()}
          className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Token
        </button>
      </div>
    </div>
  );
}

export default BrandEditor;
