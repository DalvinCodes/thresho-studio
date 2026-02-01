/**
 * Brand Library Component
 * Browse, search, and select brand profiles
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { BrandProfile } from '../../../core/types/brand';
import {
  useBrands,
  useDefaultBrand,
  useBrandStore,
} from '../store';

export function BrandLibrary() {
  const navigate = useNavigate();
  const brands = useBrands();
  const defaultBrand = useDefaultBrand();
  const { createBrand, selectBrand, setDefaultBrand, deleteBrand, duplicateBrand } = useBrandStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter brands by search
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (brand: BrandProfile) => {
    selectBrand(brand.id);
  };

  const handleEdit = (brand: BrandProfile) => {
    navigate(`/brands/${brand.id}`);
  };

  const handleCreate = (name: string) => {
    const id = createBrand(name);
    setShowCreateModal(false);
    navigate(`/brands/${id}`);
  };

  const handleDuplicate = (brand: BrandProfile) => {
    const newId = duplicateBrand(brand.id, `${brand.name} (Copy)`);
    navigate(`/brands/${newId}`);
  };

  const handleDelete = (brand: BrandProfile) => {
    if (confirm(`Delete "${brand.name}"? This action cannot be undone.`)) {
      deleteBrand(brand.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Brand Profiles</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-3xl hover:bg-primary/90 transition-colors"
          >
            + New Brand
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands..."
          className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Brand List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            {brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl">
                <div className="w-16 h-16 rounded-3xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">
                  No brand profiles yet
                </h3>
                <p className="text-[var(--color-text-muted)] max-w-md mb-6">
                  Create a brand profile to define your visual identity, voice, and style guidelines. 
                  This helps maintain consistency across all your generated content.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-3xl font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Create First Brand Profile
                </button>
              </div>
            ) : (
              <p className="text-[var(--color-text-muted)]">No brands match your search</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBrands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                isDefault={brand.id === defaultBrand?.id}
                onSelect={() => handleSelect(brand)}
                onEdit={() => handleEdit(brand)}
                onSetDefault={() => setDefaultBrand(brand.id)}
                onDuplicate={() => handleDuplicate(brand)}
                onDelete={() => handleDelete(brand)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateBrandModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// Brand Card Component
interface BrandCardProps {
  brand: BrandProfile;
  isDefault: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function BrandCard({
  brand,
  isDefault,
  onSelect,
  onEdit,
  onSetDefault,
  onDuplicate,
  onDelete,
}: BrandCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onSelect}
      className="p-4 bg-surface rounded-3xl border border-border hover:border-primary/50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Color Preview */}
          <div className="flex gap-0.5 rounded overflow-hidden">
            <div
              className="w-6 h-12"
              style={{ backgroundColor: brand.tokens.colors.primary }}
            />
            <div
              className="w-6 h-12"
              style={{ backgroundColor: brand.tokens.colors.secondary }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-primary">{brand.name}</h3>
              {isDefault && (
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                  Default
                </span>
              )}
            </div>
            {brand.description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                {brand.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="text-text-primary font-medium">Font:</span>
                {brand.tokens.typography.primaryFont}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-text-primary font-medium">Style:</span>
                {brand.tokens.visualStyle.aesthetic || 'No aesthetic'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
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
              <div className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-3xl shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                >
                  Edit
                </button>
                {!isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefault();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
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
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-surface-hover"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Token Preview */}
      <div className="flex flex-wrap gap-1 mt-3">
        {brand.tokens.voice.tone.slice(0, 3).map((tone, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs bg-background text-text-secondary rounded"
          >
            {tone}
          </span>
        ))}
        {brand.tokens.customTokens && brand.tokens.customTokens.length > 0 && (
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
            +{brand.tokens.customTokens.length} custom tokens
          </span>
        )}
      </div>
    </div>
  );
}

// Create Brand Modal
interface CreateBrandModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

function CreateBrandModal({ onClose, onCreate }: CreateBrandModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-3xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Create New Brand Profile
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Brand"
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BrandLibrary;
