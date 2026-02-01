import { test as base, expect } from '@playwright/test';
import type { TestDatabase } from './database';
import { createTestDatabase, deleteTestDatabase } from './database';

export interface TestFixtures {
  testId: string;
  testDb: TestDatabase;
}

let testCounter = 0;

function generateTestId(): string {
  const timestamp = Date.now();
  const counter = ++testCounter;
  return `test-${timestamp}-${counter}`;
}

export const test = base.extend<TestFixtures>({
  testId: async ({}, use) => {
    const testId = generateTestId();
    await use(testId);
  },
  
  testDb: async ({ testId }, use) => {
    const db = await createTestDatabase(testId);
    await use(db);
    await db.close();
    await deleteTestDatabase(testId);
  }
});

export { expect };
