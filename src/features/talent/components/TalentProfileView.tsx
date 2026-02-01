/**
 * TalentProfileView Component
 * Read-only display of a talent profile with gallery layout
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UUID } from '../../../core/types/common';
import type { TalentType, TalentReferenceImage } from '../../../core/types/talent';
import { useTalent } from '../store';
import { StorageImage } from '../../../components/StorageMedia';
import { User, Palette, ArrowLeft, Pencil, Tag, Sparkles, Eye, Brain, X } from 'lucide-react';

interface TalentProfileViewProps {
  talentId: UUID;
  onClose: () => void;
}

const TALENT_TYPE_ICONS: Record<TalentType, React.ReactNode> = {
  character: <User className="w-4 h-4" />,
  person: <User className="w-4 h-4" />,
  creature: <Sparkles className="w-4 h-4" />,
  object: <Palette className="w-4 h-4" />,
  environment: <Eye className="w-4 h-4" />,
  style: <Palette className="w-4 h-4" />,
};

const TALENT_TYPE_LABELS: Record<TalentType, string> = {
  character: 'Character',
  person: 'Person',
  creature: 'Creature',
  object: 'Object',
  environment: 'Environment',
  style: 'Style',
};

// Image Modal Component
interface ImageModalProps {
  image: TalentReferenceImage | null;
  isOpen: boolean;
  onClose: () => void;
}

function ImageModal({ image, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-surface rounded-full flex items-center justify-center text-white hover:bg-surface-raised transition-colors z-10"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image container */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <StorageImage
          src={image.url}
          alt={image.caption || 'Reference image'}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
      </div>

      {/* Caption */}
      {image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <p className="text-white text-center">{image.caption}</p>
        </div>
      )}
    </div>
  );
}

export function TalentProfileView({ talentId, onClose }: TalentProfileViewProps) {
  const navigate = useNavigate();
  const talent = useTalent(talentId);
  const [selectedImage, setSelectedImage] = useState<TalentReferenceImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const primaryImage = useMemo(() => {
    if (!talent) return null;
    return talent.referenceImages.find((img) => img.id === talent.primaryImageId) || talent.referenceImages[0] || null;
  }, [talent]);

  const otherImages = useMemo(() => {
    if (!talent) return [];
    return talent.referenceImages.filter((img) => img.id !== primaryImage?.id);
  }, [talent, primaryImage]);

  const handleImageClick = (image: TalentReferenceImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const hasAppearance = useMemo(() => {
    if (!talent?.appearance) return false;
    const a = talent.appearance;
    return !!(
      a.age ||
      a.gender ||
      a.ethnicity ||
      a.bodyType ||
      a.height ||
      a.hair?.color ||
      a.hair?.style ||
      a.hair?.length ||
      a.eyes?.color ||
      a.eyes?.shape ||
      a.skin?.tone ||
      a.skin?.texture ||
      a.clothing ||
      a.distinguishingFeatures?.length ||
      a.accessories?.length
    );
  }, [talent]);

  const hasPersonality = useMemo(() => {
    if (!talent?.personality) return false;
    const p = talent.personality;
    return !!(p.traits?.length || p.mood || p.expression || p.posture);
  }, [talent]);

  const handleEdit = () => {
    navigate(`/talent/${talentId}/edit`);
  };

  if (!talent) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <p className="text-text-subtle">Loading talent...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text transition-colors rounded-3xl hover:bg-bg-subtle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text">{talent.name}</h1>
            <div className="flex items-center gap-2 text-sm text-text-subtle">
              {TALENT_TYPE_ICONS[talent.type]}
              <span>{TALENT_TYPE_LABELS[talent.type]}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-text-on-brand rounded-3xl hover:bg-primary-hover transition-colors"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image Gallery */}
            <div className="space-y-4">
              {primaryImage ? (
                <div 
                  className="rounded-3xl overflow-hidden border border-border bg-surface shadow-md cursor-pointer"
                  onClick={() => handleImageClick(primaryImage)}
                >
                  <StorageImage
                    src={primaryImage.thumbnailUrl || primaryImage.url}
                    alt={primaryImage.caption || `${talent.name} primary reference`}
                    className="w-full aspect-square object-cover"
                  />
                  {primaryImage.caption && (
                    <div className="p-3 border-t border-border">
                      <p className="text-sm text-text-muted">{primaryImage.caption}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-border bg-surface flex flex-col items-center justify-center aspect-square">
                  <div className="w-16 h-16 rounded-full bg-bg-subtle flex items-center justify-center mb-3">
                    <Eye className="w-8 h-8 text-text-subtle" />
                  </div>
                  <p className="text-text-subtle">No reference images</p>
                </div>
              )}

              {otherImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {otherImages.map((image) => (
                    <div
                      key={image.id}
                      className="rounded-3xl overflow-hidden border border-border bg-surface aspect-square cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    >
                      <StorageImage
                        src={image.thumbnailUrl || image.url}
                        alt={image.caption || 'Reference image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Image Modal */}
              <ImageModal
                image={selectedImage}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
              />
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Description */}
              {talent.description && (
                <div className="p-5 rounded-3xl bg-surface border border-border">
                  <h2 className="text-sm font-medium text-text-subtle uppercase tracking-wider mb-3">
                    Description
                  </h2>
                  <p className="text-text leading-relaxed">{talent.description}</p>
                </div>
              )}

              {/* Appearance */}
              {hasAppearance && (
                <div className="p-5 rounded-3xl bg-surface border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-text">Appearance</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Basic Attributes */}
                    <div className="grid grid-cols-2 gap-4">
                      {talent.appearance.age && (
                        <div>
                          <span className="text-xs text-text-subtle uppercase tracking-wider">Age</span>
                          <p className="text-text font-medium">{talent.appearance.age}</p>
                        </div>
                      )}
                      {talent.appearance.gender && (
                        <div>
                          <span className="text-xs text-text-subtle uppercase tracking-wider">Gender</span>
                          <p className="text-text font-medium">{talent.appearance.gender}</p>
                        </div>
                      )}
                      {talent.appearance.ethnicity && (
                        <div>
                          <span className="text-xs text-text-subtle uppercase tracking-wider">Ethnicity</span>
                          <p className="text-text font-medium">{talent.appearance.ethnicity}</p>
                        </div>
                      )}
                      {talent.appearance.bodyType && (
                        <div>
                          <span className="text-xs text-text-subtle uppercase tracking-wider">Body Type</span>
                          <p className="text-text font-medium">{talent.appearance.bodyType}</p>
                        </div>
                      )}
                      {talent.appearance.height && (
                        <div>
                          <span className="text-xs text-text-subtle uppercase tracking-wider">Height</span>
                          <p className="text-text font-medium">{talent.appearance.height}</p>
                        </div>
                      )}
                    </div>

                    {/* Hair */}
                    {(talent.appearance.hair?.color || talent.appearance.hair?.style || talent.appearance.hair?.length) && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Hair</span>
                        <p className="text-text">
                          {[
                            talent.appearance.hair.length,
                            talent.appearance.hair.color,
                            talent.appearance.hair.style,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Eyes */}
                    {(talent.appearance.eyes?.color || talent.appearance.eyes?.shape) && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Eyes</span>
                        <p className="text-text">
                          {[talent.appearance.eyes.color, talent.appearance.eyes.shape].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Skin */}
                    {(talent.appearance.skin?.tone || talent.appearance.skin?.texture) && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Skin</span>
                        <p className="text-text">
                          {[talent.appearance.skin.tone, talent.appearance.skin.texture].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Clothing */}
                    {talent.appearance.clothing && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Clothing</span>
                        <p className="text-text">{talent.appearance.clothing}</p>
                      </div>
                    )}

                    {/* Distinguishing Features */}
                    {talent.appearance.distinguishingFeatures && talent.appearance.distinguishingFeatures.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider block mb-2">
                          Distinguishing Features
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {talent.appearance.distinguishingFeatures.map((feature, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accessories */}
                    {talent.appearance.accessories && talent.appearance.accessories.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider block mb-2">
                          Accessories
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {talent.appearance.accessories.map((accessory, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-secondary-light text-secondary rounded-full text-sm"
                            >
                              {accessory}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Personality */}
              {hasPersonality && (
                <div className="p-5 rounded-3xl bg-surface border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-text">Personality</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Traits */}
                    {talent.personality?.traits && talent.personality.traits.length > 0 && (
                      <div>
                        <span className="text-xs text-text-subtle uppercase tracking-wider block mb-2">
                          Traits
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {talent.personality.traits.map((trait, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mood */}
                    {talent.personality?.mood && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Default Mood</span>
                        <p className="text-text font-medium">{talent.personality.mood}</p>
                      </div>
                    )}

                    {/* Expression */}
                    {talent.personality?.expression && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Expression</span>
                        <p className="text-text">{talent.personality.expression}</p>
                      </div>
                    )}

                    {/* Posture */}
                    {talent.personality?.posture && (
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-text-subtle uppercase tracking-wider">Posture</span>
                        <p className="text-text">{talent.personality.posture}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {talent.tags.length > 0 && (
                <div className="p-5 rounded-3xl bg-surface border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-text-subtle" />
                    <h2 className="text-sm font-medium text-text-subtle uppercase tracking-wider">Tags</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {talent.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-bg-subtle text-text-muted rounded-full text-sm border border-border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="p-4 rounded-3xl bg-bg-subtle border border-border">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-subtle">
                  <span>Created: {new Date(talent.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(talent.updatedAt).toLocaleDateString()}</span>
                  {talent.isFavorite && (
                    <span className="flex items-center gap-1 text-primary">
                      <Sparkles className="w-3 h-3" />
                      Favorite
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TalentProfileView;
