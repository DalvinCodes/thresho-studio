/**
 * Template Editor Component
 * Full-featured prompt template editing with variable schema, preview, and versioning
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UUID } from '../../../core/types/common';
import type { PromptVariable, PromptVersion } from '../../../core/types/prompt';
import {
  useTemplateStore,
  useSelectedTemplate,
  useSelectedVersion,
  useEditorDraft,
  useHasUnsavedChanges,
} from '../store';
import { renderPrompt, extractVariables, validateVariables, generateSampleValues } from '../services/templateService';
import { MonacoEditor } from '../../../components/MonacoEditor';
import { VersionDiff } from './VersionDiff';

interface TemplateEditorProps {
  templateId: UUID;
  onClose?: () => void;
}

export function TemplateEditor({ templateId, onClose }: TemplateEditorProps) {
  const template = useSelectedTemplate();
  const currentVersion = useSelectedVersion();
  const editorDraft = useEditorDraft();
  const hasUnsavedChanges = useHasUnsavedChanges();

  const {
    startEditing,
    updateEditorDraft,
    saveEditorDraft,
    discardEditorDraft,
    selectVersion,
    setLabel,
    getVersionsForTemplate,
  } = useTemplateStore();

  const versions = useMemo(() =>
    getVersionsForTemplate(templateId),
    [templateId, getVersionsForTemplate]
  );

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'variables' | 'history'>('edit');
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [useSampleData, setUseSampleData] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changeLog, setChangeLog] = useState('');
  const [compareVersions, setCompareVersions] = useState<{ old: PromptVersion; new: PromptVersion } | null>(null);

  // Initialize editor when template changes
  useEffect(() => {
    if (templateId) {
      startEditing(templateId, currentVersion?.id);
    }
  }, [templateId]);

  // Extract variables from content
  const detectedVariables = useMemo(() => {
    if (!editorDraft?.userPrompt) return [];
    const systemVars = editorDraft.systemPrompt ? extractVariables(editorDraft.systemPrompt) : [];
    const userVars = extractVariables(editorDraft.userPrompt);
    return [...new Set([...systemVars, ...userVars])];
  }, [editorDraft?.systemPrompt, editorDraft?.userPrompt]);

  // Validate current variables
  const validationErrors = useMemo(() => {
    if (!editorDraft) return [];
    const content = `${editorDraft.systemPrompt || ''}\n${editorDraft.userPrompt}`;
    return validateVariables(content, editorDraft.variables);
  }, [editorDraft]);

  // Generate sample values for preview
  const sampleValues = useMemo(() => {
    if (!editorDraft) return {};
    return generateSampleValues(editorDraft.variables);
  }, [editorDraft?.variables]);

  // Render preview
  const previewContent = useMemo(() => {
    if (!editorDraft) return '';
    try {
      const values = useSampleData ? sampleValues : previewVariables;
      return renderPrompt(editorDraft.userPrompt, values);
    } catch {
      return editorDraft.userPrompt;
    }
  }, [editorDraft, editorDraft?.userPrompt, previewVariables, sampleValues, useSampleData]);

  const handleUserPromptChange = useCallback((userPrompt: string) => {
    updateEditorDraft({ userPrompt });
  }, [updateEditorDraft]);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    updateEditorDraft({ systemPrompt });
  }, [updateEditorDraft]);

  const handleVariableChange = useCallback((
    index: number,
    updates: Partial<PromptVariable>
  ) => {
    if (!editorDraft) return;
    const variables = [...editorDraft.variables];
    variables[index] = { ...variables[index], ...updates };
    updateEditorDraft({ variables });
  }, [editorDraft, updateEditorDraft]);

  const handleAddVariable = useCallback(() => {
    if (!editorDraft) return;
    const newVariable: PromptVariable = {
      name: `variable_${editorDraft.variables.length + 1}`,
      type: 'string',
      required: false,
    };
    updateEditorDraft({
      variables: [...editorDraft.variables, newVariable],
    });
  }, [editorDraft, updateEditorDraft]);

  const handleRemoveVariable = useCallback((index: number) => {
    if (!editorDraft) return;
    const variables = editorDraft.variables.filter((_, i) => i !== index);
    updateEditorDraft({ variables });
  }, [editorDraft, updateEditorDraft]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    await saveEditorDraft(changeLog || 'Updated template');
    setChangeLog('');
    setShowPublishModal(false);
  }, [hasUnsavedChanges, saveEditorDraft, changeLog]);

  const handleDiscard = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('Discard unsaved changes?')) {
        discardEditorDraft();
        onClose?.();
      }
    } else {
      onClose?.();
    }
  }, [hasUnsavedChanges, discardEditorDraft, onClose]);

  if (!template || !editorDraft) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Loading template...</p>
      </div>
    );
  }

  // Show diff view when comparing versions
  if (compareVersions) {
    return (
      <VersionDiff
        oldVersion={compareVersions.old}
        newVersion={compareVersions.new}
        onClose={() => setCompareVersions(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background" data-testid="template-editor">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-4">
          <button
            onClick={handleDiscard}
            data-testid="back-btn"
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary" data-testid="template-name">{template.name}</h2>
            <p className="text-sm text-text-secondary">
              {currentVersion ? `v${currentVersion.version}` : 'Draft'}
              {hasUnsavedChanges && ' • Unsaved changes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={() => setShowPublishModal(true)}
              data-testid="save-template"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save Version
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface">
        {(['edit', 'preview', 'variables', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-6 py-3 font-medium capitalize transition-colors
              ${activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab}
            {tab === 'variables' && editorDraft.variables.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/20 rounded-full">
                {editorDraft.variables.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'edit' && (
          <EditTab
            systemPrompt={editorDraft.systemPrompt}
            userPrompt={editorDraft.userPrompt}
            onSystemPromptChange={handleSystemPromptChange}
            onUserPromptChange={handleUserPromptChange}
            detectedVariables={detectedVariables}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewTab
            systemPrompt={editorDraft.systemPrompt}
            content={previewContent}
            variables={editorDraft.variables}
            previewValues={previewVariables}
            sampleValues={sampleValues}
            useSampleData={useSampleData}
            onVariableChange={(name, value) =>
              setPreviewVariables(prev => ({ ...prev, [name]: value }))
            }
            onToggleSampleData={() => setUseSampleData(prev => !prev)}
          />
        )}

        {activeTab === 'variables' && (
          <VariablesTab
            variables={editorDraft.variables}
            detectedVariables={detectedVariables}
            validationErrors={validationErrors}
            onVariableChange={handleVariableChange}
            onAddVariable={handleAddVariable}
            onRemoveVariable={handleRemoveVariable}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            versions={versions}
            currentVersionId={currentVersion?.id}
            templateId={templateId}
            onSelectVersion={(_, versionId) => selectVersion(versionId as UUID)}
            onSetLabel={(label) => {
              if (currentVersion) {
                setLabel(templateId, label, currentVersion.id);
              }
            }}
            onCompareVersions={(oldVersion, newVersion) => setCompareVersions({ old: oldVersion, new: newVersion })}
          />
        )}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Save New Version
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Change Log
              </label>
              <textarea
                value={changeLog}
                onChange={(e) => setChangeLog(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Tab Component
interface EditTabProps {
  systemPrompt: string;
  userPrompt: string;
  onSystemPromptChange: (value: string) => void;
  onUserPromptChange: (value: string) => void;
  detectedVariables: string[];
}

function EditTab({
  systemPrompt,
  userPrompt,
  onSystemPromptChange,
  onUserPromptChange,
  detectedVariables,
}: EditTabProps) {
  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* System Prompt */}
      <div className="mb-4 h-[150px] flex flex-col">
        <label className="block text-sm font-medium text-text-primary mb-2">
          System Prompt (optional)
        </label>
        <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
          <MonacoEditor
            value={systemPrompt}
            onChange={onSystemPromptChange}
            placeholder="Set the context and instructions for the AI..."
            language="plaintext"
            lineNumbers="off"
          />
        </div>
      </div>

      {/* User Prompt */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-sm font-medium text-text-primary mb-2">
          User Prompt
        </label>
        <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
          <MonacoEditor
            value={userPrompt}
            onChange={onUserPromptChange}
            placeholder="Write your prompt template here. Use {{variable_name}} for variables..."
            language="plaintext"
            lineNumbers="off"
          />
        </div>
      </div>

      {/* Detected Variables */}
      {detectedVariables.length > 0 && (
        <div className="mt-4 p-3 bg-surface rounded-lg border border-border shrink-0">
          <p className="text-sm text-text-secondary mb-2">Detected Variables:</p>
          <div className="flex flex-wrap gap-2">
            {detectedVariables.map((v) => (
              <span
                key={v}
                className="px-2 py-1 bg-primary/20 text-primary rounded text-sm font-mono"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Preview Tab Component
interface PreviewTabProps {
  systemPrompt: string;
  content: string;
  variables: PromptVariable[];
  previewValues: Record<string, string>;
  sampleValues: Record<string, string | number | boolean>;
  useSampleData: boolean;
  onVariableChange: (name: string, value: string) => void;
  onToggleSampleData: () => void;
}

function PreviewTab({
  systemPrompt,
  content,
  variables,
  previewValues,
  sampleValues,
  useSampleData,
  onVariableChange,
  onToggleSampleData,
}: PreviewTabProps) {
  return (
    <div className="h-full grid grid-cols-2 divide-x divide-border">
      {/* Variables Input */}
      <div className="p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-text-primary">Test Values</h4>
          {variables.length > 0 && (
            <button
              onClick={onToggleSampleData}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                useSampleData
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {useSampleData ? 'Using Sample Data' : 'Use Sample Data'}
            </button>
          )}
        </div>
        {variables.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No variables defined. Add variables in the Variables tab.
          </p>
        ) : (
          <div className="space-y-3">
            {variables.map((variable) => {
              const displayValue = useSampleData
                ? sampleValues[variable.name]?.toString() || ''
                : previewValues[variable.name] || variable.defaultValue?.toString() || '';
              
              return (
                <div key={variable.name}>
                  <label className="block text-xs text-text-secondary mb-1">
                    {variable.name}
                    {variable.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => onVariableChange(variable.name, e.target.value)}
                    placeholder={variable.description || `Enter ${variable.name}`}
                    disabled={useSampleData}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {useSampleData && sampleValues[variable.name] !== undefined && (
                    <p className="text-xs text-text-secondary mt-1">
                      Sample: {sampleValues[variable.name].toString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Output */}
      <div className="p-4 overflow-y-auto bg-background">
        <h4 className="text-sm font-medium text-text-primary mb-4">Preview</h4>
        {systemPrompt && (
          <div className="mb-4">
            <p className="text-xs text-text-secondary mb-1">System Prompt</p>
            <div className="p-3 bg-surface rounded-lg border border-border text-sm text-text-primary whitespace-pre-wrap">
              {systemPrompt}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-text-secondary mb-1">User Prompt</p>
          <div className="p-3 bg-surface rounded-lg border border-border text-sm text-text-primary whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

// Variables Tab Component
interface VariablesTabProps {
  variables: PromptVariable[];
  detectedVariables: string[];
  validationErrors: string[];
  onVariableChange: (index: number, updates: Partial<PromptVariable>) => void;
  onAddVariable: () => void;
  onRemoveVariable: (index: number) => void;
}

function VariablesTab({
  variables,
  detectedVariables,
  validationErrors,
  onVariableChange,
  onAddVariable,
  onRemoveVariable,
}: VariablesTabProps) {
  const definedNames = new Set(variables.map((v) => v.name));
  const undefinedVars = detectedVariables.filter((v) => !definedNames.has(v) && !v.startsWith('brand.'));

  return (
    <div className="h-full p-4 overflow-y-auto">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm font-medium text-red-500 mb-1">Validation Issues</p>
          <ul className="text-sm text-red-400 list-disc list-inside">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Undefined Variables Warning */}
      {undefinedVars.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm font-medium text-yellow-500 mb-1">Undefined Variables</p>
          <p className="text-sm text-yellow-400">
            Found variables not yet defined: {undefinedVars.map((v) => `{{${v}}}`).join(', ')}
          </p>
        </div>
      )}

      {/* Variable List */}
      <div className="space-y-3">
        {variables.map((variable, index) => (
          <VariableEditor
            key={index}
            variable={variable}
            isUsed={detectedVariables.includes(variable.name)}
            onChange={(updates) => onVariableChange(index, updates)}
            onRemove={() => onRemoveVariable(index)}
          />
        ))}
      </div>

      <button
        onClick={onAddVariable}
        className="mt-4 w-full py-2 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
      >
        + Add Variable
      </button>
    </div>
  );
}

// Variable Editor Component
interface VariableEditorProps {
  variable: PromptVariable;
  isUsed: boolean;
  onChange: (updates: Partial<PromptVariable>) => void;
  onRemove: () => void;
}

function VariableEditor({ variable, isUsed, onChange, onRemove }: VariableEditorProps) {
  return (
    <div className={`p-4 bg-surface rounded-lg border ${isUsed ? 'border-border' : 'border-yellow-500/30'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid grid-cols-3 gap-3">
          {/* Name */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name</label>
            <input
              type="text"
              value={variable.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary font-mono"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type</label>
            <select
              value={variable.type}
              onChange={(e) => onChange({ type: e.target.value as PromptVariable['type'] })}
              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary"
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="enum">Select</option>
            </select>
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Default</label>
            <input
              type="text"
              value={variable.defaultValue?.toString() || ''}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              placeholder="Optional"
              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary"
            />
          </div>
        </div>

        <button
          onClick={onRemove}
          className="p-1 text-text-secondary hover:text-red-500 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Options (for enum type) */}
      {variable.type === 'enum' && (
        <div className="mt-3">
          <label className="block text-xs text-text-secondary mb-1">Options (comma-separated)</label>
          <input
            type="text"
            value={variable.enumValues?.join(', ') || ''}
            onChange={(e) => onChange({
              enumValues: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            })}
            placeholder="option1, option2, option3"
            className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary"
          />
        </div>
      )}

      {/* Description and Required */}
      <div className="mt-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={variable.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="rounded border-border"
          />
          Required
        </label>
        <input
          type="text"
          value={variable.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description (optional)"
          className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text-primary"
        />
      </div>
    </div>
  );
}

// History Tab Component
interface HistoryTabProps {
  versions: PromptVersion[];
  currentVersionId?: UUID;
  templateId: UUID;
  onSelectVersion: (templateId: string, versionId: string) => void;
  onSetLabel: (label: 'draft' | 'staging' | 'production') => void;
  onCompareVersions: (oldVersion: PromptVersion, newVersion: PromptVersion) => void;
}

function HistoryTab({
  versions,
  currentVersionId,
  templateId,
  onSelectVersion,
  onSetLabel,
  onCompareVersions,
}: HistoryTabProps) {
  const [selectedForCompare, setSelectedForCompare] = useState<PromptVersion | null>(null);

  const handleCompareClick = (version: PromptVersion) => {
    if (selectedForCompare) {
      if (selectedForCompare.id === version.id) {
        // Deselect if clicking the same version
        setSelectedForCompare(null);
      } else {
        // Compare the two versions (older first)
        const oldVersion = selectedForCompare.createdAt < version.createdAt ? selectedForCompare : version;
        const newVersion = selectedForCompare.createdAt < version.createdAt ? version : selectedForCompare;
        onCompareVersions(oldVersion, newVersion);
        setSelectedForCompare(null);
      }
    } else {
      setSelectedForCompare(version);
    }
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      {selectedForCompare && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-text-primary">
            Select another version to compare with v{selectedForCompare.version}
          </p>
          <button
            onClick={() => setSelectedForCompare(null)}
            className="text-xs text-text-secondary hover:text-text-primary mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            onClick={() => onSelectVersion(templateId, version.id)}
            className={`
              p-4 rounded-lg border cursor-pointer transition-colors
              ${version.id === currentVersionId
                ? 'border-primary bg-primary/10'
                : 'border-border bg-surface hover:bg-surface-hover'
              }
              ${selectedForCompare?.id === version.id ? 'ring-2 ring-primary' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">
                  v{version.version}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {version.changeLog || 'No description'}
                </p>
                <p className="text-xs text-text-secondary mt-2">
                  {new Date(version.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-1">
                {version.id === currentVersionId && (
                  <>
                    {(['draft', 'staging', 'production'] as const).map((label) => (
                      <button
                        key={label}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetLabel(label);
                        }}
                        className="px-2 py-1 text-xs bg-surface-hover rounded hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompareClick(version);
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedForCompare?.id === version.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-hover hover:bg-primary/20 hover:text-primary'
                  }`}
                >
                  {selectedForCompare?.id === version.id ? 'Selected' : 'Compare'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {versions.length === 0 && (
          <p className="text-center text-text-secondary py-8">
            No versions yet. Save your first version!
          </p>
        )}
      </div>
    </div>
  );
}

export default TemplateEditor;
