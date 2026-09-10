/** Legacy HTTP+SSE MCP client used only for servers that predate Streamable HTTP. */
import Schema from '@deepseek-ai/schemastery'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { CallToolResultSchema, ListToolsResultSchema, ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import { createHash } from 'node:crypto'

export const name = 'mcp-sse-client'
export const inject = ['tools']

const serverNamePattern = /^[A-Za-z0-9_-]{1,32}$/
const invalidNameCharacters = /[^A-Za-z0-9_-]/g
const maxPublicNameLength = 64

export const Config = Schema.object({
  transport: Schema.const('sse'),
  serverName: Schema.string().required().pattern(serverNamePattern),
  url: Schema.string().required(),
  toolCallTimeoutMs: Schema.number().default(60_000),
  failOnStartupError: Schema.boolean().default(false),
})

export async function apply(ctx, config) {
  const client = new Client({ name: `dsh-sse-${config.serverName}`, version: '1.0.0' }, { capabilities: {} })
  const transport = new SSEClientTransport(new URL(config.url))
  let disposed = false
  let registrations = new Map()
  let synchronization = Promise.resolve()

  const clearTools = () => {
    for (const dispose of registrations.values()) dispose()
    registrations = new Map()
  }
  ctx.effect(() => () => {
    disposed = true
    clearTools()
    void client.close().catch(() => {})
  }, 'mcp-sse-client.connection')

  const synchronizeTools = async () => {
    const definitions = new Map()
    let cursor
    do {
      const response = await client.request({
        method: 'tools/list',
        ...(cursor === undefined ? {} : { params: { cursor } }),
      }, ListToolsResultSchema)
      for (const tool of response.tools) {
        const publicName = publicToolName(config.serverName, tool.name)
        if (definitions.has(publicName)) throw new Error(`SSE MCP server listed duplicate tool: ${tool.name}`)
        definitions.set(publicName, createTool(client, publicName, tool, config.toolCallTimeoutMs))
      }
      cursor = response.nextCursor
    } while (cursor)
    if (disposed) return
    clearTools()
    const next = new Map()
    try {
      for (const [publicName, definition] of definitions) next.set(publicName, ctx.tools.register(definition))
      registrations = next
    } catch (error) {
      for (const dispose of next.values()) dispose()
      throw error
    }
  }

  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    synchronization = synchronization.then(synchronizeTools).catch(error => {
      ctx.logger.warn(`mcp-sse-client(${config.serverName}): tool refresh failed: ${messageOf(error)}`)
    })
  })

  try {
    await client.connect(transport)
    await synchronizeTools()
  } catch (error) {
    clearTools()
    await client.close().catch(() => {})
    if (config.failOnStartupError) throw new Error(`mcp-sse-client(${config.serverName}): initial connection failed: ${messageOf(error)}`, { cause: error })
    ctx.logger.warn(`mcp-sse-client(${config.serverName}): initial connection failed: ${messageOf(error)}`)
  }
}

function createTool(client, publicName, tool, timeout) {
  return {
    name: publicName,
    description: tool.description ?? '',
    parameters: tool.inputSchema,
    output: {
      schema: {
        type: 'object',
        properties: { content: { type: 'array', items: {} }, structuredContent: {} },
        required: ['content'],
        additionalProperties: true,
      },
      render: (_args, value) => [{ type: 'text', text: textContent(value.content) }],
    },
    async execute(args, exec) {
      const result = await client.request({ method: 'tools/call', params: { name: tool.name, arguments: args } }, CallToolResultSchema, {
        signal: exec.signal,
        timeout,
      })
      if (result.isError) throw new Error(textContent(result.content) || `MCP tool ${tool.name} failed`)
      return result
    },
  }
}

function publicToolName(serverName, rawName) {
  const joined = `mcp__${serverName}__${rawName}`
  const normalized = joined.replace(invalidNameCharacters, '_')
  if (normalized === joined && normalized.length <= maxPublicNameLength) return normalized
  const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, 12)
  return `${normalized.slice(0, maxPublicNameLength - 13)}_${hash}`
}

function textContent(content) {
  const text = Array.isArray(content) ? content.filter(item => item?.type === 'text').map(item => item.text).join('\n') : ''
  return text || JSON.stringify(content ?? [])
}

const messageOf = error => error instanceof Error ? error.message : String(error)
