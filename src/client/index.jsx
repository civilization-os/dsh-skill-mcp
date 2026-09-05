/** Skill and MCP settings sections registered through the public Slots and Connection services. */
import { useEffect, useId, useState } from 'react'
import { ExtensionsController } from './controller.js'
import { zh, en } from './locales.js'
import css from './styles.css'

export const inject = ['slots', 'locale', 'connection']
const namespace = 'settings.extension-manager'
const mcpPollIntervalMs = 3000

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

export function SkillSection(props) { return <ManagerSection {...props} kind="skill" /> }
export function McpSection(props) { return <ManagerSection {...props} kind="mcp" /> }

function ManagerSection({ kind, t, useManager, request }) {
  const state = useManager(value => value)
  const [form, setForm] = useState(null)
  const busy = state.loading || state.saving
  const rows = state.extensions.filter(row => row.kind === kind)
  useEffect(() => {
    void request('list')
    if (kind !== 'mcp') return
    let timer
    const poll = () => {
      if (document.visibilityState === 'visible') void request('list', {}, { silent: true })
      timer = window.setTimeout(poll, mcpPollIntervalMs)
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void request('list', {}, { silent: true })
    }
    timer = window.setTimeout(poll, mcpPollIntervalMs)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [kind, request])
  return <section className="dsh-ext">
    <header className="dsh-ext-heading"><div><h2>{t(kind === 'skill' ? 'navSkill' : 'navMcp')}</h2><p>{t(kind === 'skill' ? 'skillIntro' : 'mcpIntro')}</p></div>
      <button type="button" disabled={busy} onClick={() => request('list')}>{t('refresh')}</button></header>
    {state.loading && <p role="status">{t('loading')}</p>}
    {state.error && <p className="dsh-ext-notice" role="alert">{t(state.error)}</p>}
    {state.saved && <p className="dsh-ext-notice" role="status">{t('saved')}</p>}
    <section className="dsh-ext-card">
      <header><h3>{t(kind === 'skill' ? 'skills' : 'mcp')} <span className="dsh-ext-count">{rows.length}</span></h3>
        <button type="button" disabled={busy || !state.revision} onClick={() => setForm(kind)}>{t(kind === 'skill' ? 'add' : 'addMcp')}</button></header>
      {rows.length === 0 && <div className="dsh-ext-empty"><strong>{t(kind === 'skill' ? 'emptySkills' : 'emptyMcp')}</strong><p>{t(kind === 'skill' ? 'emptySkillsHint' : 'emptyMcpHint')}</p></div>}
      <ul>{rows.map(row => <li key={row.id}><div className="dsh-ext-details"><strong>{row.id}</strong><code>{row.location}</code>
        {kind === 'mcp' ? <McpRuntime row={row} t={t} /> : <small>{t(row.enabled ? 'enabled' : 'disabled')}</small>}</div>
        <button type="button" role="switch" aria-checked={row.enabled} aria-label={`${t(row.enabled ? 'disable' : 'enable')} ${row.id}`} disabled={busy}
          onClick={() => request('enable', { id: row.id, enabled: !row.enabled })}>{t(row.enabled ? 'disable' : 'enable')}</button></li>)}</ul>
      {form === kind && <AddForm kind={kind} t={t} busy={busy} onCancel={() => setForm(null)} onSave={async args => {
        if (await request(kind === 'skill' ? 'add-skill' : 'add-mcp', args)) setForm(null)
      }} />}
    </section>
    <p className="dsh-ext-footnote">{t(kind === 'skill' ? 'skillFootnote' : 'mcpFootnote')}</p>
  </section>
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

function AddForm({ kind, t, busy, onSave, onCancel }) {
  const prefix = useId()
  const [transport, setTransport] = useState('stdio')
  const field = (name, required = true, multiline = false) => <label htmlFor={`${prefix}-${name}`}>{t(name)}{multiline
    ? <textarea id={`${prefix}-${name}`} name={name} rows={3} />
    : <input id={`${prefix}-${name}`} name={name} required={required} autoComplete="off" {...(name === 'id' ? { pattern: '[A-Za-z0-9_\\-]{1,32}', maxLength: 32 } : {})} />}</label>
  return <form className="dsh-ext-form" onSubmit={event => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const args = kind === 'skill' ? { id: data.id, directory: data.directory } : {
      id: data.id, configuration: JSON.stringify(transport === 'stdio'
        ? { transport, command: data.command, args: data.args.split(/\r?\n/).filter(Boolean), cwd: data.cwd }
        : { transport, url: data.url }),
    }
    void onSave(args)
  }}><fieldset disabled={busy}>{field('id')}
    {kind === 'skill' ? field('directory') : <>
      <label htmlFor={`${prefix}-transport`}>{t('transport')}<select id={`${prefix}-transport`} value={transport} onChange={event => setTransport(event.target.value)}>
        <option value="stdio">{t('stdio')}</option><option value="streamable-http">{t('http')}</option></select></label>
      {transport === 'stdio' ? <>{field('command')}{field('args', false, true)}{field('cwd', false)}</> : field('url')}
      <p>{t('secret')}</p>
    </>}
    <div className="dsh-ext-actions"><button type="button" onClick={onCancel}>{t('cancel')}</button><button type="submit">{t(busy ? 'saving' : 'save')}</button></div>
  </fieldset></form>
}
