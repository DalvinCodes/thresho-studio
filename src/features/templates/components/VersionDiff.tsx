/**
 * Version Diff Component
 * Side-by-side and inline diff view for comparing prompt versions
 */

import { useState, useMemo } from 'react';
import type { PromptVersion, PromptVariable } from '../../../core/types/prompt';
import { computeLineDiff, compareArrays, type DiffLine, type DiffType } from '../services/diffService';

interface VersionDiffProps {
  oldVersion: PromptVersion;
  newVersion: PromptVersion;
  onClose?: () => void;
}

type DiffViewMode = 'split' | 'unified';
type DiffTab = 'prompt' | 'system' | 'variables' | 'config';

export function VersionDiff({ oldVersion, newVersion, onClose }: VersionDiffProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('split');
  const [activeTab, setActiveTab] = useState<DiffTab>('prompt');

  const systemDiff = useMemo(() =>
    computeLineDiff(oldVersion.systemPrompt || '', newVersion.systemPrompt || ''),
    [oldVersion.systemPrompt, newVersion.systemPrompt]
  );

  const userDiff = useMemo(() =>
    computeLineDiff(oldVersion.userPrompt, newVersion.userPrompt),
    [oldVersion.userPrompt, newVersion.userPrompt]
  );

  const variableComparison = useMemo(() =>
    compareArrays(
      oldVersion.variables,
      newVersion.variables,
      (v) => v.name
    ),
    [oldVersion.variables, newVersion.variables]
  );

  const configChanged = useMemo(() =>
    JSON.stringify(oldVersion.modelConfig) !== JSON.stringify(newVersion.modelConfig),
    [oldVersion.modelConfig, newVersion.modelConfig]
  );

  const hasChanges = userDiff.addedCount > 0 || userDiff.removedCount > 0 ||
    systemDiff.addedCount > 0 || systemDiff.removedCount > 0 ||
    variableComparison.added.length > 0 || variableComparison.removed.length > 0 ||
    variableComparison.modified.length > 0 || configChanged;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-3xl transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Comparing Versions
            </h2>
            <p className="text-sm text-text-secondary">
              v{oldVersion.version} → v{newVersion.version}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-background rounded-3xl p-1 border border-border">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                viewMode === 'split'
                  ? 'bg-surface text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                viewMode === 'unified'
                  ? 'bg-surface text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Unified
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface">
        {[
          { id: 'prompt' as DiffTab, label: 'User Prompt', count: userDiff.addedCount + userDiff.removedCount },
          { id: 'system' as DiffTab, label: 'System Prompt', count: systemDiff.addedCount + systemDiff.removedCount },
          { id: 'variables' as DiffTab, label: 'Variables', count: variableComparison.added.length + variableComparison.removed.length + variableComparison.modified.length },
          { id: 'config' as DiffTab, label: 'Model Config', badge: configChanged },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-6 py-3 font-medium transition-colors flex items-center gap-2
              ${activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab.label}
            {(tab.count > 0 || tab.badge) && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-primary/20' : 'bg-surface-hover'}
              `}>
                {tab.count > 0 ? tab.count : '•'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!hasChanges ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-secondary text-lg">No changes detected</p>
              <p className="text-text-secondary text-sm mt-1">
                These versions appear to be identical
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'prompt' && (
              <DiffContent
                diff={userDiff}
                viewMode={viewMode}
                oldLabel={`v${oldVersion.version}`}
                newLabel={`v${newVersion.version}`}
              />
            )}

            {activeTab === 'system' && (
              <DiffContent
                diff={systemDiff}
                viewMode={viewMode}
                oldLabel={`v${oldVersion.version}`}
                newLabel={`v${newVersion.version}`}
              />
            )}

            {activeTab === 'variables' && (
              <VariableDiffView comparison={variableComparison} />
            )}

            {activeTab === 'config' && (
              <ConfigDiffView
                oldConfig={oldVersion.modelConfig}
                newConfig={newVersion.modelConfig}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Diff Content Component
interface DiffContentProps {
  diff: { lines: DiffLine[]; addedCount: number; removedCount: number; unchangedCount: number };
  viewMode: DiffViewMode;
  oldLabel: string;
  newLabel: string;
}

function DiffContent({ diff, viewMode, oldLabel, newLabel }: DiffContentProps) {
  if (viewMode === 'split') {
    return (
      <div className="h-full grid grid-cols-2 divide-x divide-border">
        {/* Old Version */}
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 bg-surface border-b border-border text-sm font-medium text-text-secondary">
            {oldLabel}
          </div>
          <div className="flex-1 overflow-auto">
            <div className="font-mono text-sm">
              {diff.lines.map((line, idx) => (
                <div
                  key={`old-${idx}`}
                  className={`flex ${
                    line.type === 'removed'
                      ? 'bg-red-500/10'
                      : line.type === 'unchanged'
                      ? ''
                      : 'opacity-30'
                  }`}
                >
                  <span className="w-12 px-2 py-0.5 text-right text-text-secondary select-none shrink-0">
                    {line.oldLineNumber || ''}
                  </span>
                  <span className={`flex-1 px-2 py-0.5 whitespace-pre ${
                    line.type === 'removed' ? 'text-red-400' : 'text-text-primary'
                  }`}>
                    {line.type === 'added' ? '' : line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* New Version */}
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 bg-surface border-b border-border text-sm font-medium text-text-secondary">
            {newLabel}
          </div>
          <div className="flex-1 overflow-auto">
            <div className="font-mono text-sm">
              {diff.lines.map((line, idx) => (
                <div
                  key={`new-${idx}`}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-green-500/10'
                      : line.type === 'unchanged'
                      ? ''
                      : 'opacity-30'
                  }`}
                >
                  <span className="w-12 px-2 py-0.5 text-right text-text-secondary select-none shrink-0">
                    {line.newLineNumber || ''}
                  </span>
                  <span className={`flex-1 px-2 py-0.5 whitespace-pre ${
                    line.type === 'added' ? 'text-green-400' : 'text-text-primary'
                  }`}>
                    {line.type === 'removed' ? '' : line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unified view
  return (
    <div className="h-full overflow-auto">
      <div className="font-mono text-sm">
        {diff.lines.map((line, idx) => (
          <div
            key={idx}
            className={`flex ${
              line.type === 'added'
                ? 'bg-green-500/10'
                : line.type === 'removed'
                ? 'bg-red-500/10'
                : ''
            }`}
          >
            <span className="w-12 px-2 py-0.5 text-right text-text-secondary select-none shrink-0">
              {line.oldLineNumber || (line.type === 'added' ? '' : ' ')}
            </span>
            <span className="w-12 px-2 py-0.5 text-right text-text-secondary select-none shrink-0 border-r border-border">
              {line.newLineNumber || (line.type === 'removed' ? '' : ' ')}
            </span>
            <span className={`w-6 px-2 py-0.5 text-center select-none shrink-0 ${
              line.type === 'added'
                ? 'text-green-400'
                : line.type === 'removed'
                ? 'text-red-400'
                : 'text-text-secondary'
            }`}>
              {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
            </span>
            <span className={`flex-1 px-2 py-0.5 whitespace-pre ${
              line.type === 'added'
                ? 'text-green-400'
                : line.type === 'removed'
                ? 'text-red-400'
                : 'text-text-primary'
            }`}>
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Variable Diff View
interface VariableDiffViewProps {
  comparison: {
    added: PromptVariable[];
    removed: PromptVariable[];
    unchanged: PromptVariable[];
    modified: Array<{ old: PromptVariable; new: PromptVariable }>;
  };
}

function VariableDiffView({ comparison }: VariableDiffViewProps) {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-4 max-w-4xl">
        {/* Added Variables */}
        {comparison.added.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Added ({comparison.added.length})
            </h4>
            <div className="space-y-2">
              {comparison.added.map((variable) => (
                <VariableCard key={variable.name} variable={variable} type="added" />
              ))}
            </div>
          </div>
        )}

        {/* Removed Variables */}
        {comparison.removed.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Removed ({comparison.removed.length})
            </h4>
            <div className="space-y-2">
              {comparison.removed.map((variable) => (
                <VariableCard key={variable.name} variable={variable} type="removed" />
              ))}
            </div>
          </div>
        )}

        {/* Modified Variables */}
        {comparison.modified.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Modified ({comparison.modified.length})
            </h4>
            <div className="space-y-2">
              {comparison.modified.map(({ old, new: newVar }) => (
                <ModifiedVariableCard key={old.name} old={old} new={newVar} />
              ))}
            </div>
          </div>
        )}

        {/* No Changes */}
        {comparison.added.length === 0 &&
          comparison.removed.length === 0 &&
          comparison.modified.length === 0 && (
            <p className="text-text-secondary text-center py-8">
              No changes to variables
            </p>
          )}
      </div>
    </div>
  );
}

// Variable Card Component
interface VariableCardProps {
  variable: PromptVariable;
  type: DiffType;
}

function VariableCard({ variable, type }: VariableCardProps) {
  return (
    <div className={`p-3 rounded-3xl border ${
      type === 'added'
        ? 'bg-green-500/5 border-green-500/30'
        : 'bg-red-500/5 border-red-500/30'
    }`}>
      <div className="flex items-center gap-3">
        <code className="text-sm font-mono text-text-primary">{variable.name}</code>
        <span className="text-xs px-2 py-0.5 rounded bg-surface text-text-secondary">
          {variable.type}
        </span>
        {variable.required && (
          <span className="text-xs text-red-400">required</span>
        )}
      </div>
      {variable.description && (
        <p className="text-sm text-text-secondary mt-1">{variable.description}</p>
      )}
      {variable.defaultValue !== undefined && (
        <p className="text-sm text-text-secondary mt-1">
          Default: <code className="font-mono">{String(variable.defaultValue)}</code>
        </p>
      )}
    </div>
  );
}

// Modified Variable Card
interface ModifiedVariableCardProps {
  old: PromptVariable;
  new: PromptVariable;
}

function ModifiedVariableCard({ old, new: newVar }: ModifiedVariableCardProps) {
  const changes: string[] = [];
  if (old.type !== newVar.type) changes.push('type');
  if (old.required !== newVar.required) changes.push('required');
  if (old.defaultValue !== newVar.defaultValue) changes.push('default');
  if (old.description !== newVar.description) changes.push('description');
  if (JSON.stringify(old.enumValues) !== JSON.stringify(newVar.enumValues)) changes.push('options');

  return (
    <div className="p-3 rounded-3xl border border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-center gap-3 mb-2">
        <code className="text-sm font-mono text-text-primary">{old.name}</code>
        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
          {changes.join(', ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Old Values */}
        <div className="space-y-1">
          <p className="text-text-secondary text-xs">Before</p>
          <p className={old.type !== newVar.type ? 'text-red-400 line-through' : 'text-text-primary'}>
            Type: {old.type}
          </p>
          <p className={old.required !== newVar.required ? 'text-red-400 line-through' : 'text-text-primary'}>
            {old.required ? 'Required' : 'Optional'}
          </p>
          {old.defaultValue !== undefined && (
            <p className={old.defaultValue !== newVar.defaultValue ? 'text-red-400 line-through' : 'text-text-primary'}>
              Default: {String(old.defaultValue)}
            </p>
          )}
        </div>

        {/* New Values */}
        <div className="space-y-1">
          <p className="text-text-secondary text-xs">After</p>
          <p className={old.type !== newVar.type ? 'text-green-400' : 'text-text-primary'}>
            Type: {newVar.type}
          </p>
          <p className={old.required !== newVar.required ? 'text-green-400' : 'text-text-primary'}>
            {newVar.required ? 'Required' : 'Optional'}
          </p>
          {newVar.defaultValue !== undefined && (
            <p className={old.defaultValue !== newVar.defaultValue ? 'text-green-400' : 'text-text-primary'}>
              Default: {String(newVar.defaultValue)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Config Diff View
interface ModelConfig {
  preferredProvider?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface ConfigDiffViewProps {
  oldConfig?: ModelConfig;
  newConfig?: ModelConfig;
}

function ConfigDiffView({ oldConfig, newConfig }: ConfigDiffViewProps) {
  const allKeys = new Set([
    ...Object.keys(oldConfig || {}),
    ...Object.keys(newConfig || {}),
  ]);

  const changes: Array<{ key: string; old?: unknown; new?: unknown }> = [];
  for (const key of allKeys) {
    const oldVal = oldConfig?.[key as keyof typeof oldConfig];
    const newVal = newConfig?.[key as keyof typeof newConfig];
    if (oldVal !== newVal) {
      changes.push({ key, old: oldVal, new: newVal });
    }
  }

  if (changes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">No changes to model configuration</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl space-y-3">
        {changes.map(({ key, old, new: newVal }) => (
          <div
            key={key}
            className="p-3 rounded-3xl border border-border bg-surface"
          >
            <p className="text-sm font-medium text-text-primary capitalize mb-2">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary text-xs mb-1">Before</p>
                <p className={newVal !== undefined ? 'text-red-400 line-through' : 'text-text-primary'}>
                  {old !== undefined ? String(old) : <em className="text-text-secondary">Not set</em>}
                </p>
              </div>
              <div>
                <p className="text-text-secondary text-xs mb-1">After</p>
                <p className={old !== undefined ? 'text-green-400' : 'text-text-primary'}>
                  {newVal !== undefined ? String(newVal) : <em className="text-text-secondary">Not set</em>}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VersionDiff;
