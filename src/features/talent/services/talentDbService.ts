/**
 * Talent Database Service
 * Handles persistence of talent profiles to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db';
import type { UUID } from '../../../core/types/common';
import type {
  TalentProfile,
  TalentReferenceImage,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
} from '../../../core/types/talent';

/**
 * Database row type for talent_profiles table
 */
interface TalentProfileRow {
  id: string;
  name: string;
  type: string;
  description: string;
  appearance: string; // JSON string
  personality: string | null; // JSON string
  primaryImageId: string | null;
  promptFragments: string; // JSON string
  tags: string; // JSON array string
  brandId: string | null;
  projectId: string | null;
  isFavorite: number; // SQLite boolean (0 or 1)
  isArchived: number; // SQLite boolean (0 or 1)
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Database row type for talent_reference_images table
 */
interface TalentReferenceImageRow {
  id: string;
  talentId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  isPrimary: number; // SQLite boolean (0 or 1)
  createdAt: number; // Unix timestamp
}

/**
 * Convert database row to TalentProfile
 */
function rowToTalentProfile(row: TalentProfileRow, images: TalentReferenceImage[] = []): TalentProfile {
  return {
    id: row.id as UUID,
    name: row.name,
    type: row.type as TalentProfile['type'],
    description: row.description,
    appearance: JSON.parse(row.appearance) as TalentAppearance,
    personality: row.personality ? JSON.parse(row.personality) as TalentPersonality : undefined,
    referenceImages: images,
    primaryImageId: row.primaryImageId as UUID | undefined,
    promptFragments: JSON.parse(row.promptFragments) as TalentPromptFragments,
    tags: JSON.parse(row.tags) as string[],
    brandId: row.brandId as UUID | undefined,
    projectId: row.projectId as UUID | undefined,
    isFavorite: row.isFavorite === 1,
    isArchived: row.isArchived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Convert database row to TalentReferenceImage
 */
function rowToReferenceImage(row: TalentReferenceImageRow): TalentReferenceImage {
  return {
    id: row.id as UUID,
    talentId: row.talentId as UUID,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    caption: row.caption ?? undefined,
    isPrimary: row.isPrimary === 1,
    createdAt: row.createdAt,
  };
}

/**
 * Load all talent profiles from the database
 */
export async function loadTalentsFromDb(): Promise<TalentProfile[]> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, returning empty talents list');
    return [];
  }

  const db = getDatabase();
  
  // Load all profiles
  const profileRows = await db.query<TalentProfileRow>(
    'SELECT * FROM talent_profiles ORDER BY createdAt DESC'
  );
  
  // Load all reference images
  const imageRows = await db.query<TalentReferenceImageRow>(
    'SELECT * FROM talent_reference_images ORDER BY createdAt ASC'
  );
  
  // Group images by talent ID
  const imagesByTalent = new Map<string, TalentReferenceImage[]>();
  for (const row of imageRows) {
    const image = rowToReferenceImage(row);
    const existing = imagesByTalent.get(row.talentId) || [];
    existing.push(image);
    imagesByTalent.set(row.talentId, existing);
  }
  
  // Convert rows to profiles with images
  return profileRows.map(row => 
    rowToTalentProfile(row, imagesByTalent.get(row.id) || [])
  );
}

/**
 * Save or update a talent profile in the database
 */
export async function saveTalentToDb(talent: TalentProfile): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping talent save');
    return;
  }

  const db = getDatabase();

  // Check if talent exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM talent_profiles WHERE id = ?',
    [talent.id]
  );

  const appearanceJson = JSON.stringify(talent.appearance);
  const personalityJson = talent.personality ? JSON.stringify(talent.personality) : null;
  const promptFragmentsJson = JSON.stringify(talent.promptFragments);
  const tagsJson = JSON.stringify(talent.tags);

  if (existing) {
    // Update existing talent
    await db.exec(
      `UPDATE talent_profiles SET
        name = ?,
        type = ?,
        description = ?,
        appearance = ?,
        personality = ?,
        primaryImageId = ?,
        promptFragments = ?,
        tags = ?,
        brandId = ?,
        projectId = ?,
        isFavorite = ?,
        isArchived = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        talent.name,
        talent.type,
        talent.description,
        appearanceJson,
        personalityJson,
        talent.primaryImageId ?? null,
        promptFragmentsJson,
        tagsJson,
        talent.brandId ?? null,
        talent.projectId ?? null,
        talent.isFavorite ? 1 : 0,
        talent.isArchived ? 1 : 0,
        talent.updatedAt,
        talent.id,
      ]
    );
  } else {
    // Insert new talent
    await db.exec(
      `INSERT INTO talent_profiles (
        id, name, type, description, appearance, personality,
        primaryImageId, promptFragments, tags, brandId, projectId,
        isFavorite, isArchived, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        talent.id,
        talent.name,
        talent.type,
        talent.description,
        appearanceJson,
        personalityJson,
        talent.primaryImageId ?? null,
        promptFragmentsJson,
        tagsJson,
        talent.brandId ?? null,
        talent.projectId ?? null,
        talent.isFavorite ? 1 : 0,
        talent.isArchived ? 1 : 0,
        talent.createdAt,
        talent.updatedAt,
      ]
    );
  }
}

/**
 * Delete a talent profile from the database
 */
export async function deleteTalentFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping talent delete');
    return;
  }

  const db = getDatabase();
  // Reference images will be deleted via CASCADE
  await db.exec('DELETE FROM talent_profiles WHERE id = ?', [id]);
}

/**
 * Save or update a reference image in the database
 */
export async function saveReferenceImageToDb(image: TalentReferenceImage): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping reference image save');
    return;
  }

  const db = getDatabase();

  // Check if image exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM talent_reference_images WHERE id = ?',
    [image.id]
  );

  if (existing) {
    // Update existing image
    await db.exec(
      `UPDATE talent_reference_images SET
        url = ?,
        thumbnailUrl = ?,
        caption = ?,
        isPrimary = ?
      WHERE id = ?`,
      [
        image.url,
        image.thumbnailUrl ?? null,
        image.caption ?? null,
        image.isPrimary ? 1 : 0,
        image.id,
      ]
    );
  } else {
    // Insert new image
    await db.exec(
      `INSERT INTO talent_reference_images (
        id, talentId, url, thumbnailUrl, caption, isPrimary, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        image.id,
        image.talentId,
        image.url,
        image.thumbnailUrl ?? null,
        image.caption ?? null,
        image.isPrimary ? 1 : 0,
        image.createdAt,
      ]
    );
  }
}

/**
 * Delete a reference image from the database
 */
export async function deleteReferenceImageFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping reference image delete');
    return;
  }

  const db = getDatabase();
  await db.exec('DELETE FROM talent_reference_images WHERE id = ?', [id]);
}

/**
 * Get a single talent profile from the database
 */
export async function getTalentFromDb(id: UUID): Promise<TalentProfile | null> {
  if (!isDatabaseInitialized()) {
    return null;
  }

  const db = getDatabase();
  const row = await db.querySingle<TalentProfileRow>(
    'SELECT * FROM talent_profiles WHERE id = ?',
    [id]
  );

  if (!row) return null;

  // Load reference images
  const imageRows = await db.query<TalentReferenceImageRow>(
    'SELECT * FROM talent_reference_images WHERE talentId = ? ORDER BY createdAt ASC',
    [id]
  );

  const images = imageRows.map(rowToReferenceImage);
  return rowToTalentProfile(row, images);
}
