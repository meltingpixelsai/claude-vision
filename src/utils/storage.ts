import { mkdirSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SCREENSHOT_DIR = join(tmpdir(), 'claude-vision');

/**
 * Get the screenshot storage directory, creating it if needed
 */
export function getScreenshotDir(): string {
  if (!existsSync(SCREENSHOT_DIR)) {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  return SCREENSHOT_DIR;
}

/**
 * Generate a unique filename for a screenshot
 */
export function generateFilename(prefix: string = 'screenshot'): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .replace(/\..+/, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.png`;
}

/**
 * Get full path for a new screenshot
 */
export function getScreenshotPath(prefix: string = 'screenshot'): string {
  return join(getScreenshotDir(), generateFilename(prefix));
}

/**
 * Delete a specific screenshot file
 */
export function deleteScreenshot(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Delete all screenshots in the temp directory
 */
export function deleteAllScreenshots(): string[] {
  const deleted: string[] = [];
  const dir = getScreenshotDir();

  if (!existsSync(dir)) return deleted;

  const files = readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.png') || file.endsWith('.jpg')) {
      const filePath = join(dir, file);
      if (deleteScreenshot(filePath)) {
        deleted.push(file);
      }
    }
  }
  return deleted;
}

/**
 * Delete screenshots older than specified minutes
 */
export function deleteOldScreenshots(olderThanMinutes: number): string[] {
  const deleted: string[] = [];
  const dir = getScreenshotDir();
  const cutoff = Date.now() - (olderThanMinutes * 60 * 1000);

  if (!existsSync(dir)) return deleted;

  const files = readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.png') || file.endsWith('.jpg')) {
      const filePath = join(dir, file);
      try {
        const stats = statSync(filePath);
        if (stats.mtimeMs < cutoff) {
          if (deleteScreenshot(filePath)) {
            deleted.push(file);
          }
        }
      } catch {
        // Skip files we can't stat
      }
    }
  }
  return deleted;
}

/**
 * List all screenshots in the temp directory
 */
export function listScreenshots(): { name: string; path: string; size: number; modified: Date }[] {
  const dir = getScreenshotDir();

  if (!existsSync(dir)) return [];

  const files = readdirSync(dir);
  return files
    .filter(file => file.endsWith('.png') || file.endsWith('.jpg'))
    .map(file => {
      const filePath = join(dir, file);
      const stats = statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}
