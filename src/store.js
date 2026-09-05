/** Owns one JSON-formatted Cordis patch containing managed extensions. */
import { open, readFile, rename, unlink, stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { Config as McpConfig } from '@deepseek-ai/dsh-mcp-client'
import { Config as SkillConfig } from '@deepseek-ai/dsh-skill-filesystem'

const modules = {
  skill: import.meta.resolve('@deepseek-ai/dsh-skill-filesystem'),
  mcp: import.meta.resolve('@deepseek-ai/dsh-mcp-client'),
}
const isModule = (value, kind) => [modules[kind], new URL('../src/index.ts', modules[kind]).href, new URL('../lib/index.js', modules[kind]).href].includes(value)
const idPattern = /^[A-Za-z0-9_-]{1,32}$/

export function revisionOf(rows) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

function validateId(id) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new Error('Id must contain 1–32 letters, digits, underscores or hyphens.')
}

/** Validate the entire owned patch before exposing or modifying its rows. */
export function validatePatch(value) {
  if (!Array.isArray(value) || value.length !== 1 || !Array.isArray(value[0]?.insert)
    || Object.keys(value[0]).join() !== 'insert') throw new Error('Expected one managed insert operation.')
  const ids = new Set()
  for (const row of value[0].insert) {
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
  }
  return value[0].insert
}

/** A store uses an exclusive cross-process lock and atomically replaces its patch. */
export class ExtensionStore {
  constructor(path) {
    if (!isAbsolute(path)) throw new Error('patchPath must be absolute.')
    this.path = path
  }

  async read() {
    return validatePatch(JSON.parse(await readFile(this.path, 'utf8')))
  }

  async update(change, signal, expectedRevision) {
    signal?.throwIfAborted()
    const lockPath = `${this.path}.lock`
    const lock = await open(lockPath, 'wx', 0o600)
    const temp = `${this.path}.${randomUUID()}.tmp`
    let tempExists = false
    try {
      const rows = await this.read()
      if (expectedRevision !== undefined && revisionOf(rows) !== expectedRevision) {
        throw Object.assign(new Error('Configuration changed. Refresh before saving.'), { code: 'CONFLICT' })
      }
      await change(rows)
      validatePatch([{ insert: rows }])
      signal?.throwIfAborted()
      const file = await open(temp, 'wx', 0o600)
      tempExists = true
      try {
        await file.writeFile(`${JSON.stringify([{ insert: rows }], null, 2)}\n`)
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
    if (!isAbsolute(directory) || !(await stat(directory)).isDirectory()) throw new Error('Skill root must be an existing absolute directory containing skill bundles.')
    return this.add({ id, name: modules.skill, disabled: true, config: {
      providerName: `managed-${id}`, includeDefaultRoots: false, customSkillDirs: [directory],
    } }, signal, expectedRevision)
  }

  async addMcp(id, input, signal, expectedRevision) {
    validateId(id)
    // Authentication values belong in the host credential setup, not tool arguments or logs.
    if (input.env || input.headers) throw new Error('This version does not accept environment values or authentication headers.')
    const config = McpConfig({ ...input, serverName: id, failOnStartupError: true })
    if (config.transport === 'streamable-http') {
      const url = new URL(config.url)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTP(S) endpoint without credentials, query or fragment.')
    } else if (!config.command.trim()) throw new Error('MCP command cannot be empty.')
    return this.add({ id, name: modules.mcp, disabled: true, config }, signal, expectedRevision)
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
}
