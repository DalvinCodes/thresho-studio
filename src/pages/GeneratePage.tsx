/**
 * Generate Page
 * Create AI-generated content (text, images, videos)
 */

import { useState, useCallback, useMemo } from 'react';
import { FileText, Image, Video, Sparkles } from 'lucide-react';
import type { UUID, ContentType } from '../core/types/common';
import type { GenerationParameters } from '../core/types/generation';
import type { TemplateWithVersion, PromptVariable } from '../core/types/prompt';
import { useGenerationStore, GenerationPanel } from '../features/generation';
import { useTemplates, useTemplateStore } from '../features/templates/store';
import { useBrands, useDefaultBrand } from '../features/brands';
import { TalentSelector } from '../features/talent/components/TalentSelector';

export function GeneratePage() {
  const templates: TemplateWithVersion[] = useTemplates();
  const brands = useBrands();
  const defaultBrand = useDefaultBrand();
  const { startGeneration } = useGenerationStore();

  const [contentType, setContentType] = useState<ContentType>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState<UUID | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<UUID | null>(defaultBrand?.id || null);
  const [selectedTalentIds, setSelectedTalentIds] = useState<UUID[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string | number | boolean>>({});
  const [parameters, setParameters] = useState<GenerationParameters>({
    temperature: 0.7,
    maxTokens: 1000,
    stream: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get the selected template's current version
  const templateStore = useTemplateStore();
  const selectedTemplateVersion = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templateStore.getLatestVersion(selectedTemplateId);
  }, [selectedTemplateId, templateStore]);

  // Extract variables from the selected template
  const templateVariables = useMemo(() => {
    if (!selectedTemplateVersion) return [];
    return selectedTemplateVersion.variables || [];
  }, [selectedTemplateVersion]);

  // Handle variable value changes
  const handleVariableChange = useCallback((name: string, value: string | number | boolean) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  }, []);

  // Reset variables when template changes
  const handleTemplateChange = useCallback((templateId: UUID | null) => {
    setSelectedTemplateId(templateId);
    setVariables({});
  }, [setSelectedTemplateId]);

  // Handle generation
  const handleGenerate = useCallback(() => {
    const request = {
      type: contentType,
      promptTemplateId: selectedTemplateId || undefined,
      brandId: selectedBrandId || undefined,
      talentIds: selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
      customPrompt: !selectedTemplateId ? customPrompt : undefined,
      variables,
      parameters,
    };

    startGeneration(request);
  }, [contentType, selectedTemplateId, selectedBrandId, selectedTalentIds, customPrompt, variables, parameters, startGeneration]);

  // Check if can generate
  const canGenerate = selectedTemplateId || customPrompt.trim().length > 0;

  return (
    <div className="h-full flex">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold text-text-primary">Generate Content</h2>
            <p className="text-text-secondary mt-1">Create AI-generated text, images, and videos</p>
          </div>

          {/* Content Type Selector */}
          <div className="bg-surface rounded-3xl border border-border p-4">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Content Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: 'text', icon: FileText, label: 'Text' },
                { type: 'image', icon: Image, label: 'Image' },
                { type: 'video', icon: Video, label: 'Video' },
              ] as const).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setContentType(type)}
                  className={`
                    p-4 rounded-3xl border-2 transition-all flex flex-col items-center
                    ${contentType === type
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <Icon className="w-8 h-8 mb-2 text-text-primary" />
                  <span className="font-medium text-text-primary">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Source */}
          <div className="bg-surface rounded-3xl border border-border p-4">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Prompt
            </label>

            {/* Template selector */}
            <div className="mb-4">
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => handleTemplateChange(e.target.value as UUID || null)}
                className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
              >
                <option value="">Custom prompt</option>
                {templates
                  .filter((t) => t.template.outputType === contentType)
                  .map((templateWithVersion) => (
                    <option key={templateWithVersion.template.id} value={templateWithVersion.template.id}>
                      {templateWithVersion.template.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Custom prompt or template variables */}
            {!selectedTemplateId ? (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                data-testid="prompt-input"
                placeholder={
                  contentType === 'text'
                    ? 'Enter your prompt...'
                    : contentType === 'image'
                    ? 'Describe the image you want to generate...'
                    : 'Describe the video scene...'
                }
                rows={6}
                className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary resize-none"
              />
            ) : (
              <div className="p-4 bg-background rounded-3xl border border-border">
                {templateVariables.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    This template has no variables. It will be used as-is.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary mb-2">
                      Fill in the template variables:
                    </p>
                    {templateVariables.map((variable: PromptVariable) => (
                      <div key={variable.name}>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {variable.name}
                          {variable.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {variable.description && (
                          <p className="text-xs text-text-secondary mb-1">{variable.description}</p>
                        )}
                        {variable.type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(variables[variable.name] ?? variable.defaultValue ?? false)}
                            onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
                            className="w-4 h-4"
                          />
                        ) : variable.type === 'number' ? (
                          <input
                            type="number"
                            value={String(variables[variable.name] ?? variable.defaultValue ?? '')}
                            onChange={(e) => handleVariableChange(variable.name, Number(e.target.value))}
                            className="w-full h-10 px-4 bg-surface border border-border rounded-3xl text-text-primary"
                          />
                        ) : variable.type === 'enum' && variable.enumValues ? (
                          <select
                            value={String(variables[variable.name] ?? variable.defaultValue ?? '')}
                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                            className="w-full h-10 px-4 bg-surface border border-border rounded-3xl text-text-primary"
                          >
                            <option value="">Select...</option>
                            {variable.enumValues.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={String(variables[variable.name] ?? variable.defaultValue ?? '')}
                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                            placeholder={variable.defaultValue ? `Default: ${variable.defaultValue}` : ''}
                            className="w-full h-10 px-4 bg-surface border border-border rounded-3xl text-text-primary placeholder:text-text-secondary"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Brand Selection */}
          <div className="bg-surface rounded-3xl border border-border p-4">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Brand Profile
            </label>
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value as UUID || null)}
              className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
            >
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                  {brand.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            {selectedBrandId && (
              <p className="mt-2 text-sm text-text-secondary">
                Brand tokens will be automatically injected into your prompt.
              </p>
            )}
          </div>

          {/* Talent Selection */}
          <div className="bg-surface rounded-3xl border border-border p-4">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Talents
            </label>
            <TalentSelector
              selectedIds={selectedTalentIds}
              onChange={setSelectedTalentIds}
              filterByBrandId={selectedBrandId || undefined}
              placeholder="Select talents to include..."
            />
            {selectedTalentIds.length > 0 && (
              <p className="mt-2 text-sm text-text-secondary">
                Talent descriptions will be injected into your prompt. Use {'{{TALENTS}}'} placeholder for precise placement.
              </p>
            )}
          </div>

          {/* Advanced Parameters */}
          <div className="bg-surface rounded-3xl border border-border">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-text-primary">Advanced Parameters</span>
              <span className="text-text-secondary">{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="p-4 pt-0 space-y-4">
                {contentType === 'text' && (
                  <>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Temperature: {parameters.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={parameters.temperature}
                        onChange={(e) =>
                          setParameters({ ...parameters, temperature: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={parameters.maxTokens}
                        onChange={(e) =>
                          setParameters({ ...parameters, maxTokens: Number(e.target.value) })
                        }
                        min={100}
                        max={4000}
                        className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="stream"
                        checked={parameters.stream}
                        onChange={(e) =>
                          setParameters({ ...parameters, stream: e.target.checked })
                        }
                      />
                      <label htmlFor="stream" className="text-sm text-text-primary">
                        Stream response
                      </label>
                    </div>
                  </>
                )}

                {contentType === 'image' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Width</label>
                        <select
                          value={parameters.width || 1024}
                          onChange={(e) =>
                            setParameters({ ...parameters, width: Number(e.target.value) })
                          }
                          className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
                        >
                          <option value={512}>512</option>
                          <option value={768}>768</option>
                          <option value={1024}>1024</option>
                          <option value={1536}>1536</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Height</label>
                        <select
                          value={parameters.height || 1024}
                          onChange={(e) =>
                            setParameters({ ...parameters, height: Number(e.target.value) })
                          }
                          className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
                        >
                          <option value={512}>512</option>
                          <option value={768}>768</option>
                          <option value={1024}>1024</option>
                          <option value={1536}>1536</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Negative Prompt
                      </label>
                      <input
                        type="text"
                        value={parameters.negativePrompt || ''}
                        onChange={(e) =>
                          setParameters({ ...parameters, negativePrompt: e.target.value })
                        }
                        placeholder="Things to avoid..."
                        className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary"
                      />
                    </div>
                  </>
                )}

                {contentType === 'video' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          value={parameters.duration || 5}
                          onChange={(e) =>
                            setParameters({ ...parameters, duration: Number(e.target.value) })
                          }
                          min={1}
                          max={60}
                          className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">
                          Aspect Ratio
                        </label>
                        <select
                          value={parameters.aspectRatio || '16:9'}
                          onChange={(e) =>
                            setParameters({ ...parameters, aspectRatio: e.target.value })
                          }
                          className="w-full h-10 px-4 bg-background border border-border rounded-3xl text-text-primary"
                        >
                          <option value="16:9">16:9</option>
                          <option value="9:16">9:16</option>
                          <option value="1:1">1:1</option>
                          <option value="4:3">4:3</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            data-testid="generate-btn"
            title={!canGenerate ? 'Enter a prompt or select a template to generate' : undefined}
            className="w-full py-4 text-lg font-semibold rounded-3xl transition-all flex items-center justify-center gap-2
              disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60
              bg-primary text-white hover:bg-primary/90 hover:shadow-md"
          >
            <Sparkles className="w-5 h-5" />
            Generate {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </button>
        </div>
      </div>

      {/* Generation Panel Sidebar */}
      <div className="w-96 border-l border-border">
        <GenerationPanel />
      </div>
    </div>
  );
}

export default GeneratePage;
