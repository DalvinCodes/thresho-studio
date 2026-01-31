/**
 * Diff Service
 * Text diff algorithm and utilities for comparing prompt versions
 */

export type DiffType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  type: DiffType;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

/**
 * Myers diff algorithm for finding the shortest edit script
 * Returns the Longest Common Subsequence (LCS) as indices
 */
function findLCS<T>(oldItems: T[], newItems: T[]): [number, number][] {
  const m = oldItems.length;
  const n = newItems.length;
  
  // Handle edge cases
  if (m === 0 || n === 0) return [];
  
  // Use dynamic programming to find LCS
  // We use a 2D array where dp[i][j] represents the length of LCS
  // for oldItems[0..i-1] and newItems[0..j-1]
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill the DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldItems[i - 1] === newItems[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find the LCS
  const lcs: [number, number][] = [];
  let i = m;
  let j = n;
  
  while (i > 0 && j > 0) {
    if (oldItems[i - 1] === newItems[j - 1]) {
      lcs.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * Compute diff between two arrays of lines
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // Handle empty strings
  if (oldText === '' && newText === '') {
    return { lines: [], addedCount: 0, removedCount: 0, unchangedCount: 0 };
  }
  if (oldText === '') {
    return {
      lines: newLines.map((content, idx) => ({
        type: 'added' as DiffType,
        newLineNumber: idx + 1,
        content,
      })),
      addedCount: newLines.length,
      removedCount: 0,
      unchangedCount: 0,
    };
  }
  if (newText === '') {
    return {
      lines: oldLines.map((content, idx) => ({
        type: 'removed' as DiffType,
        oldLineNumber: idx + 1,
        content,
      })),
      addedCount: 0,
      removedCount: oldLines.length,
      unchangedCount: 0,
    };
  }
  
  const lcs = findLCS(oldLines, newLines);
  const lines: DiffLine[] = [];
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx === lcs[lcsIdx][0] && newIdx === lcs[lcsIdx][1]) {
      // This line is in the LCS (unchanged)
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
        content: oldLines[oldIdx],
      });
      unchangedCount++;
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (lcsIdx < lcs.length && oldIdx < lcs[lcsIdx][0]) {
      // Line was removed (in old but not in LCS)
      lines.push({
        type: 'removed',
        oldLineNumber: oldIdx + 1,
        content: oldLines[oldIdx],
      });
      removedCount++;
      oldIdx++;
    } else if (lcsIdx < lcs.length && newIdx < lcs[lcsIdx][1]) {
      // Line was added (in new but not in LCS)
      lines.push({
        type: 'added',
        newLineNumber: newIdx + 1,
        content: newLines[newIdx],
      });
      addedCount++;
      newIdx++;
    } else {
      // We've passed all LCS entries, handle remaining lines
      while (oldIdx < oldLines.length) {
        lines.push({
          type: 'removed',
          oldLineNumber: oldIdx + 1,
          content: oldLines[oldIdx],
        });
        removedCount++;
        oldIdx++;
      }
      while (newIdx < newLines.length) {
        lines.push({
          type: 'added',
          newLineNumber: newIdx + 1,
          content: newLines[newIdx],
        });
        addedCount++;
        newIdx++;
      }
    }
  }
  
  return { lines, addedCount, removedCount, unchangedCount };
}

/**
 * Compute character-level diff for inline highlighting
 * Uses a simple word-based diff for better readability
 */
export function computeInlineDiff(oldText: string, newText: string): Array<{ type: DiffType; text: string }> {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: oldText }];
  }
  
  // Split into words and whitespace
  const tokenize = (text: string): string[] => {
    const tokens: string[] = [];
    let current = '';
    let inWord = false;
    
    for (const char of text) {
      const isWordChar = /\w/.test(char);
      if (isWordChar !== inWord && current) {
        tokens.push(current);
        current = '';
      }
      inWord = isWordChar;
      current += char;
    }
    if (current) tokens.push(current);
    return tokens;
  };
  
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const lcs = findLCS(oldTokens, newTokens);
  
  const result: Array<{ type: DiffType; text: string }> = [];
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  
  while (oldIdx < oldTokens.length || newIdx < newTokens.length) {
    if (lcsIdx < lcs.length && oldIdx === lcs[lcsIdx][0] && newIdx === lcs[lcsIdx][1]) {
      // Unchanged token
      if (result.length > 0 && result[result.length - 1].type === 'unchanged') {
        result[result.length - 1].text += oldTokens[oldIdx];
      } else {
        result.push({ type: 'unchanged', text: oldTokens[oldIdx] });
      }
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (lcsIdx >= lcs.length || oldIdx < lcs[lcsIdx][0]) {
      // Removed token
      if (result.length > 0 && result[result.length - 1].type === 'removed') {
        result[result.length - 1].text += oldTokens[oldIdx];
      } else {
        result.push({ type: 'removed', text: oldTokens[oldIdx] });
      }
      oldIdx++;
    } else {
      // Added token
      if (result.length > 0 && result[result.length - 1].type === 'added') {
        result[result.length - 1].text += newTokens[newIdx];
      } else {
        result.push({ type: 'added', text: newTokens[newIdx] });
      }
      newIdx++;
    }
  }
  
  return result;
}

/**
 * Compare two arrays and return detailed diff
 */
export function compareArrays<T>(
  oldArray: T[],
  newArray: T[],
  keyFn: (item: T) => string
): {
  added: T[];
  removed: T[];
  unchanged: T[];
  modified: Array<{ old: T; new: T }>;
} {
  const oldMap = new Map(oldArray.map(item => [keyFn(item), item]));
  const newMap = new Map(newArray.map(item => [keyFn(item), item]));
  
  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];
  const modified: Array<{ old: T; new: T }> = [];
  
  // Find added and modified
  for (const [key, newItem] of newMap) {
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      added.push(newItem);
    } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      modified.push({ old: oldItem, new: newItem });
    } else {
      unchanged.push(newItem);
    }
  }
  
  // Find removed
  for (const [key, oldItem] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(oldItem);
    }
  }
  
  return { added, removed, unchanged, modified };
}
