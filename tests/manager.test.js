import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, mkdir, rm, open, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'
import { Context } from '@deepseek-ai/cordis'
import Tools from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Skills from '@deepseek-ai/dsh-skill'
import * as FilesystemSkills from '@deepseek-ai/dsh-skill-filesystem'
import * as manager from '../src/index.js'
import * as SseMcpClient from '../src/mcp-sse.js'
import { ExtensionStore } from '../src/store.js'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-extensions-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'extensions.json')
  await writeFile(path, '[{"insert":[]}]\n')
  return { directory, path, store: new ExtensionStore(path) }
}

test('new sources remain disabled and survive a new store instance', async t => {
  const { directory, path, store } = await fixture(t)
  await store.addSkill('notes', directory)
  assert.equal((await new ExtensionStore(path).read())[0].disabled, true)
  await store.setEnabled('notes', true)
  assert.equal((await store.read())[0].disabled, false)
  await store.setEnabled('notes', false)
  assert.equal((await store.read())[0].disabled, true)
})

test('invalid additions and missing ids preserve existing configuration', async t => {
  const { directory, path, store } = await fixture(t)
  await store.addSkill('notes', directory)
  const original = await readFile(path, 'utf8')
  await assert.rejects(store.addSkill('notes', directory), /already exists/)
  await assert.rejects(store.addSkill('../escape', directory), /Id must/)
  await assert.rejects(store.addSkill('relative', './skills'), /absolute/)
  await assert.rejects(store.setEnabled('missing', true), /Unknown/)
  assert.equal(await readFile(path, 'utf8'), original)
})

test('managed sources and MCP servers can be edited and removed', async t => {
  const { directory, store } = await fixture(t)
  const other = join(directory, 'other')
  await mkdir(other)
  await store.addSkill('notes', directory)
  await store.updateSkillSource('notes', other)
  assert.equal((await store.read())[0].config.customSkillDirs[0], other)
  await store.addMcp('demo', { transport: 'stdio', command: 'node', args: ['old.js'] })
  await store.setEnabled('demo', true)
  await store.updateMcp('demo', { transport: 'streamable-http', url: 'http://localhost:9000/mcp' })
  const mcp = (await store.read()).find(row => row.id === 'demo')
  assert.equal(mcp.disabled, false)
  assert.equal(mcp.config.transport, 'streamable-http')
  await store.updateMcp('demo', { transport: 'sse', url: 'http://localhost:9000/sse' })
  const sse = (await store.read()).find(row => row.id === 'demo')
  assert.equal(sse.disabled, false)
  assert.equal(sse.name, '@civilization/deepseek-harness-skill-mcp/mcp-sse')
  assert.equal(sse.config.transport, 'sse')
  await store.remove('notes')
  assert.deepEqual((await store.read()).map(row => row.id), ['demo'])
  await assert.rejects(store.remove('missing'), /Unknown/)
})

test('MCP transport validation rejects credential-bearing URLs and malformed config', async t => {
  const { store } = await fixture(t)
  await assert.rejects(store.addMcp('bad', { transport: 'other' }))
  await assert.rejects(store.addMcp('bad', { transport: 'streamable-http', url: 'https://host/mcp?token=secret' }), /without credentials/)
  await assert.rejects(store.addMcp('bad', { transport: 'sse', url: 'https://host/sse#token' }), /without credentials/)
  await assert.rejects(store.addMcp('bad', { transport: 'stdio', command: 'node', env: { TOKEN: 'secret' } }), /does not accept/)
  await store.addMcp('demo', { transport: 'stdio', command: 'node', args: ['server.js'] })
  await store.addMcp('windows', { transport: 'stdio', command: String.raw`C:\\Tools\\mcp.cmd` })
  await store.addMcp('remote', { transport: 'streamable-http', url: 'http://localhost:9000/mcp' })
  await store.addMcp('legacy', { transport: 'sse', url: 'http://localhost:9000/sse' })
  const rows = await store.read()
  assert.equal(rows.find(row => row.id === 'windows').config.command, String.raw`C:\Tools\mcp.cmd`)
  assert.equal(rows.every(row => row.config.failOnStartupError === false), true)
  assert.equal(rows.find(row => row.id === 'legacy').name, '@civilization/deepseek-harness-skill-mcp/mcp-sse')
  assert.deepEqual(rows.map(row => row.disabled), [true, true, true, true])
})

test('strict MCP startup settings migrate to non-fatal startup', async t => {
  const { path, store } = await fixture(t)
  await store.addMcp('offline', { transport: 'streamable-http', url: 'http://127.0.0.1:1/mcp' })
  const strict = (await readFile(path, 'utf8')).replace('failOnStartupError: false', 'failOnStartupError: true')
  await writeFile(path, strict)
  await store.ensureNonFatalMcpStartup()
  assert.equal((await store.read())[0].config.failOnStartupError, false)
})

test('an existing writer lock refuses a competing write without changing the patch', async t => {
  const { path, store } = await fixture(t)
  const lock = await open(`${path}.lock`, 'wx')
  try {
    await assert.rejects(store.addMcp('demo', { transport: 'stdio', command: 'node' }), { code: 'EEXIST' })
    assert.deepEqual(await store.read(), [])
  } finally { await lock.close(); await unlink(`${path}.lock`) }
  await store.addMcp('demo', { transport: 'stdio', command: 'node' })
})

test('writes preserve the manager registration in a live profile patch', async t => {
  const { path, store } = await fixture(t)
  const manager = {
    id: 'extension-manager',
    name: new URL('../src/index.js', import.meta.url).href,
    config: { patchPath: path },
  }
  await writeFile(path, `${JSON.stringify([{ insert: [manager] }])}\n`)
  await store.addMcp('demo', { transport: 'stdio', command: 'node' })
  const document = JSON.parse(await readFile(path, 'utf8'))
  assert.deepEqual(document[0].insert[0], manager)
  assert.equal((await store.read())[0].id, 'demo')
})

test('writes a managed YAML block without changing other profile content', async t => {
  const { directory, path, store } = await fixture(t)
  const original = '# Your patch\n- insert:\n    - id: unrelated\n      name: example-plugin\n      config:\n        value: !!js ctx.example\n'
  await writeFile(path, original)
  await store.addSkill('notes', directory)
  const written = await readFile(path, 'utf8')
  assert.equal(written.startsWith(original.trimEnd()), true)
  assert.match(written, /# dsh-skill-mcp:managed-start/)
  assert.match(written, /name: ["']@deepseek-ai\/dsh-skill-filesystem["']/)
  await store.setEnabled('notes', true)
  const updated = await readFile(path, 'utf8')
  assert.equal(updated.match(/dsh-skill-mcp:managed-start/g).length, 1)
  assert.match(updated, /disabled: false/)
  assert.match(updated, /value: !!js ctx\.example/)
})

test('cancellation and corrupted persisted state never overwrite the patch', async t => {
  const { path, store } = await fixture(t)
  await assert.rejects(store.addMcp('demo', { transport: 'stdio', command: 'node' }, AbortSignal.abort()))
  const corrupted = '# dsh-skill-mcp:managed-start\n- insert: nope\n# dsh-skill-mcp:managed-end\n'
  await writeFile(path, corrupted)
  await assert.rejects(store.setEnabled('demo', true), /managed insert/)
  assert.equal(await readFile(path, 'utf8'), corrupted)
})

test('real Cordis tool dispatch persists configuration and unregisters on disposal', async t => {
  const { directory, path } = await fixture(t)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Skills)
  const fiber = ctx.plugin(manager, { patchPath: path })
  await fiber
  const call = (name, args) => ctx.tools.execute({ callId: name, name, arguments: args, signal: new AbortController().signal })
  const added = await call('extensions_add_skill', { id: 'notes', directory })
  assert.equal(added.isError, false, JSON.stringify(added))
  const listed = await call('extensions_list', {})
  assert.equal(listed.isError, false, JSON.stringify(listed))
  assert.equal(listed.value.extensions[0].enabled, false)
  const invalid = await call('extensions_set_enabled', { id: 'notes', enabled: 'yes' })
  assert.equal(invalid.isError, true)
  await fiber.dispose()
  assert.equal(ctx.tools.schemas().some(tool => tool.name.startsWith('extensions_')), false)
})

test('a saved skill source loads through the real filesystem provider and inspection tool', async t => {
  const { directory, path, store } = await fixture(t)
  const skillDir = join(directory, 'demo-skill')
  await mkdir(skillDir)
  await writeFile(join(skillDir, 'SKILL.md'), '---\nname: demo-skill\ndescription: Example instructions.\n---\nUse the example.\n')
  await store.addSkill('notes', directory)
  await store.setEnabled('notes', true)
  const [row] = await store.read()
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Skills)
  await ctx.plugin(FilesystemSkills, { ...row.config, watch: false })
  await ctx.plugin(manager, { patchPath: path })
  const result = await ctx.tools.execute({ callId: 'inspect', name: 'extensions_inspect', arguments: { cwd: directory }, signal: new AbortController().signal })
  assert.equal(result.isError, false, JSON.stringify(result))
  assert.equal(result.value.skills.complete, true)
  assert.equal(result.value.skills.skills[0].name, 'demo-skill')
  assert.deepEqual(result.value.mcpTools, [])
})

test('saved HTTP MCP configuration discovers tools and removes them on unload', { timeout: 15000 }, async t => {
  const { store } = await fixture(t)
  const cleanup = []
  const server = createServer((request, response) => {
    const mcp = new McpServer({ name: 'fixture', version: '1.0.0' })
    mcp.registerTool('ping', { inputSchema: {} }, async () => ({ content: [{ type: 'text', text: 'pong' }] }))
    const transport = new StreamableHTTPServerTransport({})
    cleanup.push(() => mcp.close())
    mcp.connect(transport).then(() => transport.handleRequest(request, response)).catch(error => {
      response.writeHead(500).end(String(error))
    })
  })
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await Promise.all(cleanup.map(close => close()))
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  await store.addMcp('probe', { transport: 'streamable-http', url: `http://127.0.0.1:${server.address().port}/mcp`, reconnect: { enabled: false } })
  await store.setEnabled('probe', true)
  const [row] = await store.read()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  const fiber = ctx.plugin(McpClient, row.config)
  await fiber
  assert.equal(ctx.tools.schemas().some(tool => tool.name === 'mcp__probe__ping'), true)
  const result = await ctx.tools.execute({ callId: 'ping', name: 'mcp__probe__ping', arguments: {}, signal: AbortSignal.timeout(5000) })
  assert.equal(result.isError, false, JSON.stringify(result))
  assert.match(JSON.stringify(result.content), /pong/)
  await fiber.dispose()
  assert.equal(ctx.tools.schemas().some(tool => tool.name === 'mcp__probe__ping'), false)
})

test('saved legacy SSE MCP configuration discovers tools and removes them on unload', { timeout: 15000 }, async t => {
  const { store } = await fixture(t)
  const transports = new Map()
  const mcpServers = new Set()
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    try {
      if (request.method === 'GET' && url.pathname === '/sse') {
        const mcp = new McpServer({ name: 'legacy-fixture', version: '1.0.0' })
        mcp.registerTool('ping', { inputSchema: {} }, async () => ({ content: [{ type: 'text', text: 'pong' }] }))
        const transport = new SSEServerTransport('/messages', response)
        transports.set(transport.sessionId, transport)
        mcpServers.add(mcp)
        transport.onclose = () => {
          transports.delete(transport.sessionId)
          mcpServers.delete(mcp)
        }
        await mcp.connect(transport)
        return
      }
      if (request.method === 'POST' && url.pathname === '/messages') {
        const transport = transports.get(url.searchParams.get('sessionId'))
        if (!transport) return response.writeHead(404).end()
        await transport.handlePostMessage(request, response)
        return
      }
      response.writeHead(404).end()
    } catch (error) {
      if (!response.headersSent) response.writeHead(500).end(String(error))
    }
  })
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await Promise.all([...mcpServers].map(mcp => mcp.close()))
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  await store.addMcp('legacy', { transport: 'sse', url: `http://127.0.0.1:${server.address().port}/sse` })
  await store.setEnabled('legacy', true)
  const [row] = await store.read()
  assert.equal(row.name, '@civilization/deepseek-harness-skill-mcp/mcp-sse')
  row.config.failOnStartupError = true
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  const fiber = ctx.plugin(SseMcpClient, row.config)
  await fiber
  assert.equal(ctx.tools.schemas().some(tool => tool.name === 'mcp__legacy__ping'), true)
  const result = await ctx.tools.execute({ callId: 'ping', name: 'mcp__legacy__ping', arguments: {}, signal: AbortSignal.timeout(5000) })
  assert.equal(result.isError, false, JSON.stringify(result))
  assert.match(JSON.stringify(result.content), /pong/)
  await fiber.dispose()
  assert.equal(ctx.tools.schemas().some(tool => tool.name === 'mcp__legacy__ping'), false)
})

test('an unavailable HTTP MCP server does not reject plugin startup', { timeout: 15000 }, async t => {
  const { store } = await fixture(t)
  const server = createServer((_request, response) => response.writeHead(503).end())
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
    server.closeAllConnections()
  }))
  await store.addMcp('offline', {
    transport: 'streamable-http', url: `http://127.0.0.1:${server.address().port}/mcp`, reconnect: { enabled: false },
  })
  await store.setEnabled('offline', true)
  const [row] = await store.read()
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  const fiber = ctx.plugin(McpClient, row.config)
  await assert.doesNotReject(async () => { await fiber })
  assert.equal(ctx.tools.schemas().some(tool => tool.name.startsWith('mcp__offline__')), false)
})
