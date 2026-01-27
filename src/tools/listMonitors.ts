import { z } from 'zod';
import { getAllMonitors } from '../utils/monitors.js';

export const listMonitorsSchema = z.object({});

export const listMonitorsDescription =
  'List all connected monitors with their resolution, position, and configuration. ' +
  'Use this to see available displays before taking a screenshot.';

export async function listMonitors() {
  try {
    const monitors = getAllMonitors();

    if (monitors.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No monitors detected. This may indicate a permission issue or headless environment.'
        }]
      };
    }

    const monitorList = monitors.map(m => {
      const primary = m.isPrimary ? ' (PRIMARY)' : '';
      return `  - Monitor ${m.id}${primary}: ${m.resolution} at position (${m.x}, ${m.y})`;
    }).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${monitors.length} monitor(s):\n${monitorList}\n\nUse monitor ID (0, 1, etc.) or "primary" with the screenshot tool.`
      }],
      monitors: monitors
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to enumerate monitors: ${message}`
      }],
      isError: true
    };
  }
}
