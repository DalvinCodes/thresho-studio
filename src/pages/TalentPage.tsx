/**
 * Talent Page
 * Manage talent profiles for characters, personas, and styles
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { UUID } from '../core/types/common';
import { TalentLibrary, TalentEditor } from '../features/talent';
import { useTalentStore } from '../features/talent/store';

export function TalentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const createTalent = useTalentStore((state) => state.createTalent);

  // Handle /talent/new by creating a talent and redirecting to edit
  useEffect(() => {
    if (id === 'new') {
      const newId = createTalent('New Talent', 'character');
      navigate(`/talent/${newId}/edit`, { replace: true });
    }
  }, [id, createTalent, navigate]);

  // Show library when no id
  if (!id) {
    return (
      <div className="h-full">
        <TalentLibrary />
      </div>
    );
  }

  // Don't render while redirecting from /talent/new
  if (id === 'new') {
    return null;
  }

  // Edit existing talent
  return (
    <TalentEditor
      talentId={id as UUID}
      onClose={() => navigate('/talent')}
    />
  );
}

export default TalentPage;
