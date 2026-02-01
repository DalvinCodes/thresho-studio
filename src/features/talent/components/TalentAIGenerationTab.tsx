/**
 * TalentAIGenerationTab Component
 * Main tab that orchestrates the AI generation flow for talent headshots
 * and character sheets
 */

import { useEffect, useCallback, useState } from 'react';

import type { TalentProfile, TalentGeneratedImage, TalentAppearance } from '../../../core/types/talent';
import type { UUID } from '../../../core/types/common';
import { useTalentStore, useTalentGenerationState } from '../store';
import { ProviderModelSelector } from '../../providers/components/ProviderModelSelector';
import { HeadshotGenerator } from './HeadshotGenerator';
import { CharacterSheetGenerator } from './CharacterSheetGenerator';
import { analyzeHeadshotImage, mergeAnalyzedAttributes } from '../services/talentVisionService';

interface TalentAIGenerationTabProps {
  talent: TalentProfile;
}

export function TalentAIGenerationTab({ talent }: TalentAIGenerationTabProps) {
  // Generation state from store
  const generationState = useTalentGenerationState(talent.id);
  const {
    initGenerationState,
    setGenerationProvider,
    setGenerationModel,
    addReferenceImage,
    updateTalent,
  } = useTalentStore();

  // Local state for attribute confirmation modal
  const [showAttributeConfirm, setShowAttributeConfirm] = useState(false);
  const [detectedAttributes, setDetectedAttributes] = useState<Partial<TalentAppearance> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get current headshot and selected provider/model from generation state
  const headshot = generationState?.currentHeadshot ?? null;
  const selectedProviderId = generationState?.selectedProviderId ?? null;
  const selectedModelId = generationState?.selectedModelId ?? null;

  // Initialize generation state on mount
  useEffect(() => {
    initGenerationState(talent.id);
  }, [talent.id, initGenerationState]);

  /**
   * Handle provider selection change
   */
  const handleProviderChange = useCallback(
    (providerId: UUID) => {
      setGenerationProvider(talent.id, providerId);
    },
    [talent.id, setGenerationProvider]
  );

  /**
   * Handle model selection change
   */
  const handleModelChange = useCallback(
    (modelId: string) => {
      setGenerationModel(talent.id, modelId);
    },
    [talent.id, setGenerationModel]
  );

  /**
   * Handle headshot approval - analyze image and show confirmation modal
   */
  const handleHeadshotApprove = useCallback(async () => {
    if (!headshot?.url) return;

    setIsAnalyzing(true);

    try {
      // Analyze the headshot image to detect attributes
      const analysisResult = await analyzeHeadshotImage(headshot.url);

      if (analysisResult.success && Object.keys(analysisResult.attributes).length > 0) {
        // Merge with existing attributes
        // User-set attributes have highest priority
        const mergedAttributes = mergeAnalyzedAttributes(
          talent.appearance,
          {}, // No prompt attributes to merge in this context
          analysisResult.attributes
        );

        setDetectedAttributes(mergedAttributes);
        setShowAttributeConfirm(true);
      }
    } catch (error) {
      console.error('Failed to analyze headshot:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [headshot, talent.appearance]);

  /**
   * Handle attribute confirmation
   * @param apply - Whether to apply the detected attributes to the talent
   */
  const handleConfirmAttributes = useCallback(
    (apply: boolean) => {
      if (apply && detectedAttributes) {
        // Update the talent's appearance with detected attributes
        updateTalent(talent.id, {
          appearance: {
            ...talent.appearance,
            ...detectedAttributes,
            // Deep merge nested objects
            hair: { ...talent.appearance.hair, ...detectedAttributes.hair },
            eyes: { ...talent.appearance.eyes, ...detectedAttributes.eyes },
            skin: { ...talent.appearance.skin, ...detectedAttributes.skin },
            distinguishingFeatures: detectedAttributes.distinguishingFeatures?.length
              ? [
                  ...new Set([
                    ...talent.appearance.distinguishingFeatures,
                    ...detectedAttributes.distinguishingFeatures,
                  ]),
                ]
              : talent.appearance.distinguishingFeatures,
          },
        });
      }

      // Close modal and clear state
      setShowAttributeConfirm(false);
      setDetectedAttributes(null);
    },
    [detectedAttributes, talent, updateTalent]
  );

  /**
   * Handle saving character sheet - add all character sheet images as reference images
   * Note: The headshot is already saved as a reference image when approved in HeadshotGenerator
   */
  const handleSaveCharacterSheet = useCallback(
    (characterSheetImages: TalentGeneratedImage[]) => {
      // Add all character sheet images as reference images
      for (const image of characterSheetImages) {
        const angleLabel = image.angle || 'Unknown';
        addReferenceImage(talent.id, image.url, `AI Generated - ${angleLabel}`);
      }
    },
    [talent.id, addReferenceImage]
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-[var(--color-text-muted)] leading-relaxed">
        Generate AI headshots and character sheets for this talent. Start by generating a
        headshot, approve it, then generate a full character sheet with multiple angles.
      </p>

      {/* Provider + Model Selection */}
      <div className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Image Provider & Model</h3>
        <ProviderModelSelector
          contentType="image"
          selectedProviderId={selectedProviderId as UUID | null}
          selectedModelId={selectedModelId}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
          activeOnly={true}
        />
      </div>

      {/* HeadshotGenerator */}
      <HeadshotGenerator
        talent={talent}
        providerId={selectedProviderId}
        modelId={selectedModelId}
        onApprove={handleHeadshotApprove}
      />

      {/* CharacterSheetGenerator */}
      <CharacterSheetGenerator
        talent={talent}
        providerId={selectedProviderId}
        modelId={selectedModelId}
        headshotPrompt={headshot?.generationPrompt || ''}
        onSaveAll={handleSaveCharacterSheet}
      />

      {/* Attribute Confirmation Modal */}
      {showAttributeConfirm && detectedAttributes && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              Detected Appearance Attributes
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              We analyzed the headshot and detected these attributes. Would you like to apply
              them to this talent's profile?
            </p>

            <div className="space-y-2 p-4 bg-[var(--color-bg)] rounded-3xl max-h-64 overflow-y-auto border border-[var(--color-border)]">
              {detectedAttributes.gender && (
                <p className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Gender:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">{detectedAttributes.gender}</span>
                </p>
              )}
              {detectedAttributes.age && (
                <p className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Age:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">{detectedAttributes.age}</span>
                </p>
              )}
              {detectedAttributes.ethnicity && (
                <p className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Ethnicity:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">{detectedAttributes.ethnicity}</span>
                </p>
              )}
              {detectedAttributes.hair && (
                <div className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Hair:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">
                    {[
                      detectedAttributes.hair.color,
                      detectedAttributes.hair.length,
                      detectedAttributes.hair.style,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {detectedAttributes.eyes && (
                <div className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Eyes:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">
                    {[detectedAttributes.eyes.color, detectedAttributes.eyes.shape]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {detectedAttributes.skin && (
                <div className="text-sm">
                  <span className="font-medium text-[var(--color-text)]">Skin:</span>{' '}
                  <span className="text-[var(--color-text-muted)]">
                    {[detectedAttributes.skin.tone, detectedAttributes.skin.texture]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {detectedAttributes.distinguishingFeatures &&
                detectedAttributes.distinguishingFeatures.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-[var(--color-text)]">Features:</span>{' '}
                    <span className="text-[var(--color-text-muted)]">
                      {detectedAttributes.distinguishingFeatures.join(', ')}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => handleConfirmAttributes(false)}
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-3xl hover:bg-[var(--color-surface-raised)] transition-colors font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => handleConfirmAttributes(true)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-3xl hover:bg-[var(--color-primary)]/90 transition-colors font-medium"
              >
                Apply Attributes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-3xl p-6 flex items-center gap-3 shadow-2xl border border-[var(--color-border)]">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--color-text)] font-medium">Analyzing headshot...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentAIGenerationTab;
