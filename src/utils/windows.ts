import { activeWindow as getActiveWin } from 'active-win';

export interface WindowInfo {
  title: string;
  owner: {
    name: string;
    processId: number;
    path?: string;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Get the currently active/focused window
 */
export async function getActiveWindow(): Promise<WindowInfo | null> {
  try {
    const result = await getActiveWin();
    if (!result) return null;

    return {
      title: result.title,
      owner: {
        name: result.owner.name,
        processId: result.owner.processId,
        path: result.owner.path
      },
      bounds: {
        x: result.bounds.x,
        y: result.bounds.y,
        width: result.bounds.width,
        height: result.bounds.height
      }
    };
  } catch {
    return null;
  }
}

/**
 * Find a window by title (partial match)
 * Note: This uses the active window detection - for full window enumeration
 * on Windows, additional native bindings would be needed
 */
export async function findWindowByTitle(title: string): Promise<WindowInfo | null> {
  // For now, we can only get the active window
  // Full window enumeration requires platform-specific native bindings
  const active = await getActiveWindow();
  if (active && active.title.toLowerCase().includes(title.toLowerCase())) {
    return active;
  }
  return null;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
