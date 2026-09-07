/** Skill and MCP configuration tools for a profile-owned managed patch. */
import Schema from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ExtensionStore } from './store.js'
import { createWebHandler } from './web.js'

export const name = 'extension-manager'
export const inject = ['tools', 'skills']
export const Config = Schema.object({ patchPath: Schema.string().default('') })

const string = { type: 'string', required: true }
const output = {
  schema: { type: 'object', additionalProperties: true, properties: {} },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

/** Register management operations. MCP processes are started only by the profile loader. */
export async function apply(ctx, config) {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const store = new ExtensionStore(config.patchPath || join(home, 'profiles', 'web', 'cordis.patch.yml'))
  await store.ensureNonFatalMcpStartup()
  ctx.inject(['connection'], web => {
    web.connection.rpc.handle('/extensions', createWebHandler(store, ctx))
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
  register('extensions_add_mcp', 'Add a disabled MCP server. configuration is JSON with transport and command/args/cwd or url. Do not supply secrets in arguments.', {
    id: string, configuration: string,
  }, (args, exec) => {
    const input = JSON.parse(args.configuration)
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('configuration must be a JSON object.')
    return store.addMcp(args.id, input, exec.signal)
  })
  register('extensions_set_enabled', 'Enable or disable a managed extension. Enabling MCP authorizes its configured executable or endpoint to run when the profile reloads. Live profiles reload automatically; startup profiles require restart.', {
    id: string, enabled: { type: 'boolean', required: true },
  }, (args, exec) => store.setEnabled(args.id, args.enabled, exec.signal))
  register('extensions_inspect', 'Inspect actual Skill catalog and visible MCP tool names for the caller. Zero tools does not establish connection failure. Does not start a separate connection probe.', {
    cwd: string,
  }, async (args, exec) => ({
    skills: await ctx.skills.snapshot({ cwd: args.cwd, scope: exec.agent, signal: exec.signal }),
    mcpTools: ctx.tools.schemas(exec.agent).map(tool => tool.name).filter(name => name.startsWith('mcp__')),
  }))
}
