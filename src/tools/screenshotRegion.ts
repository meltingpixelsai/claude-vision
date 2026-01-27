import { z } from 'zod';
import { writeFileSync } from 'fs';
import { Screenshots } from 'node-screenshots';
import { cropImage } from '../utils/image.js';
import { getScreenshotPath } from '../utils/storage.js';
import { getAllMonitors } from '../utils/monitors.js';

export const screenshotRegionSchema = z.object({
  x: z.number().describe('Left coordinate of the region'),
  y: z.number().describe('Top coordinate of the region'),
  width: z.number().min(1).describe('Width of the region in pixels'),
  height: z.number().min(1).describe('Height of the region in pixels'),
  monitor: z.number().optional().default(0)
    .describe('Monitor index for coordinate space (default 0)')
});

export const screenshotRegionDescription =
  'Capture a rectangular region of the screen. ' +
  'Coordinates are relative to the specified monitor. ' +
  'Returns the file path which can be viewed using the Read tool.';

export type ScreenshotRegionParams = z.infer<typeof screenshotRegionSchema>;

export async function screenshotRegion(params: ScreenshotRegionParams) {
  try {
    const { x, y, width, height, monitor: monitorIndex } = params;

    const monitors = Screenshots.all();
    if (monitorIndex >= monitors.length) {
      const available = getAllMonitors();
      const list = available.map(m => `${m.id}: ${m.resolution}`).join(', ');
      return {
        content: [{
          type: 'text' as const,
          text: `Monitor ${monitorIndex} not found. Available monitors: ${list}`
        }],
        isError: true
      };
    }

    const targetMonitor = monitors[monitorIndex];

    // Validate region bounds
    if (x < 0 || y < 0 || x + width > targetMonitor.width || y + height > targetMonitor.height) {
      return {
        content: [{
          type: 'text' as const,
          text: `Region (${x}, ${y}, ${width}x${height}) exceeds monitor bounds (${targetMonitor.width}x${targetMonitor.height}). ` +
                `Please adjust the coordinates.`
        }],
        isError: true
      };
    }

    // Capture the full monitor
    const capturedBuffer = targetMonitor.captureSync();
    if (!capturedBuffer) {
      throw new Error('Failed to capture screenshot');
    }
    let imageBuffer = capturedBuffer;

    // Crop to specified region
    imageBuffer = await cropImage(imageBuffer, x, y, width, height);

    // Save to temp directory
    const filePath = getScreenshotPath(`region_${x}_${y}_${width}x${height}`);
    writeFileSync(filePath, imageBuffer);

    return {
      content: [{
        type: 'text' as const,
        text: `Screenshot of region (${x}, ${y}, ${width}x${height}) saved to: ${filePath}\n\nUse the Read tool to view this image.`
      }],
      filePath: filePath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to capture region: ${message}`
      }],
      isError: true
    };
  }
}
