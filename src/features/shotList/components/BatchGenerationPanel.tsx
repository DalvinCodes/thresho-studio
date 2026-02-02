/**
 * Batch Generation Panel Component
 * Modal for generating multiple shots concurrently
 */

import { useState, useMemo } from 'react';
import { Sparkles, X, Play, AlertCircle } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot } from '../../../core/types/shotList';

interface BatchGenerationPanelProps {
  shots: Shot[];
  selectedShotIds: UUID[];
  onClose: () => void;
  onGenerateBatch: (shotIds: UUID[]) => void;
}

export function BatchGenerationPanel({
  shots,
  selectedShotIds,
  onClose,
  onGenerateBatch,
}: BatchGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Get selected shots with their data
  const selectedShots = useMemo(() => {
    return selectedShotIds
      .map((id) => shots.find((s) => s.id === id))
      .filter((shot): shot is Shot => shot !== undefined);
  }, [shots, selectedShotIds]);

  // Validate shots - check for short descriptions
  const validationResults = useMemo(() => {
    return selectedShots.map((shot) => ({
      shot,
      isValid: shot.description.length >= 10,
    }));
  }, [selectedShots]);

  const invalidShots = validationResults.filter((r) => !r.isValid);
  const validShots = validationResults.filter((r) => r.isValid);
  const hasInvalidShots = invalidShots.length > 0;

  const handleGenerate = async () => {
    if (validShots.length === 0) return;

    setIsGenerating(true);
    try {
      await onGenerateBatch(validShots.map((r) => r.shot.id));
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Batch Generate
              </h2>
              <p className="text-sm text-text-secondary">
                {selectedShots.length} shot{selectedShots.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Validation Warning */}
          {hasInvalidShots && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">
                    {invalidShots.length} shot{invalidShots.length !== 1 ? 's' : ''} with short description
                  </p>
                  <p className="text-sm text-yellow-400/70 mt-1">
                    Shots with descriptions shorter than 10 characters may not generate well.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shot List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Selected Shots
            </h3>
            {validationResults.map(({ shot, isValid }) => (
              <div
                key={shot.id}
                className={`
                  p-4 rounded-2xl border transition-colors
                  ${isValid
                    ? 'bg-background border-border'
                    : 'bg-yellow-500/5 border-yellow-500/20'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-text-secondary">
                        {shot.shotNumber}
                      </span>
                      <span className="text-sm font-medium text-text-primary truncate">
                        {shot.name}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {shot.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-1 text-xs capitalize bg-surface-raised rounded-full text-text-secondary">
                      {shot.shotType.replace('-', ' ')}
                    </span>
                    {!isValid && (
                      <span className="text-xs text-yellow-500 whitespace-nowrap">
                        Description too short
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-text-secondary">
            {validShots.length > 0 ? (
              <span>
                Ready to generate{' '}
                <span className="font-medium text-text-primary">
                  {validShots.length}
                </span>{' '}
                shot{validShots.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-yellow-500">No valid shots to generate</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || validShots.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate {validShots.length > 0 && `(${validShots.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchGenerationPanel;
