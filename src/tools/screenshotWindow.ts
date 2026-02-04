import { z } from 'zod';
import { writeFileSync } from 'fs';
import { Screenshots } from 'node-screenshots';
import { processImage, cropImage } from '../utils/image.js';
import { getScreenshotPath, checkAndCleanupIfNeeded } from '../utils/storage.js';
import { getActiveWindow } from '../utils/windows.js';

export const screenshotWindowSchema = z.object({
  title: z.string()
    .describe('Window title to match (partial match supported). E.g., "Visual Studio Code", "Chrome".'),
  resize: z.number().optional()
    .describe('Maximum dimension (width or height) to resize to.'),
  quality: z.number().min(1).max(100).optional().default(80)
    .describe('Image quality 1-100. Default 80.')
});

export const screenshotWindowDescription =
  'Capture a screenshot of a specific application window by its title. ' +
  'Currently captures the active window if it matches the title. ' +
  'Returns the file path which can be viewed using the Read tool.';

export type ScreenshotWindowParams = z.infer<typeof screenshotWindowSchema>;

export async function screenshotWindow(params: ScreenshotWindowParams) {
  try {
    const { title, resize, quality } = params;

    // Get active window info
    const activeWindow = await getActiveWindow();

    if (!activeWindow) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Could not detect active window. Make sure the window is visible and focused.'
        }],
        isError: true
      };
    }

    // Check if active window matches the title
    if (!activeWindow.title.toLowerCase().includes(title.toLowerCase())) {
      return {
        content: [{
          type: 'text' as const,
          text: `Active window "${activeWindow.title}" does not match "${title}". ` +
                `Please focus the window you want to capture and try again, or use screenshot_active to capture the currently focused window.`
        }],
        isError: true
      };
    }

    // Find which monitor contains this window
    const monitors = Screenshots.all();
    let targetMonitor = monitors[0];

    for (const monitor of monitors) {
      const windowCenterX = activeWindow.bounds.x + activeWindow.bounds.width / 2;
      const windowCenterY = activeWindow.bounds.y + activeWindow.bounds.height / 2;

      if (
        windowCenterX >= monitor.x &&
        windowCenterX < monitor.x + monitor.width &&
        windowCenterY >= monitor.y &&
        windowCenterY < monitor.y + monitor.height
      ) {
        targetMonitor = monitor;
        break;
      }
    }

    // Capture the full monitor
    const capturedBuffer = targetMonitor.captureSync();
    if (!capturedBuffer) {
      throw new Error('Failed to capture screenshot');
    }
    let imageBuffer = capturedBuffer;

    // Crop to window bounds (relative to monitor)
    const cropX = activeWindow.bounds.x - targetMonitor.x;
    const cropY = activeWindow.bounds.y - targetMonitor.y;

    // Ensure crop bounds are within monitor
    const finalX = Math.max(0, cropX);
    const finalY = Math.max(0, cropY);
    const finalWidth = Math.min(activeWindow.bounds.width, targetMonitor.width - finalX);
    const finalHeight = Math.min(activeWindow.bounds.height, targetMonitor.height - finalY);

    if (finalWidth > 0 && finalHeight > 0) {
      imageBuffer = await cropImage(imageBuffer, finalX, finalY, finalWidth, finalHeight);
    }

    // Process image (resize/compress if requested)
    if (resize || quality !== 80) {
      imageBuffer = await processImage(imageBuffer, { resize, quality });
    }

    // Save to temp directory
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const filePath = getScreenshotPath(`window_${safeTitle}`);
    writeFileSync(filePath, imageBuffer);

    // Auto-cleanup: delete all screenshots if 10 or more exist
    const cleanup = checkAndCleanupIfNeeded();

    let message = `Screenshot of "${activeWindow.title}" saved to: ${filePath}\n\nUse the Read tool to view this image.`;
    if (cleanup.cleaned) {
      message += `\n\n(Auto-cleanup: deleted ${cleanup.deleted.length} screenshots - limit of 10 reached)`;
    }

    return {
      content: [{
        type: 'text' as const,
        text: message
      }],
      filePath: filePath,
      windowTitle: activeWindow.title
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to capture window: ${message}`
      }],
      isError: true
    };
  }
}
