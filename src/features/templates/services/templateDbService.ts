/**
 * Template Database Service
 * Handles persistence of templates, versions, and labels to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db/adapter';
import type { UUID, ContentType } from '../../../core/types/common';
import type {
  PromptTemplate,
  PromptVersion,
  PromptLabel,
} from '../../../core/types/prompt';

// Database row types (what we get back from SQLite)
interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  outputType: string;
  category: string | null;
  tags: string;
  currentVersionId: string | null;
  isArchived: number;
  createdAt: number;
  updatedAt: number;
}

interface VersionRow {
  id: string;
  templateId: string;
  version: string;
  contentHash: string;
  systemPrompt: string | null;
  userPrompt: string;
  variables: string;
  modelConfig: string | null;
  changeLog: string | null;
  createdBy: string | null;
  createdAt: number;
}

interface LabelRow {
  id: string;
  templateId: string;
  versionId: string;
  label: string;
  labelType: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Load all templates from the database
 */
export async function loadTemplatesFromDb(): Promise<{
  templates: PromptTemplate[];
  versions: Map<UUID, PromptVersion[]>;
  labels: Map<UUID, PromptLabel[]>;
}> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, returning empty data');
    return { templates: [], versions: new Map(), labels: new Map() };
  }

  const db = getDatabase();

  // Load templates
  const templateRows = await db.query<TemplateRow>(
    'SELECT * FROM prompt_templates ORDER BY updatedAt DESC'
  );

  const templates: PromptTemplate[] = templateRows.map(rowToTemplate);

  // Load all versions
  const versionRows = await db.query<VersionRow>(
    'SELECT * FROM prompt_versions ORDER BY createdAt ASC'
  );

  const versions = new Map<UUID, PromptVersion[]>();
  for (const row of versionRows) {
    const templateId = row.templateId as UUID;
    const version = rowToVersion(row);

    if (!versions.has(templateId)) {
      versions.set(templateId, []);
    }
    versions.get(templateId)!.push(version);
  }

  // Load all labels
  const labelRows = await db.query<LabelRow>(
    'SELECT * FROM prompt_labels ORDER BY createdAt ASC'
  );

  const labels = new Map<UUID, PromptLabel[]>();
  for (const row of labelRows) {
    const templateId = row.templateId as UUID;
    const label = rowToLabel(row);

    if (!labels.has(templateId)) {
      labels.set(templateId, []);
    }
    labels.get(templateId)!.push(label);
  }

  return { templates, versions, labels };
}

/**
 * Save or update a template in the database
 */
export async function saveTemplateToDb(template: PromptTemplate): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping save');
    return;
  }

  const db = getDatabase();

  // Check if template exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM prompt_templates WHERE id = ?',
    [template.id]
  );

  if (existing) {
    // Update
    await db.exec(
      `UPDATE prompt_templates SET
        name = ?,
        description = ?,
        outputType = ?,
        category = ?,
        tags = ?,
        currentVersionId = ?,
        isArchived = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        template.name,
        template.description || null,
        template.outputType,
        template.category || null,
        JSON.stringify(template.tags),
        template.currentVersionId || null,
        template.isArchived ? 1 : 0,
        template.updatedAt,
        template.id,
      ]
    );
  } else {
    // Insert
    await db.exec(
      `INSERT INTO prompt_templates (
        id, name, description, outputType, category, tags,
        currentVersionId, isArchived, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template.id,
        template.name,
        template.description || null,
        template.outputType,
        template.category || null,
        JSON.stringify(template.tags),
        template.currentVersionId || null,
        template.isArchived ? 1 : 0,
        template.createdAt,
        template.updatedAt,
      ]
    );
  }
}

/**
 * Save a version to the database
 */
export async function saveVersionToDb(version: PromptVersion): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping save');
    return;
  }

  const db = getDatabase();

  // Check if version exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM prompt_versions WHERE id = ?',
    [version.id]
  );

  if (existing) {
    // Versions are immutable, but we allow updating changelog
    await db.exec(
      'UPDATE prompt_versions SET changeLog = ? WHERE id = ?',
      [version.changeLog || null, version.id]
    );
  } else {
    // Insert
    await db.exec(
      `INSERT INTO prompt_versions (
        id, templateId, version, contentHash, systemPrompt, userPrompt,
        variables, modelConfig, changeLog, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        version.id,
        version.templateId,
        version.version,
        version.contentHash,
        version.systemPrompt || null,
        version.userPrompt,
        JSON.stringify(version.variables),
        version.modelConfig ? JSON.stringify(version.modelConfig) : null,
        version.changeLog || null,
        version.createdAt,
      ]
    );
  }
}

/**
 * Save a label to the database
 */
export async function saveLabelToDb(label: PromptLabel): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping save');
    return;
  }

  const db = getDatabase();

  // Check if label exists (by templateId + label name)
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM prompt_labels WHERE templateId = ? AND label = ?',
    [label.templateId, label.label]
  );

  if (existing) {
    // Update
    await db.exec(
      `UPDATE prompt_labels SET
        versionId = ?,
        labelType = ?,
        description = ?,
        updatedAt = ?
      WHERE templateId = ? AND label = ?`,
      [
        label.versionId,
        label.labelType,
        label.description || null,
        label.updatedAt,
        label.templateId,
        label.label,
      ]
    );
  } else {
    // Insert
    await db.exec(
      `INSERT INTO prompt_labels (
        id, templateId, versionId, label, labelType, description, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        label.id,
        label.templateId,
        label.versionId,
        label.label,
        label.labelType,
        label.description || null,
        label.createdAt,
        label.updatedAt,
      ]
    );
  }
}

/**
 * Delete a label from the database
 */
export async function deleteLabelFromDb(templateId: UUID, labelName: string): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping delete');
    return;
  }

  const db = getDatabase();
  await db.exec(
    'DELETE FROM prompt_labels WHERE templateId = ? AND label = ?',
    [templateId, labelName]
  );
}

/**
 * Delete a template and all its versions/labels from the database
 */
export async function deleteTemplateFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping delete');
    return;
  }

  const db = getDatabase();

  // Foreign keys should cascade, but let's be explicit
  await db.exec('DELETE FROM prompt_labels WHERE templateId = ?', [id]);
  await db.exec('DELETE FROM prompt_versions WHERE templateId = ?', [id]);
  await db.exec('DELETE FROM prompt_templates WHERE id = ?', [id]);
}

// Row to model converters

function rowToTemplate(row: TemplateRow): PromptTemplate {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description || '',
    outputType: row.outputType as ContentType,
    category: row.category || 'general',
    tags: JSON.parse(row.tags || '[]'),
    currentVersionId: row.currentVersionId as UUID | undefined,
    isArchived: row.isArchived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToVersion(row: VersionRow): PromptVersion {
  return {
    id: row.id as UUID,
    templateId: row.templateId as UUID,
    version: row.version,
    contentHash: row.contentHash,
    systemPrompt: row.systemPrompt || undefined,
    userPrompt: row.userPrompt,
    variables: JSON.parse(row.variables || '[]'),
    modelConfig: row.modelConfig ? JSON.parse(row.modelConfig) : undefined,
    changeLog: row.changeLog || undefined,
    createdAt: row.createdAt,
  };
}

function rowToLabel(row: LabelRow): PromptLabel {
  return {
    id: row.id as UUID,
    templateId: row.templateId as UUID,
    versionId: row.versionId as UUID,
    label: row.label,
    labelType: row.labelType as 'draft' | 'staging' | 'production' | 'experiment',
    description: row.description || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
