/**
 * TalentCard Component
 * Card for displaying talent in grid view
 */

import { useState } from 'react';
import type { UUID } from '../../../core/types/common';
import type { TalentProfile, TalentType } from '../../../core/types/talent';

interface TalentCardProps {
  talent: TalentProfile;
  onSelect: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// Type badge colors
const TYPE_COLORS: Record<TalentType, { bg: string; text: string }> = {
  character: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  person: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  creature: { bg: 'bg-green-500/20', text: 'text-green-400' },
  object: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  environment: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  style: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

export function TalentCard({
  talent,
  onSelect,
  onEdit,
  onFavorite,
  onDuplicate,
  onDelete,
}: TalentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get primary image URL
  const primaryImage = talent.referenceImages.find(img => img.isPrimary) || talent.referenceImages[0];
  const imageUrl = primaryImage?.thumbnailUrl || primaryImage?.url;

  const typeColors = TYPE_COLORS[talent.type];

  return (
    <div
      onClick={onSelect}
      className="group bg-surface rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-background">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={talent.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl text-text-secondary opacity-30">
              {talent.type === 'character' && '👤'}
              {talent.type === 'person' && '🧑'}
              {talent.type === 'creature' && '🦄'}
              {talent.type === 'object' && '📦'}
              {talent.type === 'environment' && '🏞️'}
              {talent.type === 'style' && '🎨'}
            </div>
          </div>
        )}

        {/* Favorite badge */}
        {talent.isFavorite && (
          <div className="absolute top-2 left-2">
            <span className="text-yellow-400 text-lg">★</span>
          </div>
        )}

        {/* Quick actions on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className={`p-1.5 rounded-lg backdrop-blur-sm ${
              talent.isFavorite
                ? 'bg-yellow-500/80 text-white'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title={talent.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {talent.isFavorite ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text-primary truncate">{talent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded ${typeColors.bg} ${typeColors.text}`}>
                {talent.type}
              </span>
              {talent.tags.length > 0 && (
                <span className="text-xs text-text-secondary">
                  +{talent.tags.length} tag{talent.tags.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              ⋮
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-6 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-surface-hover"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-surface-hover"
                  >
                    Duplicate
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-surface-hover"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description preview */}
        {talent.description && (
          <p className="text-xs text-text-secondary mt-2 line-clamp-2">
            {talent.description}
          </p>
        )}

        {/* Reference images count */}
        {talent.referenceImages.length > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
            <span>🖼️</span>
            <span>{talent.referenceImages.length} reference{talent.referenceImages.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TalentCard;
