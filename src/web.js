/** Authenticated Connection channel for the independent extension settings page. */
import Schema from '@deepseek-ai/schemastery'
import { revisionOf } from './store.js'
import { createSkill, deleteSkill, inspectSkills, setSkillGroup, setSkillInvocation, updateSkill } from './skills.js'

const text = Schema.string().required()
const schemas = {
  list: Schema.object({}),
  'add-skill': Schema.object({ directory: text, revision: text }),
  'add-mcp': Schema.object({ id: text, configuration: text, revision: text }),
  'update-skill-source': Schema.object({ id: text, directory: text, revision: text }),
  'update-mcp': Schema.object({ id: text, configuration: text, revision: text }),
  'delete-extension': Schema.object({ id: text, revision: text }),
  enable: Schema.object({ id: text, enabled: Schema.boolean().required(), revision: text }),
  'set-skill-group': Schema.object({ sourceId: text, relativePath: text, skillRevision: text, group: Schema.string().required(), revision: text }),
  'create-skill': Schema.object({
    sourceId: text, name: text, description: text, whenToUse: Schema.string().required(),
    modelInvocable: Schema.boolean().required(), userInvocable: Schema.boolean().required(),
    structure: text, revision: text,
  }),
  'set-skill-invocation': Schema.object({
    sourceId: text, relativePath: text, skillRevision: text,
    modelInvocable: Schema.boolean().required(), userInvocable: Schema.boolean().required(), revision: text,
  }),
  'update-skill': Schema.object({
    sourceId: text, relativePath: text, skillRevision: text, description: text,
    whenToUse: Schema.string().required(), content: Schema.string().required(),
    modelInvocable: Schema.boolean().required(), userInvocable: Schema.boolean().required(), revision: text,
  }),
  'delete-skill': Schema.object({ sourceId: text, relativePath: text, skillRevision: text, revision: text }),
}

/** Return redacted configuration and observed global tool availability. */
export async function describeExtensions(store, ctx) {
  const rows = await store.read()
  const toolNames = ctx.tools.schemas().map(tool => tool.name)
  const inventory = await inspectSkills(rows)
  return {
    revision: revisionOf(rows),
    ...inventory,
    extensions: rows.map(row => ({
      id: row.id,
      kind: row.config.serverName ? 'mcp' : 'skill',
      enabled: !row.disabled,
      location: row.config.transport === 'stdio' ? row.config.command
        : ['streamable-http', 'sse'].includes(row.config.transport) ? new URL(row.config.url).origin
          : row.config.customSkillDirs[0],
      transport: row.config.transport ?? '',
      configuration: row.config.serverName ? (row.config.transport === 'stdio'
        ? { transport: row.config.transport, command: row.config.command, args: row.config.args ?? [], cwd: row.config.cwd ?? '' }
        : { transport: row.config.transport, url: row.config.url }) : undefined,
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
      signal?.throwIfAborted()
      if (endpoint === 'add-skill') await store.addSkillPath(args.directory, signal, args.revision)
      if (endpoint === 'add-mcp') {
        const input = JSON.parse(args.configuration)
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an MCP configuration object.')
        await store.addMcp(args.id, input, signal, args.revision)
      }
      if (endpoint === 'update-skill-source') await store.updateSkillSource(args.id, args.directory, signal, args.revision)
      if (endpoint === 'update-mcp') {
        const input = JSON.parse(args.configuration)
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an MCP configuration object.')
        await store.updateMcp(args.id, input, signal, args.revision)
      }
      if (endpoint === 'delete-extension') await store.remove(args.id, signal, args.revision)
      if (endpoint === 'enable') await store.setEnabled(args.id, args.enabled, signal, args.revision)
      if (['create-skill', 'set-skill-invocation', 'set-skill-group', 'update-skill', 'delete-skill'].includes(endpoint)) {
        const rows = await store.read()
        if (revisionOf(rows) !== args.revision) {
          throw Object.assign(new Error('Configuration changed. Refresh before saving.'), { code: 'CONFLICT' })
        }
        if (endpoint === 'create-skill') await createSkill(rows, args)
        else if (endpoint === 'set-skill-invocation') await setSkillInvocation(rows, args)
        else if (endpoint === 'set-skill-group') await setSkillGroup(rows, args)
        else if (endpoint === 'update-skill') await updateSkill(rows, args)
        else await deleteSkill(rows, args)
      }
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

/** HTTP server route handler that satisfies DSH WebServer and RPC envelope protocols. */
export function createWebHttpHandler(store, ctx) {
  const handler = createWebHandler(store, ctx)
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, *',
      })
      res.end()
      return
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: { message: 'Method Not Allowed' } }))
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
    const endpoint = pathname.startsWith('/extensions/') ? pathname.slice('/extensions/'.length)
      : pathname === '/extensions' ? 'list' : undefined
    if (!endpoint) {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: { message: 'Not Found' } }))
      return
    }

    let raw = ''
    try {
      for await (const chunk of req) raw += chunk.toString('utf8')
    } catch {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: { message: 'Failed to read request body.' } }))
      return
    }

    let body = {}
    if (raw.trim()) {
      try { body = JSON.parse(raw) }
      catch {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: { message: 'Invalid JSON body.' } }))
        return
      }
    }

    const isRpcEnvelope = body && body.type === 'client-request' && typeof body.rpcId === 'string'
    const actualEndpoint = isRpcEnvelope ? (body.method || endpoint) : endpoint
    const payload = isRpcEnvelope ? (body.payload ?? {}) : body

    const result = await handler(actualEndpoint, payload, req.signal)

    const responseBody = isRpcEnvelope
      ? { type: 'server-response', rpcId: body.rpcId, result }
      : result

    const data = JSON.stringify(responseBody)
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(data),
    })
    res.end(data)
  }
}
