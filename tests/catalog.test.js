import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import Tools, { defineTool } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Skills from '@deepseek-ai/dsh-skill'
import * as manager from '../src/index.js'
import { classifyTool, buildToolCatalog } from '../src/catalog.js'
import { ExtensionStore } from '../src/store.js'
import { createWebHandler } from '../src/web.js'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-catalog-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'extensions.json')
  await writeFile(path, '[{"insert":[]}]\n')
  return { directory, path, store: new ExtensionStore(path) }
}

test('classifyTool correctly attributes tool prefixes to their respective plugins', () => {
  assert.equal(classifyTool('session_create_autotask').id, 'dsh-autotask')
  assert.equal(classifyTool('session_list_autotasks').id, 'dsh-autotask')
  assert.equal(classifyTool('drawio_render').id, 'dsh-drawio')
  assert.equal(classifyTool('browser_navigate').id, 'dsh-playwright')
  assert.equal(classifyTool('mcp__github__create_issue').id, 'mcp-github')
  assert.equal(classifyTool('workspace_list_files').id, 'dsh-workspace-files')
  assert.equal(classifyTool('process_list').id, 'dsh-process-manager')
  assert.equal(classifyTool('extensions_list').id, 'dsh-skill-mcp')
  assert.equal(classifyTool('read_file').id, 'builtin')
})

test('store reads, updates, and toggles catalog tool status', async t => {
  const { store } = await fixture(t)
  const initial = await store.readCatalog()
  assert.deepEqual(initial.disabledTools, [])

  await store.setToolEnabled('session_create_autotask', false)
  const updated1 = await store.readCatalog()
  assert.deepEqual(updated1.disabledTools, ['session_create_autotask'])

  await store.setToolEnabled('session_create_autotask', true)
  const updated2 = await store.readCatalog()
  assert.deepEqual(updated2.disabledTools, [])

  await store.setGroupEnabled(['tool_a', 'tool_b'], false)
  const updated3 = await store.readCatalog()
  assert.deepEqual(updated3.disabledTools.sort(), ['tool_a', 'tool_b'])
})

test('plugin guard intercepts disabled tools and allows enabled tools', async t => {
  const { path } = await fixture(t)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Skills)

  // 预先在配置中指定 skill-catalog 禁用 demo_tool
  const fiber = ctx.plugin(manager, {
    patchPath: path,
    'skill-catalog': {
      disabledTools: ['demo_tool'],
    },
  })
  await fiber

  ctx.tools.register(defineTool({
    name: 'demo_tool',
    description: 'A test demo tool',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true, properties: {} },
      render: () => [{ type: 'text', text: 'ok' }],
    },
    execute: async () => ({ success: true }),
  }))

  // 验证 guardReason 会返回拒绝理由
  const reason = ctx.tools.guardReason({ name: 'demo_tool', arguments: {} })
  assert.match(reason, /Skill Catalog/)
  assert.match(reason, /已被禁用/)

  // 验证未被禁用的工具无 guardReason
  const safeReason = ctx.tools.guardReason({ name: 'other_tool', arguments: {} })
  assert.equal(safeReason, undefined)
})

test('web RPC endpoints support catalog-set-tool and catalog-set-group', async t => {
  const { store } = await fixture(t)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Skills)

  ctx.tools.register(defineTool({
    name: 'session_create_autotask',
    description: 'Create an autotask',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true, properties: {} }, render: () => [] },
    execute: async () => ({}),
  }))

  let notifiedDisabled = []
  const handler = createWebHandler(store, ctx, {
    onCatalogChange: (list) => { notifiedDisabled = list },
  })

  // 获取初始列表
  const listRes = await handler('list', {})
  assert.equal(listRes.ok, true)
  assert.ok(listRes.value.catalog)
  const targetTool = listRes.value.catalog.tools.find(t => t.name === 'session_create_autotask')
  assert.ok(targetTool)
  assert.equal(targetTool.enabled, true)

  // 禁用该工具
  const toggleRes = await handler('catalog-set-tool', {
    tool: 'session_create_autotask',
    enabled: false,
    revision: listRes.value.revision,
  })
  assert.equal(toggleRes.ok, true)
  assert.deepEqual(notifiedDisabled, ['session_create_autotask'])
  const toggledTool = toggleRes.value.catalog.tools.find(t => t.name === 'session_create_autotask')
  assert.equal(toggledTool.enabled, false)
  assert.equal(toggleRes.value.catalog.summary.disabled, 1)

  // 批量重新启用
  const groupRes = await handler('catalog-set-group', {
    tools: ['session_create_autotask'],
    enabled: true,
    revision: toggleRes.value.revision,
  })
  assert.equal(groupRes.ok, true)
  assert.deepEqual(notifiedDisabled, [])
  const reenabledTool = groupRes.value.catalog.tools.find(t => t.name === 'session_create_autotask')
  assert.equal(reenabledTool.enabled, true)
  assert.equal(groupRes.value.catalog.summary.disabled, 0)
})
