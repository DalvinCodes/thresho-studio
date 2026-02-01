/**
 * Generation Database Service
 * Handles persistence of generation records to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db/adapter';
import type { UUID, Timestamp } from '../../../core/types/common';
import type { GenerationRecord } from '../../../core/types/generation';

/**
 * Database row representation of a generation record
 */
interface GenerationRecordRow {
  id: string;
  requestId: string;
  status: string;
  providerId: string;
  providerType: string;
  model: string;
  type: string;
  promptTemplateId: string | null;
  promptVersionId: string | null;
  brandId: string | null;
  renderedPrompt: string;
  variablesUsed: string | null;
  parametersUsed: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costEstimateUsd: number | null;
  result: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  providerRequestId: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Convert database row to GenerationRecord
 */
function rowToRecord(row: GenerationRecordRow): GenerationRecord {
  return {
    id: row.id as UUID,
    requestId: row.requestId as UUID,
    status: row.status as GenerationRecord['status'],
    providerId: row.providerId as UUID,
    providerType: row.providerType as GenerationRecord['providerType'],
    model: row.model,
    type: row.type as GenerationRecord['type'],
    promptTemplateId: row.promptTemplateId as UUID | undefined,
    promptVersionId: row.promptVersionId as UUID | undefined,
    brandId: row.brandId as UUID | undefined,
    renderedPrompt: row.renderedPrompt,
    variablesUsed: row.variablesUsed ? JSON.parse(row.variablesUsed) : undefined,
    parametersUsed: JSON.parse(row.parametersUsed),
    inputTokens: row.inputTokens ?? undefined,
    outputTokens: row.outputTokens ?? undefined,
    costEstimateUsd: row.costEstimateUsd ?? undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error ? JSON.parse(row.error) : undefined,
    startedAt: row.startedAt as Timestamp | undefined,
    completedAt: row.completedAt as Timestamp | undefined,
    durationMs: row.durationMs ?? undefined,
    providerRequestId: row.providerRequestId ?? undefined,
    createdAt: row.createdAt as Timestamp,
    updatedAt: row.updatedAt as Timestamp,
  };
}

/**
 * Load generation history from the database
 * Returns records ordered by createdAt DESC (most recent first)
 */
export async function loadGenerationHistoryFromDb(): Promise<GenerationRecord[]> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping generation history load');
    return [];
  }

  try {
    const db = getDatabase();
    const rows = await db.query<GenerationRecordRow>(
      `SELECT * FROM generation_records ORDER BY createdAt DESC`
    );

    return rows.map(rowToRecord);
  } catch (error) {
    console.error('Failed to load generation history from database:', error);
    return [];
  }
}

/**
 * Save a generation record to the database
 */
export async function saveGenerationRecordToDb(record: GenerationRecord): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping generation record save');
    return;
  }

  try {
    const db = getDatabase();
    const now = Date.now();

    await db.exec(
      `INSERT INTO generation_records (
        id, requestId, status, providerId, providerType, model, type,
        promptTemplateId, promptVersionId, brandId, renderedPrompt,
        variablesUsed, parametersUsed, inputTokens, outputTokens,
        costEstimateUsd, result, error, startedAt, completedAt,
        durationMs, providerRequestId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        result = excluded.result,
        error = excluded.error,
        completedAt = excluded.completedAt,
        durationMs = excluded.durationMs,
        inputTokens = excluded.inputTokens,
        outputTokens = excluded.outputTokens,
        costEstimateUsd = excluded.costEstimateUsd,
        updatedAt = excluded.updatedAt`,
      [
        record.id,
        record.requestId,
        record.status,
        record.providerId,
        record.providerType,
        record.model,
        record.type,
        record.promptTemplateId ?? null,
        record.promptVersionId ?? null,
        record.brandId ?? null,
        record.renderedPrompt,
        record.variablesUsed ? JSON.stringify(record.variablesUsed) : null,
        JSON.stringify(record.parametersUsed),
        record.inputTokens ?? null,
        record.outputTokens ?? null,
        record.costEstimateUsd ?? null,
        record.result ? JSON.stringify(record.result) : null,
        record.error ? JSON.stringify(record.error) : null,
        record.startedAt ?? null,
        record.completedAt ?? null,
        record.durationMs ?? null,
        record.providerRequestId ?? null,
        record.createdAt ?? now,
        now,
      ]
    );
  } catch (error) {
    console.error('Failed to save generation record to database:', error);
    throw error;
  }
}

/**
 * Delete a generation record from the database
 */
export async function deleteGenerationRecordFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping generation record delete');
    return;
  }

  try {
    const db = getDatabase();
    await db.exec(`DELETE FROM generation_records WHERE id = ?`, [id]);
  } catch (error) {
    console.error('Failed to delete generation record from database:', error);
    throw error;
  }
}

/**
 * Clear all generation records from the database
 */
export async function clearGenerationHistoryFromDb(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping generation history clear');
    return;
  }

  try {
    const db = getDatabase();
    await db.exec(`DELETE FROM generation_records`);
  } catch (error) {
    console.error('Failed to clear generation history from database:', error);
    throw error;
  }
}
