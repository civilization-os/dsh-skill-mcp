/** Owns a marked block inside a profile Cordis patch while retaining legacy JSON stores. */
import { open, readFile, rename, unlink, stat } from 'node:fs/promises'
import { basename, isAbsolute, resolve, win32 } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { Config as McpConfig } from '@deepseek-ai/dsh-mcp-client'
import { Config as SkillConfig } from '@deepseek-ai/dsh-skill-filesystem'
import { parse, stringify } from 'yaml'

const moduleNames = {
  skill: '@deepseek-ai/dsh-skill-filesystem',
  mcp: '@deepseek-ai/dsh-mcp-client',
}
const managerModule = new URL('./index.js', import.meta.url).href
const resolvedModules = Object.fromEntries(Object.entries(moduleNames).map(([kind, name]) => [kind, import.meta.resolve(name)]))
const isModule = (value, kind) => [moduleNames[kind], resolvedModules[kind], new URL('../src/index.ts', resolvedModules[kind]).href, new URL('../lib/index.js', resolvedModules[kind]).href].includes(value)
const idPattern = /^[A-Za-z0-9_-]{1,32}$/
const blockStart = '# dsh-skill-mcp:managed-start'
const blockEnd = '# dsh-skill-mcp:managed-end'

function normalizeWindowsPath(value) {
  const trimmed = value.trim()
  return /^[A-Za-z]:[\\/]/.test(trimmed) ? win32.normalize(trimmed) : trimmed
}

function samePath(left, right) {
  const windows = value => /^[A-Za-z]:[\\/]/.test(value)
  if (windows(left) && windows(right)) return win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase()
  return resolve(left) === resolve(right)
}

export function revisionOf(rows) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

function validateId(id) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new Error('Id must contain 1–32 letters, digits, underscores or hyphens.')
}

function parsePatch(value) {
  if (!Array.isArray(value) || value.length !== 1 || !Array.isArray(value[0]?.insert)
    || Object.keys(value[0]).join() !== 'insert') throw new Error('Expected one managed insert operation.')
  const ids = new Set()
  const managed = []
  const preserved = []
  for (const row of value[0].insert) {
    if (row?.id === 'extension-manager' && row.name === managerModule) {
      if (ids.has(row.id)) throw new Error('Duplicate extension id.')
      ids.add(row.id)
      preserved.push(row)
      continue
    }
    if (!row || typeof row !== 'object' || Object.keys(row).sort().join() !== 'config,disabled,id,name') throw new Error('Invalid managed row.')
    validateId(row.id)
    if (ids.has(row.id)) throw new Error('Duplicate extension id.')
    ids.add(row.id)
    if (typeof row.disabled !== 'boolean') throw new Error('Invalid enabled state.')
    if (isModule(row.name, 'skill')) {
      SkillConfig(row.config)
      if (row.config.providerName !== `managed-${row.id}` || row.config.includeDefaultRoots !== false
        || row.config.customSkillDirs?.length !== 1 || !isAbsolute(row.config.customSkillDirs[0])) throw new Error('Invalid managed skill source.')
    } else if (isModule(row.name, 'mcp')) {
      McpConfig(row.config)
      if (row.config.serverName !== row.id) throw new Error('MCP namespace must match its id.')
    } else throw new Error('Unknown managed plugin module.')
    managed.push(row)
  }
  return { managed, preserved }
}

/** Validate the patch and return only extension rows owned by the manager. */
export function validatePatch(value) {
  return parsePatch(value).managed
}

function markedRows(content) {
  const start = content.indexOf(blockStart)
  const end = content.indexOf(blockEnd)
  if (start < 0 && end < 0) return undefined
  if (start < 0 || end < start || content.indexOf(blockStart, start + blockStart.length) >= 0
    || content.indexOf(blockEnd, end + blockEnd.length) >= 0) throw new Error('Invalid dsh-skill-mcp managed block.')
  const bodyStart = start + blockStart.length
  return { start, end: end + blockEnd.length, rows: validatePatch(parse(content.slice(bodyStart, end))) }
}

function legacyPatch(content) {
  try { return parsePatch(JSON.parse(content)) } catch { return undefined }
}

function renderBlock(rows) {
  validatePatch([{ insert: rows }])
  return `${blockStart}\n${stringify([{ insert: rows }]).trimEnd()}\n${blockEnd}`
}

function writeManagedRows(content, rows) {
  const marked = markedRows(content)
  const block = renderBlock(rows)
  if (marked) return `${content.slice(0, marked.start)}${block}${content.slice(marked.end)}`
  const legacy = legacyPatch(content)
  if (legacy) return `${JSON.stringify([{ insert: [...legacy.preserved, ...rows] }], null, 2)}\n`
  if (/^[ \t]*\[\][ \t]*$/m.test(content)) return content.replace(/^[ \t]*\[\][ \t]*$/m, block)
  return `${content.trimEnd()}\n\n${block}\n`
}

/** A store uses an exclusive cross-process lock and atomically replaces its patch. */
export class ExtensionStore {
  constructor(path) {
    if (!isAbsolute(path)) throw new Error('patchPath must be absolute.')
    this.path = path
  }

  async read() {
    const content = await readFile(this.path, 'utf8')
    return markedRows(content)?.rows ?? legacyPatch(content)?.managed ?? []
  }

  /** Migrate managed MCP rows so an unavailable server cannot reject profile startup. */
  async ensureNonFatalMcpStartup() {
    const rows = await this.read()
    if (!rows.some(row => row.config.serverName && row.config.failOnStartupError !== false)) return
    await this.update(current => {
      for (const row of current) {
        if (row.config.serverName) row.config.failOnStartupError = false
      }
    })
  }

  async update(change, signal, expectedRevision) {
    signal?.throwIfAborted()
    const lockPath = `${this.path}.lock`
    const lock = await open(lockPath, 'wx', 0o600)
    const temp = `${this.path}.${randomUUID()}.tmp`
    let tempExists = false
    try {
      const content = await readFile(this.path, 'utf8')
      const rows = markedRows(content)?.rows ?? legacyPatch(content)?.managed ?? []
      if (expectedRevision !== undefined && revisionOf(rows) !== expectedRevision) {
        throw Object.assign(new Error('Configuration changed. Refresh before saving.'), { code: 'CONFLICT' })
      }
      await change(rows)
      const document = writeManagedRows(content, rows)
      signal?.throwIfAborted()
      const file = await open(temp, 'wx', 0o600)
      tempExists = true
      try {
        await file.writeFile(document)
        await file.sync()
      } finally { await file.close() }
      signal?.throwIfAborted()
      await rename(temp, this.path)
      tempExists = false
    } finally {
      try { if (tempExists) await unlink(temp) }
      finally { await lock.close(); await unlink(lockPath) }
    }
    return { saved: true, activation: 'pending-profile-reload', patchPath: this.path }
  }

  async addSkill(id, directory, signal, expectedRevision) {
    validateId(id)
    const normalizedDirectory = normalizeWindowsPath(directory)
    if (!isAbsolute(normalizedDirectory) || !(await stat(normalizedDirectory)).isDirectory()) throw new Error('Skill root must be an existing absolute directory containing skill bundles.')
    return this.add({ id, name: moduleNames.skill, disabled: true, config: {
      providerName: `managed-${id}`, includeDefaultRoots: false, customSkillDirs: [normalizedDirectory],
    } }, signal, expectedRevision)
  }

  async addSkillPath(directory, signal, expectedRevision) {
    const normalizedDirectory = normalizeWindowsPath(directory)
    if (!isAbsolute(normalizedDirectory) || !(await stat(normalizedDirectory)).isDirectory()) throw new Error('Skill root must be an existing absolute directory containing skill bundles.')
    return this.update(rows => {
      if (rows.some(row => !row.config.serverName && samePath(row.config.customSkillDirs[0], normalizedDirectory))) {
        throw new Error('Skill path already exists.')
      }
      const stem = basename(normalizedDirectory).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'skills'
      let id = stem
      for (let suffix = 2; rows.some(row => row.id === id); suffix++) id = `${stem.slice(0, 27)}-${suffix}`
      rows.push({ id, name: moduleNames.skill, disabled: true, config: {
        providerName: `managed-${id}`, includeDefaultRoots: false, customSkillDirs: [normalizedDirectory],
      } })
    }, signal, expectedRevision)
  }

  async addMcp(id, input, signal, expectedRevision) {
    validateId(id)
    const config = this.normalizeMcp(id, input)
    return this.add({ id, name: moduleNames.mcp, disabled: true, config }, signal, expectedRevision)
  }

  normalizeMcp(id, input) {
    // Authentication values belong in the host credential setup, not tool arguments or logs.
    if (input.env || input.headers) throw new Error('This version does not accept environment values or authentication headers.')
    const normalized = input.transport === 'stdio' ? {
      ...input,
      command: typeof input.command === 'string' ? normalizeWindowsPath(input.command) : input.command,
      cwd: typeof input.cwd === 'string' && input.cwd ? normalizeWindowsPath(input.cwd) : input.cwd,
    } : input
    const config = McpConfig({ ...normalized, serverName: id, failOnStartupError: false })
    if (config.transport === 'streamable-http') {
      const url = new URL(config.url)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTP(S) endpoint without credentials, query or fragment.')
    } else if (!config.command.trim()) throw new Error('MCP command cannot be empty.')
    return config
  }

  async add(row, signal, expectedRevision) {
    return this.update(rows => {
      if (rows.some(existing => existing.id === row.id)) throw new Error('Extension id already exists.')
      rows.push(row)
    }, signal, expectedRevision)
  }

  async setEnabled(id, enabled, signal, expectedRevision) {
    return this.update(rows => {
      const row = rows.find(row => row.id === id)
      if (!row) throw new Error('Unknown extension id.')
      row.disabled = !enabled
    }, signal, expectedRevision)
  }

  async updateSkillSource(id, directory, signal, expectedRevision) {
    const normalizedDirectory = normalizeWindowsPath(directory)
    if (!isAbsolute(normalizedDirectory) || !(await stat(normalizedDirectory)).isDirectory()) throw new Error('Skill root must be an existing absolute directory containing skill bundles.')
    return this.update(rows => {
      const row = rows.find(row => row.id === id && !row.config.serverName)
      if (!row) throw new Error('Unknown Skill source.')
      if (rows.some(other => other !== row && !other.config.serverName && samePath(other.config.customSkillDirs[0], normalizedDirectory))) {
        throw new Error('Skill path already exists.')
      }
      row.config.customSkillDirs = [normalizedDirectory]
    }, signal, expectedRevision)
  }

  async updateMcp(id, input, signal, expectedRevision) {
    const config = this.normalizeMcp(id, input)
    return this.update(rows => {
      const row = rows.find(row => row.id === id && row.config.serverName)
      if (!row) throw new Error('Unknown MCP server.')
      row.config = config
    }, signal, expectedRevision)
  }

  async remove(id, signal, expectedRevision) {
    return this.update(rows => {
      const index = rows.findIndex(row => row.id === id)
      if (index < 0) throw new Error('Unknown extension id.')
      rows.splice(index, 1)
    }, signal, expectedRevision)
  }
}
