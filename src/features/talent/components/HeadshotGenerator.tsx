/**
 * HeadshotGenerator Component
 * Step 1 UI for generating and approving a talent headshot
 */

import { useState, useCallback } from 'react';
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

interface HeadshotGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  onApprove: () => void;
}

export function HeadshotGenerator({ talent, providerId, onApprove }: HeadshotGeneratorProps) {
  const generationState = useTalentGenerationState(talent.id);
  const {
    setCurrentHeadshot,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
  } = useTalentStore();

  const headshot = generationState?.currentHeadshot ?? null;
  const isGenerating = generationState?.isGenerating ?? false;
  const error = generationState?.error ?? null;

  const hasUserAttributes = hasAppearanceAttributes(talent.appearance);

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
          model: 'default',
          isApproved: false,
          createdAt: createTimestamp(),
        };

        setCurrentHeadshot(talent.id, generatedImage);
      } else {
        setGenerationError(talent.id, 'No image was generated');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate headshot';
      setGenerationError(talent.id, message);
    } finally {
      setIsGenerating(talent.id, false);
    }
  }, [talent, providerId, hasUserAttributes, setCurrentHeadshot, setIsGenerating, setGenerationError, setGenerationStep]);

  /**
   * Regenerate the headshot, keeping user-set attributes and randomizing unset ones
   */
  const handleRegenerate = useCallback(() => {
    handleGenerate(true);
  }, [handleGenerate]);

  /**
   * Approve the current headshot
   */
  const handleApprove = useCallback(() => {
    if (headshot) {
      const approvedHeadshot: TalentGeneratedImage = {
        ...headshot,
        isApproved: true,
      };
      setCurrentHeadshot(talent.id, approvedHeadshot);
      onApprove();
    }
  }, [headshot, talent.id, setCurrentHeadshot, onApprove]);

  return (
    <div className="p-4 bg-surface rounded-lg border border-border">
      <h4 className="text-lg font-medium text-text-primary mb-4">Step 1: Generate Headshot</h4>

      {/* Preview Area - 256x256 */}
      <div className="w-64 h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Generating...</span>
          </div>
        ) : headshot ? (
          <img
            src={headshot.url}
            alt="Generated headshot"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-secondary">
            <div className="text-4xl opacity-30">👤</div>
            <span className="text-sm">No headshot generated</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="mt-4 flex gap-2">
        {!headshot ? (
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || !providerId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Headshot
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !providerId}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={handleApprove}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Approve
            </button>
          </>
        )}
      </div>

      {/* Info text */}
      {!hasUserAttributes && (
        <p className="mt-3 text-xs text-text-secondary">
          No appearance attributes set. Random attributes will be used for generation.
        </p>
      )}
      {!providerId && (
        <p className="mt-3 text-xs text-amber-400">
          Please select a provider to generate images.
        </p>
      )}
    </div>
  );
}

export default HeadshotGenerator;
