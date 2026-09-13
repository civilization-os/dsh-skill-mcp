/** Skill and MCP configuration tools for a profile-owned managed patch. */
import Schema from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ExtensionStore } from './store.js'
import { createWebHandler, createWebHttpHandler } from './web.js'
import { buildToolCatalog } from './catalog.js'

export const name = 'extension-manager'
export const inject = ['tools', 'skills']
export const Config = Schema.object({
  patchPath: Schema.string().default(''),
  'skill-catalog': Schema.object({
    disabledTools: Schema.array(Schema.string()).default([]),
    enabledTools: Schema.array(Schema.string()).default([]),
  }).description('插件工具目录接管配置，控制各插件工具的启用与禁用').default({}),
})

const string = { type: 'string', required: true }
const output = {
  schema: { type: 'object', additionalProperties: true, properties: {} },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

/** Register management operations. MCP processes are started only by the profile loader. */
export async function apply(ctx, config) {
  try {
    const skillPath = new URL('../skills/extension-management/SKILL.md', import.meta.url)
    const skillText = await readFile(skillPath, 'utf8')
    const content = skillText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
    ctx.effect(() => ctx.skills?.register({
      name: 'extension-management',
      description: 'Manage custom Skill directories and Model Context Protocol (MCP) server configurations.',
      whenToUse: 'Use when configuring, inspecting, adding, or modifying external skills and MCP servers.',
      source: 'bundled',
      content,
    }))
  } catch {}

  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const store = new ExtensionStore(config?.patchPath || join(home, 'profiles', 'web', 'cordis.patch.yml'))
  await store.ensureNonFatalMcpStartup()

  const staticCatalog = config?.['skill-catalog'] || {}
  let cachedDisabled = new Set(staticCatalog.disabledTools || [])

  const refreshCatalogCache = async () => {
    try {
      const persisted = await store.readCatalog(staticCatalog)
      cachedDisabled = new Set(persisted.disabledTools || [])
    } catch {}
  }
  void refreshCatalogCache()

  // Monotonic guard: 单调拒绝被 skill-catalog 禁用的工具执行
  ctx.tools.guard(exec => {
    if (cachedDisabled.has(exec.name)) {
      return `【Skill Catalog】工具 "${exec.name}" 当前已被禁用。请在设置页面的“工具管理”或配置项中启用后再调用。`
    }
  })

  // Waterfall pre-execute 拦截
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (cachedDisabled.has(exec.name)) {
      return {
        kind: 'deny',
        reason: `【Skill Catalog】工具 "${exec.name}" 已被配置禁用。`,
      }
    }
    return next()
  })

  const onCatalogChange = (newDisabledList) => {
    cachedDisabled = new Set(newDisabledList)
  }

  const webHandler = createWebHandler(store, ctx, { onCatalogChange, staticCatalog })
  const httpHandler = createWebHttpHandler(store, ctx, { onCatalogChange, staticCatalog })

  ctx.inject(['connection'], web => {
    web.connection.rpc.handle('/extensions', webHandler)
  })
  ctx.inject(['webServer'], hostCtx => {
    hostCtx.effect(() => hostCtx.webServer.register({
      kind: 'prefix',
      path: '/extensions',
      handler: httpHandler,
    }), 'extension-manager: /extensions route')
  })
  const register = (name, description, parameters, execute) => ctx.tools.register(defineTool({ name, description, parameters, output, execute }))

  register('extensions_list', 'List managed Skill sources and MCP configurations; configured enabled state is not connection health.', {}, async () => ({
    extensions: (await store.read()).map(row => ({
      id: row.id, kind: row.config.serverName ? 'mcp' : 'skill', enabled: !row.disabled,
      ...(row.config.transport ? { transport: row.config.transport } : { directory: row.config.customSkillDirs[0] }),
    })),
  }))
  register('extensions_add_skill', 'Add an existing root containing skill directories. Added sources are disabled until explicitly enabled.', {
    id: string, directory: string,
  }, (args, exec) => store.addSkill(args.id, args.directory, exec.signal))
  register('extensions_add_mcp', 'Add a disabled MCP server. configuration is JSON for stdio, Streamable HTTP, or legacy SSE transport. Do not supply secrets in arguments.', {
    id: string, configuration: string,
  }, (args, exec) => {
    const input = JSON.parse(args.configuration)
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('configuration must be a JSON object.')
    return store.addMcp(args.id, input, exec.signal)
  })
  register('extensions_set_enabled', 'Enable or disable a managed extension. Enabling MCP authorizes its configured executable or endpoint to run when the profile reloads. Live profiles reload automatically; startup profiles require restart.', {
    id: string, enabled: { type: 'boolean', required: true },
  }, (args, exec) => store.setEnabled(args.id, args.enabled, exec.signal))
  register('extensions_update_skill', 'Change the absolute directory of a managed Skill source while preserving its id and enabled state.', {
    id: string, directory: string,
  }, (args, exec) => store.updateSkillSource(args.id, args.directory, exec.signal))
  register('extensions_update_mcp', 'Replace a managed MCP server configuration while preserving its id and enabled state. configuration is JSON; do not supply secrets.', {
    id: string, configuration: string,
  }, (args, exec) => {
    const input = JSON.parse(args.configuration)
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('configuration must be a JSON object.')
    return store.updateMcp(args.id, input, exec.signal)
  })
  register('extensions_remove', 'Remove one managed Skill source or MCP configuration. Removing a Skill source does not delete its files.', {
    id: string,
  }, (args, exec) => store.remove(args.id, exec.signal))
  register('extensions_inspect', 'Inspect actual Skill catalog and visible MCP tool names for the caller. Zero tools does not establish connection failure. Does not start a separate connection probe.', {
    cwd: string,
  }, async (args, exec) => ({
    skills: await ctx.skills.snapshot({ cwd: args.cwd, scope: exec.agent, signal: exec.signal }),
    mcpTools: ctx.tools.schemas(exec.agent).map(tool => tool.name).filter(name => name.startsWith('mcp__')),
  }))

  register('extensions_catalog_list', 'List all detected tools, plugin groups, and their enabled status under skill-catalog takeover.', {}, async () => {
    await refreshCatalogCache()
    return buildToolCatalog(ctx, { disabledTools: Array.from(cachedDisabled) })
  })
  register('extensions_catalog_set', 'Enable or disable a specific tool under skill-catalog takeover.', {
    tool: string, enabled: { type: 'boolean', required: true },
  }, async (args, exec) => {
    const updated = await store.setToolEnabled(args.tool, args.enabled, exec.signal)
    cachedDisabled = new Set(updated.disabledTools || [])
    return { tool: args.tool, enabled: args.enabled, catalog: updated }
  })
}

