import { z } from 'zod';
import { writeFileSync } from 'fs';
import { Screenshots } from 'node-screenshots';
import { processImage, cropImage } from '../utils/image.js';
import { getScreenshotPath } from '../utils/storage.js';
import { getActiveWindow, sleep } from '../utils/windows.js';

export const screenshotActiveSchema = z.object({
  resize: z.number().optional()
    .describe('Maximum dimension (width or height) to resize to.'),
  quality: z.number().min(1).max(100).optional().default(80)
    .describe('Image quality 1-100. Default 80.'),
  delay: z.number().min(0).max(30).optional()
    .describe('Seconds to wait before capturing. Useful for menus/tooltips/dropdowns.')
});

export const screenshotActiveDescription =
  'Capture the currently focused/active window. ' +
  'Use the delay parameter to capture menus or tooltips that appear on hover. ' +
  'Returns the file path which can be viewed using the Read tool.';

export type ScreenshotActiveParams = z.infer<typeof screenshotActiveSchema>;

export async function screenshotActive(params: ScreenshotActiveParams) {
  try {
    const { resize, quality, delay } = params;

    // Wait if delay specified
    if (delay && delay > 0) {
      await sleep(delay * 1000);
    }

    // Get active window info
    const activeWindow = await getActiveWindow();

    if (!activeWindow) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Could not detect active window. Make sure a window is focused.'
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
    const safeTitle = activeWindow.title.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const filePath = getScreenshotPath(`active_${safeTitle}`);
    writeFileSync(filePath, imageBuffer);

    return {
      content: [{
        type: 'text' as const,
        text: `Screenshot of active window "${activeWindow.title}" saved to: ${filePath}\n\nUse the Read tool to view this image.`
      }],
      filePath: filePath,
      windowTitle: activeWindow.title,
      windowBounds: activeWindow.bounds
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to capture active window: ${message}`
      }],
      isError: true
    };
  }
}
