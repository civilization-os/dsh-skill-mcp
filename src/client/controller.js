/** One observable per mounted plugin; drafts stay in the settings component. */
export class ExtensionsController {
  state = { extensions: [], revision: '', loading: false, saving: false, error: '', saved: false }
  listeners = new Set()
  lifetime = new AbortController()
  generation = 0
  constructor(call) { this.call = call }
  getSnapshot = () => this.state
  subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  publish(patch) {
    if (this.lifetime.signal.aborted) return
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
  async request(endpoint, args = {}) {
    if (this.state.saving || this.lifetime.signal.aborted) return false
    const generation = ++this.generation
    const saving = endpoint !== 'list'
    this.publish({ loading: !saving, saving, error: '', saved: false })
    try {
      const result = await this.call(endpoint, { ...args, revision: this.state.revision }, this.lifetime.signal)
      if (this.lifetime.signal.aborted || generation !== this.generation) return false
      if (!result.ok) {
        this.publish({ error: result.error.code === 'extensions/conflict' ? 'conflict' : 'failed', loading: false, saving: false })
        return false
      }
      this.publish({ ...result.value, loading: false, saving: false, saved: saving })
      return true
    } catch {
      if (generation === this.generation) this.publish({ error: 'failed', loading: false, saving: false })
      return false
    }
  }
  dispose() { this.lifetime.abort(); this.listeners.clear() }
}
