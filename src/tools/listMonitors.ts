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

    // Sort by x position for layout display
    const sorted = [...monitors].sort((a, b) => a.x - b.x);
    const layout = sorted.map(m => `${m.id}`).join(' | ');

    const monitorList = monitors.map(m => {
      const primary = m.isPrimary ? ' (PRIMARY)' : '';
      const pos = m.position ? ` [${m.position}]` : '';
      return `  - Monitor ${m.id}${primary}: ${m.name} - ${m.resolution} at (${m.x}, ${m.y})${pos}`;
    }).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${monitors.length} monitor(s):\n${monitorList}\n\nLayout (left to right): ${layout}\n\nUse Windows display number (${monitors.map(m => m.id).join(', ')}) or "primary" with the screenshot tool. Numbers match Windows Display Settings.`
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
