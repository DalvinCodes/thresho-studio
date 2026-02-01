/**
 * Shot List Database Service
 * Handles persistence of shot lists, shots, and equipment presets to SQLite
 */

import { getDatabase } from '../../../core/db/adapter';
import type { UUID } from '../../../core/types/common';
import type {
  Shot,
  ShotList,
  EquipmentPreset,
  ShotStatus,
} from '../../../core/types/shotList';

// Database row types (SQLite stores arrays as JSON strings)
interface ShotListRow {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  director: string | null;
  cinematographer: string | null;
  productionDate: number | null;
  contentType: string;
  brandId: string | null;
  status: string;
  totalShots: number;
  completedShots: number;
  defaultAspectRatio: string;
  defaultLighting: string;
  defaultEquipmentPresetId: string | null;
  tags: string;
  metadata: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ShotRow {
  id: string;
  shotListId: string;
  shotNumber: string;
  name: string;
  description: string;
  notes: string | null;
  shotType: string;
  cameraMovement: string;
  lighting: string;
  aspectRatio: string;
  duration: number | null;
  fps: number | null;
  referenceImageUrl: string | null;
  storyboardImageUrl: string | null;
  generatedAssetId: string | null;
  location: string | null;
  subjects: string;
  props: string;
  dialogue: string | null;
  soundEffects: string;
  musicCue: string | null;
  status: string;
  priority: number;
  orderIndex: number;
  promptTemplateId: string | null;
  generatedPrompt: string | null;
  providerPreference: string | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  tags: string;
  metadata: string | null;
  createdAt: number;
  updatedAt: number;
}

interface EquipmentPresetRow {
  id: string;
  name: string;
  description: string | null;
  camera: string | null;
  lens: string | null;
  lighting: string;
  movement: string;
  shotType: string;
  aspectRatio: string;
  fps: number | null;
  resolution: string | null;
  isDefault: number;
  tags: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Load all shot lists, shots, and equipment presets from the database
 */
export async function loadShotListsFromDb(): Promise<{
  shotLists: ShotList[];
  shots: Shot[];
  presets: EquipmentPreset[];
}> {
  const db = getDatabase();

  // Load shot lists
  const shotListRows = await db.query<ShotListRow>(
    'SELECT * FROM shot_lists ORDER BY createdAt DESC'
  );

  const shotLists: ShotList[] = shotListRows.map(rowToShotList);

  // Load shots
  const shotRows = await db.query<ShotRow>(
    'SELECT * FROM shots ORDER BY shotListId, orderIndex ASC'
  );

  const shots: Shot[] = shotRows.map(rowToShot);

  // Load equipment presets
  const presetRows = await db.query<EquipmentPresetRow>(
    'SELECT * FROM equipment_presets ORDER BY name ASC'
  );

  const presets: EquipmentPreset[] = presetRows.map(rowToEquipmentPreset);

  return { shotLists, shots, presets };
}

/**
 * Save or update a shot list in the database
 */
export async function saveShotListToDb(list: ShotList): Promise<void> {
  const db = getDatabase();

  await db.exec(
    `INSERT OR REPLACE INTO shot_lists (
      id, name, description, projectId, director, cinematographer,
      productionDate, contentType, brandId, status, totalShots,
      completedShots, defaultAspectRatio, defaultLighting,
      defaultEquipmentPresetId, tags, metadata, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      list.id,
      list.name,
      list.description ?? null,
      list.projectId ?? null,
      list.director ?? null,
      list.cinematographer ?? null,
      list.productionDate ?? null,
      list.contentType,
      list.brandId ?? null,
      list.status,
      list.totalShots,
      list.completedShots,
      list.defaultAspectRatio,
      list.defaultLighting,
      list.defaultEquipmentPresetId ?? null,
      JSON.stringify(list.tags),
      list.metadata ? JSON.stringify(list.metadata) : null,
      list.createdAt,
      list.updatedAt,
    ]
  );
}

/**
 * Save or update a shot in the database
 */
export async function saveShotToDb(shot: Shot): Promise<void> {
  const db = getDatabase();

  await db.exec(
    `INSERT OR REPLACE INTO shots (
      id, shotListId, shotNumber, name, description, notes,
      shotType, cameraMovement, lighting, aspectRatio, duration, fps,
      referenceImageUrl, storyboardImageUrl, generatedAssetId,
      location, subjects, props, dialogue, soundEffects, musicCue,
      status, priority, orderIndex, promptTemplateId, generatedPrompt,
      providerPreference, estimatedDuration, actualDuration,
      tags, metadata, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shot.id,
      shot.shotListId,
      shot.shotNumber,
      shot.name,
      shot.description,
      shot.notes ?? null,
      shot.shotType,
      shot.cameraMovement,
      shot.lighting,
      shot.aspectRatio,
      shot.duration ?? null,
      shot.fps ?? null,
      shot.referenceImageUrl ?? null,
      shot.storyboardImageUrl ?? null,
      shot.generatedAssetId ?? null,
      shot.location ?? null,
      JSON.stringify(shot.subjects ?? []),
      JSON.stringify(shot.props ?? []),
      shot.dialogue ?? null,
      JSON.stringify(shot.soundEffects ?? []),
      shot.musicCue ?? null,
      shot.status,
      shot.priority,
      shot.orderIndex,
      shot.promptTemplateId ?? null,
      shot.generatedPrompt ?? null,
      shot.providerPreference ?? null,
      shot.estimatedDuration ?? null,
      shot.actualDuration ?? null,
      JSON.stringify(shot.tags),
      shot.metadata ? JSON.stringify(shot.metadata) : null,
      shot.createdAt,
      shot.updatedAt,
    ]
  );
}

/**
 * Delete a shot list from the database (cascades to shots)
 */
export async function deleteShotListFromDb(id: UUID): Promise<void> {
  const db = getDatabase();
  // Shots will be cascade deleted due to foreign key constraint
  await db.exec('DELETE FROM shot_lists WHERE id = ?', [id]);
}

/**
 * Delete a shot from the database
 */
export async function deleteShotFromDb(id: UUID): Promise<void> {
  const db = getDatabase();
  await db.exec('DELETE FROM shots WHERE id = ?', [id]);
}

/**
 * Save or update an equipment preset in the database
 */
export async function saveEquipmentPresetToDb(
  preset: EquipmentPreset
): Promise<void> {
  const db = getDatabase();

  await db.exec(
    `INSERT OR REPLACE INTO equipment_presets (
      id, name, description, camera, lens, lighting, movement,
      shotType, aspectRatio, fps, resolution, isDefault, tags,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      preset.id,
      preset.name,
      preset.description ?? null,
      preset.camera ?? null,
      preset.lens ?? null,
      preset.lighting,
      preset.movement,
      preset.shotType,
      preset.aspectRatio,
      preset.fps ?? null,
      preset.resolution ?? null,
      preset.isDefault ? 1 : 0,
      JSON.stringify(preset.tags),
      preset.createdAt,
      preset.updatedAt,
    ]
  );
}

/**
 * Delete an equipment preset from the database
 */
export async function deleteEquipmentPresetFromDb(id: UUID): Promise<void> {
  const db = getDatabase();
  await db.exec('DELETE FROM equipment_presets WHERE id = ?', [id]);
}

/**
 * Batch save multiple shots (useful for reordering)
 */
export async function batchSaveShotsToDb(shots: Shot[]): Promise<void> {
  for (const shot of shots) {
    await saveShotToDb(shot);
  }
}

/**
 * Get a single shot list by ID
 */
export async function getShotListFromDb(id: UUID): Promise<ShotList | null> {
  const db = getDatabase();
  const row = await db.querySingle<ShotListRow>(
    'SELECT * FROM shot_lists WHERE id = ?',
    [id]
  );
  return row ? rowToShotList(row) : null;
}

/**
 * Get a single shot by ID
 */
export async function getShotFromDb(id: UUID): Promise<Shot | null> {
  const db = getDatabase();
  const row = await db.querySingle<ShotRow>(
    'SELECT * FROM shots WHERE id = ?',
    [id]
  );
  return row ? rowToShot(row) : null;
}

/**
 * Get all shots for a specific shot list
 */
export async function getShotsForListFromDb(
  shotListId: UUID
): Promise<Shot[]> {
  const db = getDatabase();
  const rows = await db.query<ShotRow>(
    'SELECT * FROM shots WHERE shotListId = ? ORDER BY orderIndex ASC',
    [shotListId]
  );
  return rows.map(rowToShot);
}

// Row to model conversion functions

function rowToShotList(row: ShotListRow): ShotList {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description ?? undefined,
    projectId: row.projectId as UUID | undefined,
    director: row.director ?? undefined,
    cinematographer: row.cinematographer ?? undefined,
    productionDate: row.productionDate ?? undefined,
    contentType: row.contentType as 'text' | 'image' | 'video',
    brandId: row.brandId as UUID | undefined,
    status: row.status as ShotList['status'],
    totalShots: row.totalShots,
    completedShots: row.completedShots,
    defaultAspectRatio: row.defaultAspectRatio as ShotList['defaultAspectRatio'],
    defaultLighting: row.defaultLighting as ShotList['defaultLighting'],
    defaultEquipmentPresetId: row.defaultEquipmentPresetId as UUID | undefined,
    tags: JSON.parse(row.tags),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToShot(row: ShotRow): Shot {
  return {
    id: row.id as UUID,
    shotListId: row.shotListId as UUID,
    shotNumber: row.shotNumber,
    name: row.name,
    description: row.description,
    notes: row.notes ?? undefined,
    shotType: row.shotType as Shot['shotType'],
    cameraMovement: row.cameraMovement as Shot['cameraMovement'],
    lighting: row.lighting as Shot['lighting'],
    aspectRatio: row.aspectRatio as Shot['aspectRatio'],
    duration: row.duration ?? undefined,
    fps: row.fps ?? undefined,
    referenceImageUrl: row.referenceImageUrl ?? undefined,
    storyboardImageUrl: row.storyboardImageUrl ?? undefined,
    generatedAssetId: row.generatedAssetId as UUID | undefined,
    location: row.location ?? undefined,
    subjects: JSON.parse(row.subjects),
    props: JSON.parse(row.props),
    dialogue: row.dialogue ?? undefined,
    soundEffects: JSON.parse(row.soundEffects),
    musicCue: row.musicCue ?? undefined,
    status: row.status as ShotStatus,
    priority: row.priority,
    orderIndex: row.orderIndex,
    promptTemplateId: row.promptTemplateId as UUID | undefined,
    generatedPrompt: row.generatedPrompt ?? undefined,
    providerPreference: row.providerPreference ?? undefined,
    estimatedDuration: row.estimatedDuration ?? undefined,
    actualDuration: row.actualDuration ?? undefined,
    tags: JSON.parse(row.tags),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToEquipmentPreset(row: EquipmentPresetRow): EquipmentPreset {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description ?? undefined,
    camera: row.camera ?? undefined,
    lens: row.lens ?? undefined,
    lighting: row.lighting as EquipmentPreset['lighting'],
    movement: row.movement as EquipmentPreset['movement'],
    shotType: row.shotType as EquipmentPreset['shotType'],
    aspectRatio: row.aspectRatio as EquipmentPreset['aspectRatio'],
    fps: row.fps ?? undefined,
    resolution: row.resolution ?? undefined,
    isDefault: row.isDefault === 1,
    tags: JSON.parse(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
