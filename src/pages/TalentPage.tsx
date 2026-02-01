/**
 * Talent Page
 * Manage talent profiles for characters, personas, and styles
 */

import { useState } from 'react';
import type { UUID } from '../core/types/common';
import { TalentLibrary, TalentEditor } from '../features/talent';

export function TalentPage() {
  const [editingTalentId, setEditingTalentId] = useState<UUID | null>(null);

  if (editingTalentId) {
    return (
      <TalentEditor
        talentId={editingTalentId}
        onClose={() => setEditingTalentId(null)}
      />
    );
  }

  return (
    <div className="h-full">
      <TalentLibrary
        onEditTalent={(id) => setEditingTalentId(id)}
      />
    </div>
  );
}

export default TalentPage;
