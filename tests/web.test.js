import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ExtensionStore } from '../src/store.js'
import { createWebHandler } from '../src/web.js'
import { ExtensionsController } from '../src/client/controller.js'
import { zh, en } from '../src/client/locales.js'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-web-ext-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'extensions.json')
  await writeFile(path, '[{"insert":[]}]')
  const store = new ExtensionStore(path)
  const handler = createWebHandler(store, { tools: { schemas: () => [
    { name: 'mcp__demo__ping' }, { name: 'mcp__other__ignore' }, { name: 'mcp__demo__alpha' },
  ] } })
  return { directory, store, call: (method, payload) => handler(method, payload, new AbortController().signal) }
}

test('settings writes reject stale revisions while retaining the newer record', async t => {
  const { store, call, directory } = await fixture(t)
  const { value } = await call('list', {})
  const added = await call('add-skill', { id: 'notes', directory, revision: value.revision })
  assert.equal(added.ok, true)
  const stale = await call('enable', { id: 'notes', enabled: true, revision: value.revision })
  assert.equal(stale.error.code, 'extensions/conflict')
  assert.equal((await store.read())[0].disabled, true)
  const enabled = await call('enable', { id: 'notes', enabled: true, revision: added.value.revision })
  assert.equal(enabled.value.extensions[0].enabled, true)
})

test('wire validation rejects missing revision and does not echo submitted credentials', async t => {
  const { call, store } = await fixture(t)
  const bad = await call('add-mcp', { id: 'demo', configuration: '{"headers":{"Authorization":"private-secret"}}', revision: 'bad' })
  assert.equal(bad.ok, false)
  assert.equal(JSON.stringify(bad).includes('private-secret'), false)
  assert.equal((await call('enable', { id: 'demo', enabled: true })).ok, false)
  assert.equal((await call('toString', {})).ok, false)
  assert.deepEqual(await store.read(), [])
})

test('MCP view reports observed tools independently of configured enabled state', async t => {
  const { call, store } = await fixture(t)
  await store.addMcp('demo', { transport: 'streamable-http', url: 'http://localhost:9000/mcp' })
  const { value } = await call('list', {})
  assert.equal(value.extensions[0].enabled, false)
  assert.deepEqual(value.extensions[0].tools, ['mcp__demo__alpha', 'mcp__demo__ping'])
})

test('Skill inventory diagnoses files and authoring updates invocation flags', async t => {
  const { call, store, directory } = await fixture(t)
  const root = join(directory, 'skills')
  await mkdir(join(root, 'existing', 'references'), { recursive: true })
  await writeFile(join(root, 'existing', 'SKILL.md'), '---\nname: existing\ndescription: Existing skill\nuser-invocable: false\n---\n\n# Existing\n')
  await writeFile(join(root, 'existing', 'references', 'guide.md'), '# Guide\n')
  await writeFile(join(root, 'broken.md'), '# Missing frontmatter\n')
  await store.addSkill('library', root)
  await store.setEnabled('library', true)
  const listed = await call('list', {})
  assert.equal(listed.value.sources[0].id, 'library')
  assert.equal(listed.value.skills.find(skill => skill.name === 'existing').userInvocable, false)
  assert.deepEqual(listed.value.skills.find(skill => skill.name === 'existing').resources, ['references/guide.md'])
  assert.deepEqual(listed.value.skills.find(skill => skill.name === 'broken').issues, ['missing-frontmatter'])

  const created = await call('create-skill', {
    sourceId: 'library', name: 'new-skill', description: 'A new skill', whenToUse: 'Use for tests.',
    modelInvocable: true, userInvocable: true, structure: 'standard', revision: listed.value.revision,
  })
  assert.equal(created.ok, true)
  assert.equal((await stat(join(root, 'new-skill', 'scripts'))).isDirectory(), true)
  const skill = created.value.skills.find(item => item.name === 'new-skill')
  const changed = await call('set-skill-invocation', {
    sourceId: 'library', relativePath: skill.relativePath, skillRevision: skill.revision,
    modelInvocable: false, userInvocable: true, revision: created.value.revision,
  })
  assert.equal(changed.value.skills.find(item => item.name === 'new-skill').modelInvocable, false)
  assert.match(await readFile(join(root, 'new-skill', 'SKILL.md'), 'utf8'), /disable-model-invocation: true/)
})

test('a slower refresh cannot replace the result of a later save', async () => {
  let resolveRead
  const controller = new ExtensionsController(endpoint => endpoint === 'list'
    ? new Promise(resolve => { resolveRead = resolve })
    : Promise.resolve({ ok: true, value: { revision: 'new', extensions: [{ id: 'notes' }] } }))
  const read = controller.request('list')
  await controller.request('enable', { id: 'notes', enabled: true })
  resolveRead({ ok: true, value: { revision: 'old', extensions: [] } })
  await read
  assert.equal(controller.state.revision, 'new')
  assert.equal(controller.state.saved, true)
  controller.dispose()
})

test('silent polling updates runtime data without showing a loading state', async () => {
  let resolve
  const controller = new ExtensionsController(() => new Promise(done => { resolve = done }))
  const pending = controller.request('list', {}, { silent: true })
  assert.equal(controller.state.loading, false)
  resolve({ ok: true, value: { revision: 'polled', extensions: [{ id: 'demo', tools: ['mcp__demo__ping'] }] } })
  assert.equal(await pending, true)
  assert.equal(controller.state.revision, 'polled')
  assert.equal(controller.state.loading, false)
  controller.dispose()
})

test('disposed controllers suppress late completions and subscriptions', async () => {
  let resolve
  const controller = new ExtensionsController(() => new Promise(done => { resolve = done }))
  let notifications = 0
  controller.subscribe(() => notifications++)
  const pending = controller.request('list')
  controller.dispose()
  resolve({ ok: true, value: { revision: 'late', extensions: [] } })
  await pending
  assert.equal(notifications, 1)
  assert.equal(controller.state.revision, '')
})

test('conflicts retain the displayed data and surface a localized recovery state', async () => {
  const controller = new ExtensionsController(async () => ({ ok: false, error: { code: 'extensions/conflict' } }))
  controller.publish({ revision: 'old', extensions: [{ id: 'notes' }] })
  assert.equal(await controller.request('enable', {}), false)
  assert.equal(controller.state.error, 'conflict')
  assert.equal(controller.state.extensions[0].id, 'notes')
  controller.dispose()
})

test('Chinese and English settings dictionaries have identical keys', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
})
