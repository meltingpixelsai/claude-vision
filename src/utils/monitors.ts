import { Screenshots } from 'node-screenshots';

export interface MonitorInfo {
  id: number;
  name: string;
  resolution: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
  isPrimary: boolean;
}

/**
 * Get all connected monitors
 */
export function getAllMonitors(): MonitorInfo[] {
  const monitors = Screenshots.all();

  return monitors.map((monitor: Screenshots, index: number) => ({
    id: index,
    name: `Display ${index + 1}`,
    resolution: `${monitor.width}x${monitor.height}`,
    width: monitor.width,
    height: monitor.height,
    x: monitor.x,
    y: monitor.y,
    scaleFactor: monitor.scale,
    isPrimary: index === 0 // First monitor is typically primary
  }));
}

/**
 * Get a specific monitor by ID or name
 */
export function getMonitor(identifier: number | string): Screenshots | null {
  const monitors = Screenshots.all();

  if (typeof identifier === 'number') {
    return monitors[identifier] || null;
  }

  // Handle string identifiers
  const lower = identifier.toLowerCase();

  if (lower === 'primary' || lower === 'main') {
    return monitors[0] || null;
  }

  // Try to match by display number (e.g., "display1", "monitor2")
  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10) - 1; // Convert to 0-indexed
    if (num >= 0 && num < monitors.length) {
      return monitors[num];
    }
  }

  return null;
}

/**
 * Get the monitor index
 */
export function getMonitorIndex(identifier: number | string): number {
  const monitors = Screenshots.all();

  if (typeof identifier === 'number') {
    return identifier < monitors.length ? identifier : -1;
  }

  const lower = identifier.toLowerCase();

  if (lower === 'primary' || lower === 'main') {
    return 0;
  }

  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10) - 1;
    if (num >= 0 && num < monitors.length) {
      return num;
    }
  }

  return -1;
}

/**
 * Capture a screenshot of a specific monitor
 */
export function captureMonitor(monitor: Screenshots): Buffer {
  const buffer = monitor.captureSync();
  if (!buffer) {
    throw new Error('Failed to capture screenshot');
  }
  return buffer;
}

/**
 * Capture a region of a monitor (returns full monitor, crop with sharp)
 */
export function captureRegion(
  monitor: Screenshots,
  _x: number,
  _y: number,
  _width: number,
  _height: number
): Buffer {
  const buffer = monitor.captureSync();
  if (!buffer) {
    throw new Error('Failed to capture screenshot');
  }
  // node-screenshots returns the full monitor, we'll crop with sharp
  return buffer;
}
