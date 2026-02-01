/**
 * TalentCard Component
 * Professional, modern card for displaying talent in grid view
 * Design: Cinematic editorial meets modern SaaS
 */

import { useState } from 'react';
import type { TalentProfile, TalentType } from '../../../core/types/talent';
import { useTalentGenerationState } from '../store';
import { User, Palette, Image, Star, MoreVertical, Eye, Edit2, Copy, Trash2 } from 'lucide-react';

interface TalentCardProps {
  talent: TalentProfile;
  onSelect: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// Type badge colors matching design spec
const TYPE_COLORS: Record<TalentType, { bg: string; text: string; border: string }> = {
  character: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  person: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  creature: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  object: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  environment: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  style: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
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
  const [isHovered, setIsHovered] = useState(false);

  // Get generation state for headshot
  const generationState = useTalentGenerationState(talent.id);

  // Get primary image URL - check reference images first, then generated headshot
  const primaryImage = talent.referenceImages.find(img => img.isPrimary) || talent.referenceImages[0];
  const approvedHeadshot = generationState?.currentHeadshot?.isApproved
    ? generationState.currentHeadshot
    : null;
  const imageUrl = primaryImage?.thumbnailUrl || primaryImage?.url || approvedHeadshot?.thumbnailUrl || approvedHeadshot?.url;

  const typeColors = TYPE_COLORS[talent.type];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden cursor-pointer
        transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-1 hover:border-[rgba(255,107,53,0.3)]
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.4),0_2px_8px_rgba(255,107,53,0.15)]"
    >
      {/* Image Area */}
      <div className="relative aspect-square bg-gradient-to-b from-[var(--color-surface-raised)] to-[var(--color-surface)] overflow-hidden">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={talent.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-[var(--color-text-muted)] opacity-30">
              {talent.type === 'character' && <User className="w-16 h-16" />}
              {talent.type === 'person' && <User className="w-16 h-16" />}
              {talent.type === 'creature' && <span className="text-5xl">🦄</span>}
              {talent.type === 'object' && <span className="text-5xl">📦</span>}
              {talent.type === 'environment' && <span className="text-5xl">🏞️</span>}
              {talent.type === 'style' && <Palette className="w-16 h-16" />}
            </div>
          </div>
        )}

        {/* Favorite Star - Top Right */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 z-10 p-2 rounded-3xl backdrop-blur-md
            transition-all duration-200 ease-out
            ${talent.isFavorite 
              ? 'bg-yellow-500/20 text-yellow-400 scale-110' 
              : 'bg-black text-white hover:bg-black hover:text-white opacity-0 group-hover:opacity-100'
            }`}
          title={talent.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star 
            className={`w-4 h-4 transition-transform duration-200 ${talent.isFavorite ? 'fill-current' : ''}`} 
          />
        </button>

        {/* Hover Overlay with Quick Actions */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent
            flex items-end justify-center pb-4
            transition-opacity duration-200 ease-out
            ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface backdrop-blur-md rounded-3xl
                text-white text-sm font-medium
                hover:bg-surface-raised transition-colors duration-150"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface backdrop-blur-md rounded-3xl
                text-white text-sm font-medium
                hover:bg-surface-raised transition-colors duration-150"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={handleFavoriteClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md rounded-3xl
                text-sm font-medium transition-colors duration-150
                ${talent.isFavorite 
                  ? 'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/40' 
                  : 'bg-surface text-white hover:bg-surface-raised'
                }`}
            >
              <Star className={`w-3.5 h-3.5 ${talent.isFavorite ? 'fill-current' : ''}`} />
              {talent.isFavorite ? 'Favorited' : 'Favorite'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="text-[var(--color-text)] text-lg font-semibold truncate leading-tight">
              {talent.name}
            </h3>
            
            {/* Type Badge & Tags Row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}>
                {talent.type.charAt(0).toUpperCase() + talent.type.slice(1)}
              </span>
              
              {/* Tags display */}
              {talent.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {talent.tags.slice(0, 2).map((tag, index) => (
                    <span 
                      key={index}
                      className="px-1.5 py-0.5 bg-[var(--color-text)]/5 text-[var(--color-text-subtle)] text-[10px] rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {talent.tags.length > 2 && (
                    <span className="text-[10px] text-[var(--color-text-subtle)]">
                      +{talent.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Three-dot Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={handleMenuClick}
              className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5 rounded-3xl
                transition-all duration-150"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div 
                  className="absolute right-0 top-8 z-20 min-w-[140px] py-1
                    bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-3xl shadow-xl
                    origin-top-right scale-100 animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    onClick={handleMenuAction(onEdit)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[var(--color-text)]
                      hover:bg-[var(--color-text)]/5 transition-colors duration-150"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    Edit
                  </button>
                  <button
                    onClick={handleMenuAction(onDuplicate)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[var(--color-text)]
                      hover:bg-[var(--color-text)]/5 transition-colors duration-150"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    Duplicate
                  </button>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    onClick={handleMenuAction(onDelete)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-red-400
                      hover:bg-red-500/10 transition-colors duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {talent.description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-3 line-clamp-2 leading-relaxed">
            {talent.description}
          </p>
        )}

        {/* Reference Images Count */}
        {talent.referenceImages.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-text-subtle)]">
            <Image className="w-3.5 h-3.5" />
            <span>{talent.referenceImages.length} reference{talent.referenceImages.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TalentCard;
