/**
 * CharacterSheetGenerator Component
 * Step 2 UI for generating a 5-angle character sheet
 */

import { useCallback, useState, useMemo } from 'react';
import type { UUID } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type { TalentProfile, TalentGeneratedImage, CharacterSheetAngle } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { generateImage, preparePrompt } from '../../generation/services/generationService';
import {
  buildCharacterSheetPrompts,
  CHARACTER_SHEET_ANGLES,
} from '../services/headshotGenerationService';

const ANGLE_ORDER: CharacterSheetAngle[] = ['front', 'back', 'left-profile', 'right-profile', 'three-quarter'];

interface CharacterSheetGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  headshotPrompt: string;
  onSaveAll: (images: TalentGeneratedImage[]) => void;
}

export function CharacterSheetGenerator({
  talent,
  providerId,
  headshotPrompt,
  onSaveAll,
}: CharacterSheetGeneratorProps) {
  const generationState = useTalentGenerationState(talent.id);
  const {
    setCharacterSheet,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
  } = useTalentStore();

  const characterSheet = useMemo(
    () => generationState?.characterSheet ?? [],
    [generationState?.characterSheet]
  );
  const isGenerating = generationState?.isGenerating ?? false;
  const error = generationState?.error ?? null;
  const currentHeadshot = generationState?.currentHeadshot ?? null;

  // Track which angle is currently generating
  const [currentGeneratingAngle, setCurrentGeneratingAngle] = useState<CharacterSheetAngle | null>(null);

  // Is the headshot approved?
  const isHeadshotApproved = currentHeadshot?.isApproved ?? false;

  /**
   * Get the generated image for a specific angle
   */
  const getImageForAngle = useCallback(
    (angle: CharacterSheetAngle): TalentGeneratedImage | undefined => {
      return characterSheet.find((img) => img.angle === angle);
    },
    [characterSheet]
  );

  /**
   * Generate all character sheet images sequentially
   */
  const handleGenerate = useCallback(async () => {
    if (!providerId || !headshotPrompt) {
      setGenerationError(talent.id, 'No provider or headshot prompt available');
      return;
    }

    setIsGenerating(talent.id, true);
    setGenerationError(talent.id, null);
    setGenerationStep(talent.id, 'character-sheet');

    const generatedImages: TalentGeneratedImage[] = [];

    try {
      // Build prompts for all angles
      const prompts = buildCharacterSheetPrompts(talent, headshotPrompt);

      // Generate each angle sequentially
      for (const anglePrompt of prompts) {
        setCurrentGeneratingAngle(anglePrompt.angle);

        // Build the generation request
        const generationRequest = {
          id: createUUID(),
          type: 'image' as const,
          providerId: providerId as UUID,
          customPrompt: anglePrompt.prompt,
          parameters: {
            width: 512,
            height: 768, // Taller for full body
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
            type: 'character-sheet',
            angle: anglePrompt.angle,
            url: result.urls[0],
            generationPrompt: anglePrompt.prompt,
            providerId: providerId,
            model: 'default',
            isApproved: false,
            createdAt: createTimestamp(),
          };

          generatedImages.push(generatedImage);

          // Update state progressively
          setCharacterSheet(talent.id, [...generatedImages]);
        }
      }

      setCurrentGeneratingAngle(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate character sheet';
      setGenerationError(talent.id, message);
      setCurrentGeneratingAngle(null);
    } finally {
      setIsGenerating(talent.id, false);
    }
  }, [
    talent,
    providerId,
    headshotPrompt,
    setCharacterSheet,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
  ]);

  /**
   * Regenerate all images
   */
  const handleRegenerateAll = useCallback(() => {
    // Clear existing images first
    setCharacterSheet(talent.id, []);
    handleGenerate();
  }, [talent.id, setCharacterSheet, handleGenerate]);

  /**
   * Save all images to reference images
   */
  const handleSaveAll = useCallback(() => {
    if (characterSheet.length > 0) {
      onSaveAll(characterSheet);
    }
  }, [characterSheet, onSaveAll]);

  // Calculate progress
  const generatedCount = characterSheet.length;
  const currentAngleIndex = currentGeneratingAngle
    ? ANGLE_ORDER.indexOf(currentGeneratingAngle) + 1
    : generatedCount;

  return (
    <div
      className={`p-4 bg-surface rounded-lg border border-border ${
        !isHeadshotApproved ? 'opacity-50' : ''
      }`}
    >
      <h4 className="text-lg font-medium text-text-primary mb-4">
        Step 2: Generate Character Sheet
      </h4>

      {!isHeadshotApproved && (
        <p className="text-sm text-text-secondary mb-4">
          Approve a headshot first to generate the character sheet.
        </p>
      )}

      {/* 5-image grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {ANGLE_ORDER.map((angle) => {
          const angleConfig = CHARACTER_SHEET_ANGLES[angle];
          const image = getImageForAngle(angle);
          const isCurrentlyGenerating = isGenerating && currentGeneratingAngle === angle;

          return (
            <div key={angle} className="flex flex-col">
              <div className="aspect-[2/3] bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {isCurrentlyGenerating ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Generating...</span>
                  </div>
                ) : image ? (
                  <img
                    src={image.url}
                    alt={`${angleConfig.label} view`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-secondary">
                    <div className="text-2xl opacity-30">👤</div>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-secondary text-center mt-1">
                {angleConfig.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {characterSheet.length === 0 ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !providerId || !isHeadshotApproved}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Character Sheet
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerateAll}
              disabled={isGenerating || !providerId}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Regenerate All
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save All to Reference Images
            </button>
          </>
        )}
      </div>

      {/* Progress indicator */}
      {isGenerating && (
        <p className="mt-3 text-sm text-text-secondary">
          Generating {currentAngleIndex} of 5 images...
        </p>
      )}

      {/* Info text */}
      {!providerId && isHeadshotApproved && (
        <p className="mt-3 text-xs text-amber-400">
          Please select a provider to generate images.
        </p>
      )}
    </div>
  );
}

export default CharacterSheetGenerator;
