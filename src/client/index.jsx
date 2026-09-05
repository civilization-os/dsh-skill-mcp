/** Skill and MCP settings sections registered through the public Slots and Connection services. */
import { useEffect, useId, useState } from 'react'
import { ExtensionsController } from './controller.js'
import { zh, en } from './locales.js'
import css from './styles.css'

export const inject = ['slots', 'locale', 'connection']
const namespace = 'settings.extension-manager'
const settingsPollIntervalMs = 3000

export function apply(ctx) {
  const controller = new ExtensionsController((endpoint, args, signal) => ctx.connection.rpc.call('/extensions', endpoint, args, signal))
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }))
  ctx.effect(() => () => controller.dispose())
  ctx.effect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  })
  ctx.on('connection/reset', () => { void controller.request('list') })
  const t = ctx.locale.bind(namespace)
  const face = { hooks: { manager: controller }, request: (endpoint, args, options) => controller.request(endpoint, args, options) }
  // The two sections share one controller and managed patch; each kind gets its own settings page.
  const section = (id, kind) => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id, order: kind === 'skill' ? 16 : 17,
    label: () => t(kind === 'skill' ? 'navSkill' : 'navMcp'), locale: namespace,
    inject: () => face,
  }, kind === 'skill' ? SkillSection : McpSection))
  section('skill-manager', 'skill')
  section('mcp-manager', 'mcp')
}

export function SkillSection({ t, useManager, request }) {
  const state = useManager(value => value)
  const [form, setForm] = useState('')
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState('path')
  const busy = state.loading || state.saving
  const sources = state.sources ?? []
  const skills = state.skills ?? []
  const visible = skills.filter(skill => {
    const source = sources.find(item => item.id === skill.sourceId)
    return `${skill.name} ${skill.description} ${source?.location ?? ''} ${source?.group ?? ''}`.toLowerCase().includes(query.toLowerCase())
  })
  const counts = {
    all: skills.length,
    automatic: skills.filter(skill => skill.valid && skill.modelInvocable && skill.sourceEnabled && !skill.shadowed).length,
    manual: skills.filter(skill => skill.valid && !skill.modelInvocable && skill.userInvocable && skill.sourceEnabled).length,
    invalid: skills.filter(skill => !skill.valid).length,
  }
  useLiveRefresh(request)
  return <section className="dsh-ext dsh-skill-manager">
    <header className="dsh-ext-heading"><div><h2>{t('navSkill')}</h2><p>{t('skillIntro')}</p></div>
      <div className="dsh-ext-heading-actions"><button type="button" disabled={busy || !state.revision} onClick={() => setForm('source')}>{t('add')}</button>
        <button type="button" disabled={busy || sources.length === 0} onClick={() => setForm('skill')}>{t('newSkill')}</button>
        <button type="button" disabled={busy} onClick={() => request('list')}>{t('refresh')}</button></div></header>
    <PageState state={state} t={t} />
    <div className="dsh-skill-stats">
      {Object.entries(counts).map(([key, value]) => <div key={key}><strong>{value}</strong><span>{t(`stat_${key}`)}</span></div>)}
    </div>
    <label className="dsh-skill-search"><span className="dsh-visually-hidden">{t('search')}</span>
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
    <div className="dsh-skill-grouping" role="group" aria-label={t('groupView')}>
      <span>{t('groupView')}</span><button type="button" aria-pressed={groupBy === 'path'} onClick={() => setGroupBy('path')}>{t('groupByPath')}</button>
      <button type="button" aria-pressed={groupBy === 'custom'} onClick={() => setGroupBy('custom')}>{t('groupByCustom')}</button>
    </div>
    {form === 'source' && <AddForm kind="skill" t={t} busy={busy} onCancel={() => setForm('')} onSave={async args => {
      if (await request('add-skill', args)) setForm('')
    }} />}
    {form === 'skill' && <NewSkillForm sources={sources} t={t} busy={busy} onCancel={() => setForm('')} onSave={async args => {
      if (await request('create-skill', args)) setForm('')
    }} />}
    {sources.length === 0 && <div className="dsh-ext-card dsh-ext-empty"><strong>{t('emptySkills')}</strong><p>{t('emptySkillsHint')}</p></div>}
    <div className="dsh-skill-sources">{groupBy === 'path' ? sources.map(source => <SkillPath key={source.id} source={source} skills={skills} visible={visible} query={query} t={t} busy={busy} request={request} />)
      : groupSources(sources.filter(source => !query || visible.some(skill => skill.sourceId === source.id))).map(group => <section className="dsh-skill-user-group" key={group.name}>
        <header><h3>{group.name || t('ungrouped')} <span className="dsh-ext-count">{group.sources.reduce((total, source) => total + skills.filter(skill => skill.sourceId === source.id).length, 0)}</span></h3></header>
        <div>{group.sources.map(source => <SkillPath key={source.id} source={source} skills={skills} visible={visible} query={query} t={t} busy={busy} request={request} nested />)}</div>
      </section>)}</div>
    <p className="dsh-ext-footnote">{t('skillFootnote')}</p>
  </section>
}

function groupSources(sources) {
  const groups = new Map()
  for (const source of sources) {
    const key = source.group || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(source)
  }
  return [...groups].map(([name, entries]) => ({ name, sources: entries }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function SkillPath({ source, skills, visible, query, t, busy, request, nested = false }) {
  const rows = visible.filter(skill => skill.sourceId === source.id)
  if (query && rows.length === 0) return null
  return <section className={`dsh-skill-source${nested ? ' dsh-skill-source-nested' : ''}`}>
    <header><div className="dsh-skill-source-title"><span className={`dsh-ext-status ${source.enabled ? 'dsh-ext-status-available' : ''}`} aria-hidden="true" />
      <div><h3>{source.location} <span className="dsh-ext-count">{skills.filter(skill => skill.sourceId === source.id).length}</span></h3>
        <small>{source.group ? `${t('customGroup')}: ${source.group}` : t('ungrouped')}</small></div></div>
      <button type="button" role="switch" aria-checked={source.enabled} disabled={busy}
        onClick={() => request('enable', { id: source.id, enabled: !source.enabled })}>{t(source.enabled ? 'disable' : 'enable')}</button></header>
    <GroupEditor source={source} t={t} busy={busy} request={request} />
    {source.issue && <p className="dsh-ext-notice">{t(`issue_${source.issue}`)}</p>}
    {rows.length === 0 ? <div className="dsh-ext-empty"><p>{t('sourceEmpty')}</p></div>
      : <ul>{rows.map(skill => <SkillRow key={skill.relativePath} skill={skill} t={t} busy={busy} request={request} />)}</ul>}
  </section>
}

function GroupEditor({ source, t, busy, request }) {
  const [group, setGroup] = useState(source.group)
  useEffect(() => setGroup(source.group), [source.group])
  return <form className="dsh-skill-group-editor" onSubmit={event => {
    event.preventDefault()
    void request('set-skill-group', { id: source.id, group })
  }}><label>{t('customGroup')}<input value={group} maxLength={64} disabled={busy} onChange={event => setGroup(event.target.value)} placeholder={t('groupPlaceholder')} /></label>
    <button type="submit" disabled={busy || group.trim() === source.group}>{t('saveGroup')}</button></form>
}

export function McpSection({ t, useManager, request }) {
  const state = useManager(value => value)
  const [form, setForm] = useState(false)
  const busy = state.loading || state.saving
  const rows = state.extensions.filter(row => row.kind === 'mcp')
  useLiveRefresh(request)
  return <section className="dsh-ext">
    <header className="dsh-ext-heading"><div><h2>{t('navMcp')}</h2><p>{t('mcpIntro')}</p></div>
      <button type="button" disabled={busy} onClick={() => request('list')}>{t('refresh')}</button></header>
    <PageState state={state} t={t} />
    <section className="dsh-ext-card">
      <header><h3>{t('mcp')} <span className="dsh-ext-count">{rows.length}</span></h3>
        <button type="button" disabled={busy || !state.revision} onClick={() => setForm(true)}>{t('addMcp')}</button></header>
      {rows.length === 0 && <div className="dsh-ext-empty"><strong>{t('emptyMcp')}</strong><p>{t('emptyMcpHint')}</p></div>}
      <ul>{rows.map(row => <li key={row.id}><div className="dsh-ext-details"><strong>{row.id}</strong><code>{row.location}</code><McpRuntime row={row} t={t} /></div>
        <button type="button" role="switch" aria-checked={row.enabled} aria-label={`${t(row.enabled ? 'disable' : 'enable')} ${row.id}`} disabled={busy}
          onClick={() => request('enable', { id: row.id, enabled: !row.enabled })}>{t(row.enabled ? 'disable' : 'enable')}</button></li>)}</ul>
      {form && <AddForm kind="mcp" t={t} busy={busy} onCancel={() => setForm(false)} onSave={async args => {
        if (await request('add-mcp', args)) setForm(false)
      }} />}
    </section>
    <p className="dsh-ext-footnote">{t('mcpFootnote')}</p>
  </section>
}

function useLiveRefresh(request) {
  useEffect(() => {
    void request('list')
    let timer
    const poll = () => {
      if (document.visibilityState === 'visible') void request('list', {}, { silent: true })
      timer = window.setTimeout(poll, settingsPollIntervalMs)
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void request('list', {}, { silent: true })
    }
    timer = window.setTimeout(poll, settingsPollIntervalMs)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [request])
}

function PageState({ state, t }) {
  return <>{state.loading && <p role="status">{t('loading')}</p>}
    {state.error && <p className="dsh-ext-notice" role="alert">{t(state.error)}</p>}
    {state.saved && <p className="dsh-ext-notice" role="status">{t('saved')}</p>}</>
}

function SkillRow({ skill, t, busy, request }) {
  const state = !skill.valid ? 'invalid' : !skill.sourceEnabled || (!skill.modelInvocable && !skill.userInvocable)
    ? 'disabled' : skill.shadowed ? 'shadowed' : !skill.modelInvocable ? 'manual' : 'available'
  const invocation = skill.modelInvocable && skill.userInvocable ? 'both'
    : skill.modelInvocable ? 'modelOnly' : skill.userInvocable ? 'manualOnly' : 'none'
  const statusLabel = !skill.valid ? 'skillStatusInvalid' : !skill.sourceEnabled ? 'skillStatusSourceDisabled'
    : skill.shadowed ? 'skillStatusShadowed' : ''
  const update = patch => request('set-skill-invocation', {
    sourceId: skill.sourceId, relativePath: skill.relativePath, skillRevision: skill.revision,
    modelInvocable: skill.modelInvocable, userInvocable: skill.userInvocable, ...patch,
  })
  return <li className="dsh-skill-row"><div className="dsh-skill-row-main">
    <div className="dsh-skill-name"><span className={`dsh-ext-status dsh-ext-status-${state}`} aria-hidden="true" /><strong>{skill.name}</strong>
      <span className="dsh-skill-badge">{t(`format_${skill.format}`)}</span><span className="dsh-skill-badge">{t(`invocation_${invocation}`)}</span>
      {statusLabel && <span className={`dsh-skill-badge dsh-skill-badge-${state}`}>{t(statusLabel)}</span>}</div>
    <p>{skill.description || t('noDescription')}</p><code>{skill.relativePath}</code>
    <details><summary>{t('details')}</summary><div className="dsh-skill-detail">
      {skill.whenToUse && <p><strong>{t('whenToUse')}</strong>{skill.whenToUse}</p>}
      {skill.issues.length > 0 && <div><strong>{t('diagnostics')}</strong><ul>{skill.issues.map(issue => <li key={issue}>{t(`issue_${issue}`)}</li>)}</ul></div>}
      <div className="dsh-skill-invocation"><strong>{t('invocation')}</strong>
        <label><input type="checkbox" checked={skill.modelInvocable} disabled={busy || !skill.valid} onChange={event => update({ modelInvocable: event.target.checked })} /> {t('modelInvocable')}</label>
        <label><input type="checkbox" checked={skill.userInvocable} disabled={busy || !skill.valid} onChange={event => update({ userInvocable: event.target.checked })} /> {t('userInvocable')}</label></div>
      <div><strong>{t('resources')}</strong>{skill.resources.length
        ? <ul className="dsh-skill-resources">{skill.resources.map(path => <li key={path}><code>{path}</code></li>)}</ul>
        : <p>{t('noResources')}</p>}</div>
    </div></details>
  </div></li>
}

function McpRuntime({ row, t }) {
  const tools = row.tools ?? []
  const state = !row.enabled ? 'disabled' : tools.length ? 'available' : 'waiting'
  const prefix = `mcp__${row.id}__`
  return <div className="dsh-ext-runtime">
    <span className={`dsh-ext-status dsh-ext-status-${state}`} aria-hidden="true" />
    <span className="dsh-ext-status-label">{t(`status_${state}`)}</span>
    {tools.length > 0 && <details><summary>{t('tools')} · {tools.length}</summary>
      <ul className="dsh-ext-tools">{tools.map(name => <li key={name}><code title={name}>{name.startsWith(prefix) ? name.slice(prefix.length) : name}</code></li>)}</ul>
    </details>}
  </div>
}

function NewSkillForm({ sources, t, busy, onSave, onCancel }) {
  const prefix = useId()
  return <form className="dsh-ext-form dsh-skill-create" onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void onSave({
      sourceId: data.get('sourceId'), name: data.get('name'), description: data.get('description'),
      whenToUse: data.get('whenToUse'), modelInvocable: data.has('modelInvocable'),
      userInvocable: data.has('userInvocable'), structure: data.get('structure'),
    })
  }}><fieldset disabled={busy}>
    <label htmlFor={`${prefix}-sourceId`}>{t('source')}<select id={`${prefix}-sourceId`} name="sourceId">
      {sources.map(source => <option key={source.id} value={source.id}>{source.id}</option>)}</select></label>
    <label htmlFor={`${prefix}-name`}>{t('skillName')}<input id={`${prefix}-name`} name="name" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoComplete="off" /></label>
    <label className="dsh-ext-span" htmlFor={`${prefix}-description`}>{t('description')}<textarea id={`${prefix}-description`} name="description" rows={3} required /></label>
    <label className="dsh-ext-span" htmlFor={`${prefix}-whenToUse`}>{t('whenToUse')}<textarea id={`${prefix}-whenToUse`} name="whenToUse" rows={2} /></label>
    <label htmlFor={`${prefix}-structure`}>{t('structure')}<select id={`${prefix}-structure`} name="structure">
      <option value="minimal">{t('structureMinimal')}</option><option value="standard">{t('structureStandard')}</option></select></label>
    <div className="dsh-skill-create-flags"><span>{t('invocation')}</span>
      <label><input type="checkbox" name="modelInvocable" defaultChecked /> {t('modelInvocable')}</label>
      <label><input type="checkbox" name="userInvocable" defaultChecked /> {t('userInvocable')}</label></div>
    <div className="dsh-ext-actions"><button type="button" onClick={onCancel}>{t('cancel')}</button><button type="submit">{t(busy ? 'saving' : 'create')}</button></div>
  </fieldset></form>
}

function AddForm({ kind, t, busy, onSave, onCancel }) {
  const prefix = useId()
  const [transport, setTransport] = useState('stdio')
  const field = (name, required = true, multiline = false) => <label htmlFor={`${prefix}-${name}`}>{t(name)}{multiline
    ? <textarea id={`${prefix}-${name}`} name={name} rows={3} />
    : <input id={`${prefix}-${name}`} name={name} required={required} autoComplete="off" {...(name === 'id' ? { pattern: '[A-Za-z0-9_\\-]{1,32}', maxLength: 32 } : {})} />}</label>
  return <form className="dsh-ext-form" onSubmit={event => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const args = kind === 'skill' ? { directory: data.directory, group: data.group ?? '' } : {
      id: data.id, configuration: JSON.stringify(transport === 'stdio'
        ? { transport, command: data.command, args: data.args.split(/\r?\n/).filter(Boolean), cwd: data.cwd }
        : { transport, url: data.url }),
    }
    void onSave(args)
  }}><fieldset disabled={busy}>{kind === 'skill' ? <>{field('directory')} {field('group', false)}</> : <>{field('id')}
      <label htmlFor={`${prefix}-transport`}>{t('transport')}<select id={`${prefix}-transport`} value={transport} onChange={event => setTransport(event.target.value)}>
        <option value="stdio">{t('stdio')}</option><option value="streamable-http">{t('http')}</option></select></label>
      {transport === 'stdio' ? <>{field('command')}{field('args', false, true)}{field('cwd', false)}</> : field('url')}
      <p>{t('secret')}</p>
    </>}
    <div className="dsh-ext-actions"><button type="button" onClick={onCancel}>{t('cancel')}</button><button type="submit">{t(busy ? 'saving' : 'save')}</button></div>
  </fieldset></form>
}
