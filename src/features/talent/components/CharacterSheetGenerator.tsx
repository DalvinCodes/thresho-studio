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
import { StorageImage } from '../../../components/StorageMedia';
import { User } from 'lucide-react';

const ANGLE_ORDER: CharacterSheetAngle[] = ['front', 'back', 'left-profile', 'right-profile', 'three-quarter'];

interface CharacterSheetGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  modelId?: string | null;
  headshotPrompt: string;
  onSaveAll: (images: TalentGeneratedImage[]) => void;
}

export function CharacterSheetGenerator({
  talent,
  providerId,
  modelId,
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
  
  // Image preview modal state
  const [previewImage, setPreviewImage] = useState<TalentGeneratedImage | null>(null);
  
  // Save status feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
          model: modelId || undefined,
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
            model: modelId || 'default',
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
    modelId,
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
    setSaveStatus('idle');
    handleGenerate();
  }, [talent.id, setCharacterSheet, handleGenerate]);

  /**
   * Save all images to reference images
   */
  const handleSaveAll = useCallback(() => {
    if (characterSheet.length > 0) {
      setSaveStatus('saving');
      try {
        onSaveAll(characterSheet);
        setSaveStatus('saved');
        // Reset status after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err) {
        console.error('Failed to save images:', err);
        setSaveStatus('idle');
      }
    }
  }, [characterSheet, onSaveAll]);

  /**
   * Open image preview modal
   */
  const handleImageClick = useCallback((image: TalentGeneratedImage) => {
    setPreviewImage(image);
  }, []);

  /**
   * Close image preview modal
   */
  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  /**
   * Navigate to previous/next image in preview
   */
  const handleNavigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (!previewImage) return;
    
    const currentIndex = characterSheet.findIndex(img => img.id === previewImage.id);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : characterSheet.length - 1;
    } else {
      newIndex = currentIndex < characterSheet.length - 1 ? currentIndex + 1 : 0;
    }
    
    setPreviewImage(characterSheet[newIndex]);
  }, [previewImage, characterSheet]);

  // Calculate progress
  const generatedCount = characterSheet.length;
  const currentAngleIndex = currentGeneratingAngle
    ? ANGLE_ORDER.indexOf(currentGeneratingAngle) + 1
    : generatedCount;

  return (
    <div
      className={`p-4 bg-surface rounded-3xl border border-border ${
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
              <div 
                className={`aspect-[2/3] bg-background rounded-3xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden ${
                  image && !isCurrentlyGenerating ? 'cursor-pointer hover:border-primary transition-colors' : ''
                }`}
                onClick={() => image && !isCurrentlyGenerating && handleImageClick(image)}
              >
                {isCurrentlyGenerating ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Generating...</span>
                  </div>
                ) : image ? (
                  <StorageImage
                    src={image.url}
                    alt={`${angleConfig.label} view`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-secondary">
                    <User className="w-8 h-8 opacity-30" />
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
      <div className="flex gap-2 items-center">
        {characterSheet.length === 0 ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !providerId || !isHeadshotApproved}
            className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Character Sheet
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerateAll}
              disabled={isGenerating || !providerId}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-3xl hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Regenerate All
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isGenerating || saveStatus === 'saving' || saveStatus === 'saved'}
              className={`px-4 py-2 text-white rounded-3xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                saveStatus === 'saved' 
                  ? 'bg-green-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save All to Reference Images'}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={handleClosePreview}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClosePreview}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation buttons */}
            <button
              onClick={() => handleNavigatePreview('prev')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => handleNavigatePreview('next')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Image */}
            <div className="bg-surface rounded-3xl overflow-hidden">
              <StorageImage
                src={previewImage.url}
                alt={`${previewImage.angle || 'Character'} view`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Image info */}
              <div className="p-4 border-t border-border">
                <h3 className="text-lg font-medium text-text-primary">
                  {CHARACTER_SHEET_ANGLES[previewImage.angle as CharacterSheetAngle]?.label || 'Character Sheet'} View
                </h3>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {previewImage.generationPrompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterSheetGenerator;
