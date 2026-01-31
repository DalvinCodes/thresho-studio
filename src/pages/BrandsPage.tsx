/**
 * Brands Page
 * Manage brand profiles and tokens
 */

import { useState } from 'react';
import type { UUID } from '../core/types/common';
import { BrandLibrary, BrandEditor } from '../features/brands';

export function BrandsPage() {
  const [editingBrandId, setEditingBrandId] = useState<UUID | null>(null);

  if (editingBrandId) {
    return (
      <BrandEditor
        brandId={editingBrandId}
        onClose={() => setEditingBrandId(null)}
      />
    );
  }

  return (
    <div className="h-full">
      <BrandLibrary
        onEditBrand={(id) => setEditingBrandId(id)}
      />
    </div>
  );
}

export default BrandsPage;
