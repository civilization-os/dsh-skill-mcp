/** Plugin tool discovery, classification, and execution takeover management. */

/**
 * Tool names shipped by the Harness runtime itself, verified against the
 * `dsh-tool-*`/`dsh-schedule` packages of DSH 0.2.0-rc.2. Core tools are listed,
 * grouped as `Builtin`, and protected from execution takeover, so a stale entry
 * here is a correctness bug rather than cosmetics: unknown core tools would be
 * labelled as plugins and become disableable. Refresh this set when a Harness
 * release adds or renames a bundled tool.
 */
const builtinToolNames = new Set([
  'ask_user_question', 'bash', 'pwsh', 'read', 'read_image', 'write', 'edit', 'str_replace_editor',
  'glob', 'grep', 'present', 'skill', 'todo_write',
  'create_goal', 'get_goal', 'update_goal',
  'job_list', 'job_output', 'job_kill',
  'subagent', 'subagent_fork', 'list_agents', 'list_subagent_models', 'send_message', 'interrupt_agent',
  'web_fetch', 'web_search', 'load_workspace_dependencies', 'ralph', 'workflow',
  'schedule_create', 'schedule_delete', 'schedule_list', 'schedule_update',
  'cordis_inspect_list', 'cordis_inspect_query',
])

/**
 * Infer the plugin or category group for a given tool name.
 * @param {string} toolName
 * @returns {{ id: string, name: string, isPlugin: boolean }}
 */
export function classifyTool(toolName) {
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__')
    const serverName = parts[1] || 'unknown'
    return {
      id: `mcp-${serverName}`,
      name: `MCP 服务: ${serverName}`,
      isPlugin: true,
    }
  }

  if (toolName.startsWith('session_') && toolName.includes('autotask')) {
    return {
      id: 'dsh-autotask',
      name: '自动任务巡检 (dsh-autotask)',
      isPlugin: true,
    }
  }

  if (toolName.startsWith('drawio_') || toolName.startsWith('drawio-')) {
    return {
      id: 'dsh-drawio',
      name: 'Draw.io 架构绘图 (dsh-drawio)',
      isPlugin: true,
    }
  }

  if (toolName.startsWith('browser_') || toolName.startsWith('playwright_')) {
    return {
      id: 'dsh-playwright',
      name: '浏览器自动化 (dsh-playwright)',
      isPlugin: true,
    }
  }

  if (toolName.startsWith('workspace_')) {
    return {
      id: 'dsh-workspace-files',
      name: '工作区文件管理 (dsh-workspace-files)',
      isPlugin: true,
    }
  }

  if (toolName.startsWith('process_')) {
    return {
      id: 'dsh-process-manager',
      name: '系统进程管理 (dsh-process-manager)',
      isPlugin: true,
    }
  }

  if (toolName.startsWith('extensions_')) {
    return {
      id: 'dsh-skill-mcp',
      name: '扩展与工具管理 (dsh-skill-mcp)',
      isPlugin: true,
    }
  }

  if (builtinToolNames.has(toolName)) {
    return {
      id: 'builtin',
      name: '系统核心工具 (Builtin)',
      isPlugin: false,
    }
  }

  // Fallback for custom user plugins
  const prefix = toolName.split('_')[0]
  return {
    id: prefix ? `plugin-${prefix}` : 'other-plugins',
    name: prefix ? `扩展插件 (${prefix})` : '其他插件工具',
    isPlugin: true,
  }
}

/**
 * Describe all registered tools and aggregate them by category/plugin.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ disabledTools?: string[] }} catalogConfig
 */
export function buildToolCatalog(ctx, catalogConfig = {}) {
  const disabledSet = new Set(catalogConfig.disabledTools || [])
  const schemas = ctx.tools ? ctx.tools.schemas() : []

  const tools = schemas.map(schema => {
    const classification = classifyTool(schema.name)
    const enabled = !disabledSet.has(schema.name)
    return {
      name: schema.name,
      description: schema.description || '',
      parameters: schema.parameters || {},
      groupId: classification.id,
      groupName: classification.name,
      isPlugin: classification.isPlugin,
      enabled,
      // Takeover targets plugin-registered tools only: disabling a bundled core
      // tool from this panel could leave the agent unable to read or edit files.
      canToggle: classification.isPlugin && schema.name !== 'run_code' && !schema.name.startsWith('extensions_catalog_'),
    }
  })

  // Group by category
  const groupsMap = new Map()
  for (const tool of tools) {
    if (!groupsMap.has(tool.groupId)) {
      groupsMap.set(tool.groupId, {
        id: tool.groupId,
        name: tool.groupName,
        isPlugin: tool.isPlugin,
        tools: [],
        total: 0,
        enabledCount: 0,
      })
    }
    const group = groupsMap.get(tool.groupId)
    group.tools.push(tool)
    group.total++
    if (tool.enabled) group.enabledCount++
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.isPlugin && !b.isPlugin) return -1
    if (!a.isPlugin && b.isPlugin) return 1
    return a.name.localeCompare(b.name)
  })

  return {
    tools,
    groups,
    disabledTools: Array.from(disabledSet),
    summary: {
      total: tools.length,
      enabled: tools.filter(t => t.enabled).length,
      disabled: tools.filter(t => !t.enabled).length,
      pluginCount: groups.filter(g => g.isPlugin).length,
    },
  }
}
