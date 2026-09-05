/** Create local overlays without replacing existing extension configuration. */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const local = new URL('../.local/', import.meta.url)
await mkdir(local, { recursive: true })
const profile = new URL('harness-home/profiles/web/', local)
await mkdir(profile, { recursive: true })
const managed = new URL('cordis.patch.yml', profile)
let initial = '[{"insert":[]}]\n'
try { initial = await readFile(new URL('extensions.patch.json', local), 'utf8') }
catch (error) { if (error.code !== 'ENOENT') throw error }
try { await writeFile(managed, initial, { flag: 'wx', mode: 0o600 }) }
catch (error) { if (error.code !== 'EEXIST') throw error }
await writeFile(new URL('manager.patch.json', local), JSON.stringify([{ insert: [{
  id: 'extension-manager', name: new URL('../src/index.js', import.meta.url).href,
  config: { patchPath: fileURLToPath(managed) },
}] }], null, 2) + '\n')
console.log(`Manager overlay: ${fileURLToPath(new URL('manager.patch.json', local))}`)
console.log(`Managed profile patch: ${fileURLToPath(managed)}`)
