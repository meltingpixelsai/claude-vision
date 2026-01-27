import { z } from 'zod';
import { writeFileSync } from 'fs';
import { getMonitor, captureMonitor, getAllMonitors } from '../utils/monitors.js';
import { processImage } from '../utils/image.js';
import { getScreenshotPath } from '../utils/storage.js';
import { sleep } from '../utils/windows.js';

export const screenshotSchema = z.object({
  monitor: z.union([z.number(), z.string()]).optional().default(0)
    .describe('Monitor ID (0, 1, etc.) or name ("primary", "display1"). Defaults to 0.'),
  resize: z.number().optional()
    .describe('Maximum dimension (width or height) to resize to. E.g., 1920 for HD.'),
  quality: z.number().min(1).max(100).optional().default(80)
    .describe('Image quality 1-100. Lower = smaller file. Default 80.'),
  delay: z.number().min(0).max(30).optional()
    .describe('Seconds to wait before capturing. Useful for menus/tooltips.')
});

export const screenshotDescription =
  'Capture a screenshot of a specific monitor. ' +
  'Returns the file path which can be viewed using the Read tool. ' +
  'Use list_monitors first to see available displays.';

export type ScreenshotParams = z.infer<typeof screenshotSchema>;

export async function screenshot(params: ScreenshotParams) {
  try {
    const { monitor: monitorId, resize, quality, delay } = params;

    // Wait if delay specified
    if (delay && delay > 0) {
      await sleep(delay * 1000);
    }

    // Get the monitor
    const monitor = getMonitor(monitorId);
    if (!monitor) {
      const available = getAllMonitors();
      const list = available.map(m => `${m.id}: ${m.resolution}`).join(', ');
      return {
        content: [{
          type: 'text' as const,
          text: `Monitor "${monitorId}" not found. Available monitors: ${list}`
        }],
        isError: true
      };
    }

    // Capture the screenshot
    let imageBuffer = captureMonitor(monitor);

    // Process image (resize/compress if requested)
    if (resize || quality !== 80) {
      imageBuffer = await processImage(imageBuffer, { resize, quality });
    }

    // Save to temp directory
    const filePath = getScreenshotPath(`monitor${typeof monitorId === 'number' ? monitorId : 0}`);
    writeFileSync(filePath, imageBuffer);

    return {
      content: [{
        type: 'text' as const,
        text: `Screenshot saved to: ${filePath}\n\nUse the Read tool to view this image.`
      }],
      filePath: filePath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to capture screenshot: ${message}`
      }],
      isError: true
    };
  }
}
