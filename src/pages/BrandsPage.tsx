/**
 * Brands Page
 * Manage brand profiles and tokens
 */

import { useParams, useNavigate } from 'react-router-dom';
import type { UUID } from '../core/types/common';
import { BrandLibrary, BrandEditor } from '../features/brands';

export function BrandsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // If no id param, show BrandLibrary (list view)
  if (!id) {
    return (
      <div className="h-full">
        <BrandLibrary />
      </div>
    );
  }

  // If id === 'new', show BrandEditor for creating
  if (id === 'new') {
    return (
      <BrandEditor
        onClose={() => navigate('/brands')}
      />
    );
  }

  // If id exists and is not 'new', show BrandEditor for editing
  return (
    <BrandEditor
      brandId={id as UUID}
      onClose={() => navigate('/brands')}
    />
  );
}

export default BrandsPage;
