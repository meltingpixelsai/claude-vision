import { z } from 'zod';
import {
  deleteScreenshot,
  deleteAllScreenshots,
  deleteOldScreenshots,
  listScreenshots,
  getScreenshotDir
} from '../utils/storage.js';

export const cleanupSchema = z.object({
  path: z.string().optional()
    .describe('Specific file path to delete. If not provided, use "all" or "older_than".'),
  all: z.boolean().optional()
    .describe('Delete all screenshots in the temp folder.'),
  older_than: z.number().optional()
    .describe('Delete screenshots older than this many minutes.')
});

export const cleanupDescription =
  'Delete screenshots that are no longer needed. ' +
  'Can delete a specific file, all screenshots, or screenshots older than N minutes. ' +
  'Helps manage disk space and remove sensitive screenshots.';

export type CleanupParams = z.infer<typeof cleanupSchema>;

export async function cleanup(params: CleanupParams) {
  try {
    const { path, all, older_than } = params;

    // Delete specific file
    if (path) {
      const success = deleteScreenshot(path);
      if (success) {
        return {
          content: [{
            type: 'text' as const,
            text: `Deleted: ${path}`
          }],
          deleted: [path]
        };
      } else {
        return {
          content: [{
            type: 'text' as const,
            text: `File not found or could not be deleted: ${path}`
          }],
          isError: true
        };
      }
    }

    // Delete all screenshots
    if (all) {
      const deleted = deleteAllScreenshots();
      if (deleted.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No screenshots to delete in ${getScreenshotDir()}`
          }],
          deleted: []
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Deleted ${deleted.length} screenshot(s):\n${deleted.map(f => `  - ${f}`).join('\n')}`
        }],
        deleted: deleted
      };
    }

    // Delete old screenshots
    if (older_than !== undefined) {
      const deleted = deleteOldScreenshots(older_than);
      if (deleted.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No screenshots older than ${older_than} minutes found.`
          }],
          deleted: []
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Deleted ${deleted.length} screenshot(s) older than ${older_than} minutes:\n${deleted.map(f => `  - ${f}`).join('\n')}`
        }],
        deleted: deleted
      };
    }

    // No action specified - list current screenshots
    const screenshots = listScreenshots();
    if (screenshots.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No screenshots in ${getScreenshotDir()}\n\nUse cleanup with:\n- path: "file.png" to delete a specific file\n- all: true to delete all screenshots\n- older_than: 30 to delete screenshots older than 30 minutes`
        }]
      };
    }

    const list = screenshots.map(s => {
      const sizeKB = Math.round(s.size / 1024);
      const age = Math.round((Date.now() - s.modified.getTime()) / 60000);
      return `  - ${s.name} (${sizeKB}KB, ${age}min ago)`;
    }).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${screenshots.length} screenshot(s) in ${getScreenshotDir()}:\n${list}\n\nUse cleanup with:\n- path: "file.png" to delete a specific file\n- all: true to delete all screenshots\n- older_than: 30 to delete screenshots older than 30 minutes`
      }],
      screenshots: screenshots
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Cleanup failed: ${message}`
      }],
      isError: true
    };
  }
}
