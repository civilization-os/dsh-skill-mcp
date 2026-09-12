---
name: extension-management
description: Manage custom Skill directories and Model Context Protocol (MCP) server configurations (stdio, streamable-http, sse) in DeepSeek Harness.
---

# Extension management (Skills & MCP)

The `dsh-skill-mcp` plugin manages custom Skill directories and external Model Context Protocol (MCP) servers in DeepSeek Harness (DSH).

When the user asks how to configure MCP servers or add custom Skill roots, describe the available tools and configuration schemas directly without probing the workspace.

## Core Management Tools

1. **`extensions_list`**:
   - Lists all managed Skill sources and MCP configurations along with their enabled/disabled state and transport type.
   - Note: An enabled state indicates authorization in configuration, not necessarily active connection health.

2. **`extensions_inspect`**:
   - Inspects the actual Skill catalog currently snapshot for the caller and all visible MCP tools (`mcp__*`).
   - Requires `cwd`. Zero discovered tools does not automatically mean connection failure (servers may still be discovering or starting).

3. **`extensions_add_skill`**:
   - Adds an existing directory containing skill folders (each containing a `SKILL.md`).
   - Parameters: `id` (unique internal identifier) and `directory` (absolute local path).
   - Added sources are created disabled by default; call `extensions_set_enabled` to activate.

4. **`extensions_add_mcp`**:
   - Adds a new MCP server configuration (created disabled by default).
   - Parameters: `id` and `configuration` (JSON string).
   - Supported transport configurations:
     - **`stdio`**:
       ```json
       {
         "transport": "stdio",
         "command": "node",
         "args": ["D:/path/to/server.js"],
         "cwd": "D:/path/to"
       }
       ```
     - **`streamable-http`**:
       ```json
       {
         "transport": "streamable-http",
         "url": "http://127.0.0.1:9000/mcp"
       }
       ```
     - **`sse`** (legacy SSE transport):
       ```json
       {
         "transport": "sse",
         "url": "http://127.0.0.1:9000/sse"
       }
       ```
   - **Security rules**:
     - Never supply plain-text API secrets, passwords, or authentication tokens in parameters or URLs.
     - URLs with user credentials or access tokens are strictly rejected.

5. **`extensions_set_enabled`**:
   - Toggles an extension (`id` and `enabled: true|false`).
   - Enabling a stdio server authorizes its executable to run when the DSH profile reloads.

6. **`extensions_update_skill`** & **`extensions_update_mcp`**:
   - Modifies existing Skill directory paths or updates MCP connection configurations while preserving the existing ID and enabled status.

7. **`extensions_remove`**:
   - Removes a managed configuration. Removing a Skill source removes its registration in DSH; it does NOT delete any files from the disk.

## Recommended Workflows

- **Adding a new MCP server**:
  1. Call `extensions_list` to check existing IDs and prevent duplicate names.
  2. Call `extensions_add_mcp` with a descriptive ID and valid JSON configuration.
  3. Call `extensions_set_enabled` with `enabled: true`.
  4. Inform the user that the configuration has been saved to the profile patch and tools will become available upon reload.
- **Mounting custom skills**:
  1. Verify the target directory contains valid Skill folders with `SKILL.md`.
  2. Call `extensions_add_skill` with an explicit ID.
  3. Call `extensions_set_enabled` to activate.
