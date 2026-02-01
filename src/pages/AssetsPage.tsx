/**
 * Assets Page
 * Browse and manage generated assets with collection sidebar
 */

import { useState, useCallback } from 'react';
import type { UUID } from '../core/types/common';
import { AssetGallery, CollectionSidebar, useAssetStore } from '../features/assets';

export function AssetsPage() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<UUID | null>(null);
  const setFilters = useAssetStore((state) => state.setFilters);

  // Handle collection selection
  const handleSelectCollection = useCallback((id: UUID | null) => {
    setSelectedCollectionId(id);

    if (id === 'favorites') {
      // Special case: show favorites
      setFilters({ isFavorite: true, collectionId: undefined });
    } else if (id === null) {
      // Show all assets
      setFilters({ isFavorite: undefined, collectionId: undefined });
    } else {
      // Show assets in collection
      setFilters({ isFavorite: undefined, collectionId: id });
    }
  }, [setFilters]);

  return (
    <div className="h-full flex">
      <CollectionSidebar
        selectedCollectionId={selectedCollectionId}
        onSelectCollection={handleSelectCollection}
      />
      <div className="flex-1">
        <AssetGallery />
      </div>
    </div>
  );
}

export default AssetsPage;
