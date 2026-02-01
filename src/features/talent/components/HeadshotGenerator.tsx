/**
 * HeadshotGenerator Component
 * Step 1 UI for generating and approving a talent headshot
 */

import { useCallback, useState } from 'react';
import type { UUID } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type { TalentProfile, TalentGeneratedImage } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { generateImage, preparePrompt } from '../../generation/services/generationService';
import {
  buildHeadshotPrompt,
  hasAppearanceAttributes,
  mergeWithRandomAttributes,
} from '../services/headshotGenerationService';
import { StorageImage } from '../../../components/StorageMedia';
import { User, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';

interface HeadshotGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  modelId?: string | null;
  onApprove: () => void;
}

export function HeadshotGenerator({ talent, providerId, modelId, onApprove }: HeadshotGeneratorProps) {
  const generationState = useTalentGenerationState(talent.id);
  const {
    setCurrentHeadshot,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
    addReferenceImage,
  } = useTalentStore();

  const headshot = generationState?.currentHeadshot ?? null;
  const isGenerating = generationState?.isGenerating ?? false;
  const error = generationState?.error ?? null;

  const hasUserAttributes = hasAppearanceAttributes(talent.appearance);
  
  // Image preview modal state
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Generate a headshot image
   * @param forceRandom - If true, use random attributes even if user has some set
   */
  const handleGenerate = useCallback(async (forceRandom: boolean = false) => {
    if (!providerId) {
      setGenerationError(talent.id, 'No provider selected');
      return;
    }

    setIsGenerating(talent.id, true);
    setGenerationError(talent.id, null);
    setGenerationStep(talent.id, 'headshot');

    try {
      // Build appearance - merge with random if regenerating without full attributes
      let talentForPrompt = talent;
      if (forceRandom || !hasUserAttributes) {
        const mergedAppearance = mergeWithRandomAttributes(talent.appearance);
        talentForPrompt = { ...talent, appearance: mergedAppearance };
      }

      // Build the prompt
      const promptResult = buildHeadshotPrompt(talentForPrompt);

      // Build the generation request
      const generationRequest = {
        id: createUUID(),
        type: 'image' as const,
        providerId: providerId as UUID,
        model: modelId || undefined,
        customPrompt: promptResult.prompt,
        parameters: {
          width: 256,
          height: 256,
        },
        createdAt: createTimestamp(),
      };

      // Prepare the prompt for the generation service
      const preparedPrompt = await preparePrompt(generationRequest);

      // Generate the image
      const result = await generateImage(generationRequest, preparedPrompt);

      if (result.urls.length > 0) {
        const generatedImage: TalentGeneratedImage = {
          id: createUUID(),
          talentId: talent.id,
          type: 'headshot',
          url: result.urls[0],
          generationPrompt: promptResult.prompt,
          providerId: providerId,
          model: modelId || 'default',
          isApproved: false,
          createdAt: createTimestamp(),
        };

        setCurrentHeadshot(talent.id, generatedImage);
      } else {
        setGenerationError(talent.id, 'No image was generated');
      }
    } catch (err) {
      console.error('[HeadshotGenerator] Generation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate headshot';
      setGenerationError(talent.id, message);
    } finally {
      setIsGenerating(talent.id, false);
    }
  }, [talent, providerId, modelId, hasUserAttributes, setCurrentHeadshot, setIsGenerating, setGenerationError, setGenerationStep]);

  /**
   * Regenerate the headshot, keeping user-set attributes and randomizing unset ones
   */
  const handleRegenerate = useCallback(() => {
    handleGenerate(true);
  }, [handleGenerate]);

  /**
   * Approve the current headshot and save it as a reference image
   */
  const handleApprove = useCallback(() => {
    if (headshot) {
      const approvedHeadshot: TalentGeneratedImage = {
        ...headshot,
        isApproved: true,
      };
      setCurrentHeadshot(talent.id, approvedHeadshot);
      
      // Save as reference image so it persists and shows on the talent card
      addReferenceImage(talent.id, headshot.url, 'AI Generated Headshot');
      
      onApprove();
    }
  }, [headshot, talent.id, setCurrentHeadshot, addReferenceImage, onApprove]);

  /**
   * Open image preview
   */
  const handleImageClick = useCallback(() => {
    if (headshot && !isGenerating) {
      setShowPreview(true);
    }
  }, [headshot, isGenerating]);

  /**
   * Close image preview
   */
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  return (
    <div className="p-6 bg-[var(--color-bg)] rounded-3xl">
      <h4 className="text-lg font-medium text-[var(--color-text)] mb-6">Step 1: Generate Headshot</h4>

      {/* Preview Area - 256x256 */}
      <div 
        className={`w-64 h-64 bg-[var(--color-surface)] rounded-3xl flex items-center justify-center overflow-hidden shadow-lg ${
          headshot && !isGenerating ? 'cursor-pointer ring-2 ring-[var(--color-primary)]/30 hover:ring-[var(--color-primary)]/50 transition-all' : ''
        }`}
        onClick={handleImageClick}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            <span className="text-sm text-[var(--color-text-muted)]">Generating...</span>
          </div>
        ) : headshot ? (
          <StorageImage
            src={headshot.url}
            alt="Generated headshot"
            className="w-full h-full object-cover rounded-3xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--color-text-subtle)]">
            <User className="w-12 h-12 opacity-40" />
            <span className="text-sm">No headshot generated</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => handleGenerate(false)}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-5 flex gap-3">
        {!headshot ? (
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || !providerId}
            className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-3xl hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] hover:shadow-[var(--color-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Headshot'
            )}
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !providerId}
              className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-3xl hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-divider)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
            <button
              onClick={handleApprove}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-green-600 text-white rounded-3xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
          </>
        )}
      </div>

      {/* Info text */}
      {!hasUserAttributes && (
        <p className="mt-4 text-xs text-[var(--color-text-subtle)]">
          No appearance attributes set. Random attributes will be used for generation.
        </p>
      )}
      {!providerId && (
        <p className="mt-4 text-xs text-amber-400">
          Please select a provider to generate images.
        </p>
      )}

      {/* Image Preview Modal */}
      {showPreview && headshot && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={handleClosePreview}
        >
          <div 
            className="relative max-w-2xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClosePreview}
              className="absolute -top-12 right-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden shadow-2xl">
              <StorageImage
                src={headshot.url}
                alt="Generated headshot"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              
              {/* Image info */}
              <div className="p-4 border-t border-[var(--color-border)]">
                <h3 className="text-lg font-medium text-[var(--color-text)]">Generated Headshot</h3>
                <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-3">
                  {headshot.generationPrompt}
                </p>
                {headshot.isApproved && (
                  <span className="inline-block mt-3 px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                    Approved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeadshotGenerator;
