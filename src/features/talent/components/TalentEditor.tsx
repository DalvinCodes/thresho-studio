/**
 * TalentEditor Component
 * Full editor panel for talent profiles
 */

import { useState, useEffect, useCallback } from "react";
import type { UUID } from "../../../core/types/common";
import type {
  TalentProfile,
  TalentType,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
  TalentReferenceImage,
} from "../../../core/types/talent";
import { useTalentStore, useSelectedTalent, useTalentEditor } from "../store";
import { composeTalentPrompt } from "../services/talentPromptService";
import { TalentAIGenerationTab } from "./TalentAIGenerationTab";
import { StorageImage } from "../../../components/StorageMedia";
import {
  Image as ImageIcon,
  Star,
  Trash2,
  User,
  Users,
  Cat,
  Package,
  Mountain,
  Palette,
  X,
  Maximize2,
} from "lucide-react";

interface TalentEditorProps {
  talentId: UUID;
  onClose?: () => void;
}

const TALENT_TYPES: Array<{
  value: TalentType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "character",
    label: "Character",
    icon: <User className="w-5 h-5" />,
  },
  { value: "person", label: "Person", icon: <Users className="w-5 h-5" /> },
  { value: "creature", label: "Creature", icon: <Cat className="w-5 h-5" /> },
  { value: "object", label: "Object", icon: <Package className="w-5 h-5" /> },
  {
    value: "environment",
    label: "Environment",
    icon: <Mountain className="w-5 h-5" />,
  },
  { value: "style", label: "Style", icon: <Palette className="w-5 h-5" /> },
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
    | "general"
    | "appearance"
    | "ai-generation"
    | "personality"
    | "images"
    | "prompts"
  >("general");
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof validateTalent
  > | null>(null);
  const [promptPreview, setPromptPreview] = useState("");

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

  // Update page title - MUST be before early return
  useEffect(() => {
    if (talent) {
      document.title = `${talent.name} | Thresho Studio`;
    }
    return () => {
      document.title = "Thresho Studio";
    };
  }, [talent]);

  if (!talent || !draft) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Loading talent...</p>
      </div>
    );
  }

  const showPersonalityTab =
    talent.type === "character" || talent.type === "person";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Back Button */}
      <div className="px-6 pt-4 pb-2 bg-surface">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-4 border-b border-border bg-surface">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {talent.name}
          </h2>
          <p className="text-sm text-text-secondary">
            {TALENT_TYPES.find((t) => t.value === talent.type)?.label}
          </p>
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
            disabled={
              !isDirty || (validationResult && !validationResult.isValid)
            }
            className="px-4 py-1.5 bg-primary text-white text-sm rounded-3xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface pt-3">
        <nav className="flex gap-10 px-6 overflow-x-auto">
          {[
            { key: "general", label: "General" },
            { key: "appearance", label: "Appearance" },
            ...(showPersonalityTab
              ? [{ key: "ai-generation", label: "AI Generation" }]
              : []),
            ...(showPersonalityTab
              ? [{ key: "personality", label: "Personality" }]
              : []),
            { key: "images", label: "Reference Images" },
            { key: "prompts", label: "Prompt Fragments" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`
                pb-3 text-sm font-medium whitespace-nowrap transition-colors relative
                ${
                  activeTab === tab.key
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {activeTab === "general" && (
          <GeneralTab
            draft={draft as TalentProfile}
            onUpdate={updateDraft}
            onAddTag={(tag) => addTag(talentId, tag)}
            onRemoveTag={(tag) => removeTag(talentId, tag)}
          />
        )}

        {activeTab === "appearance" && (
          <AppearanceTab
            appearance={draft.appearance || {}}
            onUpdate={(appearance) => updateDraft({ appearance })}
          />
        )}

        {activeTab === "personality" && showPersonalityTab && (
          <PersonalityTab
            personality={draft.personality || {}}
            onUpdate={(personality) => updateDraft({ personality })}
          />
        )}

        {activeTab === "ai-generation" && showPersonalityTab && (
          <TalentAIGenerationTab talent={talent} />
        )}

        {activeTab === "images" && (
          <ReferenceImagesTab
            talentId={talentId}
            images={talent.referenceImages}
            primaryImageId={talent.primaryImageId}
            onAddImage={(url, caption) =>
              addReferenceImage(talentId, url, caption)
            }
            onRemoveImage={(imageId) => removeReferenceImage(talentId, imageId)}
            onSetPrimary={(imageId) => setPrimaryImage(talentId, imageId)}
          />
        )}

        {activeTab === "prompts" && (
          <PromptFragmentsTab
            promptFragments={draft.promptFragments || { default: "" }}
            onUpdate={(promptFragments) => updateDraft({ promptFragments })}
            preview={promptPreview}
          />
        )}

        {/* Validation Messages */}
        {validationResult &&
          (validationResult.errors.length > 0 ||
            validationResult.warnings.length > 0) && (
            <div className="mt-6 space-y-3">
              {validationResult.errors.length > 0 && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-3xl">
                  <p className="text-sm font-medium text-red-700 mb-2">
                    Errors
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationResult.errors.map((error, i) => (
                      <li key={i}>• {error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-3xl">
                  <p className="text-sm font-medium text-yellow-700 mb-2">
                    Suggestions
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1">
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

function GeneralTab({
  draft,
  onUpdate,
  onAddTag,
  onRemoveTag,
}: GeneralTabProps) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !draft.tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag("");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Name <span className="text-[var(--color-primary)]">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
        />
      </div>

      {/* Type Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
          Type <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {TALENT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onUpdate({ type: t.value })}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-3xl
                transition-all duration-200
                ${
                  draft.type === t.value
                    ? "bg-primary-light text-primary ring-1 ring-primary"
                    : "bg-surface text-text-muted hover:bg-bg-subtle hover:text-text"
                }
              `}
            >
              {t.icon}
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description Textarea */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Description
        </label>
        <textarea
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe your talent..."
          rows={4}
          className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y min-h-[100px] transition-all"
        />
      </div>

      {/* Tags Section */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 bg-primary-light text-text rounded-full text-sm flex items-center gap-2 font-medium"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="text-text-muted hover:text-primary transition-colors"
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
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="Add tag..."
            className="flex-1 h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
          <button
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="px-5 py-2.5 bg-primary text-white rounded-3xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
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
  const [newFeature, setNewFeature] = useState("");
  const [newAccessory, setNewAccessory] = useState("");

  const updateField = (field: keyof TalentAppearance, value: any) => {
    onUpdate({ ...appearance, [field]: value });
  };

  const updateNested = (
    field: "hair" | "eyes" | "skin",
    subfield: string,
    value: string,
  ) => {
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
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Age
          </label>
          <input
            type="text"
            value={appearance.age || ""}
            onChange={(e) => updateField("age", e.target.value || undefined)}
            placeholder="e.g., mid-20s, elderly"
            className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Gender
          </label>
          <input
            type="text"
            value={appearance.gender || ""}
            onChange={(e) => updateField("gender", e.target.value || undefined)}
            placeholder="e.g., female, male, non-binary"
            className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Ethnicity
          </label>
          <input
            type="text"
            value={appearance.ethnicity || ""}
            onChange={(e) =>
              updateField("ethnicity", e.target.value || undefined)
            }
            placeholder="e.g., East Asian, Mediterranean"
            className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Body Type
          </label>
          <input
            type="text"
            value={appearance.bodyType || ""}
            onChange={(e) =>
              updateField("bodyType", e.target.value || undefined)
            }
            placeholder="e.g., athletic, slender, muscular"
            className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Height
          </label>
          <input
            type="text"
            value={appearance.height || ""}
            onChange={(e) => updateField("height", e.target.value || undefined)}
            placeholder="e.g., tall, average, petite"
            className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Hair */}
      <div className="p-4 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          Hair
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Color
            </label>
            <input
              type="text"
              value={appearance.hair?.color || ""}
              onChange={(e) => updateNested("hair", "color", e.target.value)}
              placeholder="e.g., dark brown"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Length
            </label>
            <input
              type="text"
              value={appearance.hair?.length || ""}
              onChange={(e) => updateNested("hair", "length", e.target.value)}
              placeholder="e.g., shoulder-length"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Style
            </label>
            <input
              type="text"
              value={appearance.hair?.style || ""}
              onChange={(e) => updateNested("hair", "style", e.target.value)}
              placeholder="e.g., wavy, straight"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Eyes */}
      <div className="p-4 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Eyes
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Color
            </label>
            <input
              type="text"
              value={appearance.eyes?.color || ""}
              onChange={(e) => updateNested("eyes", "color", e.target.value)}
              placeholder="e.g., hazel, deep blue"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Shape
            </label>
            <input
              type="text"
              value={appearance.eyes?.shape || ""}
              onChange={(e) => updateNested("eyes", "shape", e.target.value)}
              placeholder="e.g., almond, round"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Skin */}
      <div className="p-4 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          Skin
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Tone
            </label>
            <input
              type="text"
              value={appearance.skin?.tone || ""}
              onChange={(e) => updateNested("skin", "tone", e.target.value)}
              placeholder="e.g., olive, fair, dark"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              Texture
            </label>
            <input
              type="text"
              value={appearance.skin?.texture || ""}
              onChange={(e) => updateNested("skin", "texture", e.target.value)}
              placeholder="e.g., smooth, freckled"
              className="w-full h-10 px-4 bg-bg-subtle border border-border rounded-3xl text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Clothing */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Clothing
        </label>
        <input
          type="text"
          value={appearance.clothing || ""}
          onChange={(e) => updateField("clothing", e.target.value || undefined)}
          placeholder="Describe typical clothing/outfit"
          className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
        />
      </div>

      {/* Distinguishing Features */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Distinguishing Features
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(appearance.distinguishingFeatures || []).map((feature, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-primary-light text-primary rounded-full text-sm flex items-center gap-2 border border-primary"
            >
              {feature}
              <button
                onClick={() =>
                  updateField(
                    "distinguishingFeatures",
                    (appearance.distinguishingFeatures || []).filter(
                      (_, idx) => idx !== i,
                    ),
                  )
                }
                className="hover:text-text hover:bg-primary rounded-full w-4 h-4 flex items-center justify-center transition-colors"
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
              if (e.key === "Enter" && newFeature.trim()) {
                updateField("distinguishingFeatures", [
                  ...(appearance.distinguishingFeatures || []),
                  newFeature.trim(),
                ]);
                setNewFeature("");
              }
            }}
            placeholder="e.g., scar on left cheek"
            className="flex-1 h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
          <button
            onClick={() => {
              if (newFeature.trim()) {
                updateField("distinguishingFeatures", [
                  ...(appearance.distinguishingFeatures || []),
                  newFeature.trim(),
                ]);
                setNewFeature("");
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary-hover transition-colors font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Accessories
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(appearance.accessories || []).map((accessory, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-sm flex items-center gap-2 border border-cyan-300"
            >
              {accessory}
              <button
                onClick={() =>
                  updateField(
                    "accessories",
                    (appearance.accessories || []).filter(
                      (_, idx) => idx !== i,
                    ),
                  )
                }
                className="hover:text-text hover:bg-cyan-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
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
              if (e.key === "Enter" && newAccessory.trim()) {
                updateField("accessories", [
                  ...(appearance.accessories || []),
                  newAccessory.trim(),
                ]);
                setNewAccessory("");
              }
            }}
            placeholder="e.g., silver necklace, glasses"
            className="flex-1 h-10 px-4 bg-surface border border-border rounded-3xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          />
          <button
            onClick={() => {
              if (newAccessory.trim()) {
                updateField("accessories", [
                  ...(appearance.accessories || []),
                  newAccessory.trim(),
                ]);
                setNewAccessory("");
              }
            }}
            className="px-4 py-2 bg-cyan-500 text-white rounded-3xl hover:bg-cyan-600 transition-colors font-medium"
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
  const [newTrait, setNewTrait] = useState("");

  const updateField = (field: keyof TalentPersonality, value: any) => {
    onUpdate({ ...personality, [field]: value });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Traits */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Personality Traits
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(personality.traits || []).map((trait, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2 border border-purple-300"
            >
              {trait}
              <button
                onClick={() =>
                  updateField(
                    "traits",
                    (personality.traits || []).filter((_, idx) => idx !== i),
                  )
                }
                className="hover:text-text hover:bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
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
              if (e.key === "Enter" && newTrait.trim()) {
                updateField("traits", [
                  ...(personality.traits || []),
                  newTrait.trim(),
                ]);
                setNewTrait("");
              }
            }}
            placeholder="e.g., confident, introverted, curious"
            className="flex-1 h-10 px-4 bg-surface border border-border rounded-3xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
          <button
            onClick={() => {
              if (newTrait.trim()) {
                updateField("traits", [
                  ...(personality.traits || []),
                  newTrait.trim(),
                ]);
                setNewTrait("");
              }
            }}
            className="px-5 py-2.5 bg-purple-500 text-white rounded-3xl hover:bg-purple-600 font-medium transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Default Mood
        </label>
        <input
          type="text"
          value={personality.mood || ""}
          onChange={(e) => updateField("mood", e.target.value || undefined)}
          placeholder="e.g., contemplative, joyful, melancholic"
          className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
      </div>

      {/* Expression */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Typical Expression
        </label>
        <input
          type="text"
          value={personality.expression || ""}
          onChange={(e) =>
            updateField("expression", e.target.value || undefined)
          }
          placeholder="e.g., warm smile, thoughtful frown, neutral"
          className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
      </div>

      {/* Posture */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Body Language / Posture
        </label>
        <input
          type="text"
          value={personality.posture || ""}
          onChange={(e) => updateField("posture", e.target.value || undefined)}
          placeholder="e.g., confident stance, relaxed, defensive"
          className="w-full h-10 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
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
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<TalentReferenceImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = () => {
    if (newUrl.trim()) {
      onAddImage(newUrl.trim(), newCaption.trim() || undefined);
      setNewUrl("");
      setNewCaption("");
    }
  };

  const handleImageClick = (image: TalentReferenceImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <div className="space-y-6">
      {/* Add New Image */}
      <div className="p-4 bg-[var(--color-bg)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Add Reference Image
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-10 px-4 bg-surface border border-[var(--color-border)] rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Caption (optional)
            </label>
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Describe this reference..."
              className="w-full h-10 px-4 bg-surface border border-[var(--color-border)] rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="w-full py-2 bg-primary text-white rounded-3xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add Image
          </button>
        </div>
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">
            No reference images yet
          </h3>
          <p className="text-sm text-text-secondary max-w-xs">
            Add images to help visualize this talent. The primary image will be
            featured in previews.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-3xl overflow-hidden bg-[var(--color-bg)] border ${
                image.id === primaryImageId
                  ? "border-[var(--color-primary)]"
                  : "border-[var(--color-border)]"
              }`}
            >
              <div className="aspect-square">
                <StorageImage
                  src={image.thumbnailUrl || image.url}
                  alt={image.caption || "Reference image"}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {/* Primary badge */}
              {image.id === primaryImageId && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs font-medium rounded-3xl shadow-lg z-10">
                  Primary
                </div>
              )}

              {/* Hover overlay with action buttons */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                {/* Expand button */}
                <button
                  onClick={() => handleImageClick(image)}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-3xl transition-colors backdrop-blur-sm"
                  title="View full size"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
                {/* Set as primary button */}
                {image.id !== primaryImageId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPrimary(image.id);
                    }}
                    className="p-2.5 bg-gray-800 hover:bg-primary rounded-3xl transition-colors"
                    title="Set as primary"
                  >
                    <Star className="w-5 h-5 text-white" />
                  </button>
                )}
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(image.id);
                  }}
                  className="p-2.5 bg-red-600 hover:bg-red-500 rounded-3xl transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Caption */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-xs text-white truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// Prompt Fragments Tab
interface PromptFragmentsTabProps {
  promptFragments: TalentPromptFragments;
  onUpdate: (promptFragments: TalentPromptFragments) => void;
  preview: string;
}

function PromptFragmentsTab({
  promptFragments,
  onUpdate,
  preview,
}: PromptFragmentsTabProps) {
  const updateFragment = (key: keyof TalentPromptFragments, value: string) => {
    onUpdate({ ...promptFragments, [key]: value || undefined });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        Define how this talent should be described in prompts. You can create
        provider-specific fragments for optimal results with different AI
        models.
      </p>

      {/* Default Fragment */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Default Prompt Fragment
        </label>
        <textarea
          value={promptFragments.default}
          onChange={(e) => updateFragment("default", e.target.value)}
          placeholder="Write a description for this talent that will be inserted into prompts..."
          rows={4}
          className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y min-h-[100px] transition-all"
        />
        <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
          This is used when no provider-specific fragment is defined.
        </p>
      </div>

      {/* Provider-specific fragments */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Midjourney
          </label>
          <textarea
            value={promptFragments.midjourney || ""}
            onChange={(e) => updateFragment("midjourney", e.target.value)}
            placeholder="Optimized for Midjourney..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            DALL-E
          </label>
          <textarea
            value={promptFragments.dalle || ""}
            onChange={(e) => updateFragment("dalle", e.target.value)}
            placeholder="Optimized for DALL-E..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Flux
          </label>
          <textarea
            value={promptFragments.flux || ""}
            onChange={(e) => updateFragment("flux", e.target.value)}
            placeholder="Optimized for Flux..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Runway
          </label>
          <textarea
            value={promptFragments.runway || ""}
            onChange={(e) => updateFragment("runway", e.target.value)}
            placeholder="Optimized for Runway..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-2">
          Auto-generated Preview
        </h4>
        <p className="text-xs text-[var(--color-text-subtle)] mb-3">
          This preview is generated from the talent&apos;s attributes when no
          custom fragment is provided.
        </p>
        <pre className="p-3 bg-[var(--color-bg)] rounded-3xl text-sm text-[var(--color-text-muted)] whitespace-pre-wrap font-mono leading-relaxed">
          {preview || "No preview available"}
        </pre>
      </div>
    </div>
  );
}

// Image Modal Component
interface ImageModalProps {
  image: TalentReferenceImage | null;
  isOpen: boolean;
  onClose: () => void;
}

function ImageModal({ image, isOpen, onClose }: ImageModalProps) {
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setIsLoading(true);
      setImageDimensions(null);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  // Calculate the optimal display size based on screen and image dimensions
  const getDisplaySize = () => {
    if (!imageDimensions) return {};

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const padding = 48; // 24px padding on each side

    const maxWidth = screenWidth - padding;
    const maxHeight = screenHeight - padding;

    const { width: imgWidth, height: imgHeight } = imageDimensions;

    // Calculate scale to fit within viewport
    const scaleX = maxWidth / imgWidth;
    const scaleY = maxHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale beyond original size

    return {
      width: Math.round(imgWidth * scale),
      height: Math.round(imgHeight * scale),
    };
  };

  const displaySize = getDisplaySize();

  // Get resolution label for display
  const getResolutionLabel = () => {
    if (!imageDimensions) return "";
    const { width, height } = imageDimensions;

    // Common resolution names
    if (width >= 3840 || height >= 2160) return "4K";
    if (width >= 2560 || height >= 1440) return "2K";
    if (width >= 1920 || height >= 1080) return "Full HD";
    if (width >= 1280 || height >= 720) return "HD";
    return "SD";
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10 backdrop-blur-sm"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Resolution badge */}
      {imageDimensions && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-medium z-10">
          {imageDimensions.width} × {imageDimensions.height} (
          {getResolutionLabel()})
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Image container - centered with proper sizing */}
      <div
        className="flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        style={
          displaySize.width
            ? { width: displaySize.width, height: displaySize.height }
            : undefined
        }
      >
        <StorageImage
          src={image.url}
          alt={image.caption || "Reference image"}
          className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
          style={
            displaySize.width
              ? { width: displaySize.width, height: displaySize.height }
              : undefined
          }
          onLoad={(e) => {
            const img = e.currentTarget;
            setImageDimensions({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
            setIsLoading(false);
          }}
        />
      </div>

      {/* Caption with image info */}
      {(image.caption || imageDimensions) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {image.caption && (
            <p className="text-white text-center text-sm mb-1">
              {image.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TalentEditor;
