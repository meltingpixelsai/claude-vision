#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import tools
import { listMonitors, listMonitorsSchema, listMonitorsDescription } from './tools/listMonitors.js';
import { screenshot, screenshotSchema, screenshotDescription } from './tools/screenshot.js';
import { screenshotWindow, screenshotWindowSchema, screenshotWindowDescription } from './tools/screenshotWindow.js';
import { screenshotRegion, screenshotRegionSchema, screenshotRegionDescription } from './tools/screenshotRegion.js';
import { screenshotActive, screenshotActiveSchema, screenshotActiveDescription } from './tools/screenshotActive.js';
import { extractText, extractTextSchema, extractTextDescription } from './tools/extractText.js';
import { cleanup, cleanupSchema, cleanupDescription } from './tools/cleanup.js';

// Create the MCP server
const server = new McpServer({
  name: 'claude-vision',
  version: '1.0.0'
});

// Register list_monitors tool
server.tool(
  'list_monitors',
  listMonitorsDescription,
  listMonitorsSchema.shape,
  async () => {
    return await listMonitors();
  }
);

// Register screenshot tool
server.tool(
  'screenshot',
  screenshotDescription,
  screenshotSchema.shape,
  async (params) => {
    const validated = screenshotSchema.parse(params);
    return await screenshot(validated);
  }
);

// Register screenshot_window tool
server.tool(
  'screenshot_window',
  screenshotWindowDescription,
  screenshotWindowSchema.shape,
  async (params) => {
    const validated = screenshotWindowSchema.parse(params);
    return await screenshotWindow(validated);
  }
);

// Register screenshot_region tool
server.tool(
  'screenshot_region',
  screenshotRegionDescription,
  screenshotRegionSchema.shape,
  async (params) => {
    const validated = screenshotRegionSchema.parse(params);
    return await screenshotRegion(validated);
  }
);

// Register screenshot_active tool
server.tool(
  'screenshot_active',
  screenshotActiveDescription,
  screenshotActiveSchema.shape,
  async (params) => {
    const validated = screenshotActiveSchema.parse(params);
    return await screenshotActive(validated);
  }
);

// Register extract_text tool
server.tool(
  'extract_text',
  extractTextDescription,
  extractTextSchema.shape,
  async (params) => {
    const validated = extractTextSchema.parse(params);
    return await extractText(validated);
  }
);

// Register cleanup tool
server.tool(
  'cleanup',
  cleanupDescription,
  cleanupSchema.shape,
  async (params) => {
    const validated = cleanupSchema.parse(params);
    return await cleanup(validated);
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
