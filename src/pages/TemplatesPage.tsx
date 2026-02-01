/**
 * Templates Page
 * Manage prompt templates
 */

import { useParams, useNavigate } from 'react-router-dom';
import type { UUID } from '../core/types/common';
import { TemplateLibrary, TemplateEditor } from '../features/templates';

export function TemplatesPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  if (id) {
    const isNew = id === 'new';
    return (
      <TemplateEditor
        templateId={isNew ? undefined : (id as UUID)}
        onClose={() => navigate('/templates')}
      />
    );
  }

  return (
    <div className="h-full">
      <TemplateLibrary
        onEditTemplate={(templateId) => navigate(`/templates/${templateId}/edit`)}
      />
    </div>
  );
}

export default TemplatesPage;
