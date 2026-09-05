/** Start the supported dsh CLI with this repository's independent live profile. */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import './build.js'
import './setup.js'

const args = process.argv.slice(2)
if (!args.some(arg => arg === '--port' || arg.startsWith('--port='))) args.push('--port', '3081')
const child = spawn(process.execPath, [
  '--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web',
  '--patch', fileURLToPath(new URL('../.local/manager.patch.json', import.meta.url)),
  '--no-open', ...args,
], {
  cwd: fileURLToPath(new URL('../../deepseek-harness/', import.meta.url)),
  env: { ...process.env, DSH_HOME: fileURLToPath(new URL('../.local/harness-home/', import.meta.url)) },
  stdio: 'inherit',
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
