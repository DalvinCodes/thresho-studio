/**
 * Template Library Component
 * Browse, search, and manage prompt templates
 */

import { useState, useRef } from 'react';
import type { ContentType } from '../../../core/types/common';
import type { TemplateWithVersion } from '../../../core/types/prompt';
import {
  useTemplates,
  useTemplateStore,
  useSelectedTemplate,
} from '../store';

interface TemplateLibraryProps {
  onSelectTemplate?: (templateId: string) => void;
  onEditTemplate?: (templateId: string) => void;
}

export function TemplateLibrary({
  onSelectTemplate,
  onEditTemplate,
}: TemplateLibraryProps) {
  const templates = useTemplates();
  const selectedTemplate = useSelectedTemplate();
  const { selectTemplate, createTemplate, setSearchParams, exportTemplate, importTemplate } = useTemplateStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentType | ''>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchParams({ query: query || undefined });
  };

  const handleFilterType = (type: ContentType | '') => {
    setFilterType(type);
    setSearchParams({ outputType: type || undefined });
  };

  const handleSelect = (template: TemplateWithVersion) => {
    selectTemplate(template.template.id);
    onSelectTemplate?.(template.template.id);
  };

  const handleEdit = (template: TemplateWithVersion) => {
    onEditTemplate?.(template.template.id);
  };

  const handleExport = async (template: TemplateWithVersion) => {
    try {
      const json = await exportTemplate(template.template.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export template:', error);
      alert('Failed to export template');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      await importTemplate(text);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      setImportError('Failed to import template. Please check the file format.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Templates</h2>
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="px-3 py-1.5 border border-border text-text-primary text-sm rounded-lg hover:bg-surface-hover transition-colors"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
            >
              + New Template
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={filterType}
            onChange={(e) => handleFilterType(e.target.value as ContentType | '')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>

        {/* Import error message */}
        {importError && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {importError}
          </div>
        )}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-4">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">No templates found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-primary hover:underline"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((item) => (
              <TemplateCard
                key={item.template.id}
                item={item}
                isSelected={selectedTemplate?.id === item.template.id}
                onSelect={() => handleSelect(item)}
                onEdit={() => handleEdit(item)}
                onExport={() => handleExport(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, type, description) => {
            const id = await createTemplate(name, type, { description });
            setShowCreateModal(false);
            onEditTemplate?.(id);
          }}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  item: TemplateWithVersion;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

interface TemplateCardProps {
  item: TemplateWithVersion;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onExport: () => void;
}

function TemplateCard({ item, isSelected, onSelect, onEdit, onExport }: TemplateCardProps) {
  const { template, currentVersion, labels, versionCount } = item;

  const typeIcons = {
    text: '📝',
    image: '🖼️',
    video: '🎬',
  };

  const productionLabel = labels.find((l) => l.label === 'production');

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg border cursor-pointer transition-colors
        ${isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-surface hover:bg-surface-hover'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeIcons[template.outputType]}</span>
          <div>
            <h3 className="font-medium text-text-primary">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-text-secondary">
                v{currentVersion?.version || '0.0.0'}
              </span>
              <span className="text-xs text-text-secondary">
                {versionCount} version{versionCount !== 1 ? 's' : ''}
              </span>
              {productionLabel && (
                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                  production
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="px-2 py-1 text-xs text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title="Export template"
          >
            Export
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {template.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-background text-text-secondary rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 5 && (
            <span className="text-xs text-text-secondary">
              +{template.tags.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface CreateTemplateModalProps {
  onClose: () => void;
  onCreate: (name: string, type: ContentType, description: string) => void;
}

function CreateTemplateModal({ onClose, onCreate }: CreateTemplateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ContentType>('text');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), type, description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Create New Template
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Prompt Template"
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Output Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContentType)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="text">Text Generation</option>
              <option value="image">Image Generation</option>
              <option value="video">Video Generation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TemplateLibrary;
