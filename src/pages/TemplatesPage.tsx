/**
 * Templates Page
 * Manage prompt templates
 */

import { useState } from 'react';
import type { UUID } from '../core/types/common';
import { TemplateLibrary, TemplateEditor } from '../features/templates';

export function TemplatesPage() {
  const [editingTemplateId, setEditingTemplateId] = useState<UUID | null>(null);

  if (editingTemplateId) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        onClose={() => setEditingTemplateId(null)}
      />
    );
  }

  return (
    <div className="h-full">
      <TemplateLibrary
        onEditTemplate={(id) => setEditingTemplateId(id as UUID)}
      />
    </div>
  );
}

export default TemplatesPage;
