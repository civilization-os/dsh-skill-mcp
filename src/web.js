/** Authenticated Connection channel for the independent extension settings page. */
import Schema from '@deepseek-ai/schemastery'
import { revisionOf } from './store.js'

const text = Schema.string().required()
const schemas = {
  list: Schema.object({}),
  'add-skill': Schema.object({ id: text, directory: text, revision: text }),
  'add-mcp': Schema.object({ id: text, configuration: text, revision: text }),
  enable: Schema.object({ id: text, enabled: Schema.boolean().required(), revision: text }),
}

/** Return redacted configuration and observed global tool availability. */
export async function describeExtensions(store, ctx) {
  const rows = await store.read()
  const toolNames = ctx.tools.schemas().map(tool => tool.name)
  return {
    revision: revisionOf(rows),
    extensions: rows.map(row => ({
      id: row.id,
      kind: row.config.serverName ? 'mcp' : 'skill',
      enabled: !row.disabled,
      location: row.config.transport === 'stdio' ? row.config.command
        : row.config.transport === 'streamable-http' ? new URL(row.config.url).origin
          : row.config.customSkillDirs[0],
      transport: row.config.transport ?? '',
      tools: row.config.serverName
        ? toolNames.filter(name => name.startsWith(`mcp__${row.id}__`)).sort() : [],
    })),
  }
}

/** All writes carry the exact revision shown to the user. */
export function createWebHandler(store, ctx) {
  return async (endpoint, payload, signal) => {
    try {
      if (!Object.hasOwn(schemas, endpoint)) throw new Error('Unknown operation.')
      const args = schemas[endpoint](payload)
      signal.throwIfAborted()
      if (endpoint === 'add-skill') await store.addSkill(args.id, args.directory, signal, args.revision)
      if (endpoint === 'add-mcp') {
        const input = JSON.parse(args.configuration)
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an MCP configuration object.')
        await store.addMcp(args.id, input, signal, args.revision)
      }
      if (endpoint === 'enable') await store.setEnabled(args.id, args.enabled, signal, args.revision)
      return { ok: true, value: await describeExtensions(store, ctx) }
    } catch (error) {
      return { ok: false, error: {
        code: error.code === 'CONFLICT' ? 'extensions/conflict' : 'extensions/rejected',
        // Validation errors can quote the submitted configuration; keep it off the response.
        message: 'Extension operation failed.', details: {},
      } }
    }
  }
}
