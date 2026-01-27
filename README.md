# ClaudeVision

An MCP (Model Context Protocol) server that enables Claude Code to take and analyze screenshots of your displays.

## Features

- **Multi-monitor support** - List and capture specific monitors
- **Window capture** - Capture specific application windows by title
- **Region capture** - Capture rectangular areas of the screen
- **Active window capture** - Capture the currently focused window
- **OCR text extraction** - Extract readable text from screenshots
- **Image processing** - Resize and compress screenshots
- **Delay timer** - Wait before capturing (for menus/tooltips)
- **Auto-cleanup** - Delete old screenshots to save space

## Installation

### Option 1: NPM Global Install (Recommended)

```bash
npm install -g claude-vision
```

Then add to Claude Code:

```bash
claude mcp add --transport stdio --scope user claude-vision -- claude-vision
```

### Option 2: NPX (No Install)

```bash
claude mcp add --transport stdio --scope user claude-vision -- npx claude-vision
```

### Option 3: From Source

```bash
git clone https://github.com/meltingpixelsai/claude-vision.git
cd claude-vision
npm install
npm run build
claude mcp add --transport stdio --scope user claude-vision -- node /path/to/claude-vision/build/index.js
```

## Usage

Once installed, Claude Code will have access to these tools:

### list_monitors
List all connected monitors with resolution and position.

```
User: "List my monitors"
Claude: You have 2 monitors:
  - Monitor 0 (PRIMARY): 2560x1440 at (0, 0)
  - Monitor 1: 1920x1080 at (2560, 0)
```

### screenshot
Capture a full monitor.

```
User: "Take a screenshot of my second monitor"
Claude: [captures monitor 1, saves to temp file]
        [reads the image and describes what it sees]
```

Parameters:
- `monitor` - Monitor ID (0, 1) or name ("primary")
- `resize` - Max dimension to resize to
- `quality` - Compression quality 1-100
- `delay` - Seconds to wait before capture

### screenshot_window
Capture a specific application window.

```
User: "Screenshot VS Code"
Claude: [captures the VS Code window]
```

Parameters:
- `title` - Window title to match (partial match)
- `resize` - Max dimension to resize to
- `quality` - Compression quality 1-100

### screenshot_region
Capture a rectangular area.

```
User: "Screenshot the top-left 800x600 of my screen"
Claude: [captures region (0, 0, 800, 600)]
```

Parameters:
- `x`, `y` - Top-left coordinates
- `width`, `height` - Size in pixels
- `monitor` - Which monitor's coordinate space

### screenshot_active
Capture the currently focused window.

```
User: "Screenshot whatever I'm looking at"
Claude: [captures the active window]
```

Parameters:
- `resize` - Max dimension to resize to
- `quality` - Compression quality 1-100
- `delay` - Seconds to wait (useful for menus)

### extract_text
OCR - Extract text from a screenshot.

```
User: "What does that error message say?"
Claude: [runs OCR on the screenshot]
        The error says: "Connection refused on port 3000"
```

Parameters:
- `image_path` - Path to screenshot file
- `language` - Language code (default "eng")

### cleanup
Delete screenshots when done.

```
User: "Clean up those screenshots"
Claude: Deleted 3 screenshots.
```

Parameters:
- `path` - Specific file to delete
- `all` - Delete all screenshots
- `older_than` - Delete screenshots older than N minutes

## Requirements

- Node.js 18 or later
- Windows, macOS, or Linux
- Claude Code CLI

## Privacy & Security

- Screenshots are saved to your system's temp directory
- No data is transmitted over the network
- Screenshots can capture sensitive information - be aware of what's visible
- Use the cleanup tool to delete screenshots when done

## Troubleshooting

### "No monitors detected"
- Make sure you're not in a headless environment
- On Linux, ensure X11 or Wayland is running

### "Could not detect active window"
- Make sure a window is focused
- On some systems, additional permissions may be required

### OCR not detecting text
- Try a different language parameter
- Ensure the text is large enough and clearly visible
- Very stylized fonts may not be recognized

## License

MIT License - see LICENSE file

## Author

Jeremy Harvey (@jdiamond)
