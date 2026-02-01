/**
 * TalentSelector Component
 * Multi-select component for choosing talents to include in generation
 */

import { useState, useCallback, useMemo } from 'react';
import type { UUID } from '../../../core/types/common';
import type { TalentProfile, TalentType } from '../../../core/types/talent';
import { useTalentStore } from '../../talent/store';
import { User, Palette } from 'lucide-react';

interface TalentSelectorProps {
  selectedIds: UUID[];
  onChange: (ids: UUID[]) => void;
  maxSelections?: number;
  filterByType?: TalentType;
  filterByBrandId?: UUID;
  placeholder?: string;
  disabled?: boolean;
}

export function TalentSelector({
  selectedIds,
  onChange,
  maxSelections,
  filterByType,
  filterByBrandId,
  placeholder = 'Select talents...',
  disabled = false,
}: TalentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const talents = useTalentStore((state) => state.talents);
  
  // Filter talents based on props and search
  const filteredTalents = useMemo(() => {
    let result = Array.from(talents.values()).filter((t) => !t.isArchived);
    
    if (filterByType) {
      result = result.filter((t) => t.type === filterByType);
    }
    
    if (filterByBrandId) {
      result = result.filter((t) => t.brandId === filterByBrandId);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [talents, filterByType, filterByBrandId, searchQuery]);
  
  // Get selected talent objects
  const selectedTalents = useMemo(() => {
    return selectedIds
      .map((id) => talents.get(id))
      .filter((t): t is TalentProfile => t !== undefined);
  }, [selectedIds, talents]);
  
  const handleToggle = useCallback(
    (talentId: UUID) => {
      if (selectedIds.includes(talentId)) {
        onChange(selectedIds.filter((id) => id !== talentId));
      } else {
        if (maxSelections && selectedIds.length >= maxSelections) {
          return; // Don't add if at max
        }
        onChange([...selectedIds, talentId]);
      }
    },
    [selectedIds, onChange, maxSelections]
  );
  
  const handleRemove = useCallback(
    (talentId: UUID) => {
      onChange(selectedIds.filter((id) => id !== talentId));
    },
    [selectedIds, onChange]
  );
  
  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);
  
  const typeIcon: Record<TalentType, React.ReactNode> = {
    character: <User className="w-4 h-4" />,
    person: <User className="w-4 h-4" />,
    creature: <span>🐉</span>,
    object: <span>📦</span>,
    environment: <span>🏞️</span>,
    style: <Palette className="w-4 h-4" />,
  };
  
  return (
    <div className="relative">
      {/* Selected talents chips */}
      {selectedTalents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTalents.map((talent) => (
            <span
              key={talent.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
            >
              {typeIcon[talent.type]}
              <span>{talent.name}</span>
              {!disabled && (
                <button
                  onClick={() => handleRemove(talent.id)}
                  className="ml-1 hover:text-red-500 transition-colors"
                  type="button"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {selectedTalents.length > 1 && !disabled && (
            <button
              onClick={handleClear}
              className="text-xs text-text-secondary hover:text-red-500 transition-colors ml-1"
              type="button"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left text-sm border rounded-3xl
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-surface hover:border-primary cursor-pointer'}
          ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-border'}
        `}
      >
        {selectedTalents.length === 0 ? (
          <span className="text-text-secondary">{placeholder}</span>
        ) : (
          <span className="text-text-primary">
            {selectedTalents.length} talent{selectedTalents.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </button>
      
      {/* Dropdown panel */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-3xl shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search talents..."
              className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
          
          {/* Talent list */}
          <div className="overflow-y-auto max-h-48">
            {filteredTalents.length === 0 ? (
              <div className="p-3 text-center text-text-secondary text-sm">
                No talents found
              </div>
            ) : (
              filteredTalents.map((talent) => {
                const isSelected = selectedIds.includes(talent.id);
                const isDisabled = !isSelected && maxSelections && selectedIds.length >= maxSelections;
                
                return (
                  <button
                    key={talent.id}
                    type="button"
                    onClick={() => !isDisabled && handleToggle(talent.id)}
                    disabled={isDisabled}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-2 transition-colors
                      ${isSelected ? 'bg-primary/10' : 'hover:bg-background'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Checkbox */}
                    <span
                      className={`
                        w-4 h-4 border rounded flex items-center justify-center text-xs
                        ${isSelected ? 'bg-primary border-primary text-white' : 'border-border'}
                      `}
                    >
                      {isSelected && '✓'}
                    </span>
                    
                    {/* Type icon */}
                    {typeIcon[talent.type]}
                    
                    {/* Name and description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {talent.name}
                      </div>
                      {talent.description && (
                        <div className="text-xs text-text-secondary truncate">
                          {talent.description}
                        </div>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {talent.tags.length > 0 && (
                      <div className="flex gap-1">
                        {talent.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1 py-0.5 text-xs bg-background text-text-secondary rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
          
          {/* Footer with count */}
          <div className="p-2 border-t border-border bg-background text-xs text-text-secondary flex justify-between">
            <span>{filteredTalents.length} available</span>
            {maxSelections && (
              <span>
                {selectedIds.length} / {maxSelections} selected
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default TalentSelector;
