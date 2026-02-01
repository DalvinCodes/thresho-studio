/**
 * Collection Sidebar Component
 * Sidebar for browsing and managing asset collections
 */

import { useState, useCallback } from 'react';
import type { UUID } from '../../../core/types/common';
import type { AssetCollection } from '../../../core/types/asset';
import { useAssetStore, useCollections, useSelectedAssets } from '../store';

interface CollectionSidebarProps {
  selectedCollectionId: UUID | null;
  onSelectCollection: (id: UUID | null) => void;
}

export function CollectionSidebar({
  selectedCollectionId,
  onSelectCollection,
}: CollectionSidebarProps) {
  const collections = useCollections();
  const selectedAssets = useSelectedAssets();
  const {
    createCollection,
    updateCollection,
    deleteCollection,
    addToCollection,
  } = useAssetStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingId, setEditingId] = useState<UUID | null>(null);
  const [editingName, setEditingName] = useState('');

  // Create new collection
  const handleCreateCollection = useCallback(() => {
    if (!newCollectionName.trim()) return;

    createCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreating(false);
  }, [newCollectionName, createCollection]);

  // Start editing
  const handleStartEdit = useCallback((collection: AssetCollection) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
  }, []);

  // Save edit
  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editingName.trim()) return;

    updateCollection(editingId, { name: editingName.trim() });
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, updateCollection]);

  // Delete collection
  const handleDeleteCollection = useCallback((id: UUID, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this collection? Assets will not be deleted.')) {
      deleteCollection(id);
      if (selectedCollectionId === id) {
        onSelectCollection(null);
      }
    }
  }, [deleteCollection, selectedCollectionId, onSelectCollection]);

  // Add selected assets to collection
  const handleAddSelected = useCallback((collectionId: UUID, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedAssets.length === 0) return;

    addToCollection(collectionId, selectedAssets.map((a) => a.id));
  }, [selectedAssets, addToCollection]);

  return (
    <div className="w-64 border-r border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-text-primary">Collections</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="text-primary hover:text-primary/80 transition-colors text-sm"
          >
            + New
          </button>
        </div>

        {/* New collection input */}
        {isCreating && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCollection();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewCollectionName('');
                }
              }}
              placeholder="Collection name..."
              className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={handleCreateCollection}
              className="px-2 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Collection list */}
      <div className="flex-1 overflow-y-auto">
        {/* All assets option */}
        <button
          onClick={() => onSelectCollection(null)}
          className={`
            w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
            ${selectedCollectionId === null
              ? 'bg-primary/10 text-primary border-l-2 border-primary'
              : 'text-text-primary hover:bg-surface-hover'
            }
          `}
        >
          <span className="text-lg">📁</span>
          <span className="flex-1 font-medium">All Assets</span>
        </button>

        {/* Favorites shortcut */}
        <button
          onClick={() => onSelectCollection('favorites' as UUID)}
          className={`
            w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
            ${selectedCollectionId === 'favorites'
              ? 'bg-primary/10 text-primary border-l-2 border-primary'
              : 'text-text-primary hover:bg-surface-hover'
            }
          `}
        >
          <span className="text-lg">⭐</span>
          <span className="flex-1 font-medium">Favorites</span>
        </button>

        {/* Divider */}
        {collections.length > 0 && (
          <div className="mx-4 my-2 border-t border-border" />
        )}

        {/* User collections */}
        {collections.map((collection) => (
          <div
            key={collection.id}
            onClick={() => onSelectCollection(collection.id)}
            className={`
              group w-full px-4 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer
              ${selectedCollectionId === collection.id
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <span className="text-lg">📂</span>

            {editingId === collection.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditingName('');
                  }
                }}
                onBlur={handleSaveEdit}
                className="flex-1 px-1 py-0.5 text-sm bg-background border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="flex-1 font-medium truncate">{collection.name}</span>
                <span className="text-sm text-text-secondary">
                  {collection.assetIds.length}
                </span>
              </>
            )}

            {/* Actions - only show on hover */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {selectedAssets.length > 0 && editingId !== collection.id && (
                <button
                  onClick={(e) => handleAddSelected(collection.id, e)}
                  title={`Add ${selectedAssets.length} selected to collection`}
                  className="p-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                >
                  +{selectedAssets.length}
                </button>
              )}
              {editingId !== collection.id && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(collection);
                    }}
                    className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDeleteCollection(collection.id, e)}
                    className="p-1 text-text-secondary hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {collections.length === 0 && (
          <div className="px-4 py-8 text-center text-text-secondary text-sm">
            <p className="mb-2">No collections yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="text-primary hover:underline"
            >
              Create your first collection
            </button>
          </div>
        )}
      </div>

      {/* Footer with selected info */}
      {selectedAssets.length > 0 && (
        <div className="p-4 border-t border-border bg-background">
          <p className="text-sm text-text-secondary mb-2">
            {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => {
              const name = prompt('Collection name:');
              if (name) {
                const id = createCollection(name, selectedAssets.map((a) => a.id));
                onSelectCollection(id);
              }
            }}
            className="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Collection from Selected
          </button>
        </div>
      )}
    </div>
  );
}

export default CollectionSidebar;
