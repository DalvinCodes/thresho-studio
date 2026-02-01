/**
 * TalentAIGenerationTab Component
 * Main tab that orchestrates the AI generation flow for talent headshots
 * and character sheets
 */

import { useEffect, useCallback, useState } from 'react';

import type { TalentProfile, TalentGeneratedImage, TalentAppearance } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { useProvidersForType } from '../../providers/store';
import { HeadshotGenerator } from './HeadshotGenerator';
import { CharacterSheetGenerator } from './CharacterSheetGenerator';
import { analyzeHeadshotImage, mergeAnalyzedAttributes } from '../services/talentVisionService';

interface TalentAIGenerationTabProps {
  talent: TalentProfile;
}

export function TalentAIGenerationTab({ talent }: TalentAIGenerationTabProps) {
  // Get image providers filtered to active ones
  const imageProviders = useProvidersForType('image');
  const activeProviders = imageProviders.filter((p) => p.status === 'active');

  // Generation state from store
  const generationState = useTalentGenerationState(talent.id);
  const {
    initGenerationState,
    setGenerationProvider,
    addReferenceImage,
    updateTalent,
  } = useTalentStore();

  // Local state for attribute confirmation modal
  const [showAttributeConfirm, setShowAttributeConfirm] = useState(false);
  const [detectedAttributes, setDetectedAttributes] = useState<Partial<TalentAppearance> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get current headshot and selected provider from generation state
  const headshot = generationState?.currentHeadshot ?? null;
  const selectedProviderId = generationState?.selectedProviderId ?? null;

  // Initialize generation state on mount
  useEffect(() => {
    initGenerationState(talent.id);
  }, [talent.id, initGenerationState]);

  // Auto-select first provider if none selected
  useEffect(() => {
    if (!selectedProviderId && activeProviders.length > 0) {
      setGenerationProvider(talent.id, activeProviders[0].config.id);
    }
  }, [selectedProviderId, activeProviders, talent.id, setGenerationProvider]);

  /**
   * Handle provider selection change
   */
  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGenerationProvider(talent.id, e.target.value);
    },
    [talent.id, setGenerationProvider]
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
   * Handle saving character sheet - add headshot + all character sheet images as reference images
   */
  const handleSaveCharacterSheet = useCallback(
    (characterSheetImages: TalentGeneratedImage[]) => {
      // Add headshot as reference image first (if approved)
      if (headshot?.isApproved && headshot.url) {
        addReferenceImage(talent.id, headshot.url, 'AI Generated Headshot');
      }

      // Add all character sheet images as reference images
      for (const image of characterSheetImages) {
        const angleLabel = image.angle || 'Unknown';
        addReferenceImage(talent.id, image.url, `AI Generated - ${angleLabel}`);
      }
    },
    [headshot, talent.id, addReferenceImage]
  );

  // No providers configured case
  if (activeProviders.length === 0) {
    return (
      <div className="p-6 bg-surface rounded-lg text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No Image Providers Configured
        </h3>
        <p className="text-text-secondary mb-4">
          To generate AI headshots, configure an image provider with valid credentials.
        </p>
        <a
          href="/providers"
          className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Configure Providers
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-text-secondary">
        Generate AI headshots and character sheets for this talent. Start by generating a
        headshot, approve it, then generate a full character sheet with multiple angles.
      </p>

      {/* Provider dropdown */}
      <div>
        <label
          htmlFor="provider-select"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Image Provider
        </label>
        <select
          id="provider-select"
          value={selectedProviderId || ''}
          onChange={handleProviderChange}
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {activeProviders.map((p) => (
            <option key={p.config.id} value={p.config.id}>
              {p.config.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* HeadshotGenerator */}
      <HeadshotGenerator
        talent={talent}
        providerId={selectedProviderId}
        onApprove={handleHeadshotApprove}
      />

      {/* CharacterSheetGenerator */}
      <CharacterSheetGenerator
        talent={talent}
        providerId={selectedProviderId}
        headshotPrompt={headshot?.generationPrompt || ''}
        onSaveAll={handleSaveCharacterSheet}
      />

      {/* Attribute Confirmation Modal */}
      {showAttributeConfirm && detectedAttributes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Detected Appearance Attributes
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              We analyzed the headshot and detected these attributes. Would you like to apply
              them to this talent's profile?
            </p>

            <div className="space-y-2 p-4 bg-background rounded-lg max-h-64 overflow-y-auto">
              {detectedAttributes.gender && (
                <p className="text-sm">
                  <span className="font-medium text-text-primary">Gender:</span>{' '}
                  <span className="text-text-secondary">{detectedAttributes.gender}</span>
                </p>
              )}
              {detectedAttributes.age && (
                <p className="text-sm">
                  <span className="font-medium text-text-primary">Age:</span>{' '}
                  <span className="text-text-secondary">{detectedAttributes.age}</span>
                </p>
              )}
              {detectedAttributes.ethnicity && (
                <p className="text-sm">
                  <span className="font-medium text-text-primary">Ethnicity:</span>{' '}
                  <span className="text-text-secondary">{detectedAttributes.ethnicity}</span>
                </p>
              )}
              {detectedAttributes.hair && (
                <div className="text-sm">
                  <span className="font-medium text-text-primary">Hair:</span>{' '}
                  <span className="text-text-secondary">
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
                  <span className="font-medium text-text-primary">Eyes:</span>{' '}
                  <span className="text-text-secondary">
                    {[detectedAttributes.eyes.color, detectedAttributes.eyes.shape]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {detectedAttributes.skin && (
                <div className="text-sm">
                  <span className="font-medium text-text-primary">Skin:</span>{' '}
                  <span className="text-text-secondary">
                    {[detectedAttributes.skin.tone, detectedAttributes.skin.texture]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {detectedAttributes.distinguishingFeatures &&
                detectedAttributes.distinguishingFeatures.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-text-primary">Features:</span>{' '}
                    <span className="text-text-secondary">
                      {detectedAttributes.distinguishingFeatures.join(', ')}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => handleConfirmAttributes(false)}
                className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => handleConfirmAttributes(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Apply Attributes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 flex items-center gap-3 shadow-xl">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-text-primary">Analyzing headshot...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentAIGenerationTab;
