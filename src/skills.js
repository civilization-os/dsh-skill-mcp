/** Filesystem inventory and focused authoring operations for managed Skill sources. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { parseDocument, stringify } from 'yaml'

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function splitSkill(content) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)
  if (!match) throw new Error('missing-frontmatter')
  return { yaml: match[1], body: content.slice(match[0].length) }
}

function frontmatterBoolean(value, fallback) {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && (value === 0 || value === 1)) return value === 1
  if (typeof value === 'string') {
    const normalized = value.toLowerCase()
    if (['true', 'yes', 'on', '1'].includes(normalized)) return true
    if (['false', 'no', 'off', '0'].includes(normalized)) return false
  }
  throw new Error('invalid-invocation')
}

function parseFrontmatter(content) {
  const parts = splitSkill(content)
  const document = parseDocument(parts.yaml)
  if (document.errors.length) throw new Error('invalid-yaml')
  const data = document.toJS()
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-frontmatter')
  const issues = []
  if (typeof data.name !== 'string' || !skillNamePattern.test(data.name)) issues.push('invalid-name')
  if (typeof data.description !== 'string' || !data.description.trim()) issues.push('missing-description')
  let modelInvocable = true
  let userInvocable = true
  try {
    modelInvocable = !frontmatterBoolean(data['disable-model-invocation'], false)
    userInvocable = frontmatterBoolean(data['user-invocable'], true)
  } catch { issues.push('invalid-invocation') }
  return {
    data,
    body: parts.body,
    issues,
    name: typeof data.name === 'string' ? data.name : '',
    description: typeof data.description === 'string' ? data.description.trim() : '',
    whenToUse: typeof data.whenToUse === 'string' ? data.whenToUse.trim() : '',
    modelInvocable,
    userInvocable,
    group: typeof data.metadata?.['dsh-skill-mcp/group'] === 'string'
      ? data.metadata['dsh-skill-mcp/group'].trim().slice(0, 64) : '',
  }
}

async function listResources(directory) {
  const resources = []
  async function walk(current, depth) {
    if (depth > 3 || resources.length >= 100) return
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (resources.length >= 100) break
      if (entry.isSymbolicLink()) continue
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path, depth + 1)
      else if (entry.isFile() && entry.name !== 'SKILL.md') resources.push(relative(directory, path).replaceAll('\\', '/'))
    }
  }
  await walk(directory, 0)
  return resources
}

async function inspectSkill(source, path, format) {
  const relativePath = relative(source.location, path).replaceAll('\\', '/')
  try {
    const content = await readFile(path, 'utf8')
    const parsed = parseFrontmatter(content)
    const resources = format === 'bundle' ? await listResources(dirname(path)) : []
    return {
      sourceId: source.id,
      sourceEnabled: source.enabled,
      relativePath,
      format,
      name: parsed.name || basename(path, extname(path)),
      description: parsed.description,
      whenToUse: parsed.whenToUse,
      modelInvocable: parsed.modelInvocable,
      userInvocable: parsed.userInvocable,
      group: parsed.group,
      content: parsed.body,
      valid: parsed.issues.length === 0,
      issues: parsed.issues,
      resources,
      revision: createHash('sha256').update(content).digest('hex'),
    }
  } catch (error) {
    const issue = ['missing-frontmatter', 'invalid-yaml', 'invalid-frontmatter'].includes(error.message)
      ? error.message : 'unreadable'
    return {
      sourceId: source.id, sourceEnabled: source.enabled, relativePath, format,
      name: basename(path, extname(path)), description: '', whenToUse: '',
      modelInvocable: false, userInvocable: false, group: '', content: '', valid: false, issues: [issue], resources: [], revision: '',
    }
  }
}

/** Inspect direct Skill entries in every managed source without loading instructions into a session. */
export async function inspectSkills(rows) {
  const sources = rows.filter(row => !row.config.serverName).map(row => ({
    id: row.id, enabled: !row.disabled, location: row.config.customSkillDirs[0],
  }))
  const skills = []
  for (const source of sources) {
    try {
      const entries = await readdir(source.location, { withFileTypes: true })
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isDirectory()) {
          const path = join(source.location, entry.name, 'SKILL.md')
          try { if ((await stat(path)).isFile()) skills.push(await inspectSkill(source, path, 'bundle')) } catch { /* not a Skill bundle */ }
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
          skills.push(await inspectSkill(source, join(source.location, entry.name), 'flat'))
        }
      }
      source.issue = ''
    } catch { source.issue = 'source-unreadable' }
  }
  const winners = new Set()
  for (const skill of skills) {
    skill.shadowed = skill.valid && winners.has(skill.name)
    if (skill.valid && !skill.shadowed) winners.add(skill.name)
  }
  return { sources, skills }
}

function skillSource(rows, sourceId) {
  const row = rows.find(row => row.id === sourceId && !row.config.serverName)
  if (!row) throw new Error('Unknown Skill source.')
  return row.config.customSkillDirs[0]
}

/** Create an atomic directory Skill bundle inside one managed source. */
export async function createSkill(rows, input) {
  if (!skillNamePattern.test(input.name)) throw new Error('Invalid Skill name.')
  if (!input.description.trim()) throw new Error('Skill description is required.')
  if (!['minimal', 'standard'].includes(input.structure)) throw new Error('Invalid Skill structure.')
  const root = skillSource(rows, input.sourceId)
  const target = resolve(root, input.name)
  if (dirname(target) !== resolve(root)) throw new Error('Skill path escapes its source.')
  const temporary = resolve(root, `.${input.name}.${randomUUID()}.tmp`)
  const frontmatter = {
    name: input.name,
    description: input.description.trim(),
    ...(input.whenToUse.trim() ? { whenToUse: input.whenToUse.trim() } : {}),
    ...(input.modelInvocable ? {} : { 'disable-model-invocation': true }),
    ...(input.userInvocable ? {} : { 'user-invocable': false }),
  }
  await mkdir(temporary)
  try {
    await writeFile(join(temporary, 'SKILL.md'), `---\n${stringify(frontmatter)}---\n\n# ${input.name}\n\n${input.description.trim()}\n`)
    if (input.structure === 'standard') {
      await Promise.all(['scripts', 'references', 'assets'].map(name => mkdir(join(temporary, name))))
    }
    await rename(temporary, target)
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    throw error
  }
}

async function updateSkillFrontmatter(rows, input, update, body) {
  const root = skillSource(rows, input.sourceId)
  const inventory = await inspectSkills(rows)
  const skill = inventory.skills.find(item => item.sourceId === input.sourceId && item.relativePath === input.relativePath)
  if (!skill?.valid) throw new Error('Unknown or invalid Skill.')
  const path = resolve(root, input.relativePath)
  if (relative(root, path).startsWith('..')) throw new Error('Skill path escapes its source.')
  const content = await readFile(path, 'utf8')
  if (createHash('sha256').update(content).digest('hex') !== input.skillRevision) {
    throw Object.assign(new Error('Skill changed. Refresh before saving.'), { code: 'CONFLICT' })
  }
  const parsed = parseFrontmatter(content)
  update(parsed.data)
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`)
  await writeFile(temporary, `---\n${stringify(parsed.data)}---\n${body === undefined ? parsed.body : body}`)
  await rename(temporary, path)
}

/** Update only invocation frontmatter after checking the exact inspected file revision. */
export async function setSkillInvocation(rows, input) {
  await updateSkillFrontmatter(rows, input, data => {
    if (input.modelInvocable) delete data['disable-model-invocation']
    else data['disable-model-invocation'] = true
    if (input.userInvocable) delete data['user-invocable']
    else data['user-invocable'] = false
  })
}

/** Store a user-defined group on one Skill without changing provider configuration. */
export async function setSkillGroup(rows, input) {
  await updateSkillFrontmatter(rows, input, data => {
    const group = input.group.trim().slice(0, 64)
    if (data.metadata !== undefined && (!data.metadata || typeof data.metadata !== 'object' || Array.isArray(data.metadata))) {
      throw new Error('Skill metadata must be an object before assigning a group.')
    }
    const metadata = data.metadata ?? {}
    if (group) metadata['dsh-skill-mcp/group'] = group
    else delete metadata['dsh-skill-mcp/group']
    if (Object.keys(metadata).length) data.metadata = metadata
    else delete data.metadata
  })
}

/** Update the editable frontmatter and instruction body of one Skill. */
export async function updateSkill(rows, input) {
  if (!input.description.trim()) throw new Error('Skill description is required.')
  await updateSkillFrontmatter(rows, input, data => {
    data.description = input.description.trim()
    if (input.whenToUse.trim()) data.whenToUse = input.whenToUse.trim()
    else delete data.whenToUse
    if (input.modelInvocable) delete data['disable-model-invocation']
    else data['disable-model-invocation'] = true
    if (input.userInvocable) delete data['user-invocable']
    else data['user-invocable'] = false
  }, input.content)
}

/** Delete one exact inspected Skill; bundle deletion removes its complete directory. */
export async function deleteSkill(rows, input) {
  const root = skillSource(rows, input.sourceId)
  const inventory = await inspectSkills(rows)
  const skill = inventory.skills.find(item => item.sourceId === input.sourceId && item.relativePath === input.relativePath)
  if (!skill?.valid) throw new Error('Unknown or invalid Skill.')
  const path = resolve(root, input.relativePath)
  const child = relative(resolve(root), path)
  if (!child || child.startsWith('..') || resolve(root, child) !== path) throw new Error('Skill path escapes its source.')
  const content = await readFile(path, 'utf8')
  if (createHash('sha256').update(content).digest('hex') !== input.skillRevision) {
    throw Object.assign(new Error('Skill changed. Refresh before deleting.'), { code: 'CONFLICT' })
  }
  await rm(skill.format === 'bundle' ? dirname(path) : path, { recursive: skill.format === 'bundle' })
}
