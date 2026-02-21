import { Screenshots } from 'node-screenshots';
import { execSync } from 'child_process';

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
  displayDevice?: string;
  position?: string;
}

interface WindowsDisplayInfo {
  device: string;
  x: number;
  y: number;
  width: number;
  height: number;
  primary: boolean;
}

/** Cached Windows display info — refreshed on each getAllMonitors() call */
let windowsDisplayCache: WindowsDisplayInfo[] | null = null;

/**
 * Query Windows display settings via PowerShell.
 * Returns display device names, positions, and primary status.
 */
function getWindowsDisplayInfo(): WindowsDisplayInfo[] {
  if (process.platform !== 'win32') return [];
  try {
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
        "$($_.DeviceName)|$($_.Bounds.X)|$($_.Bounds.Y)|$($_.Bounds.Width)|$($_.Bounds.Height)|$($_.Primary)"
      }
    `.trim();
    const output = execSync(`powershell.exe -NoProfile -Command "${ps.replace(/\n/g, '; ')}"`, {
      timeout: 5000,
      encoding: 'utf8',
    });
    const displays: WindowsDisplayInfo[] = [];
    for (const line of output.trim().split('\n')) {
      const parts = line.trim().split('|');
      if (parts.length >= 6) {
        displays.push({
          device: parts[0],
          x: parseInt(parts[1], 10),
          y: parseInt(parts[2], 10),
          width: parseInt(parts[3], 10),
          height: parseInt(parts[4], 10),
          primary: parts[5] === 'True',
        });
      }
    }
    return displays;
  } catch {
    return [];
  }
}

/**
 * Match a node-screenshots monitor to a Windows display by position coordinates.
 */
function matchWindowsDisplay(
  monitor: { x: number; y: number; width: number; height: number },
  displays: WindowsDisplayInfo[]
): WindowsDisplayInfo | null {
  for (const d of displays) {
    if (d.x === monitor.x && d.y === monitor.y) {
      return d;
    }
  }
  return null;
}

/**
 * Get a human-readable position label based on x coordinate relative to primary.
 */
function getPositionLabel(x: number, isPrimary: boolean): string {
  if (isPrimary) return 'center';
  if (x < 0) return 'left';
  return 'right';
}

/**
 * Get all connected monitors with Windows display info.
 * IDs match Windows Display Settings numbers (1, 2, 3, etc.).
 */
export function getAllMonitors(): MonitorInfo[] {
  const monitors = Screenshots.all();
  windowsDisplayCache = getWindowsDisplayInfo();

  return monitors.map((monitor: Screenshots, index: number) => {
    const winDisplay = matchWindowsDisplay(
      { x: monitor.x, y: monitor.y, width: monitor.width, height: monitor.height },
      windowsDisplayCache!
    );
    const isPrimary = winDisplay ? winDisplay.primary : index === 0;
    const deviceName = winDisplay?.device ?? `\\\\?\\DISPLAY${index + 1}`;
    // Extract display number from device name (e.g., \\.\DISPLAY2 -> 2)
    const displayNum = parseInt(deviceName.match(/(\d+)/)?.[1] ?? String(index + 1), 10);

    return {
      id: displayNum,
      name: `Display ${displayNum}${isPrimary ? ' (Primary)' : ''}`,
      resolution: `${monitor.width}x${monitor.height}`,
      width: monitor.width,
      height: monitor.height,
      x: monitor.x,
      y: monitor.y,
      scaleFactor: monitor.scale,
      isPrimary,
      displayDevice: deviceName,
      position: getPositionLabel(monitor.x, isPrimary),
    };
  });
}

/**
 * Find the Screenshots object matching a MonitorInfo by position.
 */
function findScreenshotsByPosition(monitors: Screenshots[], info: MonitorInfo): Screenshots | null {
  return monitors.find((m: Screenshots) => m.x === info.x && m.y === info.y) || null;
}

/**
 * Get a specific monitor by Windows display number or name.
 * Numbers match Windows Display Settings (1, 2, 3, etc.).
 */
export function getMonitor(identifier: number | string): Screenshots | null {
  const monitors = Screenshots.all();
  const allInfo = getAllMonitors();

  // Handle string identifiers
  if (typeof identifier === 'string') {
    const lower = identifier.toLowerCase();

    if (lower === 'primary' || lower === 'main' || lower === '0') {
      const primary = allInfo.find(m => m.isPrimary) || allInfo[0];
      return primary ? findScreenshotsByPosition(monitors, primary) : monitors[0] || null;
    }

    // Extract number from string ("1", "2", "display1", "monitor2", etc.)
    const numMatch = lower.match(/(\d+)/);
    if (numMatch) {
      const displayNum = parseInt(numMatch[1], 10);
      const match = allInfo.find(m => m.id === displayNum);
      if (match) return findScreenshotsByPosition(monitors, match);
    }

    return null;
  }

  // Number 0: treat as "primary" for backward compatibility (default param)
  if (identifier === 0) {
    const primary = allInfo.find(m => m.isPrimary) || allInfo[0];
    return primary ? findScreenshotsByPosition(monitors, primary) : monitors[0] || null;
  }

  // Number: treat as Windows display number
  const match = allInfo.find(m => m.id === identifier);
  if (match) return findScreenshotsByPosition(monitors, match);

  return null;
}

/**
 * Get the array index of a monitor by Windows display number or name.
 * Returns the node-screenshots array index for the matching monitor.
 */
export function getMonitorIndex(identifier: number | string): number {
  const monitors = Screenshots.all();
  const target = getMonitor(identifier);
  if (!target) return -1;
  return monitors.findIndex((m: Screenshots) => m.x === target.x && m.y === target.y);
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
